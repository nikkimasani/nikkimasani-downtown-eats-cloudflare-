// Downloads real building footprints and heights for downtown Houston from OpenStreetMap (Overpass API)
// and writes public/buildings.json for the map. Run: node scripts/osm-buildings.mjs   (Node 20+, no dependencies)
// Map data © OpenStreetMap contributors, ODbL.
import fs from 'fs';
const BBOX = [29.7435, -95.3790, 29.7715, -95.3495];   // s, w, n, e — downtown inside I-45, I-10 and US-59
const Q = `[out:json][timeout:120];(way["building"](${BBOX});relation["building"](${BBOX});way["building:part"](${BBOX});way["amenity"="parking"](${BBOX}););out body geom;`;
const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let data = null;
for (let round = 0; round < 3 && !data; round++) for (const ep of EP) {
  if (data) break; if (round) await new Promise((r) => setTimeout(r, 20000));
  try { const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(Q), headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'downtown-eats (personal dining map)' }, signal: AbortSignal.timeout(90000) }); if (r.ok) { data = await r.json(); console.log('OSM from', ep, data.elements.length, 'elements'); break; } console.error(ep, r.status); } catch (e) { console.error(ep, e.message); }
}
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
    const parking = t.amenity === 'parking' && !t.building;
    const levels = num(t['building:levels']), h = num(t.height) ?? (levels != null ? levels * 3.6 + 2 : null);
    items.push({ part: !!t['building:part'], parking, name: t.name || null, h, minH: num(t.min_height) ?? (num(t['building:min_level']) != null ? num(t['building:min_level']) * 3.6 : 0),
      type: t.building || t['building:part'] || (parking ? 'parking' : 'yes'), colour: t['building:colour'] || null, roof: t['roof:colour'] || null, material: t['building:material'] || null, shape: t['roof:shape'] || null, rh: num(t['roof:height']), ring, a });
  }
}
// where a building is drawn in parts (podium + tower), draw the parts instead of the outline
const parts = items.filter((i) => i.part);
const out = [];
for (const it of items) {
  if (!it.part && !it.parking && parts.some((p) => p.h && inside(centroid(p.ring), it.ring))) continue;
  const h = it.h ?? (it.parking ? 0 : it.type === 'parking' ? 14 : it.a > 4000 ? 16 : 11);
  const r = simplify(it.ring, it.a > 2000 ? 1.5 : 0.8).map(([la, ln]) => [+la.toFixed(6), +ln.toFixed(6)]);
  out.push([r, Math.round(h * 10) / 10, Math.round(it.minH * 10) / 10, it.parking ? 'lot' : it.type, it.name, it.colour, it.material, it.shape, it.roof, it.rh]);
}
fs.writeFileSync('public/buildings.json', JSON.stringify({ updated: new Date().toISOString(), source: 'OpenStreetMap contributors (ODbL)', fields: ['ring[lat,lng]', 'heightM', 'minHeightM', 'type', 'name', 'colour', 'material', 'roofShape', 'roofColour', 'roofHeightM'], b: out }));
console.log('buildings', out.length, '· with real height', items.filter((i) => i.h).length, '· parts', parts.length);
