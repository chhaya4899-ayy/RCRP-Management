// mentionHandler.js — @FSRP Management AI responder
// Uses server brain (live member data) + channel index for context-aware answers.
// Detects @mentions and username lookups — gives personal, member-specific answers.

'use strict';

const config      = require('../config');
const db          = require('../utils/discordDb');
const ai          = require('../utils/ai');
const dbScanner   = require('./dbScanner');
const serverBrain = require('./serverBrain');

async function handleMention(message) {
  if (message.author.bot || !message.guild) return;

  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) {
    return message.reply(
      'Ask me anything — rules, member info, who\'s been active, applications, game history, anything. I scan the whole server every 2 minutes.'
    );
  }

  await message.channel.sendTyping();

  try {
    // ── 1. Ensure channel index is fresh ──────────────────────────────────────
    await dbScanner.ensureIndexed();
    const serverContext = dbScanner.getContextForQuery(question);

    // ── 2. Build member context from server brain ─────────────────────────────
    const memberContext = buildMemberContext(message, question);

    // ── 3. Get asking user's game history ────────────────────────────────────
    const userHistory = await getUserHistory(message.member, message.guild);

    // ── 4. Ask AI ─────────────────────────────────────────────────────────────
    const answer = await ai.answerQuestion(
      question,
      serverContext,
      memberContext,
      userHistory,
      message.member.displayName
    );

    const reply = answer || "I couldn't find enough info on that. Ask a staff member!";

    // ── 5. Send (split if over Discord limit) ─────────────────────────────────
    if (reply.length <= 1990) {
      return message.reply({ content: reply, allowedMentions: { repliedUser: true } });
    }

    const chunks = splitText(reply, 1990);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) await message.reply({ content: chunks[i], allowedMentions: { repliedUser: true } });
      else await message.channel.send(chunks[i]);
    }

  } catch (err) {
    console.error('[MentionHandler]', err.message);
    await message.reply('Something went wrong on my end. Try again!').catch(() => {});
  }
}

// ── Build member context for the AI ──────────────────────────────────────────
// Includes:
//   • Profile of any @mentioned members in the question
//   • Profile if someone asks "who is username" / "tell me about username"
//   • Summary of the most active members as background knowledge
function buildMemberContext(message, question) {
  const brain = serverBrain.getCachedBrain();
  if (!brain) return '';

  const parts = [];

  // ── @mentioned users in the message ──────────────────────────────────────
  for (const [, user] of message.mentions.users) {
    if (user.id === message.client.user.id) continue; // skip the bot itself
    const profile = getMemberProfile(brain, user.id);
    if (profile) parts.push(`=== @${user.username} (mentioned) ===\n${profile}`);
  }

  // ── Username lookup patterns ──────────────────────────────────────────────
  // "who is <name>", "tell me about <name>", "what do you know about <name>", etc.
  const nameMatch = question.match(
    /(?:who is|tell me about|what do you know about|info on|lookup|find|check)\s+([A-Za-z0-9_]{3,32})/i
  );
  if (nameMatch) {
    const found = serverBrain.getMemberByUsername(nameMatch[1]);
    if (found) {
      const profile = getMemberProfile(brain, found.id);
      if (profile) parts.push(`=== "${nameMatch[1]}" profile ===\n${profile}`);
    }
  }

  // ── Top active members summary (background knowledge for the AI) ──────────
  const topMembers = Object.values(brain.members || {})
    .filter(m => m.messageCount > 0)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 15);

  if (topMembers.length) {
    const summary = topMembers.map(m => {
      const gm   = brain.guildMembers?.[m.id];
      const role = gm?.topRole || m.topRole || 'Member';
      const last = m.lastSeen ? new Date(m.lastSeen).toLocaleDateString() : 'unknown';
      return `• ${m.displayName || m.username} [${role}] — ${m.messageCount} messages, last active ${last}`;
    }).join('\n');
    parts.push(`=== ACTIVE MEMBERS (top 15 by activity) ===\n${summary}`);
  }

  // ── Recent important facts (promotions, announcements) ───────────────────
  const recentFacts = (brain.facts || [])
    .filter(f => ['promotion_event', 'announcement', 'relationship'].includes(f.type))
    .slice(-20)
    .map(f => {
      if (f.type === 'promotion_event') return `• Promotion: ${f.people} — "${f.content}" (in #${f.channel})`;
      if (f.type === 'announcement')    return `• Announcement in #${f.channel}: "${f.content.slice(0, 120)}"`;
      if (f.type === 'relationship')    return `• Known fact: "${f.subject}" = "${f.value}" (set by ${f.source})`;
      return null;
    })
    .filter(Boolean);

  if (recentFacts.length) {
    parts.push(`=== RECENT SERVER FACTS ===\n${recentFacts.join('\n')}`);
  }

  return parts.join('\n\n');
}

// ── Get a human-readable profile for a Discord user ID ───────────────────────
function getMemberProfile(brain, userId) {
  const gm       = brain.guildMembers?.[userId];
  const activity = brain.members?.[userId];
  if (!gm && !activity) return null;

  const lines = [];
  if (gm) {
    lines.push(`Username: ${gm.username} | Display: ${gm.displayName}`);
    lines.push(`Top Role: ${gm.topRole}`);
    if (gm.roles?.length) lines.push(`Roles: ${gm.roles.slice(0, 6).join(', ')}`);
    if (gm.joinedAt) lines.push(`Joined: ${new Date(gm.joinedAt).toLocaleDateString()}`);
  }
  if (activity) {
    lines.push(`Messages tracked: ${activity.messageCount}`);
    if (activity.lastSeen) lines.push(`Last seen: ${new Date(activity.lastSeen).toLocaleDateString()}`);
    if (activity.channels?.length) lines.push(`Active in: ${activity.channels.slice(0, 5).join(', ')}`);
  }
  return lines.join('\n');
}

function splitText(text, maxLen) {
  const chunks = [];
  const lines  = text.split('\n');
  let cur = '';
  for (const line of lines) {
    if ((cur + '\n' + line).length > maxLen) { if (cur) chunks.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function getUserHistory(member, guild) {
  try {
    const verifyCh = guild.channels.cache.get(config.channels.verifyDatabase);
    if (!verifyCh) return '';

    const { users } = await db.getVerifyDb(verifyCh);
    const entry = users.find(u => u.discordId === member.id && u.status === 'active');
    if (!entry) return `${member.displayName} is not verified in the FSRP database.`;

    const robloxId = String(entry.robloxId);
    const gameCh   = guild.channels.cache.get(config.channels.gameDatabase);
    if (!gameCh) return `Roblox: ${entry.robloxUsername} (${robloxId}).`;

    const files       = await db.readAllFiles(gameCh, null, 50);
    const appearances = [];
    for (const f of files) {
      const p = (f.data?.players || []).find(pl => String(pl.userId || pl._userId) === robloxId);
      if (p) appearances.push({
        ts:       f.data?._meta?.timestamp || new Date(f.timestamp).toISOString(),
        team:     p.team || p._team || '?',
        vehicle:  p.vehicle || p._vehicle || 'On foot',
        callsign: p.callsign || p._callsign || 'N/A',
      });
    }

    if (!appearances.length) return `Roblox: ${entry.robloxUsername} (${robloxId}). No game sessions recorded yet.`;

    const last     = appearances[appearances.length - 1];
    const teams    = [...new Set(appearances.map(a => a.team))];
    const vehicles = [...new Set(appearances.map(a => a.vehicle).filter(v => v !== 'On foot'))];

    return [
      `Roblox: ${entry.robloxUsername} (${robloxId})`,
      `Verified: ${entry.verifiedAt}`,
      `Sessions: ${appearances.length}`,
      `Last seen: ${last.ts}`,
      `Last team: ${last.team} | Callsign: ${last.callsign}`,
      `Teams played: ${teams.join(', ')}`,
      `Vehicles used: ${vehicles.join(', ') || 'None'}`,
    ].join('\n');
  } catch (err) {
    console.error('[MentionHandler] getUserHistory:', err.message);
    return '';
  }
}

module.exports = { handleMention };
