// panel.js — Repost any panel to any channel
  'use strict';

  const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
  const { isManagement, isStaff }  = require('../utils/permissions');
  const autoSetup = require('../modules/autoSetup');

  module.exports = {
    data: new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Repost any bot panel to a channel of your choice.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption(opt =>
        opt.setName('panel')
          .setDescription('Which panel to repost?')
          .setRequired(true)
          .addChoices(
            { name: '🔐 Verification',        value: 'verification'  },
            { name: '📋 Staff Applications',  value: 'applications'  },
            { name: '🎭 Self Roles',          value: 'selfroles'     },
            { name: '⭐ Staff Review',         value: 'staffreview'   },
            { name: '📥 Welcome',             value: 'welcome'       },
            { name: '🤖 Commands Help',        value: 'commands'      },
            { name: '📜 Staff Rules',         value: 'staffrules'    },
            { name: '🚨 Department Updates',  value: 'deptupdates'   },
            { name: '✅ Whitelist Chat',       value: 'whitelist'     },
            { name: '⚖️ IA Handbook',          value: 'iahandbook'    },
          )
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to post the panel in (defaults to current channel).')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      ),

    async execute(interaction, client) {
      if (!isStaff(interaction.member) && !isManagement(interaction.member)) {
        return interaction.reply({ content: 'You need a Staff or Management role to use this.', ephemeral: true });
      }

      const panelId      = interaction.options.getString('panel');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const guild        = interaction.guild;

      await interaction.deferReply({ ephemeral: true });

      try {
        await autoSetup.repostPanel(guild, panelId, targetChannel);
        await interaction.editReply({
          content: `✅ **${panelLabel(panelId)}** panel posted in ${targetChannel}.`,
        });
      } catch (err) {
        console.error('[Panel Cmd] Error:', err.message);
        await interaction.editReply({ content: `❌ Failed to post panel: ${err.message}` });
      }
    },
  };

  function panelLabel(id) {
    const map = {
      verification: '🔐 Verification',
      applications: '📋 Staff Applications',
      selfroles:    '🎭 Self Roles',
      staffreview:  '⭐ Staff Review',
      welcome:      '📥 Welcome',
      commands:     '🤖 Commands Help',
      staffrules:   '📜 Staff Rules',
      deptupdates:  '🚨 Department Updates',
      whitelist:    '✅ Whitelist Chat',
      iahandbook:   '⚖️ IA Handbook',
    };
    return map[id] || id;
  }
  