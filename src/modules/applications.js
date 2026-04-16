// applications.js — FSRP Application System
  // Private channels · one-at-a-time Q&A · HR decisions · DMs · auto-role

  'use strict';

  const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType, PermissionFlagsBits, OverwriteType,
  } = require('discord.js');
  const config = require('../config');
  const db     = require('../utils/discordDb');
  const ai     = require('../utils/ai');

  // ─────────────────────────────────────────────────────────────────────────────
  // Palette — no generic Discord green/red
  // ─────────────────────────────────────────────────────────────────────────────
  const C = {
    ink:     0x0D1117,   // near-black primary
    steel:   0x161B22,   // secondary dark
    brand:   0x1B6FA8,   // FSRP brand blue
    approve: 0x0D6E6E,   // sophisticated teal  — approved
    deny:    0x7B1818,   // deep crimson        — denied
    hold:    0x7A5C1E,   // dark amber          — on hold
    info:    0x1B3A6B,   // deep navy           — informational
    gold:    0x9A7D2E,   // warm gold           — HR / management
    subtle:  0x21262D,   // subtle dark grey
  };

  // channelId → { discordId, category, answers, step, startedAt, channelId }
  const activeApps = new Map();

  // ─────────────────────────────────────────────────────────────────────────────
  // Application Panel
  // ─────────────────────────────────────────────────────────────────────────────
  async function postApplicationPanel(channel) {
    try {
      const msgs = await channel.messages.fetch({ limit: 20 });
      if ([...msgs.values()].some(m =>
        m.author.id === channel.client.user.id &&
        m.components?.some(r => r.components?.some(c => c.customId?.startsWith('app_category:')))
      )) return;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0x1F6FEB)
      .setAuthor({ name: 'Florida State Roleplay  ·  Human Resources', iconURL: channel.guild.iconURL() || undefined })
      .setTitle('Staff Recruitment — Open Positions')
      .setThumbnail(channel.guild.iconURL() || null)
      .setDescription(
        'Select a division below to begin your application. Applications are assessed by the Directive Team within 24–48 hours. ' +
        'Your Roblox account must be verified before submitting.'
      )
      .addFields(
        { name: 'Requirements',   value: 'Verified Roblox account  ·  No active disciplinary record  ·  Consistent server activity', inline: false },
        { name: 'Process',        value: 'Select division  →  Complete questionnaire  →  Await HR review  →  Decision via DM & results channel', inline: false },
      )
      .setFooter({ text: 'Florida State Roleplay  ·  Human Resources  ·  Applications close without notice' })
      .setTimestamp();

    const cats = config.applicationCategories || [];
    const buttons = cats.map(c =>
      new ButtonBuilder()
        .setCustomId(`app_category:${c.id}`)
        .setLabel(c.label)
        .setStyle(ButtonStyle.Secondary)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    await channel.send({ embeds: [embed], components: rows });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Apply button — show division selector
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleApplyButton(interaction) {
    const member       = interaction.member;
    const verifiedRole = config.roles.verified;
    if (verifiedRole && !member.roles.cache.has(verifiedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Your Roblox account must be verified before applying. Please complete verification first.', ephemeral: true });
    }

    const buttons = config.applicationCategories.map(c =>
      new ButtonBuilder().setCustomId(`app_category:${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary).setEmoji(c.emoji)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(C.ink)
        .setAuthor({ name: 'Florida State Roleplay  ·  Division Selection', iconURL: interaction.guild.iconURL() || undefined })
        .setTitle('Select a Division')
        .setDescription('Choose the position you are applying for. You may only hold one active application at a time.\n\n-# Your selection cannot be changed after confirmation.')
        .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
      ],
      components: rows,
      ephemeral:  true,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Division select → create private channel + begin Q&A
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleCategorySelect(interaction) {
    await interaction.deferUpdate();
    const categoryId = interaction.customId.split(':')[1];
    const category   = config.applicationCategories.find(c => c.id === categoryId);
    const member     = interaction.member;
    const guild      = interaction.guild;
    if (!category) return;

    const questions = config.applicationQuestions[categoryId];
    if (!questions?.length) return;

    const existing = [...activeApps.values()].find(a => a.discordId === member.id);
    if (existing) {
      const ch = guild.channels.cache.get(existing.channelId);
      if (ch) return interaction.followUp({ content: `You already have an open application: ${ch}`, ephemeral: true });
    }

    let appCh;
    try {
      const safeName     = `app-${categoryId}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 45);
      const everyoneRole = guild.roles.everyone;
      const hrRoleIds    = config.hrRoles;
      const botId        = guild.client.user.id;

      const overwrites = [
        { id: everyoneRole.id, type: OverwriteType.Role,   deny:  [PermissionFlagsBits.ViewChannel] },
        { id: member.id,       type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: botId,           type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
      ];

      if (Array.isArray(hrRoleIds)) {
        for (const roleId of hrRoleIds) {
          if (roleId) overwrites.push({ id: roleId, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        }
      } else if (hrRoleIds) {
        overwrites.push({ id: hrRoleIds, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      }

      const parentCh = guild.channels.cache.get(config.channels.applications);
      const parentId  = parentCh?.parentId || null;

      appCh = await guild.channels.create({
        name:                 safeName,
        type:                 ChannelType.GuildText,
        parent:               parentId,
        permissionOverwrites: overwrites,
        reason:               `Application — ${category.label} — ${member.user.username}`,
      });
    } catch (err) {
      console.error('[Applications] Create channel:', err.message);
      return interaction.followUp({ content: 'Unable to create your application channel. Please contact an administrator.', ephemeral: true });
    }

    const appData = { discordId: member.id, category: categoryId, channelId: appCh.id, answers: {}, step: 0, startedAt: new Date().toISOString() };
    activeApps.set(appCh.id, appData);

    const intro = new EmbedBuilder()
      .setColor(C.brand)
      .setAuthor({ name: 'Florida State Roleplay  ·  Application Portal', iconURL: guild.iconURL() || undefined })
      .setTitle(`${category.label} — Application`)
      .setDescription(
        `Welcome, ${member}.\n\n` +
        `This is your private application channel. Your responses are visible only to you and the HR team.\n\n` +
        `You will be presented with **${questions.length} questions**, one at a time. Send each answer as a message in this channel. \n` +
        `Take your time — there is no time limit on individual responses.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `-# Be thorough and honest. Incomplete or dishonest answers are grounds for automatic disqualification.`
      )
      .addFields(
        { name: 'Division',   value: `${category.emoji}  ${category.label}`, inline: true  },
        { name: 'Questions',  value: `${questions.length} total`,            inline: true  },
        { name: 'Response',   value: 'One message per question',               inline: true  },
      )
      .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
      .setTimestamp();

    await appCh.send({ embeds: [intro] });
    setTimeout(() => askQuestion(appCh, questions, 0), 1200);

    try {
      await member.send({ embeds: [new EmbedBuilder()
        .setColor(C.brand)
        .setAuthor({ name: 'Florida State Roleplay  ·  Application Confirmation' })
        .setTitle(`Application Initiated — ${category.label}`)
        .setDescription(
          `Your application has been registered.\n\n` +
          `> Proceed to ${appCh} to complete your questionnaire.\n` +
          `> Answer each question thoughtfully and in full sentences.\n` +
          `> Do not share this channel or solicit assistance from other members.\n\n` +
          `-# Reference: ${appCh.id}  ·  Opened: <t:${Math.floor(Date.now()/1000)}:F>`
        )
        .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
        .setTimestamp()
      ]});
    } catch {}

    await interaction.followUp({ content: `Your application channel has been created: ${appCh}`, ephemeral: true });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Q&A Engine
  // ─────────────────────────────────────────────────────────────────────────────
  function askQuestion(channel, questions, qIndex) {
    const q = questions[qIndex];
    if (!q) return;
    channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(C.steel)
        .setTitle(`Question ${qIndex + 1}  /  ${questions.length}`)
        .setDescription(`**${q.label}**`)
        .setFooter({ text: 'Reply with your answer in a single message  ·  Florida State Roleplay' })
    ]}).catch(() => {});
  }

  async function handleApplicationMessage(message, client) {
    if (message.author.bot || !message.guild) return;
    const appData = activeApps.get(message.channelId);
    if (!appData)  return;

    const questions = config.applicationQuestions[appData.category];
    if (!questions)  return;

    const qIndex = appData.step;
    const q      = questions[qIndex];
    if (!q) return;

    appData.answers[q.id] = message.content;
    appData.step++;

    if (appData.step < questions.length) {
      setTimeout(() => {
        const ch = client.channels.cache.get(message.channelId);
        if (ch) askQuestion(ch, questions, appData.step);
      }, 1200);
    } else {
      await finalizeApplication(message.channel, appData, client);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Finalize — submission confirmation + HR embed
  // ─────────────────────────────────────────────────────────────────────────────
  async function finalizeApplication(channel, appData, client) {
    const category  = config.applicationCategories.find(c => c.id === appData.category);
    const questions = config.applicationQuestions[appData.category];
    const guild     = channel.guild;
    const member    = guild.members.cache.get(appData.discordId);

    await channel.send({ embeds: [new EmbedBuilder()
      .setColor(C.brand)
      .setAuthor({ name: 'Florida State Roleplay  ·  Application Received', iconURL: guild.iconURL() || undefined })
      .setTitle(`${category?.label} — Submission Confirmed`)
      .setDescription(
        `Your application has been received and is pending review by the HR team.\n\n` +
        `**What Happens Next**\n` +
        `> **1.** The Directive Team will assess your responses within 24–48 hours\n` +
        `> **2.** A decision will be communicated here and via direct message\n` +
        `> **3.** Do not contact HR staff directly to inquire about status\n\n` +
        `-# Reference: ${channel.id}  ·  Submitted: <t:${Math.floor(Date.now()/1000)}:F>`
      )
      .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
      .setTimestamp()
    ]});

    if (member) {
      try {
        await member.send({ embeds: [new EmbedBuilder()
          .setColor(C.brand)
          .setAuthor({ name: 'Florida State Roleplay  ·  Application Received' })
          .setTitle(`Submission Confirmed — ${category?.label}`)
          .setDescription(
            `Your questionnaire responses have been logged.\n\n` +
            `> The HR team will review your application within **24–48 hours**\n` +
            `> Monitor this inbox and your application channel for updates\n` +
            `> Contacting HR staff to expedite review is not permitted\n\n` +
            `-# Reference ID: ${channel.id}`
          )
          .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
          .setTimestamp()
        ]});
      } catch {}
    }

    // AI analysis
    let aiAnalysis = 'Analysis unavailable.';
    try { aiAnalysis = await ai.analyzeApplication(appData.category, appData.answers, questions); } catch {}

    // Route to staff server channel
    const staffGuild  = client.guilds.cache.get(config.staffGuildId);
    const staffChId   = config.staffAppChannels?.[appData.category];
    const hrCh        = (staffGuild && staffChId && staffGuild.channels.cache.get(staffChId))
                        || guild.channels.cache.get(config.channels.hrCentral);

    // Send answers to HR in chunks
    for (let i = 0; i < questions.length; i += 5) {
      const fields = questions.slice(i, i + 5).map(q => ({
        name:   `${questions.indexOf(q) + 1}. ${q.label.slice(0, 200)}`,
        value:  (appData.answers[q.id] || '*No response provided*').slice(0, 1024),
        inline: false,
      }));
      const chunk = new EmbedBuilder()
        .setColor(C.subtle)
        .setTitle(`Responses — Q${i + 1} to Q${Math.min(i + 5, questions.length)}`)
        .addFields(fields)
        .setFooter({ text: `Florida State Roleplay  ·  Application Ref: ${channel.id}` });
      if (hrCh) await hrCh.send({ embeds: [chunk] }).catch(() => {});
    }

    // Main HR embed with action buttons
    const hrEmbed = new EmbedBuilder()
      .setColor(0x1A1A2E)
      .setAuthor({ name: `${category?.label || 'Staff'} Application  —  Pending Directive Review`, iconURL: guild.iconURL() || undefined })
      .setTitle('New Application Received')
      .setThumbnail(guild.members.cache.get(appData.discordId)?.displayAvatarURL() || guild.iconURL() || null)
      .addFields(
        { name: 'Applicant',   value: `<@${appData.discordId}>`,        inline: true },
        { name: 'Division',    value: `${category?.label || '—'}`,     inline: true },
        { name: 'Submitted',   value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
        { name: 'App Channel', value: channel.toString(),                  inline: true },
        { name: 'Reference',   value: `\`${channel.id}\``,          inline: true },
        { name: 'Server',      value: guild.name,                          inline: true },
        { name: 'AI Assessment', value: aiAnalysis.slice(0, 1024),        inline: false },
      )
      .setFooter({ text: 'Florida State Roleplay  ·  HR System  ·  Action Required' })
      .setTimestamp();

    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`app_approve:${channel.id}`).setLabel('Approve').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`app_deny:${channel.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`app_hold:${channel.id}`).setLabel('On Hold').setStyle(ButtonStyle.Secondary),
    );

    if (hrCh) await hrCh.send({ embeds: [hrEmbed], components: [btnRow] }).catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HR Decision routing
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleHRDecision(interaction, decision) {
    const { isStaff } = require('../utils/permissions');
    const { PermissionFlagsBits: PF } = require('discord.js');
    const isStaffServer = interaction.guildId === config.staffGuildId;
    const reviewerRoles = config.staffServerReviewerRoles || [];
    const hasReviewPerm = isStaffServer
      ? (interaction.member.permissions.has(PF.Administrator) || reviewerRoles.some(id => interaction.member.roles.cache.has(id)))
      : isStaff(interaction.member);
    if (!hasReviewPerm) {
      return interaction.reply({ content: 'You do not have the required permissions to process application decisions.', ephemeral: true });
    }

    const channelId = interaction.customId.split(':')[1];
    const appData   = activeApps.get(channelId);
    if (!appData) {
      return interaction.reply({ content: 'Application record not found — it may have already been processed.', ephemeral: true });
    }

    if (decision === 'deny') {
      const modal = new ModalBuilder()
        .setCustomId(`app_deny_modal:${channelId}`)
        .setTitle('Deny Application — Provide Reason');
      const notesInput = new TextInputBuilder()
        .setCustomId('denial_notes')
        .setLabel('Reason (communicated to applicant)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('State the specific reason for denial clearly and professionally.')
        .setMinLength(10)
        .setMaxLength(500)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
      return interaction.showModal(modal);
    }

    await interaction.deferReply({ ephemeral: true });
    await processDecision(interaction, channelId, appData, decision, '');
    await interaction.editReply({ content: `Decision recorded: **${decision === 'approve' ? 'Approved' : 'On Hold'}**.` });
  }

  async function handleDenyModal(interaction) {
    const { isStaff } = require('../utils/permissions');
    const { PermissionFlagsBits: PF } = require('discord.js');
    const isStaffServer2 = interaction.guildId === config.staffGuildId;
    const reviewerRoles2 = config.staffServerReviewerRoles || [];
    const hasReviewPerm2 = isStaffServer2
      ? (interaction.member.permissions.has(PF.Administrator) || reviewerRoles2.some(id => interaction.member.roles.cache.has(id)))
      : isStaff(interaction.member);
    if (!hasReviewPerm2) {
      return interaction.reply({ content: 'You do not have the required permissions.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const channelId = interaction.customId.split(':')[1];
    const appData   = activeApps.get(channelId);
    const notes     = interaction.fields.getTextInputValue('denial_notes');

    if (!appData) return interaction.editReply({ content: 'Application record not found.' });
    await processDecision(interaction, channelId, appData, 'deny', notes);
    await interaction.editReply({ content: 'Application denied and applicant notified.' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Process decision — shared handler
  // ─────────────────────────────────────────────────────────────────────────────
  async function processDecision(interaction, channelId, appData, decision, notes) {
    const staffGuild = interaction.guild;
    const mainGuild  = interaction.client.guilds.cache.get(process.env.GUILD_ID) || interaction.guild;
    const appCh      = mainGuild.channels.cache.get(channelId);
    const member     = mainGuild.members.cache.get(appData.discordId);
    const category   = config.applicationCategories.find(c => c.id === appData.category);
    const reviewer   = interaction.user;

    const approved = decision === 'approve';
    const onHold   = decision === 'hold';

    const ts = Math.floor(Date.now() / 1000);

    // Auto-role on approve
    if (approved && member) {
      const roleKey = config.approvalRoles?.[appData.category];
      if (roleKey) {
        const roleId = config.roles[roleKey];
        if (roleId) await member.roles.add(roleId).catch(e => console.error('[Apps] Role:', e.message));
      }
    }

    // ── In-channel decision embed ────────────────────────────
    const color = approved ? C.approve : onHold ? C.hold : C.deny;
    const decisionLabel = approved ? 'APPROVED' : onHold ? 'ON HOLD' : 'DENIED';
    const inChannelEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `Florida State Roleplay  ·  Application Decision`, iconURL: mainGuild.iconURL() || undefined })
      .setTitle(`${category?.label} — ${decisionLabel}`)
      .setDescription(
        approved
          ? `<@${appData.discordId}>, your application has been reviewed and the Directive Team has reached a decision.\n\n` +
            `**Your application has been approved.** ${config.approvalRoles?.[appData.category] ? 'Your role has been assigned automatically.' : 'A member of HR will assign your role shortly.'}\n\n` +
            `Welcome to the Florida State Roleplay team. You will receive onboarding information through the appropriate channels.`
          : onHold
          ? `<@${appData.discordId}>, your application is currently under extended review.\n\n` +
            `The HR team requires additional time to assess your application. You will be contacted directly when a final decision has been made.\n` +
            `Please do not submit a new application while this one remains active.`
          : `<@${appData.discordId}>, your application has been reviewed and the Directive Team has reached a decision.\n\n` +
            `**Your application was not successful on this occasion.**\n` +
            `You are welcome to re-apply after a mandatory 14-day waiting period.`
      )
      .addFields(
        { name: 'Division',    value: `${category?.emoji || ''}  ${category?.label || '—'}`, inline: true },
        { name: 'Decision',    value: decisionLabel,                                            inline: true },
        { name: 'Reviewed By', value: `${reviewer.username}`,                               inline: true },
      )
      .setFooter({ text: `Florida State Roleplay  ·  Human Resources  ·  Decision issued <t:${ts}:R>` })
      .setTimestamp();

    if (notes) inChannelEmbed.addFields({ name: 'Notes from HR', value: notes, inline: false });
    if (appCh) await appCh.send({ embeds: [inChannelEmbed] }).catch(() => {});

    // ── DM applicant ─────────────────────────────────────────
    if (member) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: 'Florida State Roleplay  ·  Application Decision' })
          .setTitle(`${category?.label} Application — ${decisionLabel}`)
          .setDescription(
            approved
              ? `Your **${category?.label}** application has been reviewed.\n\n` +
                `**Decision: APPROVED**\n` +
                `> ${config.approvalRoles?.[appData.category] ? 'Your role has been assigned to your account.' : 'An HR representative will assign your role shortly.'}\n` +
                `> Review the staff guidelines and onboarding materials in the staff channels.\n` +
                `> Welcome to the Florida State Roleplay team.`
              : onHold
              ? `Your **${category?.label}** application has been placed on hold.\n\n` +
                `> The HR team is conducting an extended review of your submission.\n` +
                `> You will be contacted when a final decision is available.\n` +
                `> Do not submit additional applications during this period.`
              : `Your **${category?.label}** application has been reviewed.\n\n` +
                `**Decision: NOT APPROVED**\n` +
                `> Thank you for your interest in Florida State Roleplay.\n` +
                `> You may submit a new application after **14 days** from this notice.\n` +
                `> Use the feedback below to improve your future submission.`
          )
          .addFields(
            { name: 'Division',    value: `${category?.label || '—'}`, inline: true  },
            { name: 'Reviewed By', value: reviewer.username,             inline: true  },
            { name: 'Date',        value: `<t:${ts}:D>`,              inline: true  },
          )
          .setFooter({ text: 'Florida State Roleplay  ·  Human Resources' })
          .setTimestamp();
        if (notes) dmEmbed.addFields({ name: 'HR Notes', value: notes, inline: false });
        await member.send({ embeds: [dmEmbed] });
      } catch {}
    }

    // ── Public result embed ──────────────────────────────────
    // Use direct client channel lookup as fallback to guarantee delivery
    const resultsCh = mainGuild.channels.cache.get(config.channels.applicationResults)
                      || interaction.client.channels.cache.get(config.channels.applicationResults);

    if (resultsCh && !onHold) {
      const pubEmbed = new EmbedBuilder()
        .setColor(approved ? C.approve : C.deny)
        .setAuthor({ name: 'Florida State Roleplay  ·  Recruitment Decision', iconURL: mainGuild.iconURL() || undefined })
        .setTitle(`${category?.label} — Application ${approved ? 'Approved' : 'Denied'}`)
        .setDescription(
          approved
            ? `Your **${category?.label}** application has been reviewed by the Directive Team.\n` +
              `Following a thorough assessment of your qualifications and responses, we are pleased to advise that your application has been **approved**.\n\n` +
              `You will receive your role assignment and onboarding information through the designated staff channels. Welcome to the team.`
            : `Your **${category?.label}** application has been reviewed by the Directive Team.\n` +
              `Following assessment of your submission, we regret to inform you that your application did not meet the current requirements.\n\n` +
              `You are welcome to re-apply after 14 days. We appreciate your continued interest in Florida State Roleplay.`
        )
        .addFields(
          { name: 'Applicant',   value: `<@${appData.discordId}>`, inline: true },
          { name: 'Division',    value: category?.label || '—',      inline: true },
          { name: 'Decision',    value: approved ? 'APPROVED' : 'NOT APPROVED', inline: true },
        )
        .setFooter({ text: `Reviewed by ${reviewer.username}  ·  Florida State Roleplay  ·  Human Resources` })
        .setTimestamp();

      if (notes && !approved) pubEmbed.addFields({ name: 'HR Notes', value: notes, inline: false });

      await resultsCh.send({ content: `<@${appData.discordId}>`, embeds: [pubEmbed] })
        .catch(e => console.error('[Apps] Results channel send failed:', e.message, '| Channel:', resultsCh.id));
    } else if (!onHold) {
      console.error('[Apps] Results channel not found. ID:', config.channels.applicationResults, '| mainGuild:', mainGuild?.id);
    }

    // ── Cleanup ──────────────────────────────────────────────
    if (!onHold) {
      activeApps.delete(channelId);
      try {
        const staffChId = config.staffAppChannels?.[appData.category];
        const hrCh = (staffGuild && staffChId && staffGuild.channels.cache.get(staffChId))
                     || mainGuild.channels.cache.get(config.channels.hrCentral);
        const hrMsgs = hrCh ? await hrCh.messages.fetch({ limit: 50 }) : null;
        if (hrMsgs) {
          for (const m of hrMsgs.values()) {
            if (m.author.bot && m.components?.some(r => r.components?.some(c => c.customId === `app_approve:${channelId}`))) {
              await m.edit({ components: [] }).catch(() => {});
              break;
            }
          }
        }
      } catch {}

      setTimeout(async () => {
        if (appCh) {
          await appCh.setName(`closed-${appCh.name}`.slice(0, 45)).catch(() => {});
          await appCh.permissionOverwrites.edit(appData.discordId, { ViewChannel: false }).catch(() => {});
        }
      }, 24 * 60 * 60 * 1000);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Restore on restart
  // ─────────────────────────────────────────────────────────────────────────────
  async function restoreActiveApps(guild, client) {
    try {
      const staffGuild   = client?.guilds.cache.get(config.staffGuildId);
      const staffChIds   = Object.values(config.staffAppChannels || {});
      const staffChs     = staffGuild ? staffChIds.map(id => staffGuild.channels.cache.get(id)).filter(Boolean) : [];
      const fallbackCh   = guild.channels.cache.get(config.channels.hrCentral);
      const searchChs    = staffChs.length ? staffChs : [fallbackCh].filter(Boolean);

      for (const hrCh of searchChs) {
        const msgs = await hrCh.messages.fetch({ limit: 50 }).catch(() => null);
        if (!msgs) continue;
        for (const msg of msgs.values()) {
          for (const row of (msg.components || [])) {
            for (const comp of row.components) {
              if (comp.customId?.startsWith('app_approve:')) {
                const chId = comp.customId.split(':')[1];
                if (activeApps.has(chId)) continue;
                const appCh = guild.channels.cache.get(chId);
                if (!appCh) continue;
                const catMatch = config.applicationCategories.find(c => appCh.name.includes(c.id));
                if (!catMatch) continue;
                const ow = appCh.permissionOverwrites.cache.find(o => o.type === 1 && o.id !== guild.client.user.id);
                if (!ow) continue;
                const rebuilt = await rebuildAnswers(appCh, catMatch.id);
                activeApps.set(chId, { discordId: ow.id, category: catMatch.id, channelId: chId, answers: rebuilt.answers, step: rebuilt.step, startedAt: msg.createdAt.toISOString() });
                console.log(`[Applications] Restored: ${appCh.name}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Applications] restoreActiveApps:', err.message);
    }
  }

  async function rebuildAnswers(channel, categoryId) {
    const questions = config.applicationQuestions[categoryId] || [];
    let step = 0;
    const answers = {};
    try {
      const msgs = await channel.messages.fetch({ limit: 100 });
      for (const m of [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp)) {
        if (m.author.bot || step >= questions.length) continue;
        answers[questions[step].id] = m.content;
        step++;
      }
    } catch {}
    return { answers, step };
  }

  module.exports = {
    postApplicationPanel,
    handleApplyButton,
    handleCategorySelect,
    handleApplicationMessage,
    handleHRDecision,
    handleDenyModal,
    restoreActiveApps,
  };
  