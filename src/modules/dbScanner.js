// dbScanner.js — Proxy to serverBrain (no duplicate scanning)
// All channel indexing is handled by serverBrain's single unified scanner.
// This module maintains its original API so nothing else needs to change.
'use strict';

const brain = require('./serverBrain');

let _started = false;

function start(discordClient) {
  // serverBrain.init() in ready.js handles all scanning — nothing to do here
  if (!_started) { _started = true; console.log('[DBScanner] Proxy mode — powered by ServerBrain.'); }
}

async function scan()         { return brain.scan(); }
async function ensureIndexed()  { /* no-op — brain runs on its own schedule */ }
async function scanChannel(id)  { /* no-op — brain handles incremental updates */ }

function getContextForQuery(q) { return brain.getContextForQuery(q); }
function getAllContext()        { return brain.getAllContext(); }
function getServerContext()    { return brain.getAllContext(); }
function getChannelIndex()     { return brain.getChannelIndexMap(); }

module.exports = { start, scan, ensureIndexed, scanChannel, getContextForQuery, getAllContext, getServerContext, getChannelIndex };
