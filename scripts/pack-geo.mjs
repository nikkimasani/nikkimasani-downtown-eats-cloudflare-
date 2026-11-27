// Packs the big map files so phones download less: every list of [lat,lng] points becomes {z:[...]} — whole-number
// steps from the previous point (first point absolute) at the file's precision. app.js unpacks it right after fetching.
// Safe to run more than once. Run: node scripts/pack-geo.mjs
import fs from 'fs';
const isPt = (p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && p[0] > 28 && p[0] < 31 && p[1] > -97 && p[1] < -94;
function pack(file, scale) {
  const f = new URL('../public/' + file, import.meta.url), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (j.pk) { console.log(file, 'already packed'); return; }
  let n = 0;
  const walk = (v) => {
    if (!Array.isArray(v)) { if (v && typeof v === 'object') for (const k of Object.keys(v)) v[k] = walk(v[k]); return v; }
    if (v.length >= 2 && v.every(isPt)) { const z = []; let a = 0, b = 0; for (const [la, ln] of v) { const x = Math.round(la * scale), y = Math.round(ln * scale); z.push(x - a, y - b); a = x; b = y; } n++; return { z }; }
    return v.map(walk);
  };
  walk(j); j.pk = scale;
  const before = fs.statSync(f).size; fs.writeFileSync(f, JSON.stringify(j)); console.log(file, n, 'lines packed', before, '→', fs.statSync(f).size);
}
pack('buildings.json', 1e6); pack('streets.json', 1e5);
