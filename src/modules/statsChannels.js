// statsChannels.js — Live voice channel stat updater
  // Updates two voice channels with player count + staff count.
  // Reads live ERLC data on every heartbeat (20s) but only pushes
  // a Discord channel rename when the value changes AND 5 minutes
  // have elapsed since the last rename — matching the industry
  // standard used by Statbot/MEE6 stat bots to respect Discord's
  // 2-edits-per-10-min rate limit.

  'use strict';

  const PLAYER_COUNT_CHANNEL_ID = '1493287839901814907';
  const STAFF_COUNT_CHANNEL_ID  = '1493287683290828952';

  const UPDATE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  let _client         = null;
  let _lastPlayerName = null;
  let _lastStaffName  = null;
  let _lastPlayerUpd  = 0;
  let _lastStaffUpd   = 0;

  function init(discordClient) {
    _client = discordClient;
  }

  async function pulse(snapshot) {
    if (!_client || !snapshot) return;

    const now = Date.now();

    // ── Player count ───────────────────────────────────────────────────────────
    const playerCount  = snapshot.server?.CurrentPlayers ?? snapshot.players?.length ?? 0;
    const maxPlayers   = snapshot.server?.MaxPlayers ?? 0;
    const playerName   = maxPlayers
      ? `👥 Players: ${playerCount}/${maxPlayers}`
      : `👥 Players: ${playerCount}`;

    if (playerName !== _lastPlayerName && now - _lastPlayerUpd >= UPDATE_COOLDOWN_MS) {
      try {
        const ch = _client.channels.cache.get(PLAYER_COUNT_CHANNEL_ID);
        if (ch) {
          await ch.setName(playerName);
          _lastPlayerName = playerName;
          _lastPlayerUpd  = now;
          console.log('[StatsChannels] Player channel → ' + playerName);
        }
      } catch (err) {
        console.error('[StatsChannels] Player channel update failed:', err.message);
      }
    }

    // ── Staff in-game count ────────────────────────────────────────────────────
    // Count ERLC players with elevated permissions (Admin / Server Owner / Mod etc.)
    const staffCount = (snapshot.players || [])
      .filter(p => p._permission && p._permission !== 'Normal')
      .length;
    const staffName = `🛡️ Staff: ${staffCount}`;

    if (staffName !== _lastStaffName && now - _lastStaffUpd >= UPDATE_COOLDOWN_MS) {
      try {
        const ch = _client.channels.cache.get(STAFF_COUNT_CHANNEL_ID);
        if (ch) {
          await ch.setName(staffName);
          _lastStaffName = staffName;
          _lastStaffUpd  = now;
          console.log('[StatsChannels] Staff channel → ' + staffName);
        }
      } catch (err) {
        console.error('[StatsChannels] Staff channel update failed:', err.message);
      }
    }
  }

  module.exports = { init, pulse };
  