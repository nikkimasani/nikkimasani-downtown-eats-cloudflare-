// Makes sure every spot in data/wanted.json is on the map. For each one that isn't in curated.json or places.json yet,
// finds the pin (street address via the US Census geocoder, otherwise the name on OpenStreetMap's Nominatim, limited
// to the downtown-to-Heights area) and adds it to curated.json + overrides.json, so it sticks across refreshes.
// Spots that can't be found are listed in data/wanted-misses.json for a hand fix. Run after osm-pois.mjs.
import fs from 'fs';
const W = JSON.parse(fs.readFileSync('data/wanted.json', 'utf8')).spots;
const C = JSON.parse(fs.readFileSync('public/curated.json', 'utf8'));
const OF = JSON.parse(fs.readFileSync('public/overrides.json', 'utf8')); const O = OF.spots;
const P = JSON.parse(fs.readFileSync('public/places.json', 'utf8'));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/&/g, 'and').replace(/\b(the|houston|htx|bar|lounge|restaurant|kitchen|and)\b/g, '').replace(/[^a-z0-9]/g, '');
const have = new Set([...C.map((c) => norm(c.name)), ...P.places.map((p) => norm(p.name))]);
const BOX = { s: 29.700, w: -95.485, n: 29.815, e: -95.300 };   // the inner loop, out to the Galleria
const inBox = (la, lo) => la > BOX.s && la < BOX.n && lo > BOX.w && lo < BOX.e;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'user-agent': 'downtown-eats personal dining map (github.com/nikkimasani/nikkimasani-downtown-eats)' };
async function census(street) {
  try {
    const u = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(`${street}, Houston, TX`);
    const c = (await (await fetch(u, { signal: AbortSignal.timeout(20000) })).json())?.result?.addressMatches?.[0]?.coordinates;
    return c ? { lat: +c.y.toFixed(6), lng: +c.x.toFixed(6) } : null;
  } catch { return null; }
}
async function nominatim(name) {
  const tries = [name, name.replace(/\s*[-–(].*$/, '').replace(/\b(Midtown|EaDo|Heights|Shepherd|Downtown)\b/g, '').trim()];
  for (const q of [...new Set(tries)]) {
    try {
      const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&bounded=1&viewbox=${BOX.w},${BOX.n},${BOX.e},${BOX.s}&q=` + encodeURIComponent(q + ', Houston');
      const j = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) })).json();
      await sleep(1100);   // Nominatim's 1 request/second rule
      const hit = (j || []).find((h) => inBox(+h.lat, +h.lon) && /amenity|shop|leisure|tourism|building/.test(h.category || h.class || ''));
      if (hit) { const a = hit.address || {}; return { lat: +(+hit.lat).toFixed(6), lng: +(+hit.lon).toFixed(6), street: a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road || '' }; }
    } catch { await sleep(1100); }
  }
  return null;
}
const TYPE = { bar: (c) => /rooftop/i.test(c) ? 'Rooftop Bar' : /cocktail/i.test(c) ? 'Cocktail Bar' : /wine/i.test(c) ? 'Wine Bar' : /pub/i.test(c) ? 'Pub' : /sports/i.test(c) ? 'Sports Bar' : /beer garden|icehouse/i.test(c) ? 'Beer Garden' : /nightclub/i.test(c) ? 'Nightclub' : /lounge|dive/i.test(c) ? 'Lounge' : 'Bar', coffee: (c) => /bakery/i.test(c) ? 'Bakery & Café' : 'Coffee Shop', rest: () => 'Restaurant' };
let id = Math.max(...C.map((c) => c.id)), added = 0; const misses = [];
for (const w of W) {
  if (have.has(norm(w.n))) continue;
  let g = w.a ? await census(w.a) : null; if (g) g.street = w.a; else g = await nominatim(w.n);
  if (!g || !inBox(g.lat, g.lng)) { misses.push(w.n); console.log('not found', w.n); continue; }
  const street = w.a || g.street || '';
  const rec = { id: ++id, name: w.n, address: street ? `${street}, Houston, TX` : 'Houston, TX', tunnel: null, cuisines: [w.c], meals: w.k === 'bar' ? ['Happy Hour', 'Late Night'] : w.k === 'coffee' ? ['Breakfast', 'Lunch'] : ['Lunch', 'Dinner'], price: 2,
    vibes: w.k === 'bar' ? ['drinks', 'nightlife'] : w.k === 'coffee' ? ['coffee', 'work'] : ['casual'], type: TYPE[w.k](w.c), note: `${w.c}${w.k === 'rest' ? ' restaurant' : ''}.`, tryit: '' };
  C.push(rec); P.places.push({ ...rec, official: null });
  O[w.n] = { ...(street ? { street } : {}), lat: g.lat, lng: g.lng, source: w.a ? 'US Census geocoder' : 'OpenStreetMap Nominatim', checked: new Date().toISOString().slice(0, 10), notInDirectory: true };
  have.add(norm(w.n)); added++; console.log('added', w.n, g.lat, g.lng);
}
if (added) { fs.writeFileSync('public/curated.json', JSON.stringify(C, null, 1) + '\n'); fs.writeFileSync('public/overrides.json', JSON.stringify(OF, null, 2) + '\n'); fs.writeFileSync('public/places.json', JSON.stringify(P)); }
fs.writeFileSync('data/wanted-misses.json', JSON.stringify(misses, null, 1) + '\n');
console.log('wanted spots added', added, '· not found', misses.length);
