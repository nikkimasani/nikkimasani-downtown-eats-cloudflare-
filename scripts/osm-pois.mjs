// Adds every restaurant, bar, pub, cafe and food stand that OpenStreetMap knows in the neighbourhoods around
// downtown (Warehouse District, EaDo, the East End / Second Ward, East River, Sawyer Yards) to public/places.json, so the map isn't limited
// to the Downtown Houston directory. Keeps the last good download in public/osm-pois.json for when Overpass is down.
// Run after scripts/refresh.mjs: node scripts/osm-pois.mjs   (Node 20+, no dependencies). Data © OpenStreetMap contributors, ODbL.
import fs from 'fs';
const AREAS = [[29.7650, -95.3615, 29.7712, -95.3478], [29.7398, -95.3600, 29.7625, -95.3335], [29.7385, -95.3340, 29.7600, -95.3115], [29.7580, -95.3480, 29.7740, -95.3200], [29.7640, -95.3860, 29.7735, -95.3760], [29.7675, -95.4000, 29.7725, -95.3950], [29.7540, -95.4130, 29.7650, -95.3770], [29.7310, -95.3890, 29.7525, -95.3745], [29.7310, -95.3745, 29.7480, -95.3600], [29.7620, -95.3770, 29.7745, -95.3600], [29.7745, -95.4200, 29.8100, -95.3700], [29.7525, -95.3890, 29.7605, -95.3745], [29.7330, -95.4100, 29.7530, -95.3890], [29.7080, -95.4050, 29.7330, -95.3800], [29.7050, -95.3800, 29.7400, -95.3350], [29.7200, -95.4450, 29.7620, -95.4100], [29.7250, -95.4800, 29.7700, -95.4450], [29.7620, -95.4250, 29.7745, -95.3950]];   // + East River (Fifth Ward), + Sawyer Yards
const Q = `[out:json][timeout:170];(${AREAS.map((b) => `nwr["amenity"~"^(restaurant|bar|pub|cafe|fast_food|biergarten|nightclub|ice_cream|food_court)$"]["name"](${b.join(',')});nwr["craft"~"^(brewery|distillery|winery)$"]["name"](${b.join(',')});`).join('')});out center tags;`;
const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let pois = null;
for (let round = 0; round < 3 && !pois; round++) for (const ep of EP) {
  if (pois) break; if (round) await new Promise((r) => setTimeout(r, 15000));
  try {
    const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(Q), headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'downtown-eats (personal dining map)' }, signal: AbortSignal.timeout(170000) });
    if (r.ok) { const j = await r.json(); if (j.elements?.length > 10) pois = j.elements.map((e) => ({ id: e.type[0] + e.id, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, t: e.tags })); }
  } catch (e) { console.error(ep, e.message); }
}
if (pois) fs.writeFileSync('public/osm-pois.json', JSON.stringify({ updated: new Date().toISOString(), source: 'OpenStreetMap contributors (ODbL)', pois }));
else { try { pois = JSON.parse(fs.readFileSync('public/osm-pois.json', 'utf8')).pois; console.error('Overpass unavailable; using the saved osm-pois.json'); } catch { console.error('no POIs'); process.exit(0); } }

const P = JSON.parse(fs.readFileSync('public/places.json', 'utf8'));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/\b(the|houston|eado|east end|downtown|restaurant|bar|cafe)\b/g, '').replace(/[^a-z0-9]/g, '');
let OV = {}; try { OV = JSON.parse(fs.readFileSync('public/overrides.json', 'utf8')).spots || {}; } catch {}
const have = P.places.map((p) => { const o = OV[p.name] || p.official || {}; return { n: norm(p.name), num: (p.address || '').match(/^\d+/)?.[0], lat: o.lat, lng: o.lng }; });
const close = (h, p) => h.lat && Math.abs(h.lat - p.lat) * 110850 < 60 && Math.abs(h.lng - p.lng) * 96680 < 60;   // same spot under a slightly different name (J Bar M Barbecue / J-Bar-M BBQ)
const slugId = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return 100000 + (h % 900000); };
const D = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun' };
const t12 = (s) => { const [H, M] = s.split(':').map(Number); const h = H % 24, ap = h < 12 ? 'am' : 'pm', hh = h % 12 || 12; return `${hh}${M ? ':' + String(M).padStart(2, '0') : ''}${ap}`; };
// "Mo-Fr 11:00-22:00; Sa 10:00-23:00" -> "Mon–Fri 11am–10pm, Sat 10am–11pm" (the app's hours format); anything fancier is skipped
const hours = (oh) => {
  if (!oh) return null; if (/^24\/7$/.test(oh.trim())) return 'Daily 12am–11:59pm';
  const out = [];
  for (const part of oh.split(';').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*) (\d\d:\d\d-\d\d:\d\d(?:,\d\d:\d\d-\d\d:\d\d)*)$/);
    if (!m) { if (/ off$/.test(part)) continue; return null; }
    const tm = m[2].split(',').map((r) => r.split('-').map(t12).join('–')).join(', ');
    for (const g of m[1].split(',')) { const days = g.replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (d) => D[d]).replace(/-/g, '–'); out.push(`${days === 'Mon–Sun' ? 'Daily' : days} ${tm}`); }   // "Fr,Sa" becomes two entries
  }
  return out.length ? out.join(', ') : null;
};
const cap = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
let added = 0;
for (const p of pois) {
  const t = p.t || {}, name = t.name; if (!name || !p.lat || /^(vacant|closed|empty|for lease)\b/i.test(name) || t['disused:amenity'] || t.disused) continue;   // empty storefronts mapped with a placeholder name
  if (/^(no|closed)$/i.test(t.opening_hours || '') || t['disused:amenity'] || /^(yes)$/.test(t.disused || '')) continue;
  const n = norm(name), num = t['addr:housenumber'];
  if (!n || have.some((h) => h.n && (h.n === n || (n.length > 5 && (h.n.includes(n) || n.includes(h.n))) || (num && h.num === num && h.n.slice(0, 4) === n.slice(0, 4)) || (close(h, p) && h.n.slice(0, 4) === n.slice(0, 4))))) continue;
  const a = t.amenity || (t.craft ? 'brewery' : ''), cu = (t.cuisine || '').split(';').map((s) => s.trim()).filter(Boolean).map(cap);
  const bar = /^(bar|pub|biergarten|nightclub|brewery)$/.test(a);
  const type = a === 'bar' ? (/wine/i.test(name + (t.drink || '')) ? 'Wine Bar' : /cocktail/i.test(t.bar || '') ? 'Cocktail Bar' : 'Bar') : a === 'pub' ? 'Pub' : a === 'biergarten' ? 'Beer Garden' : a === 'nightclub' ? 'Nightclub' : a === 'brewery' ? 'Brewery' : a === 'cafe' ? (cu[0] || 'Cafe') : a === 'ice_cream' ? 'Dessert' : cu[0] || (a === 'fast_food' ? 'Fast Food' : 'Restaurant');
  const meals = bar ? ['Happy Hour', 'Late Night'] : a === 'cafe' ? ['Breakfast', 'Lunch'] : a === 'ice_cream' ? ['Dessert'] : ['Lunch', 'Dinner'];
  const street = t['addr:street'] ? `${num ? num + ' ' : ''}${t['addr:street']}` : '';
  P.places.push({ id: slugId('osm' + p.id), name, address: street ? `${street}, Houston, TX` : 'Houston, TX', tunnel: null, cuisines: cu.length ? cu.slice(0, 2) : [type], meals, price: a === 'fast_food' || a === 'cafe' ? 1 : 2, vibes: bar ? ['nightlife'] : [],
    type, note: 'From OpenStreetMap.', tryit: '', official: { lat: p.lat, lng: p.lng, street, phone: t.phone || t['contact:phone'] || null, website: t.website || t['contact:website'] || null, hours: hours(t.opening_hours), osm: p.id } });
  have.push({ n, num, lat: p.lat, lng: p.lng }); added++;
}
fs.writeFileSync('public/places.json', JSON.stringify(P));
console.log('osm pois', pois.length, '· added', added);
