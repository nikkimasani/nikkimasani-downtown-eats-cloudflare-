// Downloads METRO's published GTFS schedule and keeps the stops and routes around downtown, so the map can
// place live buses and trains. Writes public/metro-static.json. Run: node scripts/metro-static.mjs (Node 20+, needs `unzip`).
import fs from 'fs';
import { execFileSync } from 'child_process';
const SOURCES = ['https://metro.resourcespace.com/pages/download.php?ref=4835&ext=zip'];   // METRO's GTFS (listed by Transitland / MobilityData)
const BOX = { s: 29.725, n: 29.79, w: -95.4, e: -95.33 };
let zip = null;
for (const u of SOURCES) {
  try { const r = await fetch(u, { headers: { 'user-agent': 'downtown-eats (personal dining app)' } }); if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b[0] === 0x50 && b[1] === 0x4b) { zip = b; console.log('GTFS from', u, b.length, 'bytes'); break; } } } catch (e) { console.error(u, e.message); }
}
if (!zip) { console.error('Could not download METRO GTFS; keeping the existing metro-static.json'); process.exit(0); }
fs.writeFileSync('/tmp/metro-gtfs.zip', zip);
const read = (f) => execFileSync('unzip', ['-p', '/tmp/metro-gtfs.zip', f], { maxBuffer: 1 << 29 }).toString('utf8').replace(/^﻿/, '');
function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, k) => [h.trim(), (r[k] || '').trim()])));
}
const stops = {};
for (const s of csv(read('stops.txt'))) {
  const lat = +s.stop_lat, lng = +s.stop_lon;
  if (lat > BOX.s && lat < BOX.n && lng > BOX.w && lng < BOX.e) stops[s.stop_id] = [+lat.toFixed(6), +lng.toFixed(6), s.stop_name];
}
const routes = {};
for (const r of csv(read('routes.txt'))) routes[r.route_id] = [r.route_short_name, +r.route_type, r.route_color || '', r.route_long_name];
fs.writeFileSync('public/metro-static.json', JSON.stringify({ updated: new Date().toISOString(), source: SOURCES[0], stops, routes }));
console.log('downtown-area stops', Object.keys(stops).length, '· routes', Object.keys(routes).length);
