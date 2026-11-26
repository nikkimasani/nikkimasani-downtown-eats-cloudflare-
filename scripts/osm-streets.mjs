// Downloads downtown Houston's real street centrelines, parks, plazas, water, rail and street trees from
// OpenStreetMap (Overpass API) and writes public/streets.json. The map uses it to line its street grid up
// with the real streets and to draw parks, the bayou and trees where they actually are.
// Run: node scripts/osm-streets.mjs   (Node 20+, no dependencies). Map data © OpenStreetMap contributors, ODbL.
import fs from 'fs';
// the same areas as scripts/osm-buildings.mjs: downtown + EaDo/East End, East River (Fifth Ward), Sawyer Yards
const BOXES = [[29.7380, -95.3790, 29.7715, -95.3100], [29.7580, -95.3480, 29.7740, -95.3200], [29.7640, -95.3860, 29.7735, -95.3760], [29.7675, -95.4000, 29.7725, -95.3950], [29.7540, -95.4130, 29.7650, -95.3770], [29.7310, -95.3890, 29.7480, -95.3600]];
// the neighbourhoods filled in by scripts/osm-homes.mjs (Fourth Ward, Montrose north, Rice Military, Sixth Ward, the Heights): their streets, parks and water
const FILL = [[29.7300, -95.4150, 29.7745, -95.3100], [29.7745, -95.4200, 29.8100, -95.3700], [29.7525, -95.3890, 29.7605, -95.3745], [29.7330, -95.4100, 29.7530, -95.3890], [29.7080, -95.4050, 29.7330, -95.3800], [29.7050, -95.3800, 29.7400, -95.3350], [29.7200, -95.4450, 29.7620, -95.4100], [29.7250, -95.4800, 29.7700, -95.4450], [29.7080, -95.4300, 29.7200, -95.4050]];   // the Heights: main streets, trails, parks and the bayou only (its many residential blocks stay off to keep the map light)   // + Midtown (Pierce to Elgin, Bagby to Spur 527/US-59)   // + Allen Parkway: Thompson/The Allen, Lost Lake, Regent Square, Autry Park   // + Washington & Yale (Bayou Heights Bier Garten)
const Q = `[out:json][timeout:170];(${BOXES.map((BBOX) => `
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|trunk|motorway|motorway_link|trunk_link)$"](${BBOX});
  way["railway"~"^(light_rail|tram)$"](${BBOX});
  way["highway"~"^(footway|cycleway|path|steps|corridor)$"](${BBOX});
  way["indoor"~"^(corridor|yes)$"]["level"~"^-"](${BBOX});
  way["leisure"~"^(park|garden|playground|dog_park)$"](${BBOX}); relation["leisure"="park"](${BBOX});
  way["place"="square"](${BBOX}); way["highway"="pedestrian"]["area"="yes"](${BBOX});
  way["natural"="water"](${BBOX}); way["waterway"~"^(river|stream)$"](${BBOX});
  node["natural"="tree"](${BBOX});
`).join('')}
);out body geom;`;
const QF = (B) => `[out:json][timeout:170];(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|trunk|motorway|motorway_link|trunk_link)$"](${B}); way["highway"~"^(cycleway|path)$"]["name"](${B});
  way["leisure"~"^(park|playground|dog_park)$"](${B}); way["waterway"~"^(river|stream)$"](${B}); way["natural"="water"](${B});
);out body geom;`;
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
const data = await overpassAll([Q, ...FILL.map(QF)], 1);
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
