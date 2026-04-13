// ready.js — Bot startup
  'use strict';

  const config           = require('../config');
  const heartbeat        = require('../modules/heartbeat');
  const shiftCards       = require('../modules/shiftCards');
  const dbScanner        = require('../modules/dbScanner');
  const erlc             = require('../utils/erlc');
  const wantedWall       = require('../modules/crimeTickerWall');
  const mapPinner        = require('../modules/mapPinner');
  const crimeTicker      = require('../modules/crimeTicker');
  const dailyReport      = require('../modules/dailyReport');
  const vouchSystem      = require('../modules/vouchSystem');
  const dutySignup       = require('../modules/dutySignup');
  const serverBrain      = require('../modules/serverBrain');
  const staffCal         = require('../modules/staffCalendar');
  const intelSystem      = require('../modules/intelSystem');
  const reputationSystem = require('../modules/reputationSystem');
  const applications     = require('../modules/applications');
  const autoSetup        = require('../modules/autoSetup');
  const { deployCommands } = require('../deploy-commands');
  const { ActivityType }   = require('discord.js');

  module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
      console.log('\n✅ FSRP Management online as ' + client.user.tag);
      console.log('📡 Guild: ' + process.env.GUILD_ID);
      console.log('🕐 ' + new Date().toISOString() + '\n');

      client.user.setPresence({
        activities: [{ name: 'Florida State Roleplay', type: ActivityType.Watching }],
        status: 'online',
      });

      // Register slash commands with Discord
      try { await deployCommands(); } catch (e) { console.error('[Ready] Deploy error:', e.message); }

      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) { console.error('[Ready] Guild not found — check GUILD_ID!'); return; }

      await guild.members.fetch().catch(e => console.warn('[Ready] Member fetch:', e.message));

      erlc.testConnection().catch(() => {});

      // ── Database channel access check ─────────────────────────────────────
      const dbCh = guild.channels.cache.get(config.channels.discordDatabase);
      if (!dbCh) {
        console.error('[Ready] DISCORD DATABASE CHANNEL NOT FOUND:', config.channels.discordDatabase,
          '— bot cannot save brain file. Check channel ID and VIEW_CHANNEL / SEND_MESSAGES / ATTACH_FILES permissions.');
      } else {
        console.log('[Ready] Discord DB channel: #' + dbCh.name);
        // Only post a startup notice if last bot message is > 10 minutes old (avoids spam)
        const recent = await dbCh.messages.fetch({ limit: 5 }).catch(() => null);
        const lastBotMsg = recent ? [...recent.values()].find(m => m.author.id === client.user.id) : null;
        const ageMs = lastBotMsg ? Date.now() - lastBotMsg.createdTimestamp : Infinity;
        if (ageMs > 10 * 60 * 1000) {
          await dbCh.send('🟢 **FSRP Management online** — brain scan begins shortly.').catch(e =>
            console.error('[Ready] Cannot write to DB channel:', e.message,
              '— check SEND_MESSAGES and ATTACH_FILES permissions.')
          );
        }
      }

      // ── Auto-configure ALL panels (0 manual commands needed) ─────────────
      await autoSetup.run(client, guild);

      // ── Restore in-progress applications from DB ──────────────────────────
      await applications.restoreActiveApps(guild).catch(e => console.warn('[Ready] App restore:', e.message));

      // ── Init shift cards ───────────────────────────────────────────────────
      await shiftCards.init(client).catch(e => console.warn('[Ready] ShiftCards:', e.message));

      // ── Latch onto existing live board messages ────────────────────────────
      await wantedWall.findExistingWantedWall(client).catch(() => {});
      await mapPinner.findExistingMessage(client).catch(() => {});

      // ── Initialize all modules ────────────────────────────────────────────
      crimeTicker.init(client);
      vouchSystem.init(client);
      dutySignup.init(client);
      staffCal.init(client);
      dailyReport.init(client);
      intelSystem.init(client);
      reputationSystem.init(client);

      // ── Start live systems ────────────────────────────────────────────────
      heartbeat.start(client);
      dbScanner.start(client);
      serverBrain.init(client);

      console.log('🚀 FSRP Management fully operational.\n');
    },
  };
  