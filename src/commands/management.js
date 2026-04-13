// management.js — Management command group
  // Covers: staff discipline (promote/demote/fire/strike/warn), partnerships, server management.
  // All actions DM the affected member with a professional embed.
  'use strict';

  const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
  } = require('discord.js');
  const config = require('../config');
  const perms  = require('../utils/permissions');
  const db     = require('../utils/discordDb');
  const erlc   = require('../utils/erlc');

  module.exports = {
    data: new SlashCommandBuilder()
      .setName('management')
      .setDescription('Management commands — staff discipline, partnerships, and server management.')

      // ── /management staff ──────────────────────────────────
      .addSubcommandGroup(group => group
        .setName('staff')
        .setDescription('Staff discipline and management actions.')
        .addSubcommand(sub => sub
          .setName('promote')
          .setDescription('Promote a staff member to a new role.')
          .addUserOption(o => o.setName('member').setDescription('Staff member').setRequired(true))
          .addRoleOption(o => o.setName('new_role').setDescription('Role to grant').setRequired(true))
          .addRoleOption(o => o.setName('old_role').setDescription('Role to remove (previous rank)').setRequired(false))
          .addStringOption(o => o.setName('note').setDescription('Promotion note').setRequired(false))
        )
        .addSubcommand(sub => sub
          .setName('demote')
          .setDescription('Demote a staff member.')
          .addUserOption(o => o.setName('member').setDescription('Staff member').setRequired(true))
          .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
          .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('fire')
          .setDescription('Remove a member from staff entirely.')
          .addUserOption(o => o.setName('member').setDescription('Member to fire').setRequired(true))
          .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('strike')
          .setDescription('Issue a formal strike to a staff member.')
          .addUserOption(o => o.setName('member').setDescription('Staff member').setRequired(true))
          .addStringOption(o => o.setName('level').setDescription('Strike level').setRequired(true)
            .addChoices({ name: 'Strike 1 — Formal Warning', value: '1' }, { name: 'Strike 2 — Demotion/Suspension', value: '2' }, { name: 'Strike 3 — Removal', value: '3' }))
          .addStringOption(o => o.setName('reason').setDescription('Reason for strike').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('warn')
          .setDescription('Issue a formal warning to a staff member (below strike level).')
          .addUserOption(o => o.setName('member').setDescription('Staff member').setRequired(true))
          .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('unstrike')
          .setDescription('Expunge a strike from a staff member.')
          .addUserOption(o => o.setName('member').setDescription('Staff member').setRequired(true))
          .addStringOption(o => o.setName('level').setDescription('Strike level to remove').setRequired(true)
            .addChoices({ name: 'Strike 1', value: '1' }, { name: 'Strike 2', value: '2' }, { name: 'Strike 3', value: '3' }))
          .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('roster')
          .setDescription('Show the current in-game staff roster from ERLC.')
        )
      )

      // ── /management server ──────────────────────────────────
      .addSubcommandGroup(group => group
        .setName('server')
        .setDescription('Server management actions.')
        .addSubcommand(sub => sub
          .setName('lockdown')
          .setDescription('Post a server lockdown notice.')
          .addStringOption(o => o.setName('reason').setDescription('Reason for lockdown').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('announce')
          .setDescription('Post a server announcement.')
          .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
          .addStringOption(o => o.setName('message').setDescription('Content').setRequired(true))
          .addBooleanOption(o => o.setName('ping').setDescription('Ping staff?').setRequired(false))
        )
      )

      // ── /management partnership ─────────────────────────────
      .addSubcommandGroup(group => group
        .setName('partnership')
        .setDescription('Manage server partnerships.')
        .addSubcommand(sub => sub
          .setName('add')
          .setDescription('Add a new partnership.')
          .addStringOption(o => o.setName('name').setDescription('Partner server name').setRequired(true))
          .addStringOption(o => o.setName('description').setDescription('Partnership description').setRequired(true))
        )
        .addSubcommand(sub => sub
          .setName('list')
          .setDescription('List all active partnerships.')
        )
        .addSubcommand(sub => sub
          .setName('remove')
          .setDescription('Remove a partnership.')
          .addStringOption(o => o.setName('name').setDescription('Partner name').setRequired(true))
        )
      ),

    async execute(interaction) {
      if (!perms.isManagement(interaction.member)) {
        return perms.denyPermission(interaction, 'Management');
      }

      const group = interaction.options.getSubcommandGroup();
      const sub   = interaction.options.getSubcommand();

      if (group === 'staff') {
        if (sub === 'promote')  return handlePromote(interaction);
        if (sub === 'demote')   return handleDemote(interaction);
        if (sub === 'fire')     return handleFire(interaction);
        if (sub === 'strike')   return handleStrike(interaction);
        if (sub === 'warn')     return handleWarn(interaction);
        if (sub === 'unstrike') return handleUnstrike(interaction);
        if (sub === 'roster')   return handleRoster(interaction);
      }

      if (group === 'server') {
        if (sub === 'lockdown') return handleLockdown(interaction);
        if (sub === 'announce') return handleAnnounce(interaction);
      }

      if (group === 'partnership') {
        if (sub === 'add')    return handlePartnerAdd(interaction);
        if (sub === 'list')   return handlePartnerList(interaction);
        if (sub === 'remove') return handlePartnerRemove(interaction);
      }
    },
  };

  // ── Helpers ───────────────────────────────────────────────

  async function sendLog(interaction, embed) {
    const ch = interaction.guild.channels.cache.get(config.channels.logs);
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
  }

  async function dmMember(member, embed) {
    try {
      await member.user.send({ embeds: [embed] });
      return true;
    } catch {
      return false; // DMs disabled — silently continue
    }
  }

  // ── Staff Actions ─────────────────────────────────────────

  async function handlePromote(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target  = interaction.options.getMember('member');
    const newRole = interaction.options.getRole('new_role');
    const oldRole = interaction.options.getRole('old_role');
    const note    = interaction.options.getString('note') || 'No note provided.';

    if (!target) return interaction.editReply({ content: 'Member not found in this server.' });

    try {
      if (oldRole) await target.roles.remove(oldRole);
      await target.roles.add(newRole);
    } catch (e) {
      return interaction.editReply({ content: 'Failed to modify roles: ' + e.message + '. Ensure the bot role is above the target role.' });
    }

    // Fetch Roblox username
    let robloxName = 'Unknown';
    try {
      const verCh = interaction.guild.channels.cache.get(config.channels.verifyDatabase);
      if (verCh) {
        const { users } = await db.getVerifyDb(verCh);
        const entry = users.find(u => u.discordId === target.id && u.status === 'active');
        if (entry) robloxName = entry.robloxUsername;
      }
    } catch {}

    const ts = Math.floor(Date.now() / 1000);
    const promoEmbed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('Staff Promotion — Florida State Roleplay')
      .setDescription(
        'Congratulations, ' + target.toString() + '!\n\n' +
        'You have been promoted to **' + newRole.name + '** in Florida State Roleplay.\n\n' +
        '> ' + note
      )
      .addFields(
        { name: 'Staff Member', value: target.toString() + ' (' + target.user.tag + ')', inline: true },
        { name: 'Roblox',       value: robloxName,                                       inline: true },
        { name: 'New Role',     value: newRole.toString(),                                inline: true },
        { name: 'Promoted By',  value: interaction.user.toString(),                       inline: true },
        { name: 'Date',         value: '<t:' + ts + ':F>',                                inline: true },
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();

    // Post in promotion channel
    const promoCh = interaction.guild.channels.cache.get(config.channels.staffPromotion);
    if (promoCh) await promoCh.send({ embeds: [promoEmbed] }).catch(() => {});

    // DM the member
    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('Congratulations! You have been promoted.')
      .setDescription(
        'You have been promoted to **' + newRole.name + '** in **Florida State Roleplay**.\n\n' +
        '> ' + note + '\n\n' +
        'Your new role has been assigned. Continue to uphold FSRP standards.'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    const dmSent = await dmMember(target, dmEmbed);

    // Log
    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Promotion Log')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'New Role', value: newRole.name, inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Note', value: note, inline: false },
      )
      .setTimestamp()
    );

    return interaction.editReply({ content: target.displayName + ' promoted to ' + newRole.name + '.' + (dmSent ? '' : ' (DMs disabled — could not notify them)') });
  }

  async function handleDemote(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const role   = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.editReply({ content: 'Member not found.' });
    await target.roles.remove(role).catch(e => { throw new Error('Failed to remove role: ' + e.message); });

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Staff Demotion — Florida State Roleplay')
      .setDescription(
        'You have been **demoted** in Florida State Roleplay.\n\n' +
        '**Role Removed:** ' + role.name + '\n' +
        '**Reason:** ' + reason + '\n\n' +
        '*If you believe this was in error, open a ticket.*'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    const dmSent = await dmMember(target, dmEmbed);

    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Demotion Log')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'Role Removed', value: role.name, inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp()
    );

    return interaction.editReply({ content: target.displayName + ' demoted — ' + role.name + ' removed.' + (dmSent ? '' : ' (DMs disabled)') });
  }

  async function handleFire(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.editReply({ content: 'Member not found.' });

    // Remove all staff roles, add former staff
    const removedRoles = [];
    for (const roleId of config.staffRoles) {
      if (target.roles.cache.has(roleId)) {
        await target.roles.remove(roleId).catch(() => {});
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) removedRoles.push(role.name);
      }
    }
    await target.roles.add(config.roles.formerStaff).catch(() => {});

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('Staff Removal — Florida State Roleplay')
      .setDescription(
        'You have been **removed from staff** in Florida State Roleplay.\n\n' +
        '**Reason:** ' + reason + '\n\n' +
        '*If you believe this was in error, you may appeal in <#' + config.channels.banAppeals + '>.*'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    const dmSent = await dmMember(target, dmEmbed);

    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('Staff Removal Log')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Roles Removed', value: removedRoles.join(', ') || 'None', inline: false },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp()
    );

    const promoChannel = interaction.guild.channels.cache.get(config.channels.staffPromotion);
    if (promoChannel) {
      await promoChannel.send({ embeds: [new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('Staff Member Removed')
        .addFields(
          { name: 'Member', value: target.toString(), inline: true },
          { name: 'By', value: interaction.user.toString(), inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
        .setTimestamp()
      ] }).catch(() => {});
    }

    return interaction.editReply({ content: target.displayName + ' removed from staff.' + (dmSent ? '' : ' (DMs disabled)') });
  }

  async function handleStrike(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const level  = interaction.options.getString('level');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.editReply({ content: 'Member not found.' });

    // Strike 3 = apply suspended role; Strike 2 = apply under investigation
    if (level === '3') await target.roles.add(config.roles.suspendedStaff).catch(() => {});
    if (level === '2') await target.roles.add(config.roles.underInvestigation).catch(() => {});

    const consequences = {
      '1': 'Formal warning — one more strike may result in demotion.',
      '2': 'Demotion or suspension may follow. You have been marked Under Investigation.',
      '3': 'You are suspended pending review. A third strike typically results in removal.',
    };

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('Strike ' + level + ' — Florida State Roleplay')
      .setDescription(
        'You have received a **Strike ' + level + '** in Florida State Roleplay.\n\n' +
        '**Reason:** ' + reason + '\n\n' +
        '**Consequence:** ' + consequences[level] + '\n\n' +
        '*If you believe this was issued in error, open a ticket.*'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    const dmSent = await dmMember(target, dmEmbed);

    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('Strike ' + level + ' Issued')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'Strike', value: 'Strike ' + level, inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp()
    );

    return interaction.editReply({ content: 'Strike ' + level + ' issued to ' + target.displayName + '.' + (dmSent ? '' : ' (DMs disabled)') });
  }

  async function handleWarn(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.editReply({ content: 'Member not found.' });

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Formal Warning — Florida State Roleplay')
      .setDescription(
        'You have received a **formal warning** from FSRP Management.\n\n' +
        '**Reason:** ' + reason + '\n\n' +
        'This is an official warning recorded on your staff file. Continued violations may result in a strike.\n\n' +
        '*If you believe this was issued in error, open a ticket.*'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    const dmSent = await dmMember(target, dmEmbed);

    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Formal Warning Issued')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp()
    );

    return interaction.editReply({ content: 'Formal warning issued to ' + target.displayName + '.' + (dmSent ? '' : ' (DMs disabled)') });
  }

  async function handleUnstrike(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const level  = interaction.options.getString('level');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.editReply({ content: 'Member not found.' });

    // Remove associated status roles
    if (level === '3') await target.roles.remove(config.roles.suspendedStaff).catch(() => {});
    if (level === '2') await target.roles.remove(config.roles.underInvestigation).catch(() => {});

    const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Strike Expunged — Florida State Roleplay')
      .setDescription(
        'Your **Strike ' + level + '** has been expunged from your staff record.\n\n' +
        '**Reason:** ' + reason
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();
    await dmMember(target, dmEmbed);

    await sendLog(interaction, new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Strike ' + level + ' Expunged')
      .addFields(
        { name: 'Member', value: target.toString() + ' (' + target.id + ')', inline: true },
        { name: 'Strike', value: 'Strike ' + level, inline: true },
        { name: 'By', value: interaction.user.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp()
    );

    return interaction.editReply({ content: 'Strike ' + level + ' expunged from ' + target.displayName + '.' });
  }

  async function handleRoster(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const snapshot = erlc.getCachedSnapshot();
    const age      = erlc.getCacheAge();

    if (!snapshot) return interaction.editReply({ content: 'No ERLC data available yet — wait for the next 20s heartbeat.' });

    const staff = (snapshot.players || []).filter(p => p._permission && p._permission !== 'None' && p._permission !== 'Normal');

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('In-Game Staff Roster (' + staff.length + ')')
      .setDescription(
        staff.length
          ? staff.map(p => '**' + p._username + '** — ' + p._permission + (p._callsign ? ' [' + p._callsign + ']' : '')).join('\n')
          : 'No staff currently in-game.'
      )
      .setFooter({ text: 'FSRP Management • data ' + age + 's ago — Florida State Roleplay' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // ── Server Actions ────────────────────────────────────────

  async function handleLockdown(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const reason = interaction.options.getString('reason');

    const ch = interaction.guild.channels.cache.get(config.channels.staffAnnouncement);
    const embed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('SERVER LOCKDOWN')
      .setDescription(
        '**Florida State Roleplay is currently under lockdown.**\n\n' +
        '**Reason:** ' + reason + '\n\n' +
        'All sessions and activities are suspended until further notice. Stand by for updates.'
      )
      .setFooter({ text: 'FSRP Management — Florida State Roleplay' })
      .setTimestamp();

    if (ch) await ch.send({ content: '<@&' + config.roles.gameStaff + '>', embeds: [embed] }).catch(() => {});
    await interaction.editReply({ content: 'Lockdown notice posted in <#' + (ch ? ch.id : 'unknown') + '>.' });
  }

  async function handleAnnounce(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const title   = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const ping    = interaction.options.getBoolean('ping') ?? false;

    const ch = interaction.guild.channels.cache.get(config.channels.staffAnnouncement);
    if (!ch) return interaction.editReply({ content: 'Staff announcement channel not found.' });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(title)
      .setDescription(message)
      .setFooter({ text: 'FSRP Management — Posted by ' + interaction.user.tag })
      .setTimestamp();

    const content = ping ? '<@&' + config.roles.gameStaff + '>' : null;
    await ch.send({ content: content, embeds: [embed] });
    await interaction.editReply({ content: 'Announcement posted in <#' + ch.id + '>.' });
  }

  // ── Partnership Actions ───────────────────────────────────

  let partnerships = [];

  async function loadPartnerships(guild) {
    if (partnerships.length > 0) return;
    try {
      const ch = guild.channels.cache.get(config.channels.partnerships);
      if (!ch) return;
      const msgs = await ch.messages.fetch({ limit: 20 });
      const stored = [...msgs.values()].find(m =>
        m.author.bot && m.embeds[0]?.footer?.text?.includes('PARTNER_DB')
      );
      if (stored) partnerships = JSON.parse(stored.embeds[0].description || '[]');
    } catch {}
  }

  async function handlePartnerAdd(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await loadPartnerships(interaction.guild);

    const name = interaction.options.getString('name');
    const desc = interaction.options.getString('description');
    partnerships.push({ name, desc, addedBy: interaction.user.tag, date: new Date().toISOString() });

    await refreshPartnershipBoard(interaction.guild);
    await interaction.editReply({ content: 'Partnership added: **' + name + '**.' });
  }

  async function handlePartnerList(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await loadPartnerships(interaction.guild);

    if (!partnerships.length) return interaction.editReply({ content: 'No active partnerships.' });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Active Partnerships (' + partnerships.length + ')')
      .setDescription(partnerships.map((p, i) => (i + 1) + '. **' + p.name + '** — ' + p.desc).join('\n'))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  async function handlePartnerRemove(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await loadPartnerships(interaction.guild);

    const name = interaction.options.getString('name').toLowerCase();
    const before = partnerships.length;
    partnerships = partnerships.filter(p => !p.name.toLowerCase().includes(name));

    if (partnerships.length === before) return interaction.editReply({ content: 'No partnership found matching "' + name + '".' });

    await refreshPartnershipBoard(interaction.guild);
    await interaction.editReply({ content: 'Partnership removed.' });
  }

  async function refreshPartnershipBoard(guild) {
    try {
      const ch = guild.channels.cache.get(config.channels.partnerships);
      if (!ch) return;
      const msgs = await ch.messages.fetch({ limit: 20 });
      const stored = [...msgs.values()].find(m =>
        m.author.bot && m.embeds[0]?.footer?.text?.includes('PARTNER_DB')
      );
      const embed = new EmbedBuilder()
        .setColor(config.colors.blue)
        .setTitle('FSRP Active Partnerships')
        .setDescription(JSON.stringify(partnerships))
        .setFooter({ text: 'PARTNER_DB — DO NOT DELETE' })
        .setTimestamp();
      if (stored) await stored.edit({ embeds: [embed] });
      else await ch.send({ embeds: [embed] });
    } catch (e) {
      console.warn('[Management] Partnership board error:', e.message);
    }
  }
  