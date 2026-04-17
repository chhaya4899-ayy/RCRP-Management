// statsChannels.js — Live voice channel stat updater
// Updates voice channels on every ERLC data pulse (~20s heartbeat).
// Discord silently drops renames that exceed their internal rate limit,
// so we just fire on every change and let Discord handle the throttle.
'use strict';

// ── Channel IDs (public server) ───────────────────────────────────────────────
const PLAYER_COUNT_CHANNEL_ID = '1493287839901814907';
const STAFF_COUNT_CHANNEL_ID  = '1493287683290828952';

// Minimum gap between rename attempts per channel (match heartbeat interval).
// We do NOT impose a 5-min cooldown — Discord handles its own throttle.
const MIN_INTERVAL_MS = 18_000; // 18 s — just under the 20 s heartbeat

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

  // ── Total player count ────────────────────────────────────────────────────
  // IMPORTANT: snapshot.players only contains staff / elevated-permission
  // players in the ERLC PRC API. For the true total (all civilians + staff)
  // we MUST use snapshot.server.CurrentPlayers, which the API always provides.
  const total      = snapshot.server?.CurrentPlayers ?? 0;
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
        console.log('[StatsChannels] Player channel →', playerName);
      }
    } catch (err) {
      console.error('[StatsChannels] Player channel rename failed:', err.message);
    }
  }

  // ── Staff in-game count ───────────────────────────────────────────────────
  // snapshot.players contains only elevated-permission players (staff),
  // so .length gives the staff count directly.
  const staffCount = (snapshot.players || []).length;
  const staffName  = `🛡️ Staff: ${staffCount}`;

  if (staffName !== _lastStaffName && now - _lastStaffUpd >= MIN_INTERVAL_MS) {
    try {
      const ch = _client.channels.cache.get(STAFF_COUNT_CHANNEL_ID);
      if (ch) {
        await ch.setName(staffName);
        _lastStaffName = staffName;
        _lastStaffUpd  = now;
        console.log('[StatsChannels] Staff channel →', staffName);
      }
    } catch (err) {
      console.error('[StatsChannels] Staff channel rename failed:', err.message);
    }
  }
}

module.exports = { init, pulse };
