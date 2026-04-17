// statsChannels.js — Live voice channel stat updater
'use strict';

const PLAYER_COUNT_CHANNEL_ID = '1493287839901814907';
const STAFF_COUNT_CHANNEL_ID  = '1493287683290828952';

// Attempt a rename on every data pulse — Discord silently throttles excess renames
const MIN_INTERVAL_MS = 18_000;

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

  // ── Total players ─────────────────────────────────────────────────────────
  // snapshot.players is the full enriched player array returned by the ERLC API
  // — it contains ALL players (Normal + elevated permissions).
  // snapshot.server.CurrentPlayers can lag or be 0; the array is always accurate.
  const total      = snapshot.players?.length ?? 0;
  const maxPlayers = snapshot.server?.MaxPlayers ?? 0;
  const playerName = maxPlayers
    ? `👥 Players: ${total}/${maxPlayers}`
    : `👥 Players: ${total}`;

  if (playerName !== _lastPlayerName && now - _lastPlayerUpd >= MIN_INTERVAL_MS) {
    try {
      const ch = _client.channels.cache.get(PLAYER_COUNT_CHANNEL_ID);
      if (ch) {
        await ch.setName(playerName);
        _lastPlayerName = playerName;
        _lastPlayerUpd  = now;
        console.log('[StatsChannels] Player →', playerName);
      }
    } catch (err) {
      console.error('[StatsChannels] Player rename failed:', err.message);
    }
  }

  // ── Staff in-game ─────────────────────────────────────────────────────────
  // Only count players with elevated ERLC permissions (Moderator, Administrator,
  // Server Owner, etc.). Normal civilians have _permission === 'Normal'.
  const staffCount = (snapshot.players || [])
    .filter(p => p._permission && p._permission !== 'Normal')
    .length;
  const staffName = `🛡️ Staff: ${staffCount}`;

  if (staffName !== _lastStaffName && now - _lastStaffUpd >= MIN_INTERVAL_MS) {
    try {
      const ch = _client.channels.cache.get(STAFF_COUNT_CHANNEL_ID);
      if (ch) {
        await ch.setName(staffName);
        _lastStaffName = staffName;
        _lastStaffUpd  = now;
        console.log('[StatsChannels] Staff →', staffName);
      }
    } catch (err) {
      console.error('[StatsChannels] Staff rename failed:', err.message);
    }
  }
}

module.exports = { init, pulse };
