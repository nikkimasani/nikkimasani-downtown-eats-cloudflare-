// Fills in lat/lng for hand-added spots (overrides.json entries marked "geocode": true) from their street
// address, using the free US Census geocoder. Run: node scripts/geocode.mjs   (Node 20+, no dependencies)
import fs from 'fs';
const O = JSON.parse(fs.readFileSync('public/overrides.json', 'utf8'));
let n = 0;
for (const [name, s] of Object.entries(O.spots || {})) {
  if (!s.geocode || (s.lat && s.lng && !s.approx) || !s.street) continue;   // "approx": a hand-placed pin to replace with the real address point
  const u = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(`${s.geoStreet || s.street}, Houston, TX`);
  try {
    const j = await (await fetch(u, { signal: AbortSignal.timeout(20000) })).json();
    const c = j?.result?.addressMatches?.[0]?.coordinates;
    if (c) { s.lat = +c.y.toFixed(6); s.lng = +c.x.toFixed(6); delete s.geocode; delete s.approx; n++; console.log('geocoded', name, s.lat, s.lng); }
    else console.log('no match', name, s.street);
  } catch (e) { console.log('failed', name, e.message); }
  await new Promise((r) => setTimeout(r, 300));
}
if (n) fs.writeFileSync('public/overrides.json', JSON.stringify(O, null, 2) + '\n');
console.log('geocoded', n);
