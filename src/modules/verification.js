// verification.js — FSRP Verification System
// Accepts Roblox username OR User ID.

const axios  = require('axios');
const config = require('../config');
const db     = require('../utils/discordDb');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

async function postVerifyPanel(channel) {
    try {
      const msgs = await channel.messages.fetch({ limit: 20 });
      if ([...msgs.values()].some(m =>
        m.author.id === channel.client.user.id &&
        m.components?.some(r => r.components?.some(c => c.customId === 'verify_button'))
      )) return;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: 'Florida State Roleplay  ·  Account Verification', iconURL: channel.guild.iconURL() || undefined })
      .setTitle('Account Linkage Required')
      .setThumbnail(channel.guild.iconURL() || null)
      .setDescription(
        'To access division channels, session servers, and staff applications, your Roblox account must be linked to your Discord account. ' +
        'The process takes under 60 seconds.'
      )
      .addFields(
        { name: 'Step 1', value: 'Press **Link Roblox Account** below', inline: true },
        { name: 'Step 2', value: 'Enter your exact Roblox username', inline: true },
        { name: 'Step 3', value: 'Complete the in-game prompt', inline: true },
        { name: 'Already Verified?', value: 'If your roles were not assigned, open a support ticket in <#' + (config.channels && config.channels.support ? config.channels.support : '') + '>.', inline: false },
      )
      .setFooter({ text: 'Florida State Roleplay  ·  Powered by Bloxlink' })
      .setTimestamp();

    await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel('Link Roblox Account')
          .setStyle(ButtonStyle.Primary)
      )],
    });
  }

async function handleVerifyButton(interaction) {
  const verifiedRoleId = config.roles.verified;
  if (verifiedRoleId && interaction.member.roles.cache.has(verifiedRoleId)) {
    return interaction.reply({ content: 'You are already verified! Contact staff if you need to update your account.', ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId('verify_roblox_modal').setTitle('FSRP Verification');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('roblox_input').setLabel('Roblox Username or User ID').setStyle(TextInputStyle.Short).setPlaceholder('e.g. Builderman  or  156').setRequired(true).setMinLength(1).setMaxLength(50)
  ));
  await interaction.showModal(modal);
}

async function handleVerifyModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const raw    = interaction.fields.getTextInputValue('roblox_input').trim();
  const member = interaction.member;
  const guild  = interaction.guild;

  let robloxUser = null;
  if (/^\d+$/.test(raw)) {
    robloxUser = await getRobloxUserById(raw) || await getRobloxUserByName(raw);
  } else {
    robloxUser = await getRobloxUserByName(raw);
  }

  if (!robloxUser) {
    return interaction.editReply({ content: `No Roblox account found for **${raw}**.\nDouble-check your username or User ID and try again.` });
  }

  const robloxId       = String(robloxUser.id);
  const robloxUsername = robloxUser.name || robloxUser.displayName || raw;

  // Duplicate check
  const verifyCh = guild.channels.cache.get(config.channels.verifyDatabase);
  if (verifyCh) {
    const { users } = await db.getVerifyDb(verifyCh);
    const dup = users.find(u => u.robloxId === robloxId && u.discordId !== member.id && u.status === 'active');
    if (dup) return interaction.editReply({ content: `**${robloxUsername}** is already linked to another account. Contact staff if this is an error.` });
  }

  // Assign roles
  try {
    const unverifiedRoleId = config.roles.unverified;
    if (unverifiedRoleId) await member.roles.remove(unverifiedRoleId).catch(() => {});
    const verifiedRoleId = config.roles.verified;
    if (verifiedRoleId) await member.roles.add(verifiedRoleId);
  } catch (err) {
    console.error('[Verification] Role grant failed:', err.message);
    return interaction.editReply({ content: 'Could not assign your verified role. Please contact staff.' });
  }

  // Save
  if (verifyCh) await updateVerifyDb(verifyCh, member.id, robloxId, robloxUsername);

  // Reply
  await interaction.editReply({ content: `You are now verified as **${robloxUsername}** (ID: \`${robloxId}\`). Welcome to FSRP!` });

  // DM the user
  try {
    await member.send({
      embeds: [new EmbedBuilder()
        .setColor(0x2D7D46)
        .setAuthor({ name: '\u2705  FSRP VERIFICATION  \u2014  Florida State Roleplay' })
        .setTitle('You Are Now Verified!')
        .setDescription(
          `**Welcome to Florida State Roleplay, ${robloxUsername}!** \uD83C\uDF89\n\n` +
          `> Your Roblox account is now linked to your Discord.\n\n` +
          `**\uD83C\uDFAE Roblox Username:** ${robloxUsername}\n` +
          `**\uD83C\uDD94 Roblox ID:** \`${robloxId}\`\n\n` +
          `You now have full server access. Read the rules, grab your roles, and enjoy Florida State!`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: 'FSRP Verification System \u2014 Florida State Roleplay' })
        .setTimestamp()
      ]
    });
  } catch { /* DMs closed */ }

  console.log(`[Verification] ${member.user.tag} verified as ${robloxUsername} (${robloxId})`);
}

async function getRobloxUserById(userId) {
  try {
    const r = await axios.get(`https://users.roblox.com/v1/users/${userId}`, { timeout: 8000 });
    return r.data;
  } catch (e) { return e.response?.status === 404 ? null : null; }
}

async function getRobloxUserByName(username) {
  try {
    const r = await axios.post('https://users.roblox.com/v1/usernames/users', { usernames: [username], excludeBannedUsers: false }, { timeout: 8000 });
    const d = r.data?.data;
    return Array.isArray(d) && d.length ? d[0] : null;
  } catch { return null; }
}

async function updateVerifyDb(channel, discordId, robloxId, robloxUsername) {
  const { users, save } = await db.getVerifyDb(channel);
  const idx   = users.findIndex(u => u.discordId === discordId);
  const entry = { discordId, robloxId: String(robloxId), robloxUsername, verifiedAt: new Date().toISOString(), status: 'active' };
  if (idx >= 0) users[idx] = { ...users[idx], ...entry }; else users.push(entry);
  await save();
}

async function lookupByDiscordId(channel, discordId) {
  const { users } = await db.getVerifyDb(channel);
  return users.find(u => u.discordId === discordId && u.status === 'active') || null;
}

async function lookupByRobloxId(channel, robloxId) {
  const { users } = await db.getVerifyDb(channel);
  return users.find(u => u.robloxId === String(robloxId) && u.status === 'active') || null;
}

module.exports = { postVerifyPanel, handleVerifyButton, handleVerifyModal, updateVerifyDb, lookupByDiscordId, lookupByRobloxId, getRobloxUserById, getRobloxUserByName };
