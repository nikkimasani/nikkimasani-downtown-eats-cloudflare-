// Downloads downtown Houston's real street centrelines, parks, plazas, water, rail and street trees from
// OpenStreetMap (Overpass API) and writes public/streets.json. The map uses it to line its street grid up
// with the real streets and to draw parks, the bayou and trees where they actually are.
// Run: node scripts/osm-streets.mjs   (Node 20+, no dependencies). Map data © OpenStreetMap contributors, ODbL.
import fs from 'fs';
const BBOX = [29.7380, -95.3790, 29.7715, -95.3100];
const Q = `[out:json][timeout:120];(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|trunk|motorway|motorway_link|trunk_link)$"](${BBOX});
  way["railway"~"^(light_rail|tram)$"](${BBOX});
  way["highway"~"^(footway|cycleway|path|steps|corridor)$"](${BBOX});
  way["indoor"~"^(corridor|yes)$"]["level"~"^-"](${BBOX});
  way["leisure"~"^(park|garden|playground|dog_park)$"](${BBOX}); relation["leisure"="park"](${BBOX});
  way["place"="square"](${BBOX}); way["highway"="pedestrian"]["area"="yes"](${BBOX});
  way["natural"="water"](${BBOX}); way["waterway"~"^(river|stream)$"](${BBOX});
  node["natural"="tree"](${BBOX});
);out body geom;`;
const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let data = null;
for (let round = 0; round < 3 && !data; round++) for (const ep of EP) {
  if (data) break; if (round) await new Promise((r) => setTimeout(r, 20000));
  try {
    const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(Q), headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'downtown-eats (personal dining map)' }, signal: AbortSignal.timeout(90000) });
    if (r.ok) { const j = await r.json(); if (j.elements?.length > 50) data = j; }
  } catch (e) { console.error(ep, e.message); }
}
if (!data) { console.error('Overpass unavailable; keeping the existing streets.json'); process.exit(0); }

const r5 = (v) => Math.round(v * 1e5) / 1e5;
const line = (g) => g.map((p) => [r5(p.lat), r5(p.lon)]);
const out = { streets: [], rail: [], parks: [], water: [], rivers: [], trees: [], paths: [], tunnels: [] };
for (const e of data.elements) {
  const t = e.tags || {};
  if (e.type === 'node' && t.natural === 'tree') { out.trees.push([r5(e.lat), r5(e.lon)]); continue; }
  const g = e.geometry || (e.members || []).filter((m) => m.role === 'outer' && m.geometry).flatMap((m) => m.geometry);
  if (!g?.length) continue;
  const br = t.bridge && t.bridge !== 'no' ? 1 : 0, layer = +(t.layer || 0) || 0;
  // the downtown pedestrian tunnels: footways/corridors mapped below street level
  const below = (t.tunnel && t.tunnel !== 'no' && !/^(culvert|flooded)$/.test(t.tunnel)) || /^-/.test(t.layer || '') || /^-/.test(t.level || '');
  if (below && (/^(footway|corridor|steps|path)$/.test(t.highway || '') || /^(corridor|yes)$/.test(t.indoor || ''))) { out.tunnels.push([t.name || '', t.highway || t.indoor, line(g)]); continue; }
  if (/^(footway|cycleway|path|steps)$/.test(t.highway || '')) { if (!/^(sidewalk|crossing)$/.test(t.footway || '') && t.indoor !== 'yes' && !(t.tunnel && t.tunnel !== 'no')) out.paths.push([t.name || '', t.highway, line(g), br]); continue; }
  if (t.highway && t.area !== 'yes') out.streets.push([t.name || '', t.highway, line(g), +(t.lanes || 0), br, layer]);
  else if (t.railway) out.rail.push(line(g));
  else if (t.leisure || t.place === 'square' || (t.highway === 'pedestrian' && t.area === 'yes')) out.parks.push([t.name || '', t.leisure || 'plaza', line(g)]);
  else if (t.natural === 'water') out.water.push(line(g));
  else if (t.waterway) out.rivers.push([t.name || '', line(g)]);
}
out.fetched = new Date().toISOString();
fs.writeFileSync(new URL('../public/streets.json', import.meta.url), JSON.stringify(out));
console.log(`streets ${out.streets.length}, rail ${out.rail.length}, parks ${out.parks.length}, water ${out.water.length}, rivers ${out.rivers.length}, trees ${out.trees.length}, paths ${out.paths.length}, tunnels ${out.tunnels.length}, bridges ${out.streets.filter((x) => x[4]).length}`);
