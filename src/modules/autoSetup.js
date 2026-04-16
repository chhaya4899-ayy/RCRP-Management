// autoSetup.js — FSRP Panel Configuration
  // Runs on every bot startup. Posts OR updates all permanent panels (upsert by footer tag).
  'use strict';

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const config       = require('../config');
  const verification = require('./verification');
  const applications = require('./applications');

  // ── Colour palette ────────────────────────────────────────────────────────────
  const C = {
    ink:    0x0D1117,
    steel:  0x161B22,
    brand:  0x1B6FA8,
    gold:   0x9A7D2E,
    navy:   0x0F2240,
    deep:   0x1A1C1F,
    purple: 0x2D1B69,
    teal:   0x0D5C63,
    subtle: 0x21262D,
  };

  let _client = null;

  // ── Upsert: edit existing tagged message or post new ─────────────────────────
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
      if (existing) {
        await existing.edit(payload);
        console.log('[AutoSetup] Updated:', tag, 'in #' + ch.name);
      } else {
        await ch.send(payload);
        console.log('[AutoSetup] Posted:', tag, 'in #' + ch.name);
      }
    } catch (e) {
      console.warn('[AutoSetup] Error in #' + (ch ? ch.name : '?') + ':', e.message);
    }
  }

  function getCh(guild, id) { return id ? guild.channels.cache.get(id) : null; }

  // ── 1. Verification ───────────────────────────────────────────────────────────
  async function runVerify(guild) {
    const ch = getCh(guild, config.channels.verification);
    if (!ch) { console.warn('[AutoSetup] #verification not found'); return; }
    await verification.postVerifyPanel(ch).catch(e => console.warn('[AutoSetup] Verify:', e.message));
  }

  // ── 2. Applications ───────────────────────────────────────────────────────────
  async function runApplications(guild) {
    const ch = getCh(guild, config.channels.applications);
    if (!ch) { console.warn('[AutoSetup] #applications not found'); return; }
    await applications.postApplicationPanel(ch).catch(e => console.warn('[AutoSetup] Apps:', e.message));
  }

  // ── 3. Self Roles ─────────────────────────────────────────────────────────────
  async function runSelfRoles(guild) {
    const ch = getCh(guild, config.channels.selfRoles);
    if (!ch) return;
    const r = config.roles;
    const embed = new EmbedBuilder()
      .setColor(C.navy)
      .setAuthor({ name: 'Florida State Roleplay  ·  Role Assignment', iconURL: guild.iconURL() || undefined })
      .setTitle('Department & Notification Roles')
      .setDescription(
        '> Select your department and configure your notification preferences below.\n' +
        '> Activating a role a second time will remove it from your profile.\n\n' +
        '**Departments**\n' +
        `◆  <@&${r.leo}>  —  Law Enforcement Officer\n` +
        `◆  <@&${r.fireDept}>  —  Fire & Emergency Medical Services\n` +
        `◆  <@&${r.dot}>  —  Department of Transportation\n` +
        `◆  <@&${r.civilian}>  —  Civilian Roleplay\n\n` +
        '**Notification Preferences**\n' +
        `◆  <@&${r.sessionPing}>  —  Live session announcements\n` +
        `◆  <@&${r.giveawayPing}>  —  Giveaway events\n` +
        `◆  <@&${r.mediaPing}>  —  Media team releases\n` +
        `◆  <@&${r.ssuPing}>  —  SSU unit callouts`
      )
      .setFooter({ text: 'FSRP:selfroles:panel  ·  Florida State Roleplay' })
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
      new ButtonBuilder().setCustomId('selfrole:' + r.mediaPing).setLabel('Media').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('selfrole:' + r.ssuPing).setLabel('SSU').setStyle(ButtonStyle.Success),
    );
    await upsert(ch, 'FSRP:selfroles:panel', [embed], [deptRow, pingRow]);
  }

  // ── 4. Staff Review ───────────────────────────────────────────────────────────
  async function runReviewPanel(guild) {
    const ch = getCh(guild, config.channels.staffReview);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(C.gold)
      .setAuthor({ name: 'Florida State Roleplay  ·  Internal Review System', iconURL: guild.iconURL() || undefined })
      .setTitle('Staff Performance Review')
      .setDescription(
        '> Submit a formal evaluation of any Florida State Roleplay staff member.\n' +
        '> All submissions are treated with strict confidentiality and reviewed exclusively by management.\n\n' +
        '**Submission Guidelines**\n' +
        '◆  Include specific dates, times, and a clear account of the incident\n' +
        '◆  Constructive and positive reviews are equally valued\n' +
        '◆  Submitting a knowingly false report is a sanctionable offence\n\n' +
        '-# Reviews are used to inform HR decisions, promotions, and disciplinary action.'
      )
      .setFooter({ text: 'FSRP:review:panel  ·  Florida State Roleplay' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leave_review').setLabel('Submit Review').setStyle(ButtonStyle.Primary),
    );
    await upsert(ch, 'FSRP:review:panel', [embed], [row]);
  }

  // ── 5. Welcome ────────────────────────────────────────────────────────────────
  async function runWelcome(guild) {
    const ch = getCh(guild, config.channels.welcome);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(C.brand)
      .setAuthor({ name: 'Florida State Roleplay', iconURL: guild.iconURL() || undefined })
      .setTitle('Welcome to Florida State Roleplay')
      .setDescription(
        `> You are joining a **${guild.memberCount.toLocaleString()}-member** professional ERLC community.\n` +
        `> FSRP operates as a serious, whitelisted server with a commitment to immersive and realistic roleplay.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .addFields(
        { name: '01  —  Verify',      value: 'Link your Roblox account in <#' + config.channels.verification + '> to unlock full server access.', inline: false },
        { name: '02  —  Select Roles', value: 'Choose your department and notification preferences in <#' + config.channels.selfRoles + '>.', inline: false },
        { name: '03  —  Read the Rules', value: '<#' + config.channels.discordRules + '>  Discord Server Rules\n<#' + config.channels.gameRules + '>  In-Game Rules\n<#' + config.channels.leoRules + '>  LEO Division Rules', inline: false },
        { name: '04  —  Join Sessions', value: 'Session announcements are posted in <#' + config.channels.sessionAnnouncements + '>. General discussion: <#' + config.channels.general + '>.', inline: false },
        { name: 'Assistance',          value: 'Support tickets: <#' + config.channels.support + '>  ·  Appeals: <#' + config.channels.banAppeals + '>', inline: false },
      )
      .setFooter({ text: 'FSRP:welcome:panel  ·  Florida State Roleplay' })
      .setTimestamp();
    await upsert(ch, 'FSRP:welcome:panel', [embed], []);
  }

  // ── 6. Commands ───────────────────────────────────────────────────────────────
  async function runCommandsHelp(guild) {
    const ch = getCh(guild, config.channels.commands);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(C.ink)
      .setAuthor({ name: 'Florida State Roleplay  ·  Command Reference', iconURL: guild.iconURL() || undefined })
      .setTitle('Bot Command Directory')
      .setDescription('> `[Staff]` — Requires a Staff role  ·  `[Mgmt]` — Requires Management or HR  ·  No tag — Available to all members\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        { name: 'Community',           value: '`/member mystats`  Your in-game statistics\n`/member where`  Your last recorded location\n`/member vouch @user`  Vouch for a community member\n`/rep give @user`  Award +1 community reputation\n`/rep view`  View a reputation profile', inline: false },
        { name: '[Staff]  ERLC',       value: '`/game overview`  Full live server snapshot\n`/game players`  Current player list\n`/game staff`  Active staff roster\n`/game run <cmd>`  Execute an in-game command', inline: false },
        { name: '[Staff]  Operations', value: '`/staff warn @member`  Issue a formal warning\n`/staff callout`  Post a department callout\n`/loa request`  Submit a leave of absence\n`/promote @member`  Process a promotion or demotion', inline: false },
        { name: '[Mgmt]  Administration', value: '`/management strike/warn/note/fire`  Disciplinary actions\n`/intel <username>`  Comprehensive player intelligence report\n`/broadcast <type>`  Post a styled server announcement\n`/fsrp refresh`  Force all panels to re-render', inline: false },
      )
      .setFooter({ text: 'FSRP:commands:panel  ·  FSRP Management Bot' })
      .setTimestamp();
    await upsert(ch, 'FSRP:commands:panel', [embed], []);
  }

  // ── 7. Staff Rules ────────────────────────────────────────────────────────────
  async function runStaffRules(guild) {
    const ch = getCh(guild, config.channels.staffRules);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(C.steel)
      .setAuthor({ name: 'Florida State Roleplay  ·  Staff Conduct Policy', iconURL: guild.iconURL() || undefined })
      .setTitle('Staff Code of Conduct')
      .setDescription(
        '> All FSRP staff are representatives of the organisation and are held to an elevated standard of conduct.\n' +
        '> Non-compliance with any article of this code will result in disciplinary action up to and including immediate removal.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .addFields(
        { name: 'Article I  —  Professionalism',    value: 'Conduct yourself with maturity and respect at all times — in-game, within Discord, and in any public-facing capacity.', inline: false },
        { name: 'Article II  —  Authority Abuse',   value: 'The use of staff permissions for personal benefit, entertainment, or outside the scope of your role constitutes an immediate strike offence.', inline: false },
        { name: 'Article III  —  Confidentiality',  value: 'Internal HR decisions, disciplinary records, and staff communications are strictly confidential. Disclosure to unauthorised parties is prohibited.', inline: false },
        { name: 'Article IV  —  Chain of Command',  value: 'All matters must be escalated through appropriate channels. Acting unilaterally on matters exceeding your authority is not permitted.', inline: false },
        { name: 'Article V  —  Availability',       value: 'Staff members are expected to maintain consistent activity. Extended absences must be formalised via the LOA system prior to the absence where possible.', inline: false },
        { name: 'Article VI  —  Impartiality',      value: 'All community members are to be treated equitably regardless of their rank, affiliation, or personal relationship with the staff member concerned.', inline: false },
        { name: 'Article VII  —  Action Logging',   value: 'Every staff action must be recorded in the appropriate log channel at the time of the action. Unlogged actions may be categorised as abuse.', inline: false },
        { name: 'Disciplinary Scale',               value: '**Strike I** — Formal written warning, notation on record\n**Strike II** — Demotion, suspension, or restricted duties\n**Strike III** — Immediate removal from staff', inline: false },
      )
      .setFooter({ text: 'FSRP:staffrules:panel  ·  Florida State Roleplay Management' })
      .setTimestamp();
    await upsert(ch, 'FSRP:staffrules:panel', [embed], []);
  }

  // ── 8. Department Updates ─────────────────────────────────────────────────────
  async function runDeptUpdates(guild) {
    const ch = getCh(guild, config.channels.deptUpdates);
    if (!ch) return;
    const r = config.roles;
    const embed = new EmbedBuilder()
      .setColor(C.teal)
      .setAuthor({ name: 'Florida State Roleplay  ·  Operations', iconURL: guild.iconURL() || undefined })
      .setTitle('Department Updates')
      .setDescription(
        '> This channel is reserved for official departmental communications, roster changes, and operational updates.\n' +
        '> Posting access is restricted to department leadership and management personnel.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .addFields(
        { name: 'Law Enforcement',    value: '<@&' + r.leo      + '>', inline: true },
        { name: 'Fire & EMS',         value: '<@&' + r.fireDept + '>', inline: true },
        { name: 'Transportation',     value: '<@&' + r.dot      + '>', inline: true },
        { name: 'S.W.A.T.',          value: '<@&' + r.swat     + '>', inline: true },
      )
      .setFooter({ text: 'FSRP:deptupdates:panel  ·  Florida State Roleplay' })
      .setTimestamp();
    await upsert(ch, 'FSRP:deptupdates:panel', [embed], []);
  }

  // ── 9. Whitelist Chat ─────────────────────────────────────────────────────────
  async function runWhitelistChat(guild) {
    const ch = getCh(guild, config.channels.whitelistChat);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(C.teal)
      .setAuthor({ name: 'Florida State Roleplay  ·  Whitelist Access', iconURL: guild.iconURL() || undefined })
      .setTitle('Whitelisted Member Channel')
      .setDescription(
        '> Your application has been approved and you have been granted access to Florida State Roleplay private servers.\n\n' +
        '**Access Information**\n' +
        `◆  Session announcements are posted in <#${config.channels.sessionAnnouncements}>\n` +
        `◆  Enable session alerts via <#${config.channels.selfRoles}>\n` +
        `◆  All standard server rules apply within private sessions without exception\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '-# Whitelist access may be revoked for rule violations without prior notice. Conduct yourself accordingly.'
      )
      .setFooter({ text: 'FSRP:whitelist:panel  ·  Florida State Roleplay' })
      .setTimestamp();
    await upsert(ch, 'FSRP:whitelist:panel', [embed], []);
  }

  // ── 10. IA Handbook ───────────────────────────────────────────────────────────
  async function runIAHandbook(guild) {
    const ch = getCh(guild, config.channels.iaHandbook);
    if (!ch) return;
    const r = config.roles;
    const embed = new EmbedBuilder()
      .setColor(C.purple)
      .setAuthor({ name: 'Florida State Roleplay  ·  Internal Affairs Division', iconURL: guild.iconURL() || undefined })
      .setTitle('Internal Affairs — Mandate & Procedures')
      .setDescription(
        '> The Internal Affairs Division operates independently to uphold staff accountability, procedural fairness, and organisational integrity.\n' +
        '> All IA proceedings are conducted in strict confidence.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .addFields(
        { name: 'Division Personnel', value:
            '<@&' + r.iaDirector      + '>  —  Director, Internal Affairs\n' +
            '<@&' + r.internalAffairs + '>  —  Investigator, Internal Affairs\n' +
            '<@&' + r.trialIA         + '>  —  Probationary Investigator', inline: false },
        { name: 'Filing a Report', value:
            '**1.**  Open a support ticket in <#' + config.channels.support + '>\n' +
            '**2.**  Clearly state that the matter is an Internal Affairs referral\n' +
            '**3.**  Provide all available supporting evidence (screenshots, recordings, logs)\n' +
            '**4.**  An IA officer will contact you confidentially within 24 hours', inline: false },
        { name: 'Jurisdiction', value: 'IA investigates staff misconduct, authority abuse, procedural violations, and inter-staff disputes. Community complaints against staff should also be directed here.', inline: false },
        { name: 'Notice on False Reports', value: 'Submitting a knowingly false or malicious IA report is treated as a serious disciplinary matter and may result in a permanent removal from the community.', inline: false },
      )
      .setFooter({ text: 'FSRP:iahandbook:panel  ·  Florida State Roleplay Internal Affairs' })
      .setTimestamp();
    await upsert(ch, 'FSRP:iahandbook:panel', [embed], []);
  }

  // ── Main runner ───────────────────────────────────────────────────────────────
  async function run(client, guild) {
    _client = client;
    console.log('[AutoSetup] Configuring ' + guild.name + ' (' + guild.memberCount + ' members)...');
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
    console.log('[AutoSetup] All panels configured.');
  }

  // ── Panel repost — fresh send to any target channel ──────────────────────────
  async function repostPanel(guild, panelId, targetChannel) {
    const r = config.roles;
    const _verification  = require('./verification');
    const _applications  = require('./applications');

    const send = (embeds, components) =>
      targetChannel.send({ embeds, components: components || [] }).catch(() => {});

    switch (panelId) {

      case 'verification':
        await _verification.postVerifyPanel(targetChannel).catch(() => {});
        break;

      case 'applications':
        await _applications.postApplicationPanel(targetChannel).catch(() => {});
        break;

      case 'selfroles': {
        const embed = new EmbedBuilder()
          .setColor(C.navy)
          .setAuthor({ name: 'Florida State Roleplay  ·  Role Assignment', iconURL: guild.iconURL() || undefined })
          .setTitle('Department & Notification Roles')
          .setDescription(
            '> Select your department and configure your notification preferences below.\n' +
            '> Activating a role a second time will remove it from your profile.\n\n' +
            '**Departments**\n' +
            `◆  <@&${r.leo}>  —  Law Enforcement Officer\n` +
            `◆  <@&${r.fireDept}>  —  Fire & Emergency Medical Services\n` +
            `◆  <@&${r.dot}>  —  Department of Transportation\n` +
            `◆  <@&${r.civilian}>  —  Civilian Roleplay\n\n` +
            '**Notification Preferences**\n' +
            `◆  <@&${r.sessionPing}>  —  Live session announcements\n` +
            `◆  <@&${r.giveawayPing}>  —  Giveaway events\n` +
            `◆  <@&${r.mediaPing}>  —  Media team releases\n` +
            `◆  <@&${r.ssuPing}>  —  SSU unit callouts`
          )
          .setFooter({ text: 'FSRP:selfroles:panel  ·  Florida State Roleplay' })
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
          new ButtonBuilder().setCustomId('selfrole:' + r.mediaPing).setLabel('Media').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('selfrole:' + r.ssuPing).setLabel('SSU').setStyle(ButtonStyle.Success),
        );
        await send([embed], [deptRow, pingRow]);
        break;
      }

      case 'staffreview': {
        const embed = new EmbedBuilder()
          .setColor(C.gold)
          .setAuthor({ name: 'Florida State Roleplay  ·  Internal Review System', iconURL: guild.iconURL() || undefined })
          .setTitle('Staff Performance Review')
          .setDescription(
            '> Submit a formal evaluation of any Florida State Roleplay staff member.\n' +
            '> All submissions are treated with strict confidentiality and reviewed exclusively by management.\n\n' +
            '**Submission Guidelines**\n' +
            '◆  Include specific dates, times, and a clear account of the incident\n' +
            '◆  Constructive and positive reviews are equally valued\n' +
            '◆  Submitting a knowingly false report is a sanctionable offence\n\n' +
            '-# Reviews are used to inform HR decisions, promotions, and disciplinary action.'
          )
          .setFooter({ text: 'FSRP:review:panel  ·  Florida State Roleplay' })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('leave_review').setLabel('Submit Review').setStyle(ButtonStyle.Primary),
        );
        await send([embed], [row]);
        break;
      }

      case 'welcome': {
        const embed = new EmbedBuilder()
          .setColor(C.brand)
          .setAuthor({ name: 'Florida State Roleplay', iconURL: guild.iconURL() || undefined })
          .setTitle('Welcome to Florida State Roleplay')
          .setDescription(
            `> You are joining a **${guild.memberCount.toLocaleString()}-member** professional ERLC community.\n` +
            '> FSRP operates as a serious, whitelisted server with a commitment to realistic roleplay.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
          )
          .addFields(
            { name: '01  —  Verify',       value: 'Link your Roblox account in <#' + config.channels.verification + '>.', inline: false },
            { name: '02  —  Select Roles', value: 'Choose your department in <#' + config.channels.selfRoles + '>.', inline: false },
            { name: '03  —  Read Rules',   value: '<#' + config.channels.discordRules + '>  Discord  ·  <#' + config.channels.gameRules + '>  In-Game  ·  <#' + config.channels.leoRules + '>  LEO', inline: false },
            { name: '04  —  Play',         value: 'Sessions: <#' + config.channels.sessionAnnouncements + '>  ·  Chat: <#' + config.channels.general + '>', inline: false },
            { name: 'Support',             value: 'Tickets: <#' + config.channels.support + '>  ·  Appeals: <#' + config.channels.banAppeals + '>', inline: false },
          )
          .setFooter({ text: 'FSRP:welcome:panel  ·  Florida State Roleplay' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      case 'commands': {
        const embed = new EmbedBuilder()
          .setColor(C.ink)
          .setAuthor({ name: 'Florida State Roleplay  ·  Command Reference', iconURL: guild.iconURL() || undefined })
          .setTitle('Bot Command Directory')
          .setDescription('> `[Staff]` — Requires Staff role  ·  `[Mgmt]` — Requires Management\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          .addFields(
            { name: 'Community',              value: '`/member mystats`  `/member where`  `/member vouch`  `/rep give`  `/rep view`', inline: false },
            { name: '[Staff]  ERLC',          value: '`/game overview`  `/game players`  `/game staff`  `/game run <cmd>`', inline: false },
            { name: '[Staff]  Operations',    value: '`/staff warn`  `/staff callout`  `/loa request`  `/promote`', inline: false },
            { name: '[Mgmt]  Administration', value: '`/management`  `/intel`  `/broadcast`  `/fsrp refresh`', inline: false },
          )
          .setFooter({ text: 'FSRP:commands:panel  ·  FSRP Management Bot' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      case 'staffrules': {
        const embed = new EmbedBuilder()
          .setColor(C.steel)
          .setAuthor({ name: 'Florida State Roleplay  ·  Staff Conduct Policy', iconURL: guild.iconURL() || undefined })
          .setTitle('Staff Code of Conduct')
          .setDescription('> Non-compliance results in disciplinary action up to immediate removal.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          .addFields(
            { name: 'Article I  —  Professionalism',   value: 'Conduct yourself with maturity and respect at all times.', inline: false },
            { name: 'Article II  —  Authority Abuse',  value: 'Using staff permissions outside the scope of your role is an immediate strike offence.', inline: false },
            { name: 'Article III  —  Confidentiality', value: 'Internal matters, HR decisions, and disciplinary records are strictly confidential.', inline: false },
            { name: 'Article IV  —  Chain of Command', value: 'Escalate through proper channels. Never act unilaterally beyond your authority.', inline: false },
            { name: 'Article V  —  Availability',      value: 'Maintain consistent activity. Extended absences require a formal LOA submission.', inline: false },
            { name: 'Disciplinary Scale',               value: '**Strike I** — Formal warning\n**Strike II** — Demotion or suspension\n**Strike III** — Removal', inline: false },
          )
          .setFooter({ text: 'FSRP:staffrules:panel  ·  Florida State Roleplay Management' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      case 'deptupdates': {
        const embed = new EmbedBuilder()
          .setColor(C.teal)
          .setAuthor({ name: 'Florida State Roleplay  ·  Operations', iconURL: guild.iconURL() || undefined })
          .setTitle('Department Updates')
          .setDescription('> Reserved for official departmental communications. Posting restricted to department leadership and management.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          .addFields(
            { name: 'Law Enforcement', value: '<@&' + r.leo      + '>', inline: true },
            { name: 'Fire & EMS',      value: '<@&' + r.fireDept + '>', inline: true },
            { name: 'Transportation',  value: '<@&' + r.dot      + '>', inline: true },
            { name: 'S.W.A.T.',       value: '<@&' + r.swat     + '>', inline: true },
          )
          .setFooter({ text: 'FSRP:deptupdates:panel  ·  Florida State Roleplay' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      case 'whitelist': {
        const embed = new EmbedBuilder()
          .setColor(C.teal)
          .setAuthor({ name: 'Florida State Roleplay  ·  Whitelist Access', iconURL: guild.iconURL() || undefined })
          .setTitle('Whitelisted Member Channel')
          .setDescription(
            '> Your application has been approved. You now have access to Florida State Roleplay private servers.\n\n' +
            '◆  Session announcements: <#' + config.channels.sessionAnnouncements + '>\n' +
            '◆  Enable alerts: <#' + config.channels.selfRoles + '>\n\n' +
            '-# Access may be revoked for rule violations without prior notice.'
          )
          .setFooter({ text: 'FSRP:whitelist:panel  ·  Florida State Roleplay' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      case 'iahandbook': {
        const embed = new EmbedBuilder()
          .setColor(C.purple)
          .setAuthor({ name: 'Florida State Roleplay  ·  Internal Affairs Division', iconURL: guild.iconURL() || undefined })
          .setTitle('Internal Affairs — Mandate & Procedures')
          .setDescription('> IA operates independently to uphold staff accountability, procedural fairness, and organisational integrity.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          .addFields(
            { name: 'Division Personnel', value:
                '<@&' + r.iaDirector      + '>  —  Director, Internal Affairs\n' +
                '<@&' + r.internalAffairs + '>  —  Investigator\n' +
                '<@&' + r.trialIA         + '>  —  Probationary Investigator', inline: false },
            { name: 'Filing a Report',   value:
                '**1.**  Open a ticket in <#' + config.channels.support + '>\n' +
                '**2.**  State it is an Internal Affairs referral\n' +
                '**3.**  Provide supporting evidence\n' +
                '**4.**  An officer will contact you within 24 hours', inline: false },
            { name: 'False Reports',     value: 'Filing a false IA report is a serious disciplinary matter and may result in permanent removal.', inline: false },
          )
          .setFooter({ text: 'FSRP:iahandbook:panel  ·  Florida State Roleplay Internal Affairs' })
          .setTimestamp();
        await send([embed], []);
        break;
      }

      default:
        console.warn('[AutoSetup] repostPanel: unknown panelId:', panelId);
    }
  }

  module.exports = { run, repostPanel };
  