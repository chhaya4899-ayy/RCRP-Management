// autoSetup.js — FSRP Panel System
'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// Per-panel distinct colours — none repeat, none use default Discord red/green
const P = {
  blurple: 0x5865F2,  // verification  — Discord identity
  blue:    0x1F6FEB,  // applications  — opportunity / action
  cyan:    0x0891B2,  // self-roles    — personal / interactive
  amber:   0xC27B0A,  // staff review  — gold / excellence
  royal:   0x2563EB,  // welcome       — opening / invitation
  slate:   0x374151,  // commands      — reference / technical
  maroon:  0xA21316,  // staff rules   — authority (not default red)
  navy:    0x0C4A78,  // dept updates  — operational
  teal:    0x0F766E,  // whitelist     — exclusive access
  violet:  0x7C3AED,  // IA handbook   — oversight / investigation
};

let _client = null;

// ── Upsert: edit existing tagged message or post new one ──────────────────────
async function upsert(ch, tag, embeds, components) {
  components = components || [];
  if (!ch) return;
  try {
    const msgs = await ch.messages.fetch({ limit: 50 });
    const existing = [...msgs.values()].find(m =>
      m.author.id === _client.user.id &&
      m.embeds.some(e => e.footer && e.footer.text && e.footer.text.includes(tag))
    );
    const payload = { embeds, components };
    if (existing) { await existing.edit(payload); }
    else          { await ch.send(payload); }
    console.log('[AutoSetup] ✓', tag, '→ #' + ch.name);
  } catch (e) {
    console.warn('[AutoSetup] ✗', tag, e.message);
  }
}

function getCh(guild, id) { return id ? guild.channels.cache.get(id) : null; }

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
async function runVerify(guild) {
  const ch = getCh(guild, config.channels.verification);
  if (!ch) return console.warn('[AutoSetup] #verification not found');
  const verification = require('./verification');
  await verification.postVerifyPanel(ch).catch(e => console.warn('[AutoSetup] Verify:', e.message));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APPLICATIONS — category buttons shown directly on the panel
// ─────────────────────────────────────────────────────────────────────────────
async function runApplications(guild) {
  const ch = getCh(guild, config.channels.applications);
  if (!ch) return console.warn('[AutoSetup] #applications not found');
  const applications = require('./applications');
  await applications.postApplicationPanel(ch).catch(e => console.warn('[AutoSetup] Apps:', e.message));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SELF-ROLES
// ─────────────────────────────────────────────────────────────────────────────
async function runSelfRoles(guild) {
  const ch = getCh(guild, config.channels.selfRoles);
  if (!ch) return;
  const r = config.roles;
  const embed = new EmbedBuilder()
    .setColor(P.cyan)
    .setAuthor({ name: 'Florida State Roleplay  ·  Role Selection', iconURL: guild.iconURL() || undefined })
    .setTitle('Departments & Notification Roles')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'Select your primary department and configure your notification preferences. ' +
      'Pressing an active button a second time removes the role from your profile.'
    )
    .addFields(
      { name: '\u200B', value: '**Departments**', inline: false },
      { name: 'Law Enforcement', value: '<@&' + r.leo      + '>', inline: true },
      { name: 'Fire & EMS',      value: '<@&' + r.fireDept + '>', inline: true },
      { name: 'DOT',             value: '<@&' + r.dot      + '>', inline: true },
      { name: 'Civilian',        value: '<@&' + r.civilian + '>', inline: true },
      { name: '\u200B', value: '**Notification Roles**', inline: false },
      { name: 'Session Alerts',  value: '<@&' + r.sessionPing  + '>', inline: true },
      { name: 'Giveaways',       value: '<@&' + r.giveawayPing + '>', inline: true },
      { name: 'Media',           value: '<@&' + r.mediaPing    + '>', inline: true },
      { name: 'SSU Callouts',    value: '<@&' + r.ssuPing      + '>', inline: true },
    )
    .setFooter({ text: 'FSRP:selfroles:panel  ·  Self-Roles  ·  Florida State Roleplay' })
    .setTimestamp();

  const deptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('selfrole:' + r.leo).setLabel('Law Enforcement').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('selfrole:' + r.fireDept).setLabel('Fire / EMS').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('selfrole:' + r.dot).setLabel('DOT').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('selfrole:' + r.civilian).setLabel('Civilian').setStyle(ButtonStyle.Secondary),
  );
  const pingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('selfrole:' + r.sessionPing).setLabel('Session Alerts').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('selfrole:' + r.giveawayPing).setLabel('Giveaways').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('selfrole:' + r.mediaPing).setLabel('Media Releases').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('selfrole:' + r.ssuPing).setLabel('SSU Callouts').setStyle(ButtonStyle.Success),
  );
  await upsert(ch, 'FSRP:selfroles:panel', [embed], [deptRow, pingRow]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STAFF REVIEW — Submit + View buttons
// ─────────────────────────────────────────────────────────────────────────────
async function runReviewPanel(guild) {
  const ch = getCh(guild, config.channels.staffReview);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(P.amber)
    .setAuthor({ name: 'Florida State Roleplay  ·  Performance Evaluations', iconURL: guild.iconURL() || undefined })
    .setTitle('Staff Evaluation Portal')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'Submit a formal performance evaluation for any staff member, or retrieve the complete review record for a specific individual. ' +
      'All submissions are treated with strict confidentiality and reviewed exclusively by management.'
    )
    .addFields(
      { name: 'Submit Evaluation', value: 'Rate a staff member 1–5 stars and provide written feedback. Both positive and critical reviews are valued equally.', inline: true },
      { name: 'View Record',       value: 'Pull the full review history and calculated average rating for any staff member by username.', inline: true },
      { name: 'Notice',            value: 'Submitting a knowingly false or malicious evaluation is a sanctionable offence. Be specific and factual.', inline: false },
    )
    .setFooter({ text: 'FSRP:review:panel  ·  Staff Review  ·  Florida State Roleplay' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('review_panel:submit').setLabel('Submit Evaluation').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('review_panel:view').setLabel('View Record').setStyle(ButtonStyle.Secondary),
  );
  await upsert(ch, 'FSRP:review:panel', [embed], [row]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. WELCOME
// ─────────────────────────────────────────────────────────────────────────────
async function runWelcome(guild) {
  const ch = getCh(guild, config.channels.welcome);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(P.royal)
    .setAuthor({ name: 'Florida State Roleplay', iconURL: guild.iconURL() || undefined })
    .setTitle('Welcome — ' + guild.memberCount.toLocaleString() + ' Members')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      "FSRP is one of ERLC's most established whitelisted roleplay communities. " +
      'Follow the four steps below to complete your setup and join your first session.'
    )
    .addFields(
      { name: '01  Verify',         value: 'Link your Roblox account in <#' + config.channels.verification + '> to unlock all channels and features.', inline: false },
      { name: '02  Select Roles',   value: 'Choose your department and enable notification pings in <#' + config.channels.selfRoles + '>.', inline: false },
      { name: '03  Read the Rules', value: '<#' + config.channels.discordRules + '>  Discord  ·  <#' + config.channels.gameRules + '>  In-Game  ·  <#' + config.channels.leoRules + '>  LEO', inline: false },
      { name: '04  Join a Session', value: 'Session announcements are posted in <#' + config.channels.sessionAnnouncements + '>.', inline: false },
      { name: 'Support',            value: 'Tickets  <#' + config.channels.support + '>  ·  Appeals  <#' + config.channels.banAppeals + '>', inline: false },
    )
    .setFooter({ text: 'FSRP:welcome:panel  ·  Florida State Roleplay' })
    .setTimestamp();
  await upsert(ch, 'FSRP:welcome:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. COMMANDS
// ─────────────────────────────────────────────────────────────────────────────
async function runCommandsHelp(guild) {
  const ch = getCh(guild, config.channels.commands);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(P.slate)
    .setAuthor({ name: 'FSRP Management Bot  ·  Command Reference', iconURL: guild.iconURL() || undefined })
    .setTitle('Command Directory')
    .setThumbnail(guild.iconURL() || null)
    .setDescription('`[Staff]` requires a staff role  ·  `[Mgmt]` requires Management or HR  ·  Unlabelled commands are open to all members.')
    .addFields(
      { name: 'Community',              value: '`/member mystats` `/member where` `/member vouch`\n`/rep give` `/rep view`', inline: true },
      { name: '[Staff]  ERLC',          value: '`/game overview` `/game players`\n`/game staff` `/game run <cmd>`', inline: true },
      { name: '[Staff]  Operations',    value: '`/staff warn` `/staff callout`\n`/loa request` `/loa view` `/promote`', inline: true },
      { name: '[Mgmt]  Disciplinary',   value: '`/management strike` `/warn` `/note` `/fire`', inline: true },
      { name: '[Mgmt]  Intelligence',   value: '`/intel <username>` `/internal-ask <query>`', inline: true },
      { name: '[Mgmt]  System',         value: '`/broadcast` `/fsrp refresh` `/fsrp status` `/panel`', inline: true },
    )
    .setFooter({ text: 'FSRP:commands:panel  ·  FSRP Management Bot  ·  Florida State Roleplay' })
    .setTimestamp();
  await upsert(ch, 'FSRP:commands:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. STAFF RULES
// ─────────────────────────────────────────────────────────────────────────────
async function runStaffRules(guild) {
  const ch = getCh(guild, config.channels.staffRules);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(P.maroon)
    .setAuthor({ name: 'Florida State Roleplay  ·  Management Division', iconURL: guild.iconURL() || undefined })
    .setTitle('Staff Code of Conduct')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'These articles are binding upon every FSRP staff member from Trial rank to Director. ' +
      'Ignorance of this code is not a mitigating factor. Violations result in disciplinary action up to and including immediate removal from all staff positions.'
    )
    .addFields(
      { name: 'I.    Professionalism',  value: 'Represent the organisation with maturity and respect across all platforms and in all circumstances.', inline: false },
      { name: 'II.   Authority',        value: 'Staff permissions exist solely to serve the community. Use outside that purpose constitutes an immediate strike offence.', inline: false },
      { name: 'III.  Confidentiality',  value: 'HR decisions, disciplinary records, and internal communications are classified. Unauthorised disclosure is prohibited.', inline: false },
      { name: 'IV.   Chain of Command', value: 'Act within your remit. Escalate issues through proper channels. Unilateral action beyond your authority is not permitted.', inline: false },
      { name: 'V.    Availability',     value: 'Inactive staff weaken the team. Extended absences require a prior LOA submission via `/loa request`.', inline: false },
      { name: 'VI.   Impartiality',     value: 'Every member receives equal treatment regardless of rank, affiliation, or personal relationship with staff.', inline: false },
      { name: 'VII.  Action Logging',   value: 'Every moderation action must be logged at the time it is taken. Unlogged actions may be classified as abuse.', inline: false },
      { name: 'Disciplinary Framework', value: '**Strike I** — Formal written warning, placed on record\n**Strike II** — Demotion, restricted duties, or suspension\n**Strike III** — Immediate removal from all staff positions', inline: false },
    )
    .setFooter({ text: 'FSRP:staffrules:panel  ·  Staff Conduct  ·  Florida State Roleplay Management' })
    .setTimestamp();
  await upsert(ch, 'FSRP:staffrules:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DEPARTMENT UPDATES
// ─────────────────────────────────────────────────────────────────────────────
async function runDeptUpdates(guild) {
  const ch = getCh(guild, config.channels.deptUpdates);
  if (!ch) return;
  const r = config.roles;
  const embed = new EmbedBuilder()
    .setColor(P.navy)
    .setAuthor({ name: 'Florida State Roleplay  ·  Operations Command', iconURL: guild.iconURL() || undefined })
    .setTitle('Department Communications')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'This channel is reserved for official divisional communications: roster updates, command directives, and operational bulletins. ' +
      'Posting access is restricted to department command staff and server management.'
    )
    .addFields(
      { name: 'Law Enforcement', value: '<@&' + r.leo      + '>', inline: true },
      { name: 'Fire & EMS',      value: '<@&' + r.fireDept + '>', inline: true },
      { name: 'Transportation',  value: '<@&' + r.dot      + '>', inline: true },
      { name: 'S.W.A.T.',       value: '<@&' + r.swat     + '>', inline: true },
    )
    .setFooter({ text: 'FSRP:deptupdates:panel  ·  Operations  ·  Florida State Roleplay' })
    .setTimestamp();
  await upsert(ch, 'FSRP:deptupdates:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. WHITELIST
// ─────────────────────────────────────────────────────────────────────────────
async function runWhitelistChat(guild) {
  const ch = getCh(guild, config.channels.whitelistChat);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(P.teal)
    .setAuthor({ name: 'Florida State Roleplay  ·  Private Server Access', iconURL: guild.iconURL() || undefined })
    .setTitle('Whitelist — Access Granted')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'Your application has been reviewed and approved. You now hold access to Florida State Roleplay private game servers.'
    )
    .addFields(
      { name: 'Session Announcements', value: '<#' + config.channels.sessionAnnouncements + '>', inline: true },
      { name: 'Enable Session Pings',  value: '<#' + config.channels.selfRoles + '>',            inline: true },
      { name: 'Notice',                value: 'Whitelist privileges may be revoked for rule violations without prior notice. All standard server rules apply within private sessions.', inline: false },
    )
    .setFooter({ text: 'FSRP:whitelist:panel  ·  Private Access  ·  Florida State Roleplay' })
    .setTimestamp();
  await upsert(ch, 'FSRP:whitelist:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. IA HANDBOOK
// ─────────────────────────────────────────────────────────────────────────────
async function runIAHandbook(guild) {
  const ch = getCh(guild, config.channels.iaHandbook);
  if (!ch) return;
  const r = config.roles;
  const embed = new EmbedBuilder()
    .setColor(P.violet)
    .setAuthor({ name: 'Florida State Roleplay  ·  Internal Affairs Division', iconURL: guild.iconURL() || undefined })
    .setTitle('Internal Affairs — Mandate & Procedure')
    .setThumbnail(guild.iconURL() || null)
    .setDescription(
      'The Internal Affairs Division operates as an independent oversight body within FSRP. ' +
      'IA investigates staff misconduct, authority abuse, and procedural violations. ' +
      'All proceedings are strictly confidential. **Contact IA via the ticket system — not direct message.**'
    )
    .addFields(
      { name: 'Division Personnel', value:
          '<@&' + r.iaDirector      + '>  Director, Internal Affairs\n' +
          '<@&' + r.internalAffairs + '>  Investigator\n' +
          '<@&' + r.trialIA         + '>  Probationary Investigator', inline: true },
      { name: 'Filing a Complaint', value:
          '**1.**  Open a ticket  →  <#' + config.channels.support + '>\n' +
          '**2.**  Identify it as an Internal Affairs referral\n' +
          '**3.**  Attach all supporting evidence\n' +
          '**4.**  An officer will respond within 24 hours', inline: true },
      { name: 'Jurisdiction',    value: 'Staff misconduct · Authority abuse · Procedural violations · Inter-staff disputes · Community complaints against staff', inline: false },
      { name: 'False Reports',   value: 'Filing a malicious or knowingly false IA report constitutes a serious offence and may result in permanent removal from the community.', inline: false },
    )
    .setFooter({ text: 'FSRP:iahandbook:panel  ·  Internal Affairs  ·  Florida State Roleplay' })
    .setTimestamp();
  await upsert(ch, 'FSRP:iahandbook:panel', [embed], []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────
async function run(client, guild) {
  _client = client;
  console.log('[AutoSetup] Configuring:', guild.name, '(' + guild.memberCount + ' members)');
  await Promise.allSettled([
    runVerify(guild),
    runApplications(guild),
    runSelfRoles(guild),
    runReviewPanel(guild),
    runWelcome(guild),
    runCommandsHelp(guild),
    runStaffRules(guild),
    runDeptUpdates(guild),
    runWhitelistChat(guild),
    runIAHandbook(guild),
  ]);
  console.log('[AutoSetup] Done.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Repost — fresh send to any target channel (used by /panel command)
// ─────────────────────────────────────────────────────────────────────────────
async function repostPanel(guild, panelId, targetChannel) {
  const r = config.roles;
  const send = (embeds, components) =>
    targetChannel.send({ embeds, components: components || [] }).catch(() => {});

  switch (panelId) {
    case 'verification': {
      const v = require('./verification');
      await v.postVerifyPanel(targetChannel).catch(() => {});
      break;
    }
    case 'applications': {
      const a = require('./applications');
      await a.postApplicationPanel(targetChannel).catch(() => {});
      break;
    }
    case 'selfroles': {
      const e = new EmbedBuilder()
        .setColor(P.cyan)
        .setAuthor({ name: 'Florida State Roleplay  ·  Role Selection', iconURL: guild.iconURL() || undefined })
        .setTitle('Departments & Notification Roles')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('Select your department and notification preferences. Pressing an active button removes the role.')
        .addFields(
          { name: '\u200B', value: '**Departments**', inline: false },
          { name: 'Law Enforcement', value: '<@&' + r.leo + '>', inline: true },
          { name: 'Fire & EMS', value: '<@&' + r.fireDept + '>', inline: true },
          { name: 'DOT', value: '<@&' + r.dot + '>', inline: true },
          { name: 'Civilian', value: '<@&' + r.civilian + '>', inline: true },
          { name: '\u200B', value: '**Notification Roles**', inline: false },
          { name: 'Session Alerts', value: '<@&' + r.sessionPing + '>', inline: true },
          { name: 'Giveaways', value: '<@&' + r.giveawayPing + '>', inline: true },
          { name: 'Media', value: '<@&' + r.mediaPing + '>', inline: true },
          { name: 'SSU Callouts', value: '<@&' + r.ssuPing + '>', inline: true },
        )
        .setFooter({ text: 'FSRP:selfroles:panel  ·  Self-Roles  ·  Florida State Roleplay' })
        .setTimestamp();
      const dR = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('selfrole:' + r.leo).setLabel('Law Enforcement').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('selfrole:' + r.fireDept).setLabel('Fire / EMS').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('selfrole:' + r.dot).setLabel('DOT').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('selfrole:' + r.civilian).setLabel('Civilian').setStyle(ButtonStyle.Secondary),
      );
      const pR = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('selfrole:' + r.sessionPing).setLabel('Session Alerts').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('selfrole:' + r.giveawayPing).setLabel('Giveaways').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('selfrole:' + r.mediaPing).setLabel('Media Releases').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('selfrole:' + r.ssuPing).setLabel('SSU Callouts').setStyle(ButtonStyle.Success),
      );
      await send([e], [dR, pR]);
      break;
    }
    case 'staffreview': {
      const e = new EmbedBuilder()
        .setColor(P.amber)
        .setAuthor({ name: 'Florida State Roleplay  ·  Performance Evaluations', iconURL: guild.iconURL() || undefined })
        .setTitle('Staff Evaluation Portal')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('Submit a formal performance evaluation or view the complete review record for any staff member. All submissions are confidential.')
        .addFields(
          { name: 'Submit Evaluation', value: 'Rate a staff member 1–5 stars with written feedback.', inline: true },
          { name: 'View Record', value: 'Retrieve review history and average rating by username.', inline: true },
        )
        .setFooter({ text: 'FSRP:review:panel  ·  Staff Review  ·  Florida State Roleplay' })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('review_panel:submit').setLabel('Submit Evaluation').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('review_panel:view').setLabel('View Record').setStyle(ButtonStyle.Secondary),
      );
      await send([e], [row]);
      break;
    }
    case 'welcome': {
      const e = new EmbedBuilder()
        .setColor(P.royal)
        .setAuthor({ name: 'Florida State Roleplay', iconURL: guild.iconURL() || undefined })
        .setTitle('Welcome — ' + guild.memberCount.toLocaleString() + ' Members')
        .setThumbnail(guild.iconURL() || null)
        .setDescription("FSRP is one of ERLC's most established whitelisted roleplay communities. Follow the steps below to complete your setup.")
        .addFields(
          { name: '01  Verify',         value: 'Link Roblox account in <#' + config.channels.verification + '>.', inline: false },
          { name: '02  Select Roles',   value: 'Pick your department in <#' + config.channels.selfRoles + '>.', inline: false },
          { name: '03  Read the Rules', value: '<#' + config.channels.discordRules + '>  ·  <#' + config.channels.gameRules + '>  ·  <#' + config.channels.leoRules + '>', inline: false },
          { name: '04  Play',           value: 'Watch <#' + config.channels.sessionAnnouncements + '> for sessions.', inline: false },
          { name: 'Support',            value: 'Tickets <#' + config.channels.support + '>  ·  Appeals <#' + config.channels.banAppeals + '>', inline: false },
        )
        .setFooter({ text: 'FSRP:welcome:panel  ·  Florida State Roleplay' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    case 'commands': {
      const e = new EmbedBuilder()
        .setColor(P.slate)
        .setAuthor({ name: 'FSRP Management Bot  ·  Command Reference', iconURL: guild.iconURL() || undefined })
        .setTitle('Command Directory')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('`[Staff]` = Staff role  ·  `[Mgmt]` = Management or HR  ·  No tag = all members.')
        .addFields(
          { name: 'Community',          value: '`/member`  `/rep`', inline: true },
          { name: '[Staff]  ERLC',       value: '`/game`  `/erlc`', inline: true },
          { name: '[Staff]  Ops',        value: '`/staff`  `/loa`  `/promote`', inline: true },
          { name: '[Mgmt]  Admin',       value: '`/management`  `/intel`  `/broadcast`  `/fsrp`', inline: true },
        )
        .setFooter({ text: 'FSRP:commands:panel  ·  FSRP Management Bot' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    case 'staffrules': {
      const e = new EmbedBuilder()
        .setColor(P.maroon)
        .setAuthor({ name: 'Florida State Roleplay  ·  Management Division', iconURL: guild.iconURL() || undefined })
        .setTitle('Staff Code of Conduct')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('Binding upon all staff from Trial to Director. Violations result in disciplinary action up to immediate removal.')
        .addFields(
          { name: 'I.    Professionalism',  value: 'Represent the organisation with maturity at all times.', inline: false },
          { name: 'II.   Authority',        value: 'Permissions used outside their purpose are an immediate strike offence.', inline: false },
          { name: 'III.  Confidentiality',  value: 'Internal matters and HR records are classified.', inline: false },
          { name: 'IV.   Chain of Command', value: 'Act within your remit. Escalate appropriately.', inline: false },
          { name: 'V.    Availability',     value: 'Extended absences require a formal LOA via `/loa request`.', inline: false },
          { name: 'Disciplinary Scale',     value: '**Strike I** — Warning  ·  **Strike II** — Demotion/suspension  ·  **Strike III** — Removal', inline: false },
        )
        .setFooter({ text: 'FSRP:staffrules:panel  ·  Staff Conduct  ·  Florida State Roleplay' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    case 'deptupdates': {
      const e = new EmbedBuilder()
        .setColor(P.navy)
        .setAuthor({ name: 'Florida State Roleplay  ·  Operations Command', iconURL: guild.iconURL() || undefined })
        .setTitle('Department Communications')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('Official divisional communications, roster updates, and operational bulletins. Restricted to department command and management.')
        .addFields(
          { name: 'Law Enforcement', value: '<@&' + r.leo + '>', inline: true },
          { name: 'Fire & EMS', value: '<@&' + r.fireDept + '>', inline: true },
          { name: 'Transportation', value: '<@&' + r.dot + '>', inline: true },
          { name: 'S.W.A.T.', value: '<@&' + r.swat + '>', inline: true },
        )
        .setFooter({ text: 'FSRP:deptupdates:panel  ·  Operations  ·  Florida State Roleplay' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    case 'whitelist': {
      const e = new EmbedBuilder()
        .setColor(P.teal)
        .setAuthor({ name: 'Florida State Roleplay  ·  Private Server Access', iconURL: guild.iconURL() || undefined })
        .setTitle('Whitelist — Access Granted')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('Your application has been approved. You now hold access to FSRP private game servers.')
        .addFields(
          { name: 'Session Announcements', value: '<#' + config.channels.sessionAnnouncements + '>', inline: true },
          { name: 'Session Pings', value: '<#' + config.channels.selfRoles + '>', inline: true },
          { name: 'Notice', value: 'Whitelist may be revoked for violations without prior notice.', inline: false },
        )
        .setFooter({ text: 'FSRP:whitelist:panel  ·  Florida State Roleplay' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    case 'iahandbook': {
      const e = new EmbedBuilder()
        .setColor(P.violet)
        .setAuthor({ name: 'Florida State Roleplay  ·  Internal Affairs Division', iconURL: guild.iconURL() || undefined })
        .setTitle('Internal Affairs — Mandate & Procedure')
        .setThumbnail(guild.iconURL() || null)
        .setDescription('IA operates as an independent oversight body. All proceedings are confidential. File reports via the ticket system — not direct message.')
        .addFields(
          { name: 'Division Personnel', value:
              '<@&' + r.iaDirector + '>  Director\n' +
              '<@&' + r.internalAffairs + '>  Investigator\n' +
              '<@&' + r.trialIA + '>  Probationary', inline: true },
          { name: 'Filing a Report', value:
              '1. Ticket → <#' + config.channels.support + '>\n' +
              '2. Mark as IA referral\n' +
              '3. Attach evidence\n' +
              '4. Response within 24h', inline: true },
          { name: 'False Reports', value: 'Filing a malicious IA report may result in permanent removal.', inline: false },
        )
        .setFooter({ text: 'FSRP:iahandbook:panel  ·  Internal Affairs  ·  Florida State Roleplay' })
        .setTimestamp();
      await send([e], []);
      break;
    }
    default:
      console.warn('[AutoSetup] repostPanel: unknown panelId:', panelId);
  }
}

module.exports = { run, repostPanel };
