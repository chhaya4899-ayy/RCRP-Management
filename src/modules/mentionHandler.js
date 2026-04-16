// mentionHandler.js — @FSRP Management AI responder
// Resolves <#channelId> mentions with LIVE message fetching.
// Member-aware, conversation-memory, non-blocking, no duplicate scans.
// Security: privacy guard, ping sanitization, anti-manipulation.
'use strict';

const config = require('../config');
const db     = require('../utils/discordDb');
const ai     = require('../utils/ai');
const brain  = require('./serverBrain');

// ── Conversation memory: userId → last 3 exchanges ───────────────────────────
const _convo = new Map();

// ── Probe strike tracker: userId → strike count ───────────────────────────────
const _strikes = new Map();

// ── Privacy guard patterns ────────────────────────────────────────────────────
// Any message matching these is rejected BEFORE reaching the AI.
const BLOCKED_PATTERNS = [
  // Repeat / say abuse
  /\brepeat after me\b/i,
  /\bsay\b.{0,60}(@everyone|@here)/i,
  /\bsay\b.{0,60}<@/i,
  /\btell everyone\b/i,
  /\bannounce\b.{0,60}(@everyone|@here)/i,

  // Ping abuse
  /\bping\b.{0,60}(@everyone|@here|all members|the whole|every role)/i,
  /\bmention\b.{0,60}(@everyone|@here)/i,
  /\bping everyone\b/i,
  /\bping.*role\b/i,
  /^@everyone/i,
  /^@here/i,

  // Code / internals probing
  /\b(your|the) (source )?code\b/i,
  /\bhow (are you|do you|were you) (built|coded|made|programmed|trained|created)\b/i,
  /\bwhat (language|framework|library|stack|model|llm|api|token|key) (are you|do you use|powers you)\b/i,
  /\bshow (me )?(your )?(code|source|prompt|token|api key|system)\b/i,
  /\breveal (your|the) (prompt|system|instructions|code|token|key)\b/i,
  /\bwhat (ai|model|llm|engine) (are you|is this|powers)\b/i,
  /\byour (system )?prompt\b/i,
  /\bwhat model\b/i,
  /\byour (background|underlying|internal) (code|system|logic|workings)\b/i,
  /\bhow (exactly )?do you work\b/i,
  /\bwhat are your instructions\b/i,
  /\bwhat were you told\b/i,

  // Jailbreak / prompt injection
  /\bignore (previous|your|all) (instructions?|prompt|system|rules)\b/i,
  /\bforget (your|the|all) (instructions?|rules?|prompt|system)\b/i,
  /\bpretend (you are|to be|you'?re)\b/i,
  /\bact as (if )?(you are|a )?\b/i,
  /\byou are now\b/i,
  /\bnew (persona|mode|role)\b/i,
  /\bjailbreak\b/i,
  /\boverride (your|the) (instructions?|system|rules?|prompt)\b/i,
  /\bdeveloper mode\b/i,
  /\bdan mode\b/i,
  /\bdisable (your )?(filter|safety|restriction|rule)\b/i,
  /\bbypass (your )?(filter|restriction|rule)\b/i,
  /\bno restrictions?\b/i,
  /\bno rules?\b/i,
  /\bunrestricted mode\b/i,
];

// Short, rotating shutdown responses — no explanation, no engagement
const SHUTDOWN_REPLIES = [
  'Not going there.',
  'No.',
  'That\'s not something I do.',
  'Hard pass.',
  'Nope.',
  'Not a chance.',
  'Not happening.',
  'Move on.',
];

function getShutdown(userId) {
  const strikes = (_strikes.get(userId) || 0) + 1;
  _strikes.set(userId, strikes);
  // After 3 attempts, just stop responding at all
  if (strikes > 3) return null;
  return SHUTDOWN_REPLIES[(strikes - 1) % SHUTDOWN_REPLIES.length];
}

// ── Sanitize output — break ALL ping-capable mentions ────────────────────────
// Inserts a zero-width space after @ so Discord never fires the ping.
function sanitizeOutput(text) {
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi,     '@\u200bhere')
    .replace(/<@&(\d+)>/g,  '[@role]')
    .replace(/<@!?(\d+)>/g, (match, id) => match); // keep user mentions as-is (they don't ping in replies with locked allowedMentions)
}

// ── Locked allowedMentions — nothing pings except the reply itself ────────────
const SAFE_MENTIONS = { repliedUser: true, parse: [], roles: [], users: [] };

// ── Main handler ─────────────────────────────────────────────────────────────
async function handleMention(message) {
  if (message.author.bot || !message.guild) return;

  const rawContent = message.content.replace(/<@!?\d+>/g, '').trim();

  if (!rawContent) {
    return message.reply({
      content: 'Ask me anything — rules, member info, game history, announcements. I scan the whole server every 2 minutes.',
      allowedMentions: SAFE_MENTIONS,
    });
  }

  // ── Privacy guard — check BEFORE hitting AI ───────────────────────────────
  const isBlocked = BLOCKED_PATTERNS.some(p => p.test(rawContent));
  if (isBlocked) {
    const reply = getShutdown(message.author.id);
    if (!reply) return; // silent after too many attempts
    return message.reply({ content: reply, allowedMentions: SAFE_MENTIONS });
  }

  // Reset strikes on a legitimate question
  _strikes.delete(message.author.id);

  // Fire typing indicator immediately (non-blocking)
  message.channel.sendTyping().catch(() => {});

  try {
    // ── 1. Detect <#channelId> mentions — LIVE fetch those channels ───────────
    const { cleanQuestion, channelSnippet } = await resolveChannelMentions(rawContent, message.guild);

    // ── 2. Channel index context (instant — cached, no blocking) ─────────────
    const serverContext = brain.getContextForQuery(cleanQuestion);

    const fullContext = channelSnippet
      ? `=== REQUESTED CHANNEL — live content ===\n${channelSnippet}\n\n=== GENERAL SERVER KNOWLEDGE ===\n${serverContext}`
      : serverContext;

    // ── 3. Member context from brain cache ────────────────────────────────────
    const memberContext = buildMemberContext(message, cleanQuestion);

    // ── 4. Conversation memory (last 3 exchanges for context) ─────────────────
    const prevConvo  = _convo.get(message.author.id) || [];
    const convoBlock = prevConvo.length
      ? prevConvo.map((x, i) => `[Q${i + 1}]: ${x.q}\n[A${i + 1}]: ${x.a}`).join('\n\n')
      : null;

    const richMemberContext = convoBlock
      ? `${memberContext}\n\n=== CONVERSATION HISTORY ===\n${convoBlock}`
      : memberContext;

    // ── 5. User game history ──────────────────────────────────────────────────
    const userHistory = await getUserHistory(message.member, message.guild);

    // ── 6. Ask AI ─────────────────────────────────────────────────────────────
    const answer = await ai.answerQuestion(
      cleanQuestion,
      fullContext,
      richMemberContext,
      userHistory,
      message.member.displayName
    );

    const raw   = answer || "I couldn't find enough info on that. Ping a staff member!";
    const reply = sanitizeOutput(raw);

    // ── 7. Update conversation memory ─────────────────────────────────────────
    const updated = [...prevConvo, { q: cleanQuestion.slice(0, 200), a: reply.slice(0, 400) }].slice(-3);
    _convo.set(message.author.id, updated);

    // ── 8. Send (auto-split if over 2000 chars, all chunks locked) ────────────
    if (reply.length <= 1990) {
      return message.reply({ content: reply, allowedMentions: SAFE_MENTIONS });
    }
    const chunks = splitText(reply, 1990);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) await message.reply({ content: chunks[i], allowedMentions: SAFE_MENTIONS });
      else         await message.channel.send({ content: chunks[i], allowedMentions: SAFE_MENTIONS });
    }

  } catch (err) {
    console.error('[MentionHandler]', err.message);
    await message.reply({ content: 'Something went wrong on my end. Try again!', allowedMentions: SAFE_MENTIONS }).catch(() => {});
  }
}

// ── resolveChannelMentions ────────────────────────────────────────────────────
async function resolveChannelMentions(text, guild) {
  const regex   = /<#(\d+)>/g;
  const matches = [...text.matchAll(regex)];

  let cleanQuestion = text.replace(/<#(\d+)>/g, (_, id) => {
    const ch = guild.channels.cache.get(id);
    return ch ? `#${ch.name}` : `#${id}`;
  });

  if (!matches.length) return { cleanQuestion, channelSnippet: null };

  const parts = [];

  for (const match of matches) {
    const channelId = match[1];
    const ch = guild.channels.cache.get(channelId);
    if (!ch || !ch.isTextBased()) continue;

    try {
      const msgs = await ch.messages.fetch({ limit: 20 });
      if (!msgs.size) { parts.push(`#${ch.name}: (no messages found)`); continue; }

      const sorted     = [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      const mostRecent = sorted[sorted.length - 1];

      const lines = sorted.map(m => {
        const ts   = new Date(m.createdTimestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const name = m.member?.displayName || m.author.username;
        const body = m.content?.trim() || (m.embeds?.[0] ? `[embed: ${m.embeds[0].title || m.embeds[0].description?.slice(0, 80) || 'embed'}]` : '[attachment]');
        return `[${ts}] ${name}: ${body.slice(0, 400)}`;
      });

      parts.push(
        `Channel #${ch.name} — last ${lines.length} messages:\n` +
        lines.join('\n') +
        `\n\nMOST RECENT: [${new Date(mostRecent.createdTimestamp).toLocaleString()}] ${mostRecent.member?.displayName || mostRecent.author.username}: ${(mostRecent.content || '[embed/attachment]').slice(0, 500)}`
      );

      brain.indexChannelContent(channelId, ch.name, sorted);
    } catch (e) {
      parts.push(`#${ch.name}: (could not fetch — ${e.message})`);
    }
  }

  return { cleanQuestion, channelSnippet: parts.length ? parts.join('\n\n---\n\n') : null };
}

// ── buildMemberContext ────────────────────────────────────────────────────────
function buildMemberContext(message, question) {
  const cached = brain.getCachedBrain();
  if (!cached) return '';

  const parts = [];

  for (const [, user] of message.mentions.users) {
    if (user.id === message.client.user.id) continue;
    const profile = getMemberProfile(cached, user.id);
    if (profile) parts.push(`=== @${user.username} ===\n${profile}`);
  }

  const nameMatch = question.match(
    /(?:who(?:'s| is)|tell me about|info (?:on|about)|look ?up|check|find)\s+([A-Za-z0-9_\-.]{2,32})/i
  );
  if (nameMatch) {
    const found = brain.getMemberByUsername(nameMatch[1]);
    if (found) {
      const profile = getMemberProfile(cached, found.id);
      if (profile) parts.push(`=== "${nameMatch[1]}" profile ===\n${profile}`);
    }
  }

  const top = Object.values(cached.members || {})
    .filter(m => m.messageCount > 0)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 12);

  if (top.length) {
    parts.push(
      `=== MOST ACTIVE MEMBERS ===\n` +
      top.map(m => {
        const gm   = cached.guildMembers?.[m.id];
        const role = gm?.topRole || m.topRole || 'Member';
        const last = m.lastSeen ? new Date(m.lastSeen).toLocaleDateString() : '?';
        return `• ${m.displayName || m.username} [${role}] — ${m.messageCount} msgs, last seen ${last}`;
      }).join('\n')
    );
  }

  const facts = (cached.facts || [])
    .filter(f => ['promotion_event', 'announcement', 'relationship'].includes(f.type))
    .slice(-15)
    .map(f => {
      if (f.type === 'promotion_event') return `• Promotion in #${f.channel}: ${f.people} — "${f.content.slice(0, 100)}"`;
      if (f.type === 'announcement')    return `• Announcement in #${f.channel}: "${f.content.slice(0, 120)}"`;
      if (f.type === 'relationship')    return `• Fact set by ${f.source}: "${f.subject}" = "${f.value}"`;
      return null;
    }).filter(Boolean);

  if (facts.length) parts.push(`=== RECENT FACTS ===\n${facts.join('\n')}`);

  return parts.join('\n\n');
}

// ── getMemberProfile ──────────────────────────────────────────────────────────
function getMemberProfile(cached, userId) {
  const gm  = cached.guildMembers?.[userId];
  const act = cached.members?.[userId];
  if (!gm && !act) return null;

  const lines = [];
  if (gm) {
    lines.push(`Username: ${gm.username} | Display: ${gm.displayName}`);
    lines.push(`Top Role: ${gm.topRole}`);
    if (gm.roles?.length) lines.push(`All Roles: ${gm.roles.slice(0, 6).join(', ')}`);
    if (gm.joinedAt) lines.push(`Joined server: ${new Date(gm.joinedAt).toLocaleDateString()}`);
  }
  if (act) {
    lines.push(`Messages tracked: ${act.messageCount}`);
    if (act.lastSeen) lines.push(`Last active: ${new Date(act.lastSeen).toLocaleDateString()}`);
    if (act.channels?.length) lines.push(`Active channels: ${act.channels.slice(0, 5).join(', ')}`);
  }
  return lines.join('\n');
}

// ── getUserHistory ────────────────────────────────────────────────────────────
async function getUserHistory(member, guild) {
  try {
    const verifyCh = guild.channels.cache.get(config.channels.verifyDatabase);
    if (!verifyCh) return '';

    const { users } = await db.getVerifyDb(verifyCh);
    const entry = (users || []).find(u => u.discordId === member.id && u.status === 'active');
    if (!entry) return `${member.displayName} is not verified in the FSRP database.`;

    const robloxId = String(entry.robloxId);
    const gameCh   = guild.channels.cache.get(config.channels.gameDatabase);
    if (!gameCh)   return `Roblox: ${entry.robloxUsername} (${robloxId}).`;

    const files       = await db.readAllFiles(gameCh, null, 25);
    const appearances = [];
    for (const f of files) {
      const p = (f.data?.players || []).find(pl => String(pl.userId || pl._userId) === robloxId);
      if (p) appearances.push({
        ts:       f.data?._meta?.timestamp || new Date(f.timestamp).toISOString(),
        team:     p.team     || p._team     || '?',
        vehicle:  p.vehicle  || p._vehicle  || 'On foot',
        callsign: p.callsign || p._callsign || 'N/A',
      });
    }

    if (!appearances.length) return `Roblox: ${entry.robloxUsername} (${robloxId}). No sessions recorded yet.`;

    const last     = appearances[appearances.length - 1];
    const teams    = [...new Set(appearances.map(a => a.team))];
    const vehicles = [...new Set(appearances.map(a => a.vehicle).filter(v => v !== 'On foot'))];

    return [
      `Roblox: ${entry.robloxUsername} (${robloxId})`,
      `Verified: ${entry.verifiedAt}`,
      `Sessions seen: ${appearances.length}`,
      `Last session: ${last.ts} | Team: ${last.team} | Callsign: ${last.callsign}`,
      `Teams played: ${teams.join(', ')}`,
      `Vehicles used: ${vehicles.join(', ') || 'none recorded'}`,
    ].join('\n');
  } catch (err) {
    console.error('[MentionHandler] getUserHistory:', err.message);
    return '';
  }
}

function splitText(text, maxLen) {
  const chunks = [], lines = text.split('\n');
  let cur = '';
  for (const line of lines) {
    if ((cur + '\n' + line).length > maxLen) { if (cur) chunks.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

module.exports = { handleMention };
