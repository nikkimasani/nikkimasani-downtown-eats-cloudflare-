// Downtown Eats — isometric city map with Sims-style NPCs.
// Street level and the downtown tunnel system are separate layers.
// Coordinates come from the official listing pages (lat/lng); the map is rotated so the
// downtown street grid lines up with the isometric axes, and street lines are placed from
// the addresses themselves.

const TW = 32, TH = 16, ZU = 14;          // px per unit at zoom 1 (1 unit = 10 m)
const M_LAT = 110850, M_LNG = 96680;      // meters per degree near Houston
// Main St runs from 104 Main (north) to 1725 Main (south): use it as the grid's "down" axis.
const MAIN_A = [29.763689, -95.359828], MAIN_B = [29.751043, -95.368924];
const AVENUES = ['Main', 'Travis', 'Milam', 'Louisiana', 'Smith', 'Brazos', 'Bagby', 'Fannin', 'San Jacinto', 'Caroline', 'Austin', 'La Branch', 'Crawford', 'Jackson', 'Chenevert', 'Hamilton'];
const CROSS = ['Commerce', 'Franklin', 'Congress', 'Preston', 'Prairie', 'Texas', 'Capitol', 'Rusk', 'Walker', 'McKinney', 'Lamar', 'Dallas', 'Polk', 'Clay', 'Bell', 'Leeland', 'Pease', 'Jefferson', 'Pierce', 'Gray'];

// ---------- colour helpers ----------
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, t, to = 255) => '#' + rgb(h).map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
const lighten = (h, t) => mix(h, t, 255), darken = (h, t) => mix(h, t, 0);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

export const CUISINE_STYLE = [
  [/mexican|tex-mex|latin|taco/i, '#ff7a45', '🌮'], [/bbq|barbecue/i, '#a0522d', '🍖'], [/steak/i, '#8b2635', '🥩'],
  [/seafood|poke|fish/i, '#2b9fd6', '🦐'], [/sushi|japanese/i, '#e64980', '🍣'], [/asian|chinese|thai|vietnam|filipino|dumpling/i, '#e8590c', '🥢'],
  [/italian|pizza/i, '#2f9e44', '🍕'], [/french|bakery|dessert|boba|sweet/i, '#cc5de8', '🥐'], [/coffee|tea/i, '#8d6e63', '☕'],
  [/juice|smoothie|salad|bowl|healthy/i, '#51cf66', '🥗'], [/burger|american|deli|sandwich|fast/i, '#f59f00', '🍔'],
  [/bar|pub|lounge/i, '#7048e8', '🍸'], [/cajun|southern|soul/i, '#d9480f', '🍗'], [/mediterranean|indian|international|african/i, '#0ca678', '🥙'],
];
export function styleFor(p) {
  const key = [p.type, ...(p.cuisines || [])].join(' ');
  for (const [re, c, e] of CUISINE_STYLE) if (re.test(key)) return { color: c, emoji: e };
  return { color: '#868e96', emoji: '🍽️' };
}

// ---------- projection ----------
function makeProjector(points) {
  const lat0 = points.reduce((a, p) => a + p.lat, 0) / points.length, lng0 = points.reduce((a, p) => a + p.lng, 0) / points.length;
  let vx = (MAIN_B[1] - MAIN_A[1]) * M_LNG, vy = (MAIN_B[0] - MAIN_A[0]) * M_LAT; const L = Math.hypot(vx, vy); vx /= L; vy /= L;
  const ux = -vy, uy = vx;   // keeps east to the right and north up on screen
  return (lat, lng) => { const ex = (lng - lng0) * M_LNG, ny = (lat - lat0) * M_LAT; return [(ex * ux + ny * uy) / 10, (ex * vx + ny * vy) / 10]; };
}

export class View {
  constructor() { this.s = 0.18; this.ox = 0; this.oy = 0; }
  p(x, y, z = 0) { return [(x - y) * TW / 2 * this.s + this.ox, (x + y) * TH / 2 * this.s - z * ZU * this.s + this.oy]; }
  inv(sx, sy) { const a = (sx - this.ox) / (TW / 2 * this.s), b = (sy - this.oy) / (TH / 2 * this.s); return [(a + b) / 2, (b - a) / 2]; }
}

function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function box(ctx, v, x, y, w, d, h, c, z0 = 0, alpha = 1, windows = 0, night = 0) {
  const z1 = z0 + h;
  ctx.globalAlpha = alpha;
  poly(ctx, [v.p(x + w, y, z1), v.p(x + w, y + d, z1), v.p(x + w, y + d, z0), v.p(x + w, y, z0)], darken(c, 0.22));
  poly(ctx, [v.p(x, y + d, z1), v.p(x + w, y + d, z1), v.p(x + w, y + d, z0), v.p(x, y + d, z0)], darken(c, 0.08));
  if (windows && v.s > 0.12) {                       // window bands on the two visible faces
    const bands = Math.min(40, Math.floor(h / 1.1));
    const lit = night > 0.3;
    for (let i = 1; i < bands; i++) {
      const z = z0 + (i / bands) * h; const zz = z + 0.35;
      const seed = hash(x + ':' + y + ':' + i);
      const col = lit ? (seed > 0.45 ? 'rgba(255,214,120,.85)' : 'rgba(30,40,70,.6)') : 'rgba(255,255,255,.28)';
      poly(ctx, [v.p(x + 0.15, y + d, z), v.p(x + w - 0.15, y + d, z), v.p(x + w - 0.15, y + d, zz), v.p(x + 0.15, y + d, zz)], col);
      poly(ctx, [v.p(x + w, y + 0.15, z), v.p(x + w, y + d - 0.15, z), v.p(x + w, y + d - 0.15, zz), v.p(x + w, y + 0.15, zz)], lit ? (seed > 0.6 ? 'rgba(255,200,100,.7)' : 'rgba(20,30,60,.6)') : 'rgba(255,255,255,.18)');
    }
  }
  poly(ctx, [v.p(x, y, z1), v.p(x + w, y, z1), v.p(x + w, y + d, z1), v.p(x, y + d, z1)], lighten(c, 0.12), 'rgba(255,255,255,.25)');
  ctx.globalAlpha = 1;
}
const circle = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, 7); ctx.fillStyle = fill; ctx.fill(); };
const ellipse = (ctx, x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); };

// ---------- Sims-style character ----------
const SKIN = ['#f6d3b3', '#e8b48f', '#c98e64', '#a86b45', '#7a4a2c', '#5a3520'];
const HAIR = ['#2b1b12', '#5b3a1e', '#a0522d', '#e0b04c', '#1d1d1d', '#c2185b', '#6d4c41', '#b0b0b0'];
const SHIRT = ['#4dabf7', '#ff6b6b', '#51cf66', '#fcc419', '#845ef7', '#ff922b', '#20c997', '#f06595', '#339af0', '#343a40'];
const PANTS = ['#364fc7', '#495057', '#2b2b2b', '#7950f2', '#a5d8ff', '#e9ecef', '#5c940d'];
function drawPerson(ctx, x, y, u, look, phase, moving, plumbob, now) {
  const step = moving ? Math.sin(phase) : 0, bob = moving ? Math.abs(Math.sin(phase)) * 1.4 * u : 0;
  ellipse(ctx, x, y, 7 * u, 3 * u, 'rgba(0,0,0,.22)');
  y -= bob;
  ctx.lineCap = 'round';
  ctx.strokeStyle = look.pants; ctx.lineWidth = 3.4 * u;                     // legs
  ctx.beginPath(); ctx.moveTo(x - 2 * u, y - 10 * u); ctx.lineTo(x - 2 * u + step * 2.5 * u, y - 1 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2 * u, y - 10 * u); ctx.lineTo(x + 2 * u - step * 2.5 * u, y - 1 * u); ctx.stroke();
  ctx.fillStyle = look.shirt;                                                     // torso
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 5 * u, y - 21 * u, 10 * u, 12 * u, 3 * u) : ctx.rect(x - 5 * u, y - 21 * u, 10 * u, 12 * u); ctx.fill();
  ctx.strokeStyle = look.skin; ctx.lineWidth = 2.6 * u;                          // arms
  ctx.beginPath(); ctx.moveTo(x - 5 * u, y - 19 * u); ctx.lineTo(x - 6.5 * u - step * 1.5 * u, y - 11 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5 * u, y - 19 * u); ctx.lineTo(x + 6.5 * u + step * 1.5 * u, y - 11 * u); ctx.stroke();
  circle(ctx, x, y - 26 * u, 5.4 * u, look.skin);                                // head
  ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(x, y - 27 * u, 5.8 * u, Math.PI, 0); ctx.fill();
  if (look.long) { ctx.fillRect(x - 5.8 * u, y - 27 * u, 2.2 * u, 7 * u); ctx.fillRect(x + 3.6 * u, y - 27 * u, 2.2 * u, 7 * u); }
  circle(ctx, x - 1.9 * u, y - 25.5 * u, 0.8 * u, '#222'); circle(ctx, x + 1.9 * u, y - 25.5 * u, 0.8 * u, '#222');
  if (plumbob) {                                                                  // the green diamond
    const py = y - 40 * u + Math.sin(now / 400 + phase) * 1.5 * u, w = 3.6 * u * (0.6 + 0.4 * Math.abs(Math.cos(now / 600 + phase)));
    const g = plumbob === true ? '#40c057' : plumbob;
    poly(ctx, [[x, py - 6 * u], [x + w, py], [x, py + 6 * u], [x - w, py]], g, darken(g.startsWith('#') ? g : '#40c057', 0.3));
    poly(ctx, [[x, py - 6 * u], [x + w, py], [x, py]], 'rgba(255,255,255,.35)');
  }
}

function bubble(ctx, x, y, text, u, bg = '#fff') {
  ctx.font = `${Math.round(13 * Math.max(0.8, u))}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  const w = ctx.measureText(text).width + 10 * Math.max(0.8, u), h = 18 * Math.max(0.8, u);
  ctx.fillStyle = bg; ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h, w, h, h / 2) : ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y + 5); ctx.lineTo(x + 3, y); ctx.fill();
  ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + 1);
}

// ---------- the map ----------
export class CityMap {
  constructor(canvas, places, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.opts = opts;
    this.v = new View(); this.mode = 'street'; this.highlight = null; this.pick = null; this.hover = null;
    this.openFn = opts.isOpen || (() => true);
    this.build(places);
    this.bindInput(); this.resize(); this.fit();
    new ResizeObserver(() => this.resize()).observe(canvas);
    const loop = (t) => { try { this.frame(t); } catch (e) { console.warn(e); } this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  build(places) {
    const pts = places.filter((p) => p.lat && p.lng);
    const proj = makeProjector(pts);
    // streets from addresses
    const av = {}, cs = {};
    for (const p of pts) {
      const [x, y] = proj(p.lat, p.lng);
      const m = (p.address || '').match(/^\d+\s+(?:N\.?\s+|S\.?\s+)?(.+?)\s+(St|Ave|Avenue|Street|Pkwy|Blvd)\b/i);
      if (!m) continue; const nm = m[1].replace(/\./g, '').trim();
      const A = AVENUES.find((a) => a.toLowerCase() === nm.toLowerCase()), C = CROSS.find((c) => c.toLowerCase() === nm.toLowerCase());
      if (A) (av[A] = av[A] || []).push(x); else if (C) (cs[C] = cs[C] || []).push(y);
    }
    const med = (a) => { a = [...a].sort((p, q) => p - q); return a[a.length >> 1]; };
    // a building fronts the street but sits ~3 units into the block; nudge the line toward the street centre
    this.avenues = Object.entries(av).map(([n, xs]) => ({ n, x: med(xs) })).sort((a, b) => a.x - b.x);
    this.cross = Object.entries(cs).map(([n, ys]) => ({ n, y: med(ys) })).sort((a, b) => a.y - b.y);
    // drop near-duplicates (two names resolving to the same line)
    this.avenues = this.avenues.filter((a, i, arr) => i === 0 || a.x - arr[i - 1].x > 4);
    this.cross = this.cross.filter((c, i, arr) => i === 0 || c.y - arr[i - 1].y > 4);

    // places → spots (group exact same building)
    const groups = new Map();
    for (const p of pts) {
      let [x, y] = proj(p.lat, p.lng);
      const key = (p.tunnel ? 'T' : 'S') + Math.round(x * 2) / 2 + ':' + Math.round(y * 2) / 2;
      if (!groups.has(key)) groups.set(key, { x, y, tunnel: !!p.tunnel, places: [] });
      groups.get(key).places.push(p);
    }
    this.spots = [...groups.values()];
    // keep street-level spots out of the asphalt
    for (const s of this.spots) {
      for (const a of this.avenues) if (Math.abs(s.x - a.x) < 2.6) s.x = a.x + Math.sign(s.x - a.x || 1) * 2.6;
      for (const c of this.cross) if (Math.abs(s.y - c.y) < 2.6) s.y = c.y + Math.sign(s.y - c.y || 1) * 2.6;
      s.size = s.places.length > 6 ? 5 : s.places.length > 1 ? 3.6 : 2.6;
      s.style = styleFor(s.places[0]);
      s.isHall = s.places.length > 2;
      s.label = s.isHall ? (s.places.find((p) => /hall|post htx|finn|lyric/i.test(p.name))?.name || `${s.places.length} spots`) : s.places[0].name;
    }
    const xs = this.spots.map((s) => s.x), ys = this.spots.map((s) => s.y);
    this.bounds = { x0: Math.min(...xs) - 12, x1: Math.max(...xs) + 12, y0: Math.min(...ys) - 12, y1: Math.max(...ys) + 12 };
    if (!this.avenues.length || !this.cross.length) { // fallback grid
      for (let x = this.bounds.x0; x < this.bounds.x1; x += 10) this.avenues.push({ n: '', x });
      for (let y = this.bounds.y0; y < this.bounds.y1; y += 10) this.cross.push({ n: '', y });
    }
    this.buildBlocks();
    this.buildTunnels();
    this.spawnNpcs();
  }

  // filler skyline for blocks between streets
  buildBlocks() {
    const B = this.bounds, aX = this.avenues.map((a) => a.x), cY = this.cross.map((c) => c.y);
    const xsEdges = [B.x0, ...aX.filter((x) => x > B.x0 && x < B.x1), B.x1], ysEdges = [B.y0, ...cY.filter((y) => y > B.y0 && y < B.y1), B.y1];
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, R = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) / 2;
    this.blocks = []; this.towers = [];
    for (let i = 0; i < xsEdges.length - 1; i++) for (let j = 0; j < ysEdges.length - 1; j++) {
      const x0 = xsEdges[i] + 1.5, x1 = xsEdges[i + 1] - 1.5, y0 = ysEdges[j] + 1.5, y1 = ysEdges[j + 1] - 1.5;
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      this.blocks.push({ x0, x1, y0, y1 });
      const nx = (x1 - x0) > 9 ? 2 : 1, ny = (y1 - y0) > 9 ? 2 : 1;
      for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
        const lx0 = x0 + 0.6 + a * (x1 - x0) / nx, ly0 = y0 + 0.6 + b * (y1 - y0) / ny, w = (x1 - x0) / nx - 1.2, d = (y1 - y0) / ny - 1.2;
        if (w < 1.5 || d < 1.5) continue;
        if (this.spots.some((s) => !s.tunnel && s.x > lx0 - 1.5 && s.x < lx0 + w + 1.5 && s.y > ly0 - 1.5 && s.y < ly0 + d + 1.5)) continue;
        const r = hash(`${i}-${j}-${a}-${b}`), dist = Math.hypot((lx0 + w / 2) - cx, (ly0 + d / 2) - cy) / R;
        if (r < 0.12) { this.towers.push({ x: lx0, y: ly0, w, d, h: 0.15, c: '#7bc47f', park: true }); continue; }
        const h = Math.max(1.5, (1 - dist) * (8 + r * 24) + r * 3);
        this.towers.push({ x: lx0, y: ly0, w, d, h, c: ['#9bb7d4', '#b8c4d6', '#d8cdb8', '#a5b4c8', '#c9d6e3', '#8fa9c4', '#e0d6c8'][Math.floor(r * 7)] });
      }
    }
  }

  // tunnel network: minimum spanning tree over tunnel spots, drawn as L-shaped corridors
  buildTunnels() {
    const T = this.spots.filter((s) => s.tunnel);
    this.tunnelSpots = T; this.tunnelEdges = [];
    if (T.length < 2) return;
    const inTree = new Set([0]), dist = T.map((t) => Math.abs(t.x - T[0].x) + Math.abs(t.y - T[0].y)), from = T.map(() => 0);
    while (inTree.size < T.length) {
      let best = -1; for (let i = 0; i < T.length; i++) if (!inTree.has(i) && (best < 0 || dist[i] < dist[best])) best = i;
      inTree.add(best); this.tunnelEdges.push([from[best], best]);
      for (let i = 0; i < T.length; i++) if (!inTree.has(i)) { const d = Math.abs(T[i].x - T[best].x) + Math.abs(T[i].y - T[best].y); if (d < dist[i]) { dist[i] = d; from[i] = best; } }
    }
    this.tunnelAdj = T.map(() => []);
    for (const [a, b] of this.tunnelEdges) { this.tunnelAdj[a].push(b); this.tunnelAdj[b].push(a); }
  }

  spawnNpcs() {
    const n = Math.min(70, 25 + this.spots.length / 4);
    this.npcs = [];
    for (let i = 0; i < n; i++) this.npcs.push(this.newNpc(i, false));
    for (let i = 0; i < Math.min(30, this.tunnelSpots.length * 1.2); i++) this.npcs.push(this.newNpc(i + 1000, true));
  }
  newNpc(seed, under) {
    const r = (k) => hash(seed + ':' + k);
    const look = { skin: SKIN[Math.floor(r(1) * SKIN.length)], hair: HAIR[Math.floor(r(2) * HAIR.length)], shirt: SHIRT[Math.floor(r(3) * SHIRT.length)], pants: PANTS[Math.floor(r(4) * PANTS.length)], long: r(5) > 0.55 };
    const npc = { id: seed, under, look, phase: r(6) * 6, speed: 0.9 + r(7) * 0.7, wait: r(8) * 4, path: [], target: null, inside: 0, thought: null, thoughtT: 0 };
    if (under) { const s = this.tunnelSpots[Math.floor(r(9) * this.tunnelSpots.length)]; npc.x = s.x; npc.y = s.y; npc.node = this.tunnelSpots.indexOf(s); }
    else { const a = this.avenues[Math.floor(r(9) * this.avenues.length)], c = this.cross[Math.floor(r(10) * this.cross.length)]; npc.x = a.x; npc.y = c.y; }
    return npc;
  }
  chooseTarget(npc) {
    const pool = this.spots.filter((s) => s.tunnel === npc.under);
    if (!pool.length) return null;
    const w = pool.map((s) => {
      let k = 1 + s.places.length * 0.3;
      if (this.highlight) k *= s.places.some((p) => this.highlight.has(p.id)) ? 6 : 0.4;
      if (!s.places.some((p) => this.openFn(p))) k *= 0.15;
      if (this.pick && s.places.some((p) => p.id === this.pick)) k *= 8;
      return k;
    });
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }
  routeStreet(npc, t) {
    const near = (arr, v, key) => arr.reduce((b, a) => (Math.abs(a[key] - v) < Math.abs(b[key] - v) ? a : b))[key];
    const ax = near(this.avenues, npc.x, 'x'), cy = near(this.cross, t.y, 'y'), tx = near(this.avenues, t.x, 'x');
    const startOnAv = Math.abs(npc.x - ax) < 0.5;
    const pts = [];
    if (!startOnAv) pts.push([npc.x, near(this.cross, npc.y, 'y')], [ax, near(this.cross, npc.y, 'y')]);
    pts.push([ax, cy], [tx, cy], [tx, t.y], [t.x, t.y]);
    return pts;
  }
  routeTunnel(npc, goal) {
    const T = this.tunnelSpots, start = npc.node ?? 0, end = T.indexOf(goal);
    const prev = new Map([[start, -1]]), q = [start];
    while (q.length) { const c = q.shift(); if (c === end) break; for (const n of this.tunnelAdj[c]) if (!prev.has(n)) { prev.set(n, c); q.push(n); } }
    const nodes = []; for (let c = end; c !== -1 && c !== undefined; c = prev.get(c)) nodes.unshift(c);
    const pts = [];
    for (let i = 1; i < nodes.length; i++) { const a = T[nodes[i - 1]], b = T[nodes[i]]; pts.push([b.x, a.y], [b.x, b.y]); }
    npc.node = end;
    return pts;
  }
  stepNpcs(dt) {
    for (const n of this.npcs) {
      n.thoughtT -= dt;
      if (n.inside > 0) { n.inside -= dt; if (n.inside <= 0) n.thought = null; continue; }
      if (n.wait > 0) { n.wait -= dt; continue; }
      if (!n.path.length) {
        if (n.target) {                                                        // arrived: go inside for a meal
          n.inside = 4 + Math.random() * 10; n.lastVisit = n.target; n.target = null; continue;
        }
        const t = this.chooseTarget(n); if (!t) continue;
        n.target = t; n.path = (n.under ? this.routeTunnel(n, t) : this.routeStreet(n, t)).filter(Boolean);
        if (!n.path.length) { n.wait = 1 + Math.random() * 3; continue; }
        const pl = t.places[Math.floor(Math.random() * t.places.length)];
        n.thought = styleFor(pl).emoji; n.thoughtFor = pl; n.thoughtT = 3 + Math.random() * 3;
      }
      const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), sp = n.speed * dt * 2.2;
      if (d <= sp) { n.x = tx; n.y = ty; n.path.shift(); } else { n.x += dx / d * sp; n.y += dy / d * sp; }
      n.phase += dt * 9 * n.speed; n.moving = true;
    }
  }

  // ---------- view / input ----------
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height; this.cv.width = r.width * dpr; this.cv.height = r.height * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit() {
    const B = this.bounds, v = this.v; v.s = 1; v.ox = 0; v.oy = 0;
    const c = [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x0, B.y1), v.p(B.x1, B.y1)];
    const minx = Math.min(...c.map((p) => p[0])), maxx = Math.max(...c.map((p) => p[0])), miny = Math.min(...c.map((p) => p[1])), maxy = Math.max(...c.map((p) => p[1]));
    v.s = Math.min((this.W || 360) / (maxx - minx), (this.H || 500) / (maxy - miny)) * (this.fitAll ? 1.1 : 2.4);
    const [cx, cy] = [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2];
    const [px, py] = v.p(cx, cy); v.ox += (this.W || 360) / 2 - px; v.oy += (this.H || 500) / 2 - py;
  }
  focus(id) {
    const s = this.spots.find((s) => s.places.some((p) => p.id === id)); if (!s) return;
    if (s.tunnel && this.mode === 'street') this.setMode('both');
    const target = Math.max(this.v.s, 0.55);
    this.anim = { from: { s: this.v.s, x: this.v.ox, y: this.v.oy }, spot: s, s: target, t: 0 };
  }
  bindInput() {
    const cv = this.cv; let drag = null, pinch = null, moved = 0;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pointers = new Map();
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, pt(e)); moved = 0; if (pointers.size === 1) drag = { p: pt(e), ox: this.v.ox, oy: this.v.oy }; else { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: this.v.s }; drag = null; } this.anim = null; });
    cv.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) { this.hover = this.hit(...pt(e)); cv.style.cursor = this.hover ? 'pointer' : 'grab'; return; }
      pointers.set(e.pointerId, pt(e));
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.s * d / pinch.d / this.v.s); moved += 10; }
      else if (drag) { const p = pt(e); moved += Math.abs(p[0] - drag.p[0]) + Math.abs(p[1] - drag.p[1]); this.v.ox = drag.ox + p[0] - drag.p[0]; this.v.oy = drag.oy + p[1] - drag.p[1]; }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && moved < 8) { const h = this.hit(...pt(e)); if (h?.spot) this.opts.onSelect?.(h.spot.places, h.spot); else if (h?.npc) this.opts.onNpc?.(h.npc); }
      drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = pt(e); this.zoomAt(x, y, Math.exp(-e.deltaY * 0.0015)); this.anim = null; }, { passive: false });
  }
  zoomAt(x, y, k) {
    const ns = Math.min(3, Math.max(0.05, this.v.s * k)); k = ns / this.v.s;
    this.v.ox = x - (x - this.v.ox) * k; this.v.oy = y - (y - this.v.oy) * k; this.v.s = ns;
  }
  zoom(k) { this.zoomAt(this.W / 2, this.H / 2, k); }
  setMode(m) {
    const prev = this.mode; this.mode = m; this.opts.onMode?.(m);
    if (m === 'tunnel' && prev !== 'tunnel' && this.tunnelSpots.length && this.pick == null) {   // re-centre on the tunnel network
      const T = this.tunnelSpots, cx = T.reduce((a, s) => a + s.x, 0) / T.length, cy = T.reduce((a, s) => a + s.y, 0) / T.length;
      this.anim = { from: { s: this.v.s, x: this.v.ox, y: this.v.oy }, spot: { x: cx, y: cy, tunnel: true }, s: Math.max(this.v.s, 0.42), t: 0 };
    }
  }
  setHighlight(ids) { this.highlight = ids; }
  setPick(id) { this.pick = id; if (id != null) this.focus(id); }

  hit(sx, sy) {
    const under = this.mode === 'tunnel';
    const depth = (s) => (s.tunnel && this.mode !== 'street' ? this.tunnelZ() : 0);
    // NPCs first (they're small and on top)
    for (const n of this.npcs) {
      if (n.inside > 0 || (n.under ? this.mode === 'street' : under)) continue;
      const [x, y] = this.v.p(n.x, n.y, n.under ? this.tunnelZ() : 0), u = this.u();
      if (Math.abs(sx - x) < 8 * u + 4 && sy < y + 3 && sy > y - 32 * u) return { npc: n };
    }
    let best = null, bd = 1e9;
    for (const s of this.spots) {
      if (s.tunnel ? this.mode === 'street' : under) continue;
      const [x, y] = this.v.p(s.x, s.y, depth(s) + (s.tunnel ? 0.5 : 1.2));
      const d = Math.hypot(sx - x, sy - y), r = Math.max(14, s.size * TW * this.v.s * 0.5);
      if (d < r && d < bd) { bd = d; best = s; }
    }
    return best ? { spot: best } : null;
  }
  u() { return Math.min(1.25, Math.max(0.45, this.v.s * 2.6)); }
  tunnelZ() { return this.mode === 'tunnel' ? 0 : -3.2; }
  nightAmount(d = new Date()) { const h = d.getHours() + d.getMinutes() / 60; return h < 6 ? 1 : h < 8 ? (8 - h) / 2 : h < 18 ? 0 : h < 20 ? (h - 18) / 2 : 1; }

  // ---------- drawing ----------
  frame(t) {
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t;
    if (this.anim) {
      const a = this.anim; a.t = Math.min(1, a.t + dt * 1.6); const e = 1 - Math.pow(1 - a.t, 3);
      const s = a.from.s + (a.s - a.from.s) * e; this.v.s = s; this.v.ox = 0; this.v.oy = 0;
      const z = a.spot.tunnel && this.mode !== 'street' ? this.tunnelZ() : 0;
      const [px, py] = this.v.p(a.spot.x, a.spot.y, z), tx = this.W / 2 - px, ty = this.H * 0.55 - py;
      this.v.ox = a.from.x + (tx - a.from.x) * e; this.v.oy = a.from.y + (ty - a.from.y) * e;
      if (a.t >= 1) this.anim = null;
    }
    this.stepNpcs(dt);
    this.draw(t);
  }

  draw(now) {
    const ctx = this.ctx, v = this.v, B = this.bounds, night = this.nightAmount(), mode = this.mode;
    const underView = mode === 'tunnel';
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    if (underView) { g.addColorStop(0, '#10131f'); g.addColorStop(1, '#1b2033'); }
    else { g.addColorStop(0, night > 0.5 ? '#141a35' : '#bfe3ff'); g.addColorStop(1, night > 0.5 ? '#2a2550' : '#fdf3e7'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);

    if (underView) { this.drawTunnels(now, true); return; }

    // ground plate
    const tz = 0, plateA = mode === 'both' ? 0.35 : 1;
    ctx.globalAlpha = plateA;
    poly(ctx, [v.p(B.x0, B.y1, tz), v.p(B.x1, B.y1, tz), v.p(B.x1, B.y1, tz - 1), v.p(B.x0, B.y1, tz - 1)], '#8a8f98');
    poly(ctx, [v.p(B.x1, B.y0, tz), v.p(B.x1, B.y1, tz), v.p(B.x1, B.y1, tz - 1), v.p(B.x1, B.y0, tz - 1)], '#6c717a');
    poly(ctx, [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x1, B.y1), v.p(B.x0, B.y1)], night > 0.5 ? '#3a3f4b' : '#cfd4da');
    // blocks (sidewalk) and streets
    for (const b of this.blocks) poly(ctx, [v.p(b.x0, b.y0), v.p(b.x1, b.y0), v.p(b.x1, b.y1), v.p(b.x0, b.y1)], night > 0.5 ? '#4a505c' : '#e9ecef');
    ctx.globalAlpha = 1;
    const road = night > 0.5 ? '#23262e' : '#5d636e';
    for (const a of this.avenues) poly(ctx, [v.p(a.x - 1.2, B.y0), v.p(a.x + 1.2, B.y0), v.p(a.x + 1.2, B.y1), v.p(a.x - 1.2, B.y1)], road);
    for (const c of this.cross) poly(ctx, [v.p(B.x0, c.y - 1.2), v.p(B.x1, c.y - 1.2), v.p(B.x1, c.y + 1.2), v.p(B.x0, c.y + 1.2)], road);
    if (v.s > 0.14) {                                     // lane markings
      ctx.setLineDash([4 * v.s * 8, 6 * v.s * 8]); ctx.strokeStyle = 'rgba(255,220,120,.6)'; ctx.lineWidth = Math.max(0.5, v.s * 2);
      for (const a of this.avenues) { ctx.beginPath(); ctx.moveTo(...v.p(a.x, B.y0)); ctx.lineTo(...v.p(a.x, B.y1)); ctx.stroke(); }
      for (const c of this.cross) { ctx.beginPath(); ctx.moveTo(...v.p(B.x0, c.y)); ctx.lineTo(...v.p(B.x1, c.y)); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    // in "both" the tunnel level shows through a see-through street level
    if (mode === 'both') {
      for (const s of this.tunnelSpots) { const [x, y] = v.p(s.x, s.y); ellipse(ctx, x, y, 5 * this.u(), 2.5 * this.u(), 'rgba(32,201,151,.55)'); const [x2, y2] = v.p(s.x, s.y, this.tunnelZ() + 1.1); ctx.strokeStyle = 'rgba(56,217,169,.35)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); }
    }

    // depth-sorted drawables
    const items = [];
    for (const tw of this.towers) items.push({ k: tw.x + tw.w / 2 + tw.y + tw.d / 2, t: 0, o: tw });
    for (const s of this.spots) if (!s.tunnel) items.push({ k: s.x + s.y, t: 1, o: s });
    for (const n of this.npcs) if (!n.under && n.inside <= 0) items.push({ k: n.x + n.y + 0.01, t: 2, o: n });
    items.sort((a, b) => a.k - b.k);
    const hl = this.highlight;
    for (const it of items) {
      if (it.t === 0) { const o = it.o; box(ctx, v, o.x, o.y, o.w, o.d, o.h, night > 0.5 ? darken(o.c, 0.45) : o.c, 0, mode === 'both' ? 0.55 : o.park ? 1 : 0.96, o.park ? 0 : 1, night); if (o.park && v.s > 0.15) this.trees(o); }
      else if (it.t === 1) this.drawSpot(it.o, now, night, 0, hl);
      else this.drawNpc(it.o, now, 0);
    }
    if (mode === 'both') {                              // x-ray: tunnel level drawn over the see-through city
      ctx.fillStyle = 'rgba(16,19,31,.35)'; ctx.fillRect(0, 0, this.W, this.H);
      this.drawTunnels(now, false);
    }
    this.drawStreetLabels(night);
    if (night > 0) { ctx.fillStyle = `rgba(20,24,60,${0.18 * night})`; ctx.fillRect(0, 0, this.W, this.H); }
    this.drawPickBeacon(now);
  }

  trees(o) {
    const ctx = this.ctx, v = this.v;
    for (let i = 0; i < 3; i++) { const tx = o.x + o.w * (0.25 + 0.25 * i), ty = o.y + o.d * (0.3 + 0.2 * ((i * 7) % 3)); const [x, y] = v.p(tx, ty); circle(ctx, x, y - 10 * v.s * 2, 7 * v.s * 2.4, '#2f9e44'); circle(ctx, x - 2 * v.s * 2, y - 13 * v.s * 2, 4 * v.s * 2.4, '#51cf66'); }
  }

  drawSpot(s, now, night, z, hl) {
    const ctx = this.ctx, v = this.v, w = s.size, h = s.isHall ? 2.4 : 1.6;
    const matched = !hl || s.places.some((p) => hl.has(p.id));
    const open = s.places.some((p) => this.openFn(p));
    const alpha = matched ? 1 : 0.35;
    const base = s.isHall ? '#f1e3c8' : lighten(s.style.color, 0.55);
    const x = s.x - w / 2, y = s.y - w / 2;
    if (matched && hl) { const [cx, cy] = v.p(s.x, s.y, z); ellipse(ctx, cx, cy, w * TW * v.s * 0.75, w * TH * v.s * 0.75, 'rgba(255,212,59,.35)'); }
    box(ctx, v, x, y, w, w, h, base, z, alpha);
    // awning on the two street faces
    ctx.globalAlpha = alpha;
    const aw = s.style.color;
    for (let i = 0; i < 6; i++) {
      const c = i % 2 ? '#fff' : aw, f0 = i / 6, f1 = (i + 1) / 6;
      poly(ctx, [v.p(x + w * f0, y + w, z + h * 0.72), v.p(x + w * f1, y + w, z + h * 0.72), v.p(x + w * f1, y + w + 0.5, z + h * 0.5), v.p(x + w * f0, y + w + 0.5, z + h * 0.5)], c);
      poly(ctx, [v.p(x + w, y + w * f0, z + h * 0.72), v.p(x + w, y + w * f1, z + h * 0.72), v.p(x + w + 0.5, y + w * f1, z + h * 0.5), v.p(x + w + 0.5, y + w * f0, z + h * 0.5)], c);
    }
    // lit doorway
    const door = open ? (night > 0.3 ? '#ffd43b' : '#fff3bf') : '#495057';
    poly(ctx, [v.p(x + w * 0.4, y + w, z), v.p(x + w * 0.6, y + w, z), v.p(x + w * 0.6, y + w, z + h * 0.45), v.p(x + w * 0.4, y + w, z + h * 0.45)], door);
    ctx.globalAlpha = 1;
    // sign
    const [sx, sy] = v.p(s.x, s.y, z + h + 0.4), u = this.u();
    if (v.s > 0.08 || matched) {
      const label = s.isHall ? `${s.style.emoji} ${s.places.length}` : s.style.emoji;
      bubble(ctx, sx, sy - 2, label, u * 0.9, matched ? (open ? '#fff' : '#e9ecef') : 'rgba(255,255,255,.6)');
      if (v.s > 0.42 || this.hover?.spot === s) { ctx.font = `600 ${Math.round(11 * Math.max(0.85, u))}px system-ui, sans-serif`; ctx.fillStyle = night > 0.5 ? '#fff' : '#212529'; ctx.textAlign = 'center'; ctx.fillText(s.label.length > 26 ? s.label.slice(0, 25) + '…' : s.label, sx, sy - 24 * u); }
    }
  }

  drawNpc(n, now, z) {
    const [x, y] = this.v.p(n.x, n.y, z), u = this.u();
    if (x < -40 || y < -60 || x > this.W + 40 || y > this.H + 40) return;
    const pickColor = this.pick != null && n.target?.places.some((p) => p.id === this.pick) ? '#fcc419' : true;
    drawPerson(this.ctx, x, y, u * 0.75, n.look, n.phase, !!n.path.length && n.wait <= 0, pickColor, now);
    if (n.thought && n.thoughtT > 0) bubble(this.ctx, x + 10 * u, y - 36 * u, n.thought, u * 0.8);
  }

  drawTunnels(now, underView) {
    const ctx = this.ctx, v = this.v, z = this.tunnelZ(), T = this.tunnelSpots, u = this.u();
    if (!T.length) return;
    const B = this.bounds;
    if (underView) {                                   // dim ghost of the street grid for orientation
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
      for (const a of this.avenues) { ctx.beginPath(); ctx.moveTo(...v.p(a.x, B.y0)); ctx.lineTo(...v.p(a.x, B.y1)); ctx.stroke(); }
      for (const c of this.cross) { ctx.beginPath(); ctx.moveTo(...v.p(B.x0, c.y)); ctx.lineTo(...v.p(B.x1, c.y)); ctx.stroke(); }
      for (const tw of this.towers) if (!tw.park) poly(ctx, [v.p(tw.x, tw.y), v.p(tw.x + tw.w, tw.y), v.p(tw.x + tw.w, tw.y + tw.d), v.p(tw.x, tw.y + tw.d)], null, 'rgba(255,255,255,.05)');
    }
    // corridors
    const seg = (ax, ay, bx, by) => {
      const w = 0.9, x0 = Math.min(ax, bx) - w, x1 = Math.max(ax, bx) + w, y0 = Math.min(ay, by) - w, y1 = Math.max(ay, by) + w;
      poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], '#3b4a63');
      poly(ctx, [v.p(x0, y1, z), v.p(x1, y1, z), v.p(x1, y1, z + 0.6), v.p(x0, y1, z + 0.6)], '#2c3850');
    };
    for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b]; seg(A.x, A.y, Bn.x, A.y); seg(Bn.x, A.y, Bn.x, Bn.y); }
    // glowing guide line
    ctx.strokeStyle = 'rgba(56,217,169,.8)'; ctx.lineWidth = Math.max(1, v.s * 3); ctx.shadowColor = '#38d9a9'; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b]; ctx.moveTo(...v.p(A.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, Bn.y, z)); }
    ctx.stroke(); ctx.shadowBlur = 0;
    // kiosks + NPCs sorted
    const items = T.map((s) => ({ k: s.x + s.y, s })).concat(this.npcs.filter((n) => n.under && n.inside <= 0).map((n) => ({ k: n.x + n.y + 0.01, n })));
    items.sort((a, b) => a.k - b.k);
    const hl = this.highlight;
    for (const it of items) {
      if (it.n) { this.drawNpc(it.n, now, z); continue; }
      const s = it.s, matched = !hl || s.places.some((p) => hl.has(p.id)), open = s.places.some((p) => this.openFn(p));
      const w = Math.min(3.2, s.size), x = s.x - w / 2, y = s.y - w / 2;
      box(ctx, v, x, y, w, w, 1.1, open ? '#20c997' : '#5c677d', z, matched ? 1 : 0.35);
      if (open) { const [cx, cy] = v.p(s.x, s.y, z + 1.1); circle(ctx, cx, cy, 2 * u, '#c3fae8'); }
      const [sx, sy] = v.p(s.x, s.y, z + 1.6);
      bubble(ctx, sx, sy, (s.places.length > 1 ? s.places.length + ' ' : '') + s.style.emoji, u * 0.85, matched ? (open ? '#e6fcf5' : '#ced4da') : 'rgba(255,255,255,.5)');
      if (underView && (v.s > 0.75 || this.hover?.spot === s)) { ctx.font = `600 ${Math.round(11 * Math.max(0.85, u))}px system-ui, sans-serif`; ctx.fillStyle = '#e6fcf5'; ctx.textAlign = 'center'; ctx.fillText(s.label.slice(0, 26), sx, sy - 22 * u); }
    }
  }

  drawStreetLabels(night) {
    if (this.v.s < 0.1) return;
    const ctx = this.ctx, v = this.v, B = this.bounds;
    ctx.font = `700 ${Math.round(Math.min(13, 9 + v.s * 6))}px system-ui, sans-serif`; ctx.fillStyle = night > 0.5 ? 'rgba(255,255,255,.75)' : 'rgba(33,37,41,.7)'; ctx.textAlign = 'center';
    for (const a of this.avenues) { const [x, y] = v.p(a.x, B.y0 + 3); ctx.fillText(a.n, x, y); }
    for (const c of this.cross) { const [x, y] = v.p(B.x0 + 3, c.y); ctx.fillText(c.n, x, y); }
  }
  drawLabelsTunnel() {
    const ctx = this.ctx; ctx.font = '700 12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(195,250,232,.8)'; ctx.textAlign = 'left';
    ctx.fillText('🚇 Downtown tunnel system — mostly weekdays, roughly 6:30am–6pm', 12, this.H - 14);
  }
  drawPickBeacon(now) {
    if (this.pick == null) return;
    const s = this.spots.find((s) => s.places.some((p) => p.id === this.pick)); if (!s || (s.tunnel && this.mode === 'street')) return;
    const z = s.tunnel ? this.tunnelZ() : 0, [x, y] = this.v.p(s.x, s.y, z + 3), u = this.u();
    const py = y - 30 * u + Math.sin(now / 300) * 5 * u, w = 9 * u * (0.5 + 0.5 * Math.abs(Math.cos(now / 500)));
    const ctx = this.ctx; ctx.shadowColor = '#69db7c'; ctx.shadowBlur = 18;
    poly(ctx, [[x, py - 16 * u], [x + w, py], [x, py + 16 * u], [x - w, py]], '#51cf66', '#2b8a3e', 1.5); ctx.shadowBlur = 0;
    poly(ctx, [[x, py - 16 * u], [x + w, py], [x, py]], 'rgba(255,255,255,.4)');
  }
}
