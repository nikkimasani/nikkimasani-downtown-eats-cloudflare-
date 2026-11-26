// Downloads real building footprints and heights for downtown Houston from OpenStreetMap (Overpass API)
// and writes public/buildings.json for the map. Run: node scripts/osm-buildings.mjs   (Node 20+, no dependencies)
// Map data © OpenStreetMap contributors, ODbL.
import fs from 'fs';
// s, w, n, e — downtown inside I-45, I-10 and US-59 (+ EaDo, the East End and the Warehouse District),
// + East River across the bayou in Fifth Ward (Jensen to Hirsch), + Sawyer Yards just west of I-45 (Tejas Brewery)
const BOXES = [[29.7380, -95.3790, 29.7715, -95.3100], [29.7580, -95.3480, 29.7740, -95.3200], [29.7640, -95.3860, 29.7735, -95.3760], [29.7675, -95.4000, 29.7725, -95.3950], [29.7540, -95.4130, 29.7650, -95.3770], [29.7310, -95.3890, 29.7480, -95.3600]];   // + the Heights: shops, restaurants and bars only (see HEIGHTS below)   // + Midtown (Pierce to Elgin, Bagby to Spur 527/US-59)   // + Allen Parkway: Thompson/The Allen, Lost Lake, Regent Square, Autry Park   // + Washington & Yale (Bayou Heights Bier Garten)
// the rest of the inner loop (the Heights, Fourth Ward, Montrose, Museum District, Third Ward & Almeda, Upper Kirby & River Oaks, Uptown/Galleria/Post Oak):
// every building that isn't a house goes here (named, shops, offices, towers, anything over 450 m²); the houses go to homes.json
const FILTERED = [[29.7745, -95.4200, 29.8100, -95.3700], [29.7525, -95.3890, 29.7605, -95.3745], [29.7330, -95.4100, 29.7530, -95.3890], [29.7080, -95.4050, 29.7330, -95.3800], [29.7050, -95.3800, 29.7400, -95.3350], [29.7200, -95.4450, 29.7620, -95.4100], [29.7250, -95.4800, 29.7700, -95.4450]];
const inB = ([la, ln], B) => la > B[0] && la < B[2] && ln > B[1] && ln < B[3];
const inHeights = (p) => FILTERED.some((B) => inB(p, B)) && !BOXES.slice(0, 6).some((B) => inB(p, B));
const HOMES = /^(house|houses|residential|detached|semidetached_house|terrace|bungalow|garage|garages|shed|carport|roof|hut|apartments|dormitory)$/;
const EPS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
// one Overpass request per area (one big request for the whole inner loop times out); null if any area can't be fetched
async function overpassAll(queries, min = 1) {
  const all = [];
  for (const q of queries) {
    let got = null;
    for (let round = 0; round < 3 && !got; round++) for (const ep of EPS) {
      if (got) break; if (round) await new Promise((r) => setTimeout(r, 20000));
      try { const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'inner-loop-eats (personal dining map)' }, signal: AbortSignal.timeout(170000) }); if (r.ok) { const j = await r.json(); if ((j.elements?.length || 0) >= min) got = j; } } catch (e) { console.error(ep, e.message); }
    }
    if (!got) return null;
    all.push(...got.elements); await new Promise((r) => setTimeout(r, 3000));
  }
  const seen = new Set(); return { elements: all.filter((e) => { const k = e.type + e.id; if (seen.has(k)) return false; seen.add(k); return true; }) };
}
const Qb = (B) => `way["building"](${B});relation["building"](${B});way["building:part"](${B});way["amenity"="parking"](${B});`;
const data = await overpassAll([`[out:json][timeout:170];(${BOXES.slice(0, 6).map(Qb).join('')});out body geom;`, ...FILTERED.map((B) => `[out:json][timeout:170];(${Qb(B)});out body geom;`)], 10);
if (!data) { console.error('Overpass unavailable; keeping the existing buildings.json'); process.exit(0); }

const M_LAT = 110850, M_LNG = 96680, toM = ([lat, lng]) => [lng * M_LNG, lat * M_LAT];
function simplify(pts, tol) {   // Douglas–Peucker on a closed ring (metres)
  if (pts.length < 5) return pts;
  const P = pts.map(toM), keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  // a closed ring starts and ends on the same point, so split it at the vertex farthest from the start
  let far = 1, fd = 0; for (let i = 1; i < P.length - 1; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
  keep[far] = true;
  const st = [[0, far], [far, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = P[a], [bx, by] = P[b], L = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = true; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
}
const num = (v) => { if (v == null) return null; const m = String(v).match(/[\d.]+/); if (!m) return null; let x = +m[0]; if (/ft|'/.test(v)) x *= 0.3048; return x; };
const area = (pts) => { let s = 0; const P = pts.map(toM); for (let i = 0; i < P.length - 1; i++) s += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1]; return Math.abs(s / 2); };
const inside = ([lat, lng], ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [yi, xi] = ring[i], [yj, xj] = ring[j]; if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c; } return c; };
const centroid = (r) => r.slice(0, -1).reduce((a, p) => [a[0] + p[0] / (r.length - 1), a[1] + p[1] / (r.length - 1)], [0, 0]);

const items = [];
for (const el of data.elements) {
  const t = el.tags || {}; let rings = [];
  if (el.type === 'way' && el.geometry) rings = [el.geometry.map((g) => [g.lat, g.lon])];
  else if (el.type === 'relation') rings = (el.members || []).filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry.map((g) => [g.lat, g.lon]));
  for (let ring of rings) {
    if (ring.length < 4) continue;
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
    const a = area(ring); if (a < 30) continue;
    if (inHeights(ring[0]) && !t.name && !t.amenity && !t.shop && (HOMES.test(t.building || '') || (!/^(commercial|retail|office|industrial|warehouse|church|school|civic|public|hotel|supermarket)$/.test(t.building || '') && a < 450))) continue;   // the Heights is thousands of houses: keep the commercial strips, not every bungalow
    const parking = t.amenity === 'parking' && !t.building;
    const levels = num(t['building:levels']), h = num(t.height) ?? (levels != null ? levels * 3.6 + 2 : null);
    items.push({ part: !!t['building:part'], parking, name: t.name || null, h, minH: num(t.min_height) ?? (num(t['building:min_level']) != null ? num(t['building:min_level']) * 3.6 : 0),
      type: t.building || t['building:part'] || (parking ? 'parking' : 'yes'), colour: t['building:colour'] || null, roof: t['roof:colour'] || null, material: t['building:material'] || null, shape: t['roof:shape'] || null, rh: num(t['roof:height']), dir: t['roof:direction'] || null, ring, a });
  }
}
// where a building is drawn in parts (podium + tower), draw the parts instead of the outline
const parts = items.filter((i) => i.part);
const out = [];
for (const it of items) {
  if (!it.part && !it.parking && parts.some((p) => p.h && inside(centroid(p.ring), it.ring))) continue;
  const h = it.h ?? (it.parking ? 0 : it.type === 'parking' ? 14 : it.a > 4000 ? 16 : 11);
  const r = simplify(it.ring, it.a > 2000 ? 1.5 : 0.8).map(([la, ln]) => [+la.toFixed(6), +ln.toFixed(6)]);
  out.push([r, Math.round(h * 10) / 10, Math.round(it.minH * 10) / 10, it.parking ? 'lot' : it.type, it.name, it.colour, it.material, it.shape, it.roof, it.rh, it.dir]);
}
fs.writeFileSync('public/buildings.json', JSON.stringify({ updated: new Date().toISOString(), source: 'OpenStreetMap contributors (ODbL)', fields: ['ring[lat,lng]', 'heightM', 'minHeightM', 'type', 'name', 'colour', 'material', 'roofShape', 'roofColour', 'roofHeightM', 'roofDirection'], b: out }));
console.log('buildings', out.length, '· with real height', items.filter((i) => i.h).length, '· parts', parts.length);
