// interactionCreate.js — Central interaction router

const verification = require('../modules/verification');
const applications = require('../modules/applications');
const loa          = require('../commands/loa');
const roleSystem   = require('../commands/roleSystem');
const dutySignup   = require('../modules/dutySignup');
const review       = require('../commands/review');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash Commands ──────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error('[Command] /' + interaction.commandName + ':', err.message, err.stack?.split('\n')[1] || '');
        const msg = { content: 'Something went wrong. Please try again.', ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
          else await interaction.reply(msg);
        } catch {}
      }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Verification
      if (id === 'verify_button') return verification.handleVerifyButton(interaction);

      // Applications
      if (id === 'apply_button')          return applications.handleApplyButton(interaction);
      if (id.startsWith('app_category:')) return applications.handleCategorySelect(interaction);
      if (id.startsWith('app_approve:'))  return applications.handleHRDecision(interaction, 'approve');
      if (id.startsWith('app_deny:'))     return applications.handleHRDecision(interaction, 'deny');
      if (id.startsWith('app_hold:'))     return applications.handleHRDecision(interaction, 'hold');

      // LOA
      if (id.startsWith('loa_approve:')) return loa.handleLOADecision(interaction, 'approve');
      if (id.startsWith('loa_deny:'))    return loa.handleLOADecision(interaction, 'deny');

      // Custom role panels (created via /role-system)
      if (id.startsWith('role_panel:'))  return roleSystem.handleRoleButton(interaction);

      // Built-in self-roles panel (selfrole:{roleId})
      if (id.startsWith('selfrole:'))    return roleSystem.handleSelfRoleButton(interaction);

      // Duty signup buttons
      if (id.startsWith('dutysignup:')) {
        const parts  = id.split(':');
        const action = parts[1];
        const sid    = parts[2];
        return dutySignup.handleSignup(interaction, action, sid);
      }

      // Scenario reroll
      if (id === 'member_scenario_reroll') {
        const SCENARIOS = require('../commands/member').SCENARIOS_EXPORT || [];
        const idx = Math.floor(Math.random() * 25);
        const { EmbedBuilder } = require('discord.js');
        const config = require('../config');
        const embed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🎲  Random RP Scenario')
          .setDescription('**' + (SCENARIOS[idx] || 'You discover an overturned vehicle on Route 7 with no driver in sight.') + '**')
          .setFooter({ text: 'FSRP RP Tools — click to reroll again' })
          .setTimestamp();
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('member_scenario_reroll').setLabel('🎲  New Scenario').setStyle(ButtonStyle.Secondary)
        );
        return interaction.update({ embeds: [embed], components: [row] });
      }

      // Review panel buttons
      if (id.startsWith('review_panel:')) return review.handleReviewPanelButton(interaction);

      // Legacy review button (backward compat)
      if (id === 'leave_review') return review.handleReviewPanelButton({ ...interaction, customId: 'review_panel:submit' });

      return;
    }

    // ── Select Menus ─────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('app_category:')) return applications.handleCategorySelect(interaction);
      return;
    }

    // ── Modals ────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (id === 'verify_roblox_modal')      return verification.handleVerifyModal(interaction);
      if (id.startsWith('app_deny_modal:')) return applications.handleDenyModal(interaction);
      if (id.startsWith('review_modal:'))   return review.handleReviewModal(interaction);
      return;
    }
  },
};
