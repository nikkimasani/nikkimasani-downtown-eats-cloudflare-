// Downtown Eats — isometric downtown Houston with Sims-style NPCs.
// The street grid is rebuilt from address numbers: downtown Houston numbers each block by
// hundreds along both street directions, so every street (even ones with no restaurants) can be
// placed. Landmarks sit on their real blocks. Restaurants are pins inside buildings; zoomed out
// they collapse into one badge per block so the city stays calm.

const TW = 32, TH = 16, ZU = 8.5;   // heights drawn ~60% of true scale so towers don't swallow the map          // px per unit at zoom 1 (1 unit = 10 m)
const M_LAT = 110850, M_LNG = 96680;
const MAIN_A = [29.763689, -95.359828], MAIN_B = [29.751043, -95.368924];
// west → east (parallel to Main)
const AVENUES = ['Bagby', 'Brazos', 'Smith', 'Louisiana', 'Milam', 'Travis', 'Main', 'Fannin', 'San Jacinto', 'Caroline', 'Austin', 'La Branch', 'Crawford', 'Jackson', 'Chenevert', 'Hamilton'];
// north → south
const CROSS = ['Commerce', 'Franklin', 'Congress', 'Preston', 'Prairie', 'Texas', 'Capitol', 'Rusk', 'Walker', 'McKinney', 'Lamar', 'Dallas', 'Polk', 'Clay', 'Bell', 'Leeland', 'Pease', 'Jefferson', 'Pierce'];
const MAJOR = new Set(['Main', 'Louisiana', 'Smith', 'Travis', 'Milam', 'Fannin', 'La Branch', 'Crawford', 'Texas', 'Prairie', 'McKinney', 'Walker', 'Lamar', 'Polk', 'Pierce', 'Franklin']);

// landmarks on their real blocks: [westAvenue, eastAvenue, northCross, southCross]; h in 10 m units
const LANDMARKS = [
  { n: 'JPMorgan Chase Tower', b: ['Milam', 'Travis', 'Texas', 'Capitol'], h: 30.5, kind: 'chase', c: '#8d99a6' },
  { n: 'Wells Fargo Plaza', b: ['Smith', 'Louisiana', 'McKinney', 'Lamar'], h: 30.2, kind: 'glass', c: '#6f9fae' },
  { n: 'TC Energy Center', b: ['Smith', 'Louisiana', 'Capitol', 'Rusk'], h: 23.8, kind: 'gable', c: '#b5715e' },
  { n: 'Pennzoil Place', b: ['Louisiana', 'Milam', 'Capitol', 'Rusk'], h: 15.8, kind: 'twin', c: '#4b5563' },
  { n: 'Heritage Plaza', b: ['Bagby', 'Brazos', 'Lamar', 'Dallas'], h: 23.2, kind: 'mayan', c: '#c7bfae' },
  { n: 'One Shell Plaza', b: ['Louisiana', 'Milam', 'Walker', 'McKinney'], h: 21.8, kind: 'box', c: '#ece6da' },
  { n: '609 Main', b: ['Main', 'Fannin', 'Texas', 'Capitol'], h: 23.0, kind: 'glass', c: '#7fa7c4' },
  { n: 'Bank of America Tower', b: ['Milam', 'Travis', 'Capitol', 'Rusk'], h: 21.3, kind: 'glass', c: '#9fb6c8' },
  { n: 'Chevron Tower', b: ['Smith', 'Louisiana', 'Bell', 'Leeland'], h: 22.6, kind: 'stepped', c: '#a8b3bd' },
  { n: '1600 Smith', b: ['Brazos', 'Smith', 'Bell', 'Leeland'], h: 22.0, kind: 'glass', c: '#8aa0b4' },
  { n: 'Hilton Americas', b: ['Austin', 'La Branch', 'Lamar', 'Dallas'], h: 10.2, kind: 'box', c: '#d8cbb8' },
  { n: 'Marriott Marquis', b: ['La Branch', 'Crawford', 'Walker', 'McKinney'], h: 10.6, kind: 'box', c: '#d2d7de' },
  { n: 'City Hall', b: ['Bagby', 'Brazos', 'Walker', 'McKinney'], h: 3.8, kind: 'box', c: '#e3dccd', half: true },
  { n: 'Jones Hall', b: ['Smith', 'Louisiana', 'Texas', 'Capitol'], h: 4.6, kind: 'theater', c: '#cfae8a' },
  { n: 'Alley Theatre', b: ['Smith', 'Louisiana', 'Prairie', 'Texas'], h: 4.2, kind: 'theater', c: '#b99272' },
  { n: 'Wortham Center', b: ['Brazos', 'Smith', 'Prairie', 'Texas'], h: 5, kind: 'theater', c: '#b07a60' },
  { n: 'Bayou Place', b: ['Brazos', 'Smith', 'Texas', 'Capitol'], h: 2.6, kind: 'theater', c: '#d8b48e' },
  { n: 'Central Library', b: ['Brazos', 'Smith', 'McKinney', 'Lamar'], h: 3.6, kind: 'box', c: '#e5dbc4' },
  { n: 'Christ Church Cathedral', b: ['Fannin', 'San Jacinto', 'Prairie', 'Texas'], h: 2.6, kind: 'church', c: '#c8b9a0', half: true },
  { n: 'Hobby Center', b: ['W', 'Bagby', 'Rusk', 'Walker'], h: 4.4, kind: 'theater', c: '#c4a27c' },
  { n: 'Downtown Aquarium', b: ['W', 'Bagby', 'Congress', 'Prairie'], h: 2.4, kind: 'aquarium', c: '#7fb4c9' },
];
const AREAS = [
  { n: 'Discovery Green', b: ['La Branch', 'Crawford', 'McKinney', 'Lamar'], kind: 'park', grow: [0, 1.2, 0, 0] },
  { n: 'Market Square Park', b: ['Milam', 'Travis', 'Congress', 'Preston'], kind: 'park' },
  { n: 'Hermann Square', b: ['Bagby', 'Brazos', 'Walker', 'McKinney'], kind: 'park', half: 'east' },
  { n: 'Main Street Square', b: ['Main', 'Fannin', 'Lamar', 'Dallas'], kind: 'plaza', half: 'west' },
  { n: 'Daikin Park', b: ['Crawford', 'Hamilton', 'Congress', 'Texas'], kind: 'ballpark' },
  { n: 'Toyota Center', b: ['La Branch', 'Crawford', 'Polk', 'Bell'], kind: 'arena' },
  { n: 'George R. Brown Convention Center', b: ['Jackson', 'Hamilton', 'Rusk', 'Polk'], kind: 'grb' },
  { n: 'Sam Houston Park', b: ['W', 'Bagby', 'McKinney', 'Dallas'], kind: 'park' },
];
// METRORail (stations from METRO / Wikipedia). Red Line runs down the middle of Main St; the Green and
// Purple lines share one eastbound track on Capitol and one westbound track on Rusk, from Smith St east.
const RED_STATIONS = [
  { n: 'UH–Downtown', at: 'bayouNorth' }, { n: 'Preston', at: ['Preston'] }, { n: 'Central Station Main', num: 714 },
  { n: 'Main Street Square', at: ['Walker', 'McKinney', 'Lamar', 'Dallas'] }, { n: 'Bell', at: ['Clay', 'Bell', 'Leeland'] },
  { n: 'Downtown Transit Center', at: 'south' },
];
const GP_STATIONS = [{ n: 'Theater District', av: 'Smith' }, { n: 'Central Station Capitol / Rusk', num: 1115 }, { n: 'Convention District', av: 'Jackson' }];
const SUFFIX = (n) => n === 'Texas' ? 'Texas Ave' : n + ' St';
export const STREETS = { avenues: AVENUES, cross: CROSS, full: SUFFIX };

// "Main & Texas", "main and texas st", "corner of Fannin/Walker", "San Jac @ Rusk", or an address like "1000 Main"
export function parseStreetQuery(q) {
  const f = (x) => String(x).toLowerCase().replace(/[^a-z0-9 &/@,]/g, ' ').replace(/\b(street|st|avenue|ave|av|blvd)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const lev = (a, b) => { const m = a.length, n = b.length; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; };
  const street = (t) => {
    const w = t.replace(/ /g, ''); if (w.length < 3) return null; let best = null, bd = 9;
    for (const n of [...AVENUES, ...CROSS]) { const k = norm(n), d = k === w ? 0 : k.startsWith(w) && w.length >= 4 ? 0.5 : w.length >= 5 ? lev(w, k) : 9; if (d < bd && d <= (w.length >= 7 ? 2 : 1)) { bd = d; best = n; } }
    return best;
  };
  let t = f(q).replace(/^(the )?(corner|intersection) of /, '');
  const addr = t.match(/^(\d{2,4}) (?:n |north )?([a-z ]+)$/);
  if (addr) { const st = street(addr[2]); if (st) return { kind: 'address', num: +addr[1], street: st, label: `${addr[1]} ${SUFFIX(st)}` }; }
  const parts = t.split(/ ?(?:&|\/|@|,| and | at | x ) ?/).map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const a = street(parts[0]), b = street(parts[1]); if (!a || !b) return null;
  const av = AVENUES.includes(a) ? a : AVENUES.includes(b) ? b : null, cs = CROSS.includes(a) ? a : CROSS.includes(b) ? b : null;
  if (!av || !cs) return { kind: 'parallel', a, b, label: `${SUFFIX(a)} and ${SUFFIX(b)} run parallel — they never meet` };
  return { kind: 'corner', av, cs, label: `${SUFFIX(av)} & ${SUFFIX(cs)}` };
}

// ---------- helpers ----------
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, t, to = 255) => '#' + rgb(h).map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
const lighten = (h, t) => mix(h, t, 255), darken = (h, t) => mix(h, t, 0);
const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

export const CUISINE_STYLE = [
  [/mexican|tex-mex|latin|taco/i, '#e8590c', '🌮'], [/bbq|barbecue/i, '#a0522d', '🍖'], [/steak/i, '#9c2f3f', '🥩'],
  [/seafood|poke|fish/i, '#1c7ed6', '🦐'], [/sushi|japanese/i, '#d6336c', '🍣'], [/asian|chinese|thai|vietnam|filipino|dumpling/i, '#e67700', '🥢'],
  [/italian|pizza/i, '#2b8a3e', '🍕'], [/french|bakery|dessert|boba|sweet/i, '#ae3ec9', '🥐'], [/coffee|tea/i, '#7c5b4a', '☕'],
  [/juice|smoothie|salad|bowl|healthy/i, '#37b24d', '🥗'], [/burger|american|deli|sandwich|fast|hot dog/i, '#f08c00', '🍔'],
  [/bar|pub|lounge/i, '#7048e8', '🍸'], [/cajun|southern|soul/i, '#c92a2a', '🍗'], [/mediterranean|indian|international|african/i, '#0c8599', '🥙'],
];
export function styleFor(p) {
  const key = [p.type, ...(p.cuisines || [])].join(' ');
  for (const [re, c, e] of CUISINE_STYLE) if (re.test(key)) return { color: c, emoji: e };
  return { color: '#868e96', emoji: '🍽️' };
}
function lsq(pts) {
  const n = pts.length; if (n < 2) return null;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, sxy = 0; for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  const b = sxy / (sxx || 1); return { a: my - b * mx, b };
}
const median = (a) => { a = [...a].sort((p, q) => p - q); return a[a.length >> 1]; };

// The view can spin a full 360°: world points are rotated about a pivot, then drawn isometric.
export class View {
  constructor() { this.s = 0.3; this.ox = 0; this.oy = 0; this.cx = 0; this.cy = 0; this.setRot(0); }
  setRot(r) { const T = Math.PI * 2; this.r = ((r % T) + T) % T; this.c = Math.cos(this.r); this.sn = Math.sin(this.r); }
  p(x, y, z = 0) {
    const dx = x - this.cx, dy = y - this.cy, X = dx * this.c - dy * this.sn, Y = dx * this.sn + dy * this.c;
    return [(X - Y) * TW / 2 * this.s + this.ox, (X + Y) * TH / 2 * this.s - z * ZU * this.s + this.oy];
  }
  depth(x, y) { const dx = x - this.cx, dy = y - this.cy; return dx * (this.c + this.sn) + dy * (this.c - this.sn); }
  boxDepth(x, y, w, d) { return Math.max(this.depth(x, y), this.depth(x + w, y), this.depth(x, y + d), this.depth(x + w, y + d)); }
  vis(nx, ny) { const X = nx * this.c - ny * this.sn, Y = nx * this.sn + ny * this.c; return [X + Y, X - Y]; }   // [faces viewer, faces right]
}
// the four side faces of a box: [normal x, normal y, corner a, corner b] in unit-box coordinates
const FACES = [[1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 1], [-1, 0, 0, 0, 0, 1], [0, -1, 0, 0, 1, 0]];
function sides(v, x, y, w, d) {
  const out = [];
  for (const [nx, ny, ax, ay, bx, by] of FACES) {
    const [f, r] = v.vis(nx, ny); if (f <= 0.0001) continue;
    out.push({ a: [x + ax * w, y + ay * d], b: [x + bx * w, y + by * d], n: [nx, ny], f, shade: 0.135 + 0.065 * r / Math.SQRT2 });
  }
  return out;
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
const circle = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, 7); ctx.fillStyle = fill; ctx.fill(); };
const ellipse = (ctx, x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); };

function box(ctx, v, x, y, w, d, h, c, z0 = 0, o = {}) {
  const z1 = z0 + h; ctx.globalAlpha = o.alpha ?? 1;
  for (const f of sides(v, x, y, w, d)) {
    poly(ctx, [v.p(...f.a, z1), v.p(...f.b, z1), v.p(...f.b, z0), v.p(...f.a, z0)], darken(c, f.shade));
    const len = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    if (o.mullions && v.s > 0.28) {
      ctx.strokeStyle = o.night ? 'rgba(255,214,140,.35)' : 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
      const n = Math.max(2, Math.round(len * 1.2)); ctx.beginPath();
      for (let i = 1; i < n; i++) { const q = lerp2(f.a, f.b, i / n); ctx.moveTo(...v.p(...q, z0 + 0.4)); ctx.lineTo(...v.p(...q, z1 - 0.2)); }
      ctx.stroke();
    }
    if (o.night && !o.mullions && h > 2 && v.s > 0.28) {
      for (let i = 0; i < Math.min(14, h * 0.8); i++) {
        const r = hash(x + ',' + y + ',' + i + f.n), zz = z0 + 0.6 + r * (h - 1.2), t = 0.1 + hash(i + ':' + x + f.n) * 0.8, t2 = Math.min(1, t + 0.35 / Math.max(len, 0.5));
        if (r > 0.5) { const q1 = lerp2(f.a, f.b, t), q2 = lerp2(f.a, f.b, t2); poly(ctx, [v.p(...q1, zz), v.p(...q2, zz), v.p(...q2, zz + 0.3), v.p(...q1, zz + 0.3)], 'rgba(255,212,120,.85)'); }
      }
    }
  }
  if (!o.noTop) poly(ctx, [v.p(x, y, z1), v.p(x + w, y, z1), v.p(x + w, y + d, z1), v.p(x, y + d, z1)], o.top || lighten(c, 0.1), 'rgba(255,255,255,.18)');
  ctx.globalAlpha = 1;
}
// a band (stripe, window row) painted on every visible side of a box
function band(ctx, v, x, y, w, d, z0, z1, col, inset = 0.12) {
  for (const f of sides(v, x, y, w, d)) {
    const len = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]), k = Math.min(0.45, inset / Math.max(len, 0.01));
    const a = lerp2(f.a, f.b, k), b = lerp2(f.a, f.b, 1 - k);
    poly(ctx, [v.p(...a, z0), v.p(...b, z0), v.p(...b, z1), v.p(...a, z1)], col);
  }
}
function pyramid(ctx, v, x, y, w, d, z, h, c) {
  const ap = v.p(x + w / 2, y + d / 2, z + h);
  for (const f of sides(v, x, y, w, d)) poly(ctx, [v.p(...f.a, z), v.p(...f.b, z), ap], darken(c, f.shade));
}
// a box whose top is a sloped plane: hs = heights at corners (x,y) (x+w,y) (x+w,y+d) (x,y+d)
function prism(ctx, v, x, y, w, d, z, hs, c, topCol) {
  const C = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], H = (q) => hs[C.findIndex((k) => k[0] === q[0] && k[1] === q[1])] ?? 0;
  for (const f of sides(v, x, y, w, d)) { const ha = H(f.a), hb = H(f.b); if (ha <= 0 && hb <= 0) continue; poly(ctx, [v.p(...f.a, z), v.p(...f.b, z), v.p(...f.b, z + hb), v.p(...f.a, z + ha)], darken(c, f.shade)); }
  poly(ctx, C.map((q, i) => v.p(q[0], q[1], z + hs[i])), topCol);
}
function gableRoof(ctx, v, x, y, w, d, z, h, c) {
  const halves = [];
  for (let i = 0; i < 3; i++) {
    const gx = x + i * w / 3, gw = w / 3, hr = h * (i === 1 ? 1.25 : 1);
    halves.push([gx, gw / 2, [0, hr, hr, 0], -1], [gx + gw / 2, gw / 2, [hr, 0, 0, hr], 1]);
  }
  halves.sort((a, b) => v.depth(a[0] + a[1] / 2, y + d / 2) - v.depth(b[0] + b[1] / 2, y + d / 2));
  for (const [hx, hw, hs, nx] of halves) { const [, r] = v.vis(nx, 0); prism(ctx, v, hx, y, hw, d, z, hs, c, darken(c, 0.12 + 0.08 * r / Math.SQRT2)); }
}
function wedgeTop(ctx, v, x, y, w, d, z, h, c, flip) {
  prism(ctx, v, x, y, w, d, z, flip ? [h, 0, 0, h] : [0, h, h, 0], c, lighten(c, 0.12));
}

// ---------- Sims-style character ----------
const SKIN = ['#f6d3b3', '#e8b48f', '#c98e64', '#a86b45', '#7a4a2c', '#5a3520'];
const HAIR = ['#2b1b12', '#5b3a1e', '#a0522d', '#e0b04c', '#1d1d1d', '#6d4c41', '#b0b0b0'];
const SHIRT = ['#4dabf7', '#ff8787', '#69db7c', '#ffd43b', '#9775fa', '#ffa94d', '#38d9a9', '#f783ac', '#495057'];
const PANTS = ['#364fc7', '#495057', '#2b2b2b', '#5f3dc4', '#a5d8ff', '#e9ecef'];
function drawPerson(ctx, x, y, u, look, phase, moving, gem, now) {
  const step = moving ? Math.sin(phase) : 0, bob = moving ? Math.abs(Math.sin(phase)) * 1.2 * u : 0;
  ellipse(ctx, x, y, 6 * u, 2.6 * u, 'rgba(0,0,0,.2)');
  y -= bob; ctx.lineCap = 'round';
  ctx.strokeStyle = look.pants; ctx.lineWidth = 3.2 * u;
  ctx.beginPath(); ctx.moveTo(x - 2 * u, y - 10 * u); ctx.lineTo(x - 2 * u + step * 2.4 * u, y - 1 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2 * u, y - 10 * u); ctx.lineTo(x + 2 * u - step * 2.4 * u, y - 1 * u); ctx.stroke();
  ctx.fillStyle = look.shirt; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 5 * u, y - 21 * u, 10 * u, 12 * u, 3 * u) : ctx.rect(x - 5 * u, y - 21 * u, 10 * u, 12 * u); ctx.fill();
  ctx.strokeStyle = look.skin; ctx.lineWidth = 2.4 * u;
  ctx.beginPath(); ctx.moveTo(x - 5 * u, y - 19 * u); ctx.lineTo(x - 6.4 * u - step * 1.4 * u, y - 11 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5 * u, y - 19 * u); ctx.lineTo(x + 6.4 * u + step * 1.4 * u, y - 11 * u); ctx.stroke();
  circle(ctx, x, y - 26 * u, 5.3 * u, look.skin);
  ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(x, y - 27 * u, 5.7 * u, Math.PI, 0); ctx.fill();
  if (look.long) { ctx.fillRect(x - 5.7 * u, y - 27 * u, 2.1 * u, 7 * u); ctx.fillRect(x + 3.6 * u, y - 27 * u, 2.1 * u, 7 * u); }
  if (gem) {
    const py = y - 39 * u + Math.sin(now / 420 + phase) * 1.4 * u, w = 3.4 * u * (0.6 + 0.4 * Math.abs(Math.cos(now / 650 + phase)));
    poly(ctx, [[x, py - 5.5 * u], [x + w, py], [x, py + 5.5 * u], [x - w, py]], gem, 'rgba(0,0,0,.25)');
    poly(ctx, [[x, py - 5.5 * u], [x + w, py], [x, py]], 'rgba(255,255,255,.4)');
  }
}
function pill(ctx, x, y, text, size, bg, fg = '#212529') {
  ctx.font = `600 ${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  const w = ctx.measureText(text).width + size * 0.9, h = size * 1.55;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
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
    const lat0 = 29.7575, lng0 = -95.364;
    let vx = (MAIN_B[1] - MAIN_A[1]) * M_LNG, vy = (MAIN_B[0] - MAIN_A[0]) * M_LAT; const L = Math.hypot(vx, vy); vx /= L; vy /= L;
    const ux = -vy, uy = vx;
    const proj = (lat, lng) => { const ex = (lng - lng0) * M_LNG, ny = (lat - lat0) * M_LAT; return [(ex * ux + ny * uy) / 10, (ex * vx + ny * vy) / 10]; };

    // --- street grid from address numbers ---
    const avPts = [], csPts = [], avObs = {}, csObs = {};
    for (const p of pts) {
      const [x, y] = proj(p.lat, p.lng);
      const m = (p.address || '').match(/^(\d+)\s+(?:N\.?\s+)?(.+?)\s+(St|Ave)\b/i); if (!m) continue;
      const num = +m[1], nm = norm(m[2]);
      const ai = AVENUES.findIndex((a) => norm(a) === nm), ci = CROSS.findIndex((c) => norm(c) === nm);
      if (ai >= 0) { avPts.push([num, y]); (avObs[ai] = avObs[ai] || []).push(x); }
      if (ci >= 0) { csPts.push([num, x]); (csObs[ci] = csObs[ci] || []).push(y); }
    }
    const fy = lsq(avPts), fx = lsq(csPts);
    if (fy && fx && Object.keys(avObs).length && Object.keys(csObs).length) {
      const n0 = median(Object.entries(avObs).map(([k, xs]) => (median(xs) - fx.a) / fx.b - 100 * k));
      const m0 = median(Object.entries(csObs).map(([k, ys]) => (median(ys) - fy.a) / fy.b - 100 * k));
      const snap = (f) => Math.round(f / 100) * 100;
      this.avenues = AVENUES.map((n, k) => ({ n, x: fx.a + fx.b * (snap(n0) + 100 * k) }));
      this.cross = CROSS.map((n, k) => ({ n, y: fy.a + fy.b * (snap(m0) + 100 * k) }));
      this.blockW = Math.abs(fx.b * 100); this.blockD = Math.abs(fy.b * 100);
      this.fitX = fx; this.fitY = fy;   // address number → position (cross-street numbers → x, avenue numbers → y)
      this.avenues.forEach((a, k) => (a.num = snap(n0) + 100 * k)); this.cross.forEach((c, k) => (c.num = snap(m0) + 100 * k));
    } else {
      this.avenues = AVENUES.map((n, k) => ({ n, x: -70 + k * 10 })); this.cross = CROSS.map((n, k) => ({ n, y: -90 + k * 10 })); this.blockW = this.blockD = 10;
    }
    this.avenues.sort((a, b) => a.x - b.x); this.cross.sort((a, b) => a.y - b.y);
    this.avX = Object.fromEntries(this.avenues.map((a) => [a.n, a.x])); this.csY = Object.fromEntries(this.cross.map((c) => [c.n, c.y]));
    this.streetW = Math.min(this.blockW, this.blockD) * 0.13;

    // --- spots (restaurants grouped by building) ---
    const groups = new Map();
    for (const p of pts) {
      const [x, y] = proj(p.lat, p.lng);
      const key = (p.tunnel ? 'T' : 'S') + Math.round(x) + ':' + Math.round(y);
      if (!groups.has(key)) groups.set(key, { x, y, tunnel: !!p.tunnel, places: [] });
      groups.get(key).places.push(p);
    }
    this.spots = [...groups.values()];
    this.snapSpots();
    for (const s of this.spots) {
      s.style = styleFor(s.places[0]);
      s.label = s.places.length > 2 ? (s.places.find((p) => /hall|post htx|finn|lyric/i.test(p.name))?.name || `${s.places.length} spots`) : s.places[0].name;
      s.cell = this.cellOf(s.x, s.y);
    }
    const A = this.avenues, C = this.cross;
    this.bounds = { x0: A[0].x - this.blockW * 2.2, x1: A[A.length - 1].x + this.blockW * 1.6, y0: C[0].y - this.blockD * 2.8, y1: C[C.length - 1].y + this.blockD * 1.2 };
    for (const s of this.spots) { const b = this.bounds; b.x0 = Math.min(b.x0, s.x - 4); b.x1 = Math.max(b.x1, s.x + 4); b.y0 = Math.min(b.y0, s.y - 4); b.y1 = Math.max(b.y1, s.y + 4); }
    this.bayouY = C[0].y - this.blockD * 1.4;
    this.v.cx = (this.avX.Main ?? 0); this.v.cy = (this.csY.Walker ?? 0);
    this.northW = [uy, vy];   // which way true north points in map units
    this.buildCity(); this.buildRail(); this.spawnTraffic(); this.buildTunnels(); this.spawnNpcs();
  }

  // Keep every pin inside a building: move it into the block it belongs to (never on the asphalt),
  // and lay out several pins in one block on a tidy sub-grid so they don't pile up.
  snapSpots() {
    const A = this.avenues, C = this.cross, sw = this.streetW, pad = 1.6;
    const blocks = new Map();
    for (const s of this.spots) {
      let [i, j] = this.cellIdx(s.x, s.y);
      i = Math.min(Math.max(i, 1), A.length - 1); j = Math.min(Math.max(j, 1), C.length - 1);   // edge spots go to the outermost block
      const k = (s.tunnel ? 'T' : 'S') + i + ':' + j;
      if (!blocks.has(k)) blocks.set(k, { i, j, list: [] });
      blocks.get(k).list.push(s);
      s.ox = s.x; s.oy = s.y;
    }
    for (const { i, j, list } of blocks.values()) {
      const x0 = A[i - 1].x + sw + pad, x1 = A[i].x - sw - pad, y0 = C[j - 1].y + sw + pad, y1 = C[j].y - sw - pad;
      if (list.length === 1) { const s = list[0]; s.x = Math.min(x1, Math.max(x0, s.x)); s.y = Math.min(y1, Math.max(y0, s.y)); continue; }
      const n = list.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      list.sort((a, b) => (a.oy - b.oy) || (a.ox - b.ox));
      list.forEach((s, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        s.x = x0 + (x1 - x0) * (cols === 1 ? 0.5 : c / (cols - 1));
        s.y = y0 + (y1 - y0) * (rows === 1 ? 0.5 : r / (rows - 1));
      });
    }
    this.spotBlocks = new Set([...blocks.values()].filter((b) => b.list.some((s) => !s.tunnel)).map((b) => b.i - 1 + '-' + (b.j - 1)));
  }
  cellIdx(x, y) {
    const i = this.avenues.findIndex((a) => a.x > x), j = this.cross.findIndex((c) => c.y > y);
    return [i < 0 ? this.avenues.length : i, j < 0 ? this.cross.length : j];
  }
  cellOf(x, y) { return this.cellIdx(x, y).join(':'); }
  clusterSpan() { const s = this.v.s; return s < 0.2 ? 4 : s < 0.34 ? 2 : 1; }
  rectFor(b, inset = 0) {
    const [w, e, n, s] = b, sw = this.streetW;
    if (w === 'W') { if (!(n in this.csY) || !(s in this.csY)) return null; const bx = this.avX.Bagby; return { x0: bx - this.blockW * 0.92 + inset, x1: bx - sw - 0.4 - inset, y0: Math.min(this.csY[n], this.csY[s]) + sw + inset, y1: Math.max(this.csY[n], this.csY[s]) - sw - inset }; }
    if (!(w in this.avX) || !(e in this.avX) || !(n in this.csY) || !(s in this.csY)) return null;
    return { x0: Math.min(this.avX[w], this.avX[e]) + sw + inset, x1: Math.max(this.avX[w], this.avX[e]) - sw - inset, y0: Math.min(this.csY[n], this.csY[s]) + sw + inset, y1: Math.max(this.csY[n], this.csY[s]) - sw - inset };
  }

  buildCity() {
    this.landmarks = []; this.areas = []; this.fill = [];
    const taken = [];
    const half = (r, side) => side === 'east' ? { ...r, x0: (r.x0 + r.x1) / 2 + 0.3 } : side === 'west' ? { ...r, x1: (r.x0 + r.x1) / 2 - 0.3 } : r;
    for (const a of AREAS) { let r = this.rectFor(a.b); if (!r) continue; r = half(r, a.half); this.areas.push({ ...a, r }); taken.push(r); }
    if ('Main' in this.avX && 'Fannin' in this.avX) this.areas.push({ n: "Allen's Landing", kind: 'park', r: { x0: this.avX.Main + this.streetW + 0.4, x1: this.avX.Fannin - this.streetW, y0: this.cross[0].y - 5.6, y1: this.cross[0].y - this.streetW - 0.5 } });
    for (const l of LANDMARKS) {
      let r = this.rectFor(l.b, 1.2); if (!r) continue; if (l.half) r = half(r, 'west');
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, w = (r.x1 - r.x0) * (l.kind === 'twin' ? 0.9 : 0.72), d = (r.y1 - r.y0) * 0.72;
      this.landmarks.push({ ...l, x: cx - w / 2, y: cy - d / 2, w, d }); taken.push(r);
    }
    const core = { x: ((this.avX.Louisiana ?? 0) + (this.avX.Main ?? 0)) / 2, y: ((this.csY.Capitol ?? 0) + (this.csY.McKinney ?? 0)) / 2 };
    const A = this.avenues, C = this.cross, sw = this.streetW;
    const PAL = ['#cfd6de', '#d9d2c5', '#bfcad6', '#e2ddd3', '#c8d3cf', '#d5d9e0', '#b9c4cf'];
    for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
      const r = { x0: A[i].x + sw, x1: A[i + 1].x - sw, y0: C[j].y + sw, y1: C[j + 1].y - sw };
      const t = taken.find((t) => t.x0 < r.x1 - 0.5 && t.x1 > r.x0 + 0.5 && t.y0 < r.y1 - 0.5 && t.y1 > r.y0 + 0.5);
      if (t) { if (t.x0 - r.x0 > 3) this.fill.push({ x: r.x0 + 0.6, y: r.y0 + 0.6, w: t.x0 - r.x0 - 1.4, d: r.y1 - r.y0 - 1.2, h: 3, c: PAL[(i + j) % PAL.length] }); continue; }
      const hasFood = this.spotBlocks?.has(i + '-' + j);
      const seed = hasFood ? 0.4 + hash(i + '-' + j) * 0.6 : hash(i + '-' + j), dist = Math.hypot(((r.x0 + r.x1) / 2 - core.x) / (this.blockW * 4), ((r.y0 + r.y1) / 2 - core.y) / (this.blockD * 4));
      const inCore = dist < 1;
      if (!inCore && seed < 0.22) { this.fill.push({ x: r.x0, y: r.y0, w: r.x1 - r.x0, d: r.y1 - r.y0, h: 0.05, lot: true }); continue; }
      if (!inCore && seed < 0.36) { this.fill.push({ x: r.x0 + 0.5, y: r.y0 + 0.5, w: r.x1 - r.x0 - 1, d: r.y1 - r.y0 - 1, h: 2.4, c: '#b9bcc2' }); continue; }
      const h = inCore ? 7 + seed * 13 : Math.max(1.6, (1.4 - Math.min(1.4, dist)) * 8 + seed * 3);
      const c = PAL[Math.floor(seed * PAL.length)];
      if (seed > 0.6 && (r.x1 - r.x0) > 6) {
        const mid = (r.x0 + r.x1) / 2;
        this.fill.push({ x: r.x0 + 0.5, y: r.y0 + 0.5, w: mid - r.x0 - 0.9, d: r.y1 - r.y0 - 1, h, c, glass: seed > 0.8 });
        this.fill.push({ x: mid + 0.4, y: r.y0 + 0.5, w: r.x1 - mid - 0.9, d: r.y1 - r.y0 - 1, h: h * 0.55, c: PAL[(i * 3 + j) % PAL.length] });
      } else this.fill.push({ x: r.x0 + 0.5, y: r.y0 + 0.5, w: r.x1 - r.x0 - 1, d: r.y1 - r.y0 - 1, h, c, glass: inCore && seed > 0.5 });
    }
  }

  // ---------- streets & addresses ----------
  numY(n) { return this.fitY ? this.fitY.a + this.fitY.b * n : null; }   // avenue address → y
  numX(n) { return this.fitX ? this.fitX.a + this.fitX.b * n : null; }   // cross-street address → x
  corner(av, cs) { return av in this.avX && cs in this.csY ? { x: this.avX[av], y: this.csY[cs] } : null; }
  locate(q) {   // q from parseStreetQuery
    if (q.kind === 'corner') return this.corner(q.av, q.cs);
    if (q.kind === 'address') {
      if (q.street in this.avX && this.fitY) return { x: this.avX[q.street], y: this.numY(q.num) };
      if (q.street in this.csY && this.fitX) return { x: this.numX(q.num), y: this.csY[q.street] };
    }
    return null;
  }
  nearestCorner(x, y) {
    const a = this.avenues.reduce((b, k) => (Math.abs(k.x - x) < Math.abs(b.x - x) ? k : b)), c = this.cross.reduce((b, k) => (Math.abs(k.y - y) < Math.abs(b.y - y) ? k : b));
    return { av: a.n, cs: c.n, x: a.x, y: c.y, label: `${SUFFIX(a.n)} & ${SUFFIX(c.n)}` };
  }
  spotsNear(x, y, r = Math.max(this.blockW, this.blockD) * 1.25) {
    return this.spots.map((s) => ({ s, d: Math.hypot(s.x - x, s.y - y) })).filter((o) => o.d <= r).sort((p, q) => p.d - q.d);
  }
  markCorner(x, y, label, sticky) { this.mark = { x, y, label, t0: performance.now(), sticky }; }
  goTo(q) {
    const at = this.locate(q); if (!at) return null;
    if (this.mode === 'tunnel') this.setMode('street');
    this.zoomTo(at.x, at.y, Math.max(this.v.s, 1.05)); this.markCorner(at.x, at.y, q.label, true);
    return { ...at, near: this.spotsNear(at.x, at.y) };
  }
  toWorld(sx, sy) {
    const v = this.v, a = (sx - v.ox) / (TW / 2 * v.s), b = (sy - v.oy) / (TH / 2 * v.s), X = (a + b) / 2, Y = (b - a) / 2;
    return [v.cx + X * v.c + Y * v.sn, v.cy - X * v.sn + Y * v.c];
  }
  // spin the map about a screen point (default: the middle of the screen)
  rotateTo(r, sx = this.W / 2, sy = this.H / 2) {
    const [wx, wy] = this.toWorld(sx, sy); this.v.setRot(r); const [px, py] = this.v.p(wx, wy); this.v.ox += sx - px; this.v.oy += sy - py;
    this.opts.onRotate?.(this.compass());
  }
  rotateBy(da, sx, sy) { this.rotateTo(this.v.r + da, sx, sy); }
  spin(to) { let from = this.v.r, d = ((to - from) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; this.rotAnim = { from, d, t: 0 }; }
  compass() { const a = this.v.p(0, 0), b = this.v.p(this.northW[0], this.northW[1]); return Math.atan2(b[0] - a[0], -(b[1] - a[1])); }   // screen angle of north, 0 = up

  // ---------- METRORail ----------
  buildRail() {
    const A = this.avX, Y = this.csY, C = this.cross, mid = (...ns) => ns.reduce((t, n) => t + Y[n], 0) / ns.length;
    this.rail = null; if (!('Main' in A) || !('Capitol' in Y) || !('Rusk' in Y)) return;
    const yNorth = this.bayouY - this.blockD * 0.55, ySouth = C[C.length - 1].y + this.blockD * 0.7;
    const red = RED_STATIONS.map((st) => {
      let ys;
      if (st.at === 'bayouNorth') ys = [yNorth]; else if (st.at === 'south') ys = [ySouth];
      else if (st.num) ys = [this.numY(st.num) ?? mid('Capitol', 'Rusk')];
      else if (st.at.length === 4) ys = [mid(st.at[0], st.at[1]), mid(st.at[2], st.at[3])];
      else if (st.at.length === 3) ys = [mid(st.at[0], st.at[1]), mid(st.at[1], st.at[2])];
      else ys = [Y[st.at[0]]];
      return { n: st.n, line: 'red', plats: ys.map((y) => ({ x: A.Main, y })), x: A.Main, y: ys.reduce((a, b) => a + b, 0) / ys.length };
    });
    const xE = this.bounds.x1, xW = A.Smith;
    const gp = GP_STATIONS.map((st) => { const x = st.av ? A[st.av] : this.numX(st.num) ?? (A.Fannin + A['San Jacinto']) / 2; return { n: st.n, line: 'gp', x, y: (Y.Capitol + Y.Rusk) / 2, plats: [{ x, y: Y.Capitol }, { x, y: Y.Rusk }] }; });
    this.rail = { x: A.Main, y0: this.bounds.y0, y1: this.bounds.y1, capY: Y.Capitol, ruskY: Y.Rusk, xW, xE, stations: [...red, ...gp] };
    const redStops = red.flatMap((s) => s.plats.map((p) => p.y)).sort((a, b) => a - b);
    this.trains = [
      { line: 'red', pos: redStops[1], dir: 1, wait: 0, stops: redStops, lo: yNorth - 6, hi: ySouth + 6 },
      { line: 'red', pos: redStops[redStops.length - 2], dir: -1, wait: 1.5, stops: redStops, lo: yNorth - 6, hi: ySouth + 6 },
      { line: 'red', pos: redStops[Math.floor(redStops.length / 2)], dir: 1, wait: 4, stops: redStops, lo: yNorth - 6, hi: ySouth + 6 },
      { line: 'gp', pos: xW, dir: 1, wait: 2, stops: gp.map((s) => s.x).sort((a, b) => a - b), lo: xW, hi: xE - 2, track: 'cap', color: '#2f9e44' },
      { line: 'gp', pos: (xW + xE) / 2, dir: -1, wait: 0, stops: gp.map((s) => s.x).sort((a, b) => a - b), lo: xW, hi: xE - 2, track: 'rusk', color: '#7048e8' },
    ];
  }
  stepTrains(dt) {
    for (const t of this.trains || []) {
      if (t.wait > 0) { t.wait -= dt; continue; }
      const sp = t.line === 'red' ? 2.6 : 2.2, next = t.pos + t.dir * sp * dt;
      const hitStop = t.stops.find((y) => (t.dir > 0 ? y > t.pos && y <= next : y < t.pos && y >= next));
      if (hitStop != null) { t.pos = hitStop; t.wait = 2.8; continue; }
      t.pos = next;
      if (t.pos > t.hi || t.pos < t.lo) {
        if (t.line === 'red') { t.dir *= -1; t.pos = Math.max(t.lo, Math.min(t.hi, t.pos)); t.wait = 3; }
        else { t.track = t.track === 'cap' ? 'rusk' : 'cap'; t.dir *= -1; t.pos = Math.max(t.lo, Math.min(t.hi, t.pos)); t.wait = 3; t.color = t.color === '#2f9e44' ? '#7048e8' : '#2f9e44'; }
      }
    }
  }
  trainBox(t) {   // world box of a two-car train
    const R = this.rail, L = 5.2, W = 0.95;
    if (t.line === 'red') return { x: R.x - W / 2 + (t.dir > 0 ? 0.32 : -0.32), y: t.pos - L / 2, w: W, d: L, along: 'y' };
    const y = t.track === 'cap' ? R.capY : R.ruskY; return { x: t.pos - L / 2, y: y - W / 2, w: L, d: W, along: 'x' };
  }
  drawTrain(t, N, alpha) {
    const ctx = this.ctx, v = this.v, b = this.trainBox(t), h = 1.15, body = N ? '#cfd4da' : '#f8f9fa', stripe = t.line === 'red' ? '#e03131' : t.color;
    box(ctx, v, b.x, b.y, b.w, b.d, h, body, 0.05, { alpha });
    ctx.globalAlpha = alpha;
    band(ctx, v, b.x, b.y, b.w, b.d, 0.05 + 0.25, 0.05 + 0.47, stripe, 0.1); band(ctx, v, b.x, b.y, b.w, b.d, 0.05 + 0.62, 0.05 + 0.95, N ? 'rgba(255,224,140,.9)' : 'rgba(40,54,74,.85)', 0.35);
    // pantographs reaching up to the overhead wire
    ctx.strokeStyle = N ? '#adb5bd' : '#495057'; ctx.lineWidth = Math.max(1, v.s * 1.4); ctx.beginPath();
    for (const k of [0.3, 0.7]) { const q = b.along === 'y' ? [b.x + b.w / 2, b.y + b.d * k] : [b.x + b.w * k, b.y + b.d / 2]; ctx.moveTo(...v.p(...q, h + 0.05)); ctx.lineTo(...v.p(q[0] + (b.along === 'y' ? 0 : 0.35), q[1] + (b.along === 'y' ? 0.35 : 0), h + 0.6)); ctx.lineTo(...v.p(...q, h + 0.75)); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawRail(N) {
    const R = this.rail; if (!R) return; const ctx = this.ctx, v = this.v;
    const quad = (x0, y0, x1, y1, col) => poly(ctx, [v.p(x0, y0, 0.02), v.p(x1, y0, 0.02), v.p(x1, y1, 0.02), v.p(x0, y1, 0.02)], col);
    const line = (x0, y0, x1, y1, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...v.p(x0, y0, 0.03)); ctx.lineTo(...v.p(x1, y1, 0.03)); ctx.stroke(); };
    const detail = v.s > 0.55, bed = N ? '#4a3a3a' : '#cdbfb8';
    // Red Line: two tracks down the middle of Main
    quad(R.x - 0.95, R.y0, R.x + 0.95, R.y1, bed);
    if (detail) {
      ctx.strokeStyle = N ? '#5b5050' : '#8f8178'; ctx.lineWidth = 1; ctx.beginPath();
      const [, sy0] = v.p(R.x, R.y0), step = 0.55;
      for (let y = R.y0; y < R.y1; y += step) { const p = v.p(R.x, y); if (p[1] < -20 || p[1] > this.H + 20 || p[0] < -40 || p[0] > this.W + 40) continue; for (const o of [-0.32, 0.32]) { ctx.moveTo(...v.p(R.x + o - 0.24, y, 0.03)); ctx.lineTo(...v.p(R.x + o + 0.24, y, 0.03)); } }
      ctx.stroke();
      for (const o of [-0.5, -0.14, 0.14, 0.5]) line(R.x + o, R.y0, R.x + o, R.y1, N ? '#a7a9ad' : '#5c626b', 1);
    }
    line(R.x, R.y0, R.x, R.y1, 'rgba(224,49,49,' + (detail ? '.55' : '.95') + ')', detail ? 1.6 : Math.max(2.5, v.s * 9));
    // Green + Purple: single track each on Capitol (eastbound) and Rusk (westbound)
    for (const y of [R.capY, R.ruskY]) {
      quad(R.xW, y - 0.5, R.xE, y + 0.5, bed);
      if (detail) for (const o of [-0.17, 0.17]) line(R.xW, y + o, R.xE, y + o, N ? '#a7a9ad' : '#5c626b', 1);
      line(R.xW, y - (detail ? 0.08 : 0.12), R.xE, y - (detail ? 0.08 : 0.12), 'rgba(47,158,68,.9)', detail ? 1.4 : Math.max(2, v.s * 6));
      line(R.xW, y + (detail ? 0.08 : 0.12), R.xE, y + (detail ? 0.08 : 0.12), 'rgba(112,72,232,.85)', detail ? 1.4 : Math.max(2, v.s * 6));
    }
    // platforms
    for (const st of R.stations) for (const p of st.plats) {
      const col = st.line === 'red' ? '#e03131' : '#2f9e44';
      if (detail) {
        const along = st.line === 'red';
        const pw = along ? 0.55 : 3.4, pd = along ? 3.4 : 0.55, px = along ? p.x + 1.0 : p.x - pw / 2, py = along ? p.y - pd / 2 : p.y + 0.6;
        box(ctx, v, px, py, pw, pd, 0.25, N ? '#6b7280' : '#e9ecef');
        box(ctx, v, px - (along ? 0.1 : 0), py, pw + (along ? 0.2 : 0), pd, 0.08, col, 1.25);
        for (const k of [0.15, 0.85]) { const [x, yy] = along ? v.p(px + pw / 2, py + pd * k, 0.25) : v.p(px + pw * k, py + pd / 2, 0.25); const [, y2] = along ? v.p(px + pw / 2, py + pd * k, 1.25) : v.p(px + pw * k, py + pd / 2, 1.25); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, y2); ctx.stroke(); }
      } else { const [x, y] = v.p(p.x, p.y); circle(ctx, x, y, Math.max(3, v.s * 9), '#fff'); circle(ctx, x, y, Math.max(2, v.s * 6.5), col); }
    }
  }

  drawRailOverlay() {
    const R = this.rail, v = this.v; if (!R || v.s > 0.55) return; const ctx = this.ctx;
    const line = (x0, y0, x1, y1, col, w, off = 0) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); const a = v.p(x0, y0), b = v.p(x1, y1); ctx.moveTo(a[0], a[1] + off); ctx.lineTo(b[0], b[1] + off); ctx.stroke(); };
    ctx.lineCap = 'round';
    line(R.x, R.y0, R.x, R.y1, 'rgba(255,255,255,.9)', 7); line(R.x, R.y0, R.x, R.y1, '#e03131', 4);
    for (const y of [R.capY, R.ruskY]) { line(R.xW, y, R.xE, y, 'rgba(255,255,255,.9)', 7); line(R.xW, y, R.xE, y, '#2f9e44', 2.4, -1.1); line(R.xW, y, R.xE, y, '#7048e8', 2.4, 1.1); }
    ctx.lineCap = 'butt';
    for (const st of R.stations) { const [x, y] = v.p(st.x, st.y); circle(ctx, x, y, 6, '#fff'); circle(ctx, x, y, 4, st.line === 'red' ? '#e03131' : '#2f9e44'); }
  }

  // ---------- traffic: METRO buses on loops with stops, Waymos roaming the grid ----------
  spawnTraffic() {
    this.cars = []; const A = this.avenues, C = this.cross;
    const ai = (n) => A.findIndex((a) => a.n === n), ci = (n) => C.findIndex((c) => c.n === n);
    const LOOPS = [
      [['Travis', 'Pierce'], ['Travis', 'Franklin'], ['Milam', 'Franklin'], ['Milam', 'Pierce']],
      [['Bagby', 'Walker'], ['Hamilton', 'Walker'], ['Hamilton', 'McKinney'], ['Bagby', 'McKinney']],
      [['Smith', 'Leeland'], ['Louisiana', 'Leeland'], ['Louisiana', 'Congress'], ['Smith', 'Congress']],
      [['Fannin', 'Texas'], ['La Branch', 'Texas'], ['La Branch', 'Polk'], ['Fannin', 'Polk']],
    ];
    this.busStops = [];
    LOOPS.forEach((loop, li) => {
      const corners = loop.map(([a, c]) => [ai(a), ci(c)]); if (corners.some(([i, j]) => i < 0 || j < 0)) return;
      const path = [];
      for (let k = 0; k < corners.length; k++) {
        let [i, j] = corners[k]; const [i2, j2] = corners[(k + 1) % corners.length];
        while (i !== i2 || j !== j2) { path.push([i, j]); if (i !== i2) i += Math.sign(i2 - i); else j += Math.sign(j2 - j); }
      }
      path.forEach((n, k) => { if (k % 3 === 1) this.busStops.push({ n, route: li }); });
      for (let b = 0; b < 2; b++) this.cars.push({ kind: 'bus', route: li, path, k: Math.floor(b * path.length / 2), t: 0, wait: b * 2, speed: 2.3 });
    });
    const okEdge = (i, j, i2, j2) => i2 >= 0 && j2 >= 0 && i2 < A.length && j2 < C.length && !(i === i2 && A[i].n === 'Main');   // Main is the rail mall
    this.okEdge = okEdge;
    for (let k = 0; k < 14; k++) {
      const i = Math.floor(hash('wi' + k) * A.length), j = Math.floor(hash('wj' + k) * C.length);
      const c = { kind: 'waymo', at: [i, j], to: null, t: 0, wait: hash('ww' + k) * 3, speed: 3.4 + hash('ws' + k) };
      this.pickNext(c); this.cars.push(c);
    }
  }
  pickNext(c) {
    const [i, j] = c.at, prev = c.from, opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [i + di, j + dj]).filter(([i2, j2]) => this.okEdge(i, j, i2, j2));
    let choices = opts.filter(([i2, j2]) => !prev || i2 !== prev[0] || j2 !== prev[1]); if (!choices.length) choices = opts;
    const fwd = prev && choices.find(([i2, j2]) => i2 - i === i - prev[0] && j2 - j === j - prev[1]);
    c.to = fwd && Math.random() < 0.6 ? fwd : choices[Math.floor(Math.random() * choices.length)];
  }
  node(n) { return [this.avenues[n[0]].x, this.cross[n[1]].y]; }
  carEnds(c) { return c.kind === 'bus' ? [c.path[c.k], c.path[(c.k + 1) % c.path.length]] : [c.at, c.to]; }
  carPos(c) {
    const [a, b] = this.carEnds(c), p = this.node(a), q = this.node(b), dx = Math.sign(q[0] - p[0]), dy = Math.sign(q[1] - p[1]);
    const lane = this.streetW * 0.5;   // drive on the right
    return { x: p[0] + (q[0] - p[0]) * c.t - dy * lane, y: p[1] + (q[1] - p[1]) * c.t + dx * lane, dx, dy, len: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  }
  carBox(c) {
    const P = this.carPos(c), L = c.kind === 'bus' ? 4.3 : 1.9, W = c.kind === 'bus' ? 1.05 : 0.85;
    return P.dx ? { x: P.x - L / 2, y: P.y - W / 2, w: L, d: W, P } : { x: P.x - W / 2, y: P.y - L / 2, w: W, d: L, P };
  }
  stepTraffic(dt) {
    const cars = this.cars || []; if (!cars.length) return;
    const key = (c) => { const [a, b] = this.carEnds(c); return a + '>' + b; }, lanes = new Map();
    for (const c of cars) { const k = key(c); (lanes.get(k) || lanes.set(k, []).get(k)).push(c); }
    for (const c of cars) {
      if (c.wait > 0) { c.wait -= dt; continue; }
      const P = this.carPos(c), gap = (c.kind === 'bus' ? 5.4 : 3) / P.len;
      if (lanes.get(key(c)).some((o) => o !== c && o.t > c.t && o.t - c.t < gap)) continue;   // don't rear-end the car ahead
      if (c.kind === 'bus' && c.t < 1 && this.trainNear(P)) continue;
      c.t += (c.speed * dt) / P.len;
      if (c.t < 1) continue;
      c.t = 0;
      if (c.kind === 'bus') { c.k = (c.k + 1) % c.path.length; if (c.k % 3 === 1) c.wait = 2.6; }
      else { c.from = c.at; c.at = c.to; this.pickNext(c); if (Math.random() < 0.45) c.wait = 0.4 + Math.random() * 0.6; }
    }
  }
  trainNear() { return false; }
  drawCar(c, N, alpha, now) {
    const ctx = this.ctx, v = this.v, b = this.carBox(c);
    if (c.kind === 'bus') {
      box(ctx, v, b.x, b.y, b.w, b.d, 1.35, N ? '#ced4da' : '#f8f9fa', 0.12, { alpha });
      ctx.globalAlpha = alpha;
      band(ctx, v, b.x, b.y, b.w, b.d, 0.2, 0.42, '#1c5fa8', 0.05);
      band(ctx, v, b.x, b.y, b.w, b.d, 0.42, 0.5, '#e03131', 0.05);
      band(ctx, v, b.x, b.y, b.w, b.d, 0.72, 1.25, N ? 'rgba(255,224,140,.9)' : 'rgba(40,54,74,.82)', 0.25);
      ctx.globalAlpha = 1;
      if (v.s > 0.9) { const [x, y] = v.p(b.x + b.w / 2, b.y + b.d / 2, 2.4); pill(ctx, x, y, '🚌 ' + ['82', '11', '85', '40'][c.route % 4], 9, 'rgba(28,95,168,.92)', '#fff'); }
    } else {
      const P = b.P;
      box(ctx, v, b.x, b.y, b.w, b.d, 0.55, N ? '#dee2e6' : '#ffffff', 0.12, { alpha });
      const cw = b.w * (P.dx ? 0.55 : 0.82), cd = b.d * (P.dx ? 0.82 : 0.55);
      box(ctx, v, b.x + (b.w - cw) / 2 - P.dx * 0.12, b.y + (b.d - cd) / 2 - P.dy * 0.12, cw, cd, 0.36, N ? '#55647a' : '#3d4b5e', 0.67, { alpha, top: N ? '#e9ecef' : '#f8f9fa' });
      const dome = 0.26, [cx, cy] = [b.x + b.w / 2 - P.dx * 0.12, b.y + b.d / 2 - P.dy * 0.12];
      box(ctx, v, cx - dome / 2, cy - dome / 2, dome, dome, 0.2, '#212529', 1.03, { alpha });
      if (v.s > 0.6) { const [x, y] = v.p(cx, cy, 1.25), a = now / 120; ctx.globalAlpha = alpha; circle(ctx, x + Math.cos(a) * 2 * v.s, y + Math.sin(a) * v.s, Math.max(1, v.s * 1.4), '#4dabf7'); ctx.globalAlpha = 1; }
    }
  }
  drawBusStops(N) {
    if (this.v.s < 0.6 || !this.busStops) return; const ctx = this.ctx, v = this.v, sw = this.streetW;
    for (const st of this.busStops) {
      const [x0, y0] = this.node(st.n), [x, y] = v.p(x0 + sw + 0.5, y0 + sw + 0.5), [, yt] = v.p(x0 + sw + 0.5, y0 + sw + 0.5, 2.1);
      if (x < -20 || x > this.W + 20 || y < -40 || y > this.H + 20) continue;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = Math.max(1, v.s * 1.3); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yt); ctx.stroke();
      const r = Math.max(3, v.s * 4.5); ctx.fillStyle = '#1c5fa8'; ctx.fillRect(x - r, yt - r * 1.4, r * 2, r * 1.4); ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', x, yt - r * 0.7);
    }
  }

  // ---------- street signs & crosswalks ----------
  drawCrosswalks(N) {
    const v = this.v; if (v.s < 0.7) return;
    const ctx = this.ctx, sw = this.streetW, k = 0.85;
    ctx.strokeStyle = N ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, v.s * 1.6); ctx.beginPath();
    for (const a of this.avenues) for (const c of this.cross) {
      const [sx, sy] = v.p(a.x, c.y); if (sx < -80 || sx > this.W + 80 || sy < -80 || sy > this.H + 80) continue;
      for (let i = 0; i <= 5; i++) {
        const t = -sw + (2 * sw) * i / 5;
        for (const yy of [c.y - sw - 0.15, c.y + sw + 0.15 - k]) { ctx.moveTo(...v.p(a.x + t, yy)); ctx.lineTo(...v.p(a.x + t, yy + k)); }
        for (const xx of [a.x - sw - 0.15, a.x + sw + 0.15 - k]) { ctx.moveTo(...v.p(xx, c.y + t)); ctx.lineTo(...v.p(xx + k, c.y + t)); }
      }
    }
    ctx.stroke();
  }
  drawStreetSigns(N) {
    const v = this.v; if (v.s < 0.28) return;
    const ctx = this.ctx, A = this.avenues, C = this.cross, size = Math.round(Math.min(13.5, 9 + v.s * 3));
    const px = (dx, dy) => { const a = v.p(0, 0), b = v.p(dx, dy); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
    const kA = Math.max(1, Math.ceil(300 / px(0, this.blockD))), kC = Math.max(1, Math.ceil(300 / px(this.blockW, 0)));
    const dirAng = (dx, dy) => { const a = v.p(0, 0), b = v.p(dx, dy); let g = Math.atan2(b[1] - a[1], b[0] - a[0]); if (g > Math.PI / 2) g -= Math.PI; if (g < -Math.PI / 2) g += Math.PI; return g; };
    const angA = dirAng(0, 1), angC = dirAng(1, 0);
    const showNum = v.s > 1.15;
    const sign = (x, y, text, ang, major, num) => {
      if (x < -120 || x > this.W + 120 || y < -30 || y > this.H + 30) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
      const label = num ? `${text}  ·  ${num}` : text, w = ctx.measureText(label).width + size * 1.1, h = size * 1.55;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2 + 1, -h / 2 + 2, w, h, 4) : ctx.rect(-w / 2 + 1, -h / 2 + 2, w, h); ctx.fill();
      ctx.fillStyle = major ? '#1b6e3f' : '#2b7a4b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 4) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0.5);
      ctx.restore();
    };
    for (let i = 0; i < A.length; i++) for (let j = 0; j < C.length - 1; j++) {
      if ((j + i) % kA) continue; const [x, y] = v.p(A[i].x, (C[j].y + C[j + 1].y) / 2);
      sign(x, y, SUFFIX(A[i].n), angA, MAJOR.has(A[i].n), showNum && C[j].num != null ? `${C[j].num}s` : '');
    }
    for (let j = 0; j < C.length; j++) for (let i = 0; i < A.length - 1; i++) {
      if ((i + j + 1) % kC) continue; const [x, y] = v.p((A[i].x + A[i + 1].x) / 2, C[j].y);
      sign(x, y, SUFFIX(C[j].n), angC, MAJOR.has(C[j].n), showNum && A[i].num != null ? `${A[i].num}s` : '');
    }
    if (v.s > 1.5) {   // corner plates at every intersection when zoomed right in
      ctx.font = `700 10px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const a of A) for (const c of C) {
        const [x, y] = v.p(a.x - this.streetW - 0.6, c.y - this.streetW - 0.6, 2.2); if (x < -60 || x > this.W + 60 || y < -20 || y > this.H + 20) continue;
        const [bx, by] = v.p(a.x - this.streetW - 0.6, c.y - this.streetW - 0.6); ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y + 8); ctx.stroke();
        const t = `${a.n} / ${c.n}`, w = ctx.measureText(t).width + 8; ctx.fillStyle = '#1b6e3f'; ctx.fillRect(x - w / 2, y - 7, w, 14); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y + 0.5);
      }
    }
  }
  drawMark(now) {
    const m = this.mark; if (!m || this.mode === 'tunnel') return;
    const age = (now - m.t0) / 1000; if (!m.sticky && age > 7) { this.mark = null; return; }
    const ctx = this.ctx, [x, y] = this.v.p(m.x, m.y), r = 10 + (age * 18) % 26;
    ctx.strokeStyle = `rgba(28,126,214,${1 - ((age * 18) % 26) / 26})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    ellipse(ctx, x, y, 7, 3.5, '#1c7ed6'); pill(ctx, x, y - 26, '📍 ' + m.label, 12, 'rgba(28,126,214,.95)', '#fff');
  }

  buildTunnels() {
    const T = this.spots.filter((s) => s.tunnel);
    this.tunnelSpots = T; this.tunnelEdges = []; this.tunnelAdj = T.map(() => []);
    if (T.length < 2) return;
    const inTree = new Set([0]), dist = T.map((t) => Math.abs(t.x - T[0].x) + Math.abs(t.y - T[0].y)), from = T.map(() => 0);
    while (inTree.size < T.length) {
      let best = -1; for (let i = 0; i < T.length; i++) if (!inTree.has(i) && (best < 0 || dist[i] < dist[best])) best = i;
      inTree.add(best); this.tunnelEdges.push([from[best], best]);
      for (let i = 0; i < T.length; i++) if (!inTree.has(i)) { const d = Math.abs(T[i].x - T[best].x) + Math.abs(T[i].y - T[best].y); if (d < dist[i]) { dist[i] = d; from[i] = best; } }
    }
    for (const [a, b] of this.tunnelEdges) { this.tunnelAdj[a].push(b); this.tunnelAdj[b].push(a); }
  }

  spawnNpcs() {
    this.npcs = [];
    for (let i = 0; i < 60; i++) this.npcs.push(this.newNpc(i, false));
    for (let i = 0; i < Math.min(25, this.tunnelSpots.length * 1.2); i++) this.npcs.push(this.newNpc(i + 1000, true));
  }
  newNpc(seed, under) {
    const r = (k) => hash(seed + ':' + k);
    const look = { skin: SKIN[Math.floor(r(1) * SKIN.length)], hair: HAIR[Math.floor(r(2) * HAIR.length)], shirt: SHIRT[Math.floor(r(3) * SHIRT.length)], pants: PANTS[Math.floor(r(4) * PANTS.length)], long: r(5) > 0.55 };
    const n = { id: seed, under, look, phase: r(6) * 6, speed: 0.8 + r(7) * 0.5, wait: r(8) * 5, path: [], target: null, inside: 0, thought: null, thoughtT: 0 };
    if (under) { const k = Math.floor(r(9) * this.tunnelSpots.length); const s = this.tunnelSpots[k]; n.x = s.x; n.y = s.y; n.node = k; }
    else { const a = this.avenues[2 + Math.floor(r(9) * (this.avenues.length - 6))], c = this.cross[2 + Math.floor(r(10) * (this.cross.length - 6))]; n.x = a.x; n.y = c.y; }
    return n;
  }
  chooseTarget(n) {
    const pool = this.spots.filter((s) => s.tunnel === n.under); if (!pool.length) return null;
    const w = pool.map((s) => {
      let k = 1 + s.places.length * 0.2;
      if (this.highlight) k *= s.places.some((p) => this.highlight.has(p.id)) ? 6 : 0.3;
      if (!s.places.some((p) => this.openFn(p))) k *= 0.1;
      if (this.pick != null && s.places.some((p) => p.id === this.pick)) k *= 10;
      return k;
    });
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }
  routeStreet(n, t) {
    const near = (arr, v, k) => arr.reduce((b, a) => (Math.abs(a[k] - v) < Math.abs(b[k] - v) ? a : b))[k];
    const ax = near(this.avenues, n.x, 'x'), cy = near(this.cross, t.y, 'y'), tx = near(this.avenues, t.x, 'x');
    const pts = [];
    if (Math.abs(n.x - ax) > 0.5) pts.push([n.x, near(this.cross, n.y, 'y')], [ax, near(this.cross, n.y, 'y')]);
    pts.push([ax, cy], [tx, cy], [tx, t.y], [t.x, t.y]);
    return pts;
  }
  routeTunnel(n, goal) {
    const T = this.tunnelSpots, start = n.node ?? 0, end = T.indexOf(goal);
    const prev = new Map([[start, -1]]), q = [start];
    while (q.length) { const c = q.shift(); if (c === end) break; for (const m of this.tunnelAdj[c]) if (!prev.has(m)) { prev.set(m, c); q.push(m); } }
    const nodes = []; for (let c = end; c !== -1 && c !== undefined; c = prev.get(c)) nodes.unshift(c);
    const pts = []; for (let i = 1; i < nodes.length; i++) { const a = T[nodes[i - 1]], b = T[nodes[i]]; pts.push([b.x, a.y], [b.x, b.y]); }
    n.node = end; return pts;
  }
  stepNpcs(dt) {
    for (const n of this.npcs) {
      n.thoughtT -= dt;
      if (n.inside > 0) { n.inside -= dt; continue; }
      if (n.wait > 0) { n.wait -= dt; continue; }
      if (!n.path.length) {
        if (n.target) { n.inside = 5 + Math.random() * 12; n.target = null; continue; }
        const t = this.chooseTarget(n); if (!t) continue;
        n.target = t; n.path = (n.under ? this.routeTunnel(n, t) : this.routeStreet(n, t)).filter(Boolean);
        if (!n.path.length) { n.wait = 1 + Math.random() * 3; n.target = null; continue; }
        const pl = t.places[Math.floor(Math.random() * t.places.length)];
        n.thought = styleFor(pl).emoji; n.thoughtFor = pl; n.thoughtT = 3.5;
      }
      const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), sp = n.speed * dt * 2;
      if (d <= sp) { n.x = tx; n.y = ty; n.path.shift(); } else { n.x += dx / d * sp; n.y += dy / d * sp; }
      n.phase += dt * 8 * n.speed;
    }
  }

  // ---------- view / input ----------
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height; this.cv.width = r.width * dpr; this.cv.height = r.height * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  centerOn(x, y, z = 0, fy = 0.55) { const [px, py] = this.v.p(x, y, z); this.v.ox += this.W / 2 - px; this.v.oy += this.H * fy - py; }
  fit() {
    const v = this.v; v.ox = 0; v.oy = 0;
    if (this.fitAll) {
      const B = this.bounds; v.s = 1;
      const c = [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x0, B.y1), v.p(B.x1, B.y1)];
      const w = Math.max(...c.map((p) => p[0])) - Math.min(...c.map((p) => p[0])), h = Math.max(...c.map((p) => p[1])) - Math.min(...c.map((p) => p[1]));
      v.s = Math.min(this.W / w, this.H / h) * 1.05; v.ox = 0; v.oy = 0;
      this.centerOn((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0, 0.5);
    } else {
      v.s = Math.max(0.2, Math.min(0.36, this.W / 1500));
      this.centerOn((this.avX.Main ?? 0) + 4, (this.csY.Walker ?? 0) + 4, 0, 0.5);
    }
  }
  remember() {
    this.viewStack = this.viewStack || [];
    this.viewStack.push({ s: this.v.s, ox: this.v.ox, oy: this.v.oy, mode: this.mode, r: this.v.r });
    if (this.viewStack.length > 20) this.viewStack.shift();
    this.opts.onHistory?.(this.viewStack.length);
  }
  back() {
    const prev = (this.viewStack || []).pop(); if (!prev) return false;
    if (prev.mode !== this.mode) { this.mode = prev.mode; this.opts.onMode?.(prev.mode); }
    if (prev.r != null && Math.abs(prev.r - this.v.r) > 1e-4) { this.v.setRot(prev.r); this.opts.onRotate?.(this.compass()); this.v.ox = prev.ox; this.v.oy = prev.oy; this.v.s = prev.s; this.anim = null; }
    else this.anim = { from: { s: this.v.s, x: this.v.ox, y: this.v.oy }, to: prev, t: 0 };
    this.opts.onHistory?.(this.viewStack.length);
    return true;
  }
  focus(id) {
    const s = this.spots.find((s) => s.places.some((p) => p.id === id)); if (!s) return;
    this.remember();
    if (s.tunnel && this.mode === 'street') this.setMode('both');
    if (!s.tunnel && this.mode === 'tunnel') this.setMode('street');
    this.anim = { from: { s: this.v.s, x: this.v.ox, y: this.v.oy }, at: s, s: Math.max(this.v.s, 0.85), t: 0 };
  }
  zoomTo(x, y, s, z = 0, keep) { if (!keep) this.remember(); this.anim = { from: { s: this.v.s, x: this.v.ox, y: this.v.oy }, at: { x, y, z }, s, t: 0 }; }
  bindInput() {
    const cv = this.cv; let drag = null, pinch = null, moved = 0; const pointers = new Map();
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const two = () => { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      try { cv.setPointerCapture(e.pointerId); } catch (_) {} pointers.set(e.pointerId, pt(e)); moved = 0; this.anim = null; this.rotAnim = null;
      if (pointers.size === 1) drag = { p: pt(e), ox: this.v.ox, oy: this.v.oy, rot: e.button === 2 || e.shiftKey || e.altKey };
      else { const g = two(); pinch = { ...g, s: this.v.s, r: this.v.r }; drag = null; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) { this.hover = this.hit(...pt(e)); cv.style.cursor = this.hover ? 'pointer' : 'grab'; return; }
      pointers.set(e.pointerId, pt(e));
      if (pinch && pointers.size === 2) {
        const g = two();
        this.v.ox += g.m[0] - pinch.m[0]; this.v.oy += g.m[1] - pinch.m[1]; pinch.m = g.m;         // two-finger pan
        this.zoomAt(g.m[0], g.m[1], pinch.s * g.d / pinch.d / this.v.s);                           // pinch to zoom
        let da = g.ang - pinch.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.06 || pinch.rotating) { pinch.rotating = true; this.rotateTo(pinch.r + da, g.m[0], g.m[1]); }   // twist to rotate
        moved += 10;
      }
      else if (drag && drag.rot) { const p = pt(e); const dx = p[0] - drag.p[0]; moved += Math.abs(dx); this.rotateBy(-dx * 0.008); drag.p = p; }
      else if (drag) { const p = pt(e); moved += Math.abs(p[0] - drag.p[0]) + Math.abs(p[1] - drag.p[1]); this.v.ox = drag.ox + p[0] - drag.p[0]; this.v.oy = drag.oy + p[1] - drag.p[1]; }
    });
    const up = (e) => {
      pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
      if (drag && moved < 8) {
        const h = this.hit(...pt(e));
        if (h?.cluster) this.zoomTo(h.cluster.x, h.cluster.y, Math.max(0.75, this.v.s * 2.4), h.cluster.z);
        else if (h?.spot) this.opts.onSelect?.(h.spot.places, h.spot);
        else if (h?.npc) this.opts.onNpc?.(h.npc);
        else if (h?.vehicle) this.opts.onVehicle?.(h.vehicle);
        else if (h?.landmark) this.opts.onLandmark?.(h.landmark);
        else if (this.mode !== 'tunnel') {
          const [wx, wy] = this.toWorld(...pt(e)), c = this.nearestCorner(wx, wy), near = Math.min(Math.abs(wx - c.x), Math.abs(wy - c.y));
          if (near < this.streetW + 1.2) { this.markCorner(c.x, c.y, c.label, false); this.opts.onCorner?.(c, this.spotsNear(c.x, c.y)); }
        }
      }
      drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = pt(e); if (e.shiftKey && !e.ctrlKey) this.rotateBy((e.deltaY || e.deltaX) * 0.004, x, y); else this.zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); this.anim = null; }, { passive: false });
    // Safari trackpad / iOS gesture events: stop the page from zooming; on a Mac trackpad, use them to twist + pinch
    let g0 = null;
    cv.addEventListener('gesturestart', (e) => { e.preventDefault(); g0 = pointers.size ? null : { r: this.v.r, s: this.v.s }; });
    cv.addEventListener('gesturechange', (e) => { e.preventDefault(); if (!g0) return; const [x, y] = pt(e); this.zoomAt(x, y, g0.s * e.scale / this.v.s); this.rotateTo(g0.r + (e.rotation || 0) * Math.PI / 180, x, y); });
    cv.addEventListener('gestureend', (e) => { e.preventDefault(); g0 = null; });
  }
  zoomAt(x, y, k) { const ns = Math.min(3, Math.max(0.08, this.v.s * k)); k = ns / this.v.s; this.v.ox = x - (x - this.v.ox) * k; this.v.oy = y - (y - this.v.oy) * k; this.v.s = ns; }
  zoom(k) { this.zoomAt(this.W / 2, this.H / 2, k); }
  setMode(m) {
    const prev = this.mode; this.mode = m; this.opts.onMode?.(m);
    if (m === 'tunnel' && prev !== 'tunnel' && this.tunnelSpots.length && this.pick == null) {
      const T = this.tunnelSpots; this.zoomTo(T.reduce((a, s) => a + s.x, 0) / T.length, T.reduce((a, s) => a + s.y, 0) / T.length, Math.max(this.v.s, 0.55), 0, true);
    }
  }
  setHighlight(ids) { this.highlight = ids; }
  setPick(id) { this.pick = id; if (id != null) this.focus(id); }

  lod() { const s = this.v.s; return s < 0.5 ? 'cluster' : s < 1.0 ? 'pin' : 'label'; }
  tunnelZ() { return this.mode === 'tunnel' ? 0 : -3; }
  visibleSpots(under) { return this.spots.filter((s) => s.tunnel === under && (!this.highlight || s.places.some((p) => this.highlight.has(p.id)))); }
  clusters(under) {
    const m = new Map(), k = this.clusterSpan();
    for (const s of this.visibleSpots(under)) {
      const [i, j] = this.cellIdx(s.x, s.y), key = Math.floor(i / k) + ':' + Math.floor(j / k);
      const c = m.get(key) || { n: 0, x: 0, y: 0, open: 0 };
      c.n += s.places.length; c.x += s.x * s.places.length; c.y += s.y * s.places.length; c.open += s.places.filter((p) => this.openFn(p)).length; m.set(key, c);
    }
    return [...m.values()].map((c) => ({ ...c, x: c.x / c.n, y: c.y / c.n, z: under && this.mode !== 'street' ? this.tunnelZ() : 0 }));
  }
  layers() { return this.mode === 'tunnel' ? [true] : this.mode === 'both' ? [true, false] : [false]; }
  hit(sx, sy) {
    const lod = this.lod();
    for (const n of this.npcs) {
      if (n.inside > 0 || !this.layers().includes(n.under)) continue;
      const [x, y] = this.v.p(n.x, n.y, n.under ? this.tunnelZ() : 0), u = Math.max(0.55, this.u() * 0.8);
      if (Math.abs(sx - x) < 7 * u + 4 && sy < y + 3 && sy > y - 30 * u) return { npc: n };
    }
    if (this.mode !== 'tunnel' && this.v.s > 0.35) for (const c of [...(this.cars || []), ...(this.trains || []).map((t) => ({ ...this.trainBox(t), kind: 'train', line: t.line }))]) {
      const b = c.kind === 'train' ? c : this.carBox(c), [x, y] = this.v.p(b.x + b.w / 2, b.y + b.d / 2, 0.8);
      if (Math.hypot(sx - x, sy - y) < Math.max(10, 16 * this.v.s)) return { vehicle: c };
    }
    let best = null, bd = 1e9;
    for (const under of this.layers()) {
      if (lod === 'cluster') {
        for (const c of this.clusters(under)) { const [x, y] = this.v.p(c.x, c.y, c.z); const r = 8 + Math.min(9, Math.sqrt(c.n) * 2.2); const d = Math.hypot(sx - x, sy - (y - r - 4)); if (d < r + 8 && d < bd) { bd = d; best = { cluster: c }; } }
      } else {
        for (const s of this.visibleSpots(under)) { const [x, y] = this.v.p(s.x, s.y, under ? this.tunnelZ() : 0); const d = Math.hypot(sx - x, sy - (y - this.pinLift())); if (d < 18 && d < bd) { bd = d; best = { spot: s }; } }
      }
    }
    if (!best && this.mode !== 'tunnel') for (const st of this.rail?.stations || []) {
      const [x, y] = this.v.p(st.x + (st.line === 'red' ? 1.3 : 0), st.y, 1.6); if (Math.abs(sx - x) < 60 && Math.abs(sy - y) < 11 && this.v.s > 0.3) return { landmark: { n: '🚊 ' + st.n + (st.line === 'red' ? ' · Red Line' : ' · Green & Purple lines'), station: true } };
    }
    if (!best && this.mode !== 'tunnel') for (const l of this.landmarks) {
      const [x, y] = this.v.p(l.x + l.w / 2, l.y + l.d / 2, l.h * 0.6);
      if (Math.abs(sx - x) < l.w * TW * this.v.s * 0.4 && Math.abs(sy - y) < l.h * ZU * this.v.s * 0.4) return { landmark: l };
    }
    return best;
  }
  u() { return Math.min(1.1, Math.max(0.5, this.v.s * 1.1)); }
  pinLift() { return 16 * Math.min(1.2, Math.max(0.8, this.v.s)); }
  nightAmount(d = new Date()) { const h = d.getHours() + d.getMinutes() / 60; return h < 6 ? 1 : h < 7.5 ? (7.5 - h) / 1.5 : h < 18 ? 0 : h < 19.5 ? (h - 18) / 1.5 : 1; }

  frame(t) {
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t;
    if (this.rotAnim) { const a = this.rotAnim; a.t = Math.min(1, a.t + dt * 2.2); const e = 1 - Math.pow(1 - a.t, 3); this.rotateTo(a.from + a.d * e); if (a.t >= 1) this.rotAnim = null; }
    this.stepTraffic(dt);
    if (this.anim) {
      const a = this.anim; a.t = Math.min(1, a.t + dt * 1.8); const e = 1 - Math.pow(1 - a.t, 3);
      if (a.to) {
        this.v.s = a.from.s + (a.to.s - a.from.s) * e; this.v.ox = a.from.x + (a.to.ox - a.from.x) * e; this.v.oy = a.from.y + (a.to.oy - a.from.y) * e;
        if (a.t >= 1) this.anim = null; this.stepNpcs(dt); this.stepTrains(dt); this.draw(t); return;
      }
      this.v.s = a.from.s + (a.s - a.from.s) * e; this.v.ox = 0; this.v.oy = 0;
      const z = a.at.z ?? (a.at.tunnel && this.mode !== 'street' ? this.tunnelZ() : 0);
      const [px, py] = this.v.p(a.at.x, a.at.y, z), tx = this.W / 2 - px, ty = this.H * 0.55 - py;
      this.v.ox = a.from.x + (tx - a.from.x) * e; this.v.oy = a.from.y + (ty - a.from.y) * e;
      if (a.t >= 1) this.anim = null;
    }
    this.stepNpcs(dt); this.stepTrains(dt);
    this.draw(t);
  }

  draw(now) {
    const ctx = this.ctx, v = this.v, B = this.bounds, night = this.nightAmount(), mode = this.mode, lod = this.lod(), N = night > 0.5;
    ctx.fillStyle = mode === 'tunnel' ? '#121624' : N ? '#1d2338' : '#e9eef3'; ctx.fillRect(0, 0, this.W, this.H);
    if (mode === 'tunnel') { this.drawGhostGrid(); this.drawTunnels(now); this.drawMarkers(true); this.drawPickBeacon(now); return; }

    const walk = N ? '#3a4152' : '#eef0f2', road = N ? '#20242f' : '#a3a9b2';
    for (const f of sides(v, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0)) poly(ctx, [v.p(...f.a), v.p(...f.b), v.p(...f.b, -0.8), v.p(...f.a, -0.8)], darken(N ? '#20253a' : '#d0d5db', f.shade));
    poly(ctx, [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x1, B.y1), v.p(B.x0, B.y1)], N ? '#2c3244' : '#dde2e7');
    this.drawBayouAndFreeways(N);
    const A = this.avenues, C = this.cross, sw = this.streetW;
    const ax0 = A[0].x - sw, ax1 = A[A.length - 1].x + sw, cy0 = C[0].y - sw, cy1 = C[C.length - 1].y + sw;
    poly(ctx, [v.p(ax0, cy0), v.p(ax1, cy0), v.p(ax1, cy1), v.p(ax0, cy1)], road);
    for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
      const x0 = A[i].x + sw, x1 = A[i + 1].x - sw, y0 = C[j].y + sw, y1 = C[j + 1].y - sw;
      poly(ctx, [v.p(x0, y0), v.p(x1, y0), v.p(x1, y1), v.p(x0, y1)], walk);
    }
    if (v.s > 0.45) {
      ctx.strokeStyle = N ? 'rgba(255,214,120,.3)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
      for (const a of A) { ctx.beginPath(); ctx.moveTo(...v.p(a.x, cy0)); ctx.lineTo(...v.p(a.x, cy1)); ctx.stroke(); }
      for (const c of C) { ctx.beginPath(); ctx.moveTo(...v.p(ax0, c.y)); ctx.lineTo(...v.p(ax1, c.y)); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    this.drawCrosswalks(N);
    this.drawRail(N);
    this.drawBusStops(N);
    for (const a of this.areas) this.drawArea(a, N, 'flat');
    for (const f of this.fill) if (f.lot) this.drawLot(f, N);
    if (mode === 'both') for (const s of this.tunnelSpots) { const [x, y] = v.p(s.x, s.y); ellipse(ctx, x, y, 4, 2, 'rgba(32,201,151,.6)'); }

    const items = [];
    for (const f of this.fill) if (!f.lot) items.push({ k: v.boxDepth(f.x, f.y, f.w, f.d), f });
    for (const l of this.landmarks) items.push({ k: v.boxDepth(l.x, l.y, l.w, l.d), l });
    for (const a of this.areas) if (['ballpark', 'arena', 'grb'].includes(a.kind)) items.push({ k: v.boxDepth(a.r.x0, a.r.y0, a.r.x1 - a.r.x0, a.r.y1 - a.r.y0), a });
    for (const n of this.npcs) if (!n.under && n.inside <= 0) items.push({ k: v.depth(n.x, n.y) + 0.5, n });
    for (const t of this.trains || []) { const b = this.trainBox(t); items.push({ k: v.boxDepth(b.x, b.y, b.w, b.d), t }); }
    for (const c of this.cars || []) { const b = this.carBox(c); items.push({ k: v.boxDepth(b.x, b.y, b.w, b.d), c }); }
    items.sort((p, q) => p.k - q.k);
    const ghost = mode === 'both' ? 0.4 : 1;
    for (const it of items) {
      if (it.f) box(ctx, v, it.f.x, it.f.y, it.f.w, it.f.d, it.f.h, N ? darken(it.f.c, 0.5) : it.f.c, 0, { alpha: ghost, mullions: it.f.glass, night: N });
      else if (it.l) this.drawLandmark(it.l, N, ghost);
      else if (it.a) this.drawArea(it.a, N, '3d', ghost);
      else if (it.t) this.drawTrain(it.t, N, ghost);
      else if (it.c) this.drawCar(it.c, N, ghost, now);
      else this.drawNpc(it.n, now, 0);
    }
    if (mode === 'both') { ctx.fillStyle = 'rgba(14,18,30,.3)'; ctx.fillRect(0, 0, this.W, this.H); this.drawTunnels(now); this.drawMarkers(true); }
    this.drawRailOverlay();
    this.drawStreetSigns(N);
    this.drawMarkers(false);
    this.drawLabels(N);
    this.drawMark(now);
    if (night > 0) { ctx.fillStyle = `rgba(14,18,48,${0.1 * night})`; ctx.fillRect(0, 0, this.W, this.H); }
    this.drawPickBeacon(now);
  }

  drawLot(f, N) {
    const ctx = this.ctx, v = this.v;
    poly(ctx, [v.p(f.x, f.y), v.p(f.x + f.w, f.y), v.p(f.x + f.w, f.y + f.d), v.p(f.x, f.y + f.d)], N ? '#2a2f3b' : '#c9ced4');
    if (v.s > 0.5) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const x = f.x + f.w * i / 6; ctx.beginPath(); ctx.moveTo(...v.p(x, f.y + 0.6)); ctx.lineTo(...v.p(x, f.y + f.d * 0.4)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...v.p(x, f.y + f.d * 0.6)); ctx.lineTo(...v.p(x, f.y + f.d - 0.6)); ctx.stroke(); } }
  }

  drawLandmark(l, N, alpha) {
    const ctx = this.ctx, v = this.v, c = N ? darken(l.c, 0.4) : l.c, o = { alpha, night: N };
    ctx.globalAlpha = alpha;
    if (l.kind === 'twin') {
      const w2 = l.w * 0.44;
      box(ctx, v, l.x, l.y, w2, l.d, l.h * 0.88, c, 0, { ...o, noTop: true }); ctx.globalAlpha = alpha; wedgeTop(ctx, v, l.x, l.y, w2, l.d, l.h * 0.88, l.h * 0.12, c, true);
      box(ctx, v, l.x + l.w - w2, l.y + l.d * 0.15, w2, l.d * 0.85, l.h * 0.88, c, 0, { ...o, noTop: true }); ctx.globalAlpha = alpha; wedgeTop(ctx, v, l.x + l.w - w2, l.y + l.d * 0.15, w2, l.d * 0.85, l.h * 0.88, l.h * 0.12, c, false);
    } else if (l.kind === 'stepped' || l.kind === 'mayan') {
      const tiers = l.kind === 'mayan' ? [[1, 0.78], [0.82, 0.08], [0.64, 0.05], [0.46, 0.04]] : [[1, 0.7], [0.8, 0.18], [0.6, 0.12]];
      let z = 0; for (const [k, hf] of tiers) { const w = l.w * k, d = l.d * k; box(ctx, v, l.x + (l.w - w) / 2, l.y + (l.d - d) / 2, w, d, l.h * hf, c, z, { ...o, mullions: l.kind === 'stepped' }); z += l.h * hf; }
      ctx.globalAlpha = alpha;
      if (l.kind === 'mayan') { const w = l.w * 0.3; pyramid(ctx, v, l.x + (l.w - w) / 2, l.y + (l.d - w) / 2, w, w, z, 1.4, c); }
    } else if (l.kind === 'gable') {
      let z = 0;
      for (const [k, hf] of [[1, 0.62], [0.8, 0.22], [0.6, 0.1]]) { const w = l.w * k, d = l.d * k, x = l.x + (l.w - w) / 2, y = l.y + (l.d - d) / 2; box(ctx, v, x, y, w, d, l.h * hf, c, z, o); ctx.globalAlpha = alpha; gableRoof(ctx, v, x, y, w, d, z + l.h * hf, 1.2, c); z += l.h * hf; }
    } else if (l.kind === 'chase') {
      box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, { ...o, mullions: true }); ctx.globalAlpha = alpha;
      if (v.vis(1, 1)[0] > 0) poly(ctx, [v.p(l.x + l.w * 0.7, l.y + l.d, l.h), v.p(l.x + l.w, l.y + l.d * 0.7, l.h), v.p(l.x + l.w, l.y + l.d * 0.7, 0), v.p(l.x + l.w * 0.7, l.y + l.d, 0)], lighten(c, 0.08));
    } else if (l.kind === 'theater') {
      box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, o); ctx.globalAlpha = alpha;
      const F = sides(v, l.x, l.y, l.w, l.d).sort((a, b) => b.f - a.f)[0];
      if (F) { const a = lerp2(F.a, F.b, 0.15), b = lerp2(F.a, F.b, 0.85), o = [F.n[0] * 0.6, F.n[1] * 0.6]; poly(ctx, [v.p(...a, 1.1), v.p(...b, 1.1), v.p(b[0] + o[0], b[1] + o[1], 1.0), v.p(a[0] + o[0], a[1] + o[1], 1.0)], N ? '#ffd43b' : '#c92a2a'); }
    } else if (l.kind === 'church') {
      box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, { ...o, noTop: true }); ctx.globalAlpha = alpha; gableRoof(ctx, v, l.x, l.y, l.w, l.d, l.h, 1.6, darken(c, 0.15));
      const tw = Math.min(l.w, l.d) * 0.3; box(ctx, v, l.x + 0.3, l.y + l.d - tw - 0.3, tw, tw, l.h + 2.2, c, 0, o); ctx.globalAlpha = alpha; pyramid(ctx, v, l.x + 0.3, l.y + l.d - tw - 0.3, tw, tw, l.h + 2.2, 1.6, darken(c, 0.2));
    } else if (l.kind === 'aquarium') {
      box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, o); ctx.globalAlpha = alpha;
      const [cx, cy] = v.p(l.x + l.w * 0.3, l.y + l.d * 0.5, l.h + 3.2), R = 3.4 * ZU * v.s * 0.55;
      ctx.strokeStyle = N ? '#ffd43b' : '#e8590c'; ctx.lineWidth = Math.max(1, v.s * 2); ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.55, R, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + performance.now() / 4000; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R); ctx.stroke(); }
      const [bx, by] = v.p(l.x + l.w * 0.3, l.y + l.d * 0.5, l.h); ctx.beginPath(); ctx.moveTo(bx - R * 0.3, by); ctx.lineTo(cx, cy); ctx.lineTo(bx + R * 0.3, by); ctx.stroke();
    } else box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, { ...o, mullions: l.kind === 'glass' });
    ctx.globalAlpha = 1;
  }

  drawArea(a, N, pass, alpha = 1) {
    const ctx = this.ctx, v = this.v, r = a.r;
    const quad = (x0, y0, x1, y1, z, f) => poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], f);
    if (pass === 'flat') {
      if (a.kind === 'park') {
        quad(r.x0, r.y0, r.x1, r.y1, 0, N ? '#24452f' : '#acd38f');
        if (a.n === 'Discovery Green') { const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; quad(cx - 2.5, cy + 0.5, cx + 2, cy + 3, 0.02, N ? '#2a4d6e' : '#8fd0f2'); }
        if (v.s > 0.22) for (let i = 0; i < 7; i++) { const tx = r.x0 + (r.x1 - r.x0) * (0.1 + hash(a.n + i) * 0.8), ty = r.y0 + (r.y1 - r.y0) * (0.1 + hash(i + a.n) * 0.8); const [x, y] = v.p(tx, ty); const k = v.s * 2.2; ellipse(ctx, x, y, 6 * k, 3 * k, 'rgba(0,0,0,.12)'); circle(ctx, x, y - 6 * k, 5.2 * k, N ? '#2f6b45' : '#5fae5a'); circle(ctx, x - 1.6 * k, y - 7.6 * k, 2.6 * k, N ? '#3d8a59' : '#7cc576'); }
      } else quad(r.x0, r.y0, r.x1, r.y1, 0, N ? '#3d4456' : '#e7dfd0');
      return;
    }
    ctx.globalAlpha = alpha;
    if (a.kind === 'ballpark') {
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, w = r.x1 - r.x0, d = r.y1 - r.y0;
      box(ctx, v, r.x0 + 0.5, r.y0 + 0.5, w - 1, d - 1, 3.6, N ? '#5a4a40' : '#c8b29a', 0, { alpha, noTop: true });
      ctx.globalAlpha = alpha; quad(r.x0 + 1.5, r.y0 + 1.5, r.x1 - 1.5, r.y1 - 1.5, 3.6, N ? '#2d5b3a' : '#6cc070');
      const [dx, dy] = v.p(cx + w * 0.12, cy + d * 0.12, 3.62), k = v.s * 4;
      ctx.fillStyle = N ? '#7a6248' : '#d9a36b'; ctx.beginPath(); ctx.moveTo(dx, dy - 6 * k); ctx.lineTo(dx + 7 * k, dy); ctx.lineTo(dx, dy + 6 * k); ctx.lineTo(dx - 7 * k, dy); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; for (let i = 0; i <= 6; i++) { const y = r.y0 + 0.5 + (d - 1) * i / 6; ctx.beginPath(); ctx.moveTo(...v.p(r.x0 + 0.5, y, 6)); ctx.lineTo(...v.p(r.x1 - 0.5, y, 6)); ctx.stroke(); }
    } else if (a.kind === 'arena') {
      box(ctx, v, r.x0 + 0.8, r.y0 + 0.8, r.x1 - r.x0 - 1.6, r.y1 - r.y0 - 1.6, 4.2, N ? '#3b4252' : '#aab4bf', 0, { alpha, mullions: true });
      ctx.globalAlpha = alpha; const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; quad(cx - 2.2, cy - 2.2, cx + 2.2, cy + 2.2, 4.25, N ? '#59606e' : '#c3cad3'); const [x, y] = v.p(cx, cy, 4.3); circle(ctx, x, y, Math.max(1.5, 3 * v.s * 3), '#c92a2a');
    } else if (a.kind === 'grb') {
      box(ctx, v, r.x0 + 0.6, r.y0 + 0.6, r.x1 - r.x0 - 1.2, r.y1 - r.y0 - 1.2, 3.4, N ? '#46505f' : '#dfe4ea', 0, { alpha, mullions: true });
      for (let i = 0; i < 4; i++) { const y = r.y0 + 2 + (r.y1 - r.y0 - 4) * i / 3; box(ctx, v, r.x1 - 2.6, y, 0.9, 0.9, 5.2, '#d9480f', 0, { alpha }); }
    }
    ctx.globalAlpha = 1;
  }

  drawBayouAndFreeways(N) {
    const ctx = this.ctx, v = this.v, B = this.bounds, A = this.avenues, C = this.cross;
    const yb = C[0].y - this.blockD * 1.4, pts = [];
    for (let x = B.x0; x <= B.x1; x += 2) pts.push([x, yb + Math.sin(x / 9) * 2 + Math.sin(x / 23) * 1.3]);
    const band = (w, col) => poly(ctx, [...pts.map(([x, y]) => v.p(x, y - w)), ...pts.slice().reverse().map(([x, y]) => v.p(x, y + w))], col);
    band(4, N ? '#24452f' : '#b6d79c'); band(1.9, N ? '#1c3a57' : '#7fbbd9');
    const fw = 2.2, road = N ? '#2b303c' : '#b7bcc4';
    const xW = A[0].x - this.blockW * 1.2, xE = A[A.length - 1].x + this.blockW * 0.9, yN = C[0].y - this.blockD * 2.3;
    poly(ctx, [v.p(xW - fw, B.y0), v.p(xW + fw, B.y0), v.p(xW + fw, B.y1), v.p(xW - fw, B.y1)], road);
    poly(ctx, [v.p(xE - fw, B.y0), v.p(xE + fw, B.y0), v.p(xE + fw, B.y1), v.p(xE - fw, B.y1)], road);
    poly(ctx, [v.p(B.x0, yN - fw), v.p(B.x1, yN - fw), v.p(B.x1, yN + fw), v.p(B.x0, yN + fw)], road);
    ctx.strokeStyle = N ? 'rgba(255,214,120,.4)' : 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]);
    for (const x of [xW, xE]) { ctx.beginPath(); ctx.moveTo(...v.p(x, B.y0)); ctx.lineTo(...v.p(x, B.y1)); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(...v.p(B.x0, yN)); ctx.lineTo(...v.p(B.x1, yN)); ctx.stroke(); ctx.setLineDash([]);
    const midY = (C[3].y + C[C.length - 4].y) / 2, midX = (A[2].x + A[A.length - 3].x) / 2;
    this.freewayLabels = [{ t: 'I-45', x: xW, y: midY }, { t: 'US-59 / I-69', x: xE, y: midY }, { t: 'I-10', x: midX, y: yN }, { t: 'Buffalo Bayou', x: (A[1].x + A[4].x) / 2, y: yb, water: true }];
  }

  drawGhostGrid() {
    const ctx = this.ctx, v = this.v, A = this.avenues, C = this.cross;
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (const a of A) { ctx.beginPath(); ctx.moveTo(...v.p(a.x, C[0].y)); ctx.lineTo(...v.p(a.x, C[C.length - 1].y)); ctx.stroke(); }
    for (const c of C) { ctx.beginPath(); ctx.moveTo(...v.p(A[0].x, c.y)); ctx.lineTo(...v.p(A[A.length - 1].x, c.y)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of A) if (MAJOR.has(a.n)) { const [x, y] = v.p(a.x, C[0].y - 2); ctx.fillText(a.n, x, y); }
    for (const c of C) if (MAJOR.has(c.n)) { const [x, y] = v.p(A[0].x - 3, c.y); ctx.fillText(c.n, x, y); }
  }

  drawTunnels(now) {
    const ctx = this.ctx, v = this.v, z = this.tunnelZ(), T = this.tunnelSpots; if (!T.length) return;
    const w = 0.8;
    const seg = (ax, ay, bx, by) => { const x0 = Math.min(ax, bx) - w, x1 = Math.max(ax, bx) + w, y0 = Math.min(ay, by) - w, y1 = Math.max(ay, by) + w; poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], '#34425c'); for (const f of sides(v, x0, y0, x1 - x0, y1 - y0)) poly(ctx, [v.p(...f.a, z), v.p(...f.b, z), v.p(...f.b, z + 0.5), v.p(...f.a, z + 0.5)], '#26324a'); };
    for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b]; seg(A.x, A.y, Bn.x, A.y); seg(Bn.x, A.y, Bn.x, Bn.y); }
    ctx.strokeStyle = 'rgba(56,217,169,.85)'; ctx.lineWidth = Math.max(1.2, v.s * 2.5); ctx.shadowColor = '#38d9a9'; ctx.shadowBlur = 6;
    ctx.beginPath(); for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b]; ctx.moveTo(...v.p(A.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, Bn.y, z)); } ctx.stroke(); ctx.shadowBlur = 0;
    for (const n of this.npcs) if (n.under && n.inside <= 0) this.drawNpc(n, now, z);
  }

  drawMarkers(under) {
    const ctx = this.ctx, v = this.v, lod = this.lod();
    const z = under ? this.tunnelZ() : 0, accent = under ? '#12b886' : '#e8590c';
    if (lod === 'cluster') {
      for (const c of this.clusters(under)) {
        const [x, y] = v.p(c.x, c.y, z), r = 8 + Math.min(9, Math.sqrt(c.n) * 2.2), cy = y - r - 4;
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, cy + r); ctx.stroke();
        circle(ctx, x, cy, r + 2, '#fff'); circle(ctx, x, cy, r, c.open ? accent : '#868e96');
        ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 0.95)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.n), x, cy + 0.5);
      }
      return;
    }
    const lift = this.pinLift();
    for (const s of this.visibleSpots(under).sort((a, b) => v.depth(a.x, a.y) - v.depth(b.x, b.y))) {
      const [x, y] = v.p(s.x, s.y, z), open = s.places.some((p) => this.openFn(p)), r = lod === 'label' ? 12 : 10;
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - lift + r); ctx.stroke();
      ellipse(ctx, x, y, 3, 1.5, 'rgba(0,0,0,.25)');
      circle(ctx, x, y - lift, r + 1.8, under ? '#c3fae8' : '#fff'); circle(ctx, x, y - lift, r, open ? s.style.color : '#adb5bd');
      ctx.font = `${Math.round(r * 1.05)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.style.emoji, x, y - lift + 1);
      if (s.places.length > 1) { circle(ctx, x + r * 0.85, y - lift - r * 0.8, 7, '#212529'); ctx.fillStyle = '#fff'; ctx.font = '700 9px system-ui, sans-serif'; ctx.fillText(String(s.places.length), x + r * 0.85, y - lift - r * 0.8 + 0.5); }
      if (lod === 'label' || this.hover?.spot === s) pill(ctx, x, y - lift - r - 12, s.label.length > 24 ? s.label.slice(0, 23) + '…' : s.label, 11, under ? 'rgba(18,184,134,.92)' : 'rgba(255,255,255,.94)', under ? '#fff' : '#212529');
    }
  }

  drawNpc(n, now, z) {
    const [x, y] = this.v.p(n.x, n.y, z), u = Math.max(0.55, this.u() * 0.8);
    if (x < -40 || y < -60 || x > this.W + 40 || y > this.H + 40) return;
    const gem = this.pick != null && n.target?.places.some((p) => p.id === this.pick) ? '#fcc419' : '#40c057';
    drawPerson(this.ctx, x, y, u, n.look, n.phase, !!n.path.length && n.wait <= 0, gem, now);
    if (n.thought && n.thoughtT > 0 && this.v.s > 0.3) pill(this.ctx, x + 12 * u, y - 38 * u, n.thought, 11, 'rgba(255,255,255,.95)');
  }

  drawLabels(N) {
    const ctx = this.ctx, v = this.v, A = this.avenues, C = this.cross;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(Math.min(13, 9 + v.s * 4))}px system-ui, sans-serif`; ctx.fillStyle = N ? 'rgba(255,255,255,.8)' : 'rgba(33,37,41,.85)';
    const all = v.s > 0.5;
    for (const a of A) if (all || MAJOR.has(a.n)) { const [x, y] = v.p(a.x, C[0].y - 1.6); ctx.fillText(a.n, x, y); }
    for (const c of C) if (all || MAJOR.has(c.n)) { const [x, y] = v.p(A[0].x - 2.4, c.y); ctx.fillText(c.n, x, y); }
    for (const f of this.freewayLabels || []) { const [x, y] = v.p(f.x, f.y); pill(ctx, x, y, f.t, 10, f.water ? 'rgba(25,113,194,.85)' : 'rgba(33,37,41,.75)', '#fff'); }
    if (v.s > 0.3) {
      for (const a of this.areas) { const [x, y] = v.p((a.r.x0 + a.r.x1) / 2, (a.r.y0 + a.r.y1) / 2, a.kind === 'park' || a.kind === 'plaza' ? 0.5 : 7); pill(ctx, x, y, a.n, 10, a.kind === 'park' ? 'rgba(47,158,68,.88)' : 'rgba(73,80,87,.85)', '#fff'); }
      for (const st of this.rail?.stations || []) { const [x, y] = v.p(st.x + (st.line === 'red' ? 1.3 : 0), st.y, 1.6); pill(ctx, x, y, '🚊 ' + st.n, 10, st.line === 'red' ? 'rgba(224,49,49,.92)' : 'rgba(47,158,68,.92)', '#fff'); }
      if (v.s > 0.42) for (const l of this.landmarks) { const [x, y] = v.p(l.x + l.w / 2, l.y + l.d / 2, l.h + 1.5); pill(ctx, x, y, l.n, 10, 'rgba(255,255,255,.88)', '#343a40'); }
    }
  }

  drawPickBeacon(now) {
    if (this.pick == null) return;
    const s = this.spots.find((s) => s.places.some((p) => p.id === this.pick)); if (!s || (s.tunnel && this.mode === 'street') || (!s.tunnel && this.mode === 'tunnel')) return;
    const z = s.tunnel ? this.tunnelZ() : 0, [x, y] = this.v.p(s.x, s.y, z);
    const py = y - this.pinLift() - 34 + Math.sin(now / 300) * 4, w = 9 * (0.5 + 0.5 * Math.abs(Math.cos(now / 500)));
    const ctx = this.ctx; ctx.shadowColor = '#69db7c'; ctx.shadowBlur = 14;
    poly(ctx, [[x, py - 15], [x + w, py], [x, py + 15], [x - w, py]], '#51cf66', '#2b8a3e', 1.5); ctx.shadowBlur = 0;
    poly(ctx, [[x, py - 15], [x + w, py], [x, py]], 'rgba(255,255,255,.4)');
  }
}
