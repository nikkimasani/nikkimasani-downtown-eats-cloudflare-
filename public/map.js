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
  { n: 'Downtown Aquarium', b: ['W', 'Bagby', 'Congress', 'Prairie'], h: 2.6, kind: 'aquarium', c: '#4fa3c1' },
  { n: 'POST Houston', b: ['Bagby', 'Smith', 'Commerce', 'Franklin'], h: 3.4, kind: 'post', c: '#cdc6b8' },
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
// vehicle sizes in map units (1 unit = 10 m), about 1.4× life size so they read on a phone
const VEH = { waymo: { L: 0.7, W: 0.32, H: 0.24 }, bus: { L: 1.6, W: 0.4, H: 0.46 }, train: { L: 4.2, W: 0.4, H: 0.42 } };
const GLASS = ['#8fb3c9', '#7d9db8', '#9fb6c8', '#6f8fa8', '#a7bfcf', '#86a3b5'], CONCRETE = ['#cfd6de', '#d9d2c5', '#c8cdd3', '#e2ddd3', '#bfc7cf', '#d6cbbb'], LOW = ['#e2d6c4', '#d8cfc2', '#cdbfae', '#e6e0d6', '#d3c8b8', '#c9c2b6'];
// buildings OpenStreetMap leaves unnamed or plain, styled by hand (lat, lng inside the footprint)
const STYLE_FIX = [{ at: [29.75412, -95.36274], name: 'Four Seasons Hotel', c: '#cdb59a', grid: '#6b5646', minH: 80 }];
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
const mixC = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
const ptIn = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const AWN = ['#b3392f', '#1f6f5c', '#2c3e70', '#b8862b', '#7b2d5b', '#2f5d8a', '#3d3d3d'];
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
const NAMES = ['Maya', 'Jordan', 'Luis', 'Aisha', 'Ben', 'Priya', 'Marcus', 'Sofia', 'Tyler', 'Grace', 'Diego', 'Hannah', 'Kwame', 'Lena', 'Omar', 'Chloe', 'Andre', 'Mei', 'Jamal', 'Rosa', 'Ethan', 'Nia', 'Carlos', 'Zoe', 'Raj', 'Ivy', 'Malik', 'Elena', 'Sam', 'Tasha', 'Victor', 'Leah', 'Hiro', 'Bianca', 'Devon', 'Amara', 'Nate', 'Lucia', 'Femi', 'Kara', 'Trinh', 'Javier', 'Olivia', 'DeShawn', 'Ana', 'Wes'];
const NEED = { hunger: { e: '🍔', l: 'Hungry', kinds: ['food'] }, thirst: { e: '🍹', l: 'Thirsty', kinds: ['bar'] }, energy: { e: '☕', l: 'Tired', kinds: ['coffee'] }, fun: { e: '🎉', l: 'Bored', kinds: ['bar', 'food'] } };
const ROLE = { office: ['💼', 'Office worker'], local: ['🙂', 'Local'], tourist: ['📸', 'Tourist'], jogger: ['🏃', 'Jogger'], courier: ['🚲', 'Delivery rider'], night: ['🌃', 'Night owl'], fan: ['🏟️', 'Game-day fan'] };
const ME_LOOK = { skin: '#c98e64', hair: '#2b1b12', shirt: '#1c7ed6', pants: '#343a40', long: true };
const UMB = ['#e03131', '#1971c2', '#212529', '#f08c00', '#7048e8', '#2f9e44', '#f8f9fa'];
function placeKind(p) { const k = [p.type, ...(p.cuisines || []), ...(p.vibes || [])].join(' '); if (/coffee|caffeine|caf[eé]|bakery|boba|juice|\btea\b|kolache|donut/i.test(k) && !/nightlife/i.test(k)) return 'coffee'; if (/\bbar\b|lounge|\bpub\b|nightclub|nightlife|saloon|tavern|brew/i.test(k)) return 'bar'; return 'food'; }
function drawPerson(ctx, x, y, u, look, phase, moving, gem, now, wx = '') {
  const step = moving ? Math.sin(phase) : 0, bob = moving && !look.bike ? Math.abs(Math.sin(phase)) * 1.2 * u : 0;
  const ln = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  ellipse(ctx, x, y, (look.bike ? 10 : 6) * u, 2.6 * u, 'rgba(0,0,0,.2)');
  ctx.lineCap = 'round';
  if (look.bike) {   // two wheels and a frame; the rider sits up on top
    ctx.strokeStyle = '#212529'; ctx.lineWidth = 1.3 * u;
    for (const sx of [-6, 6]) { ctx.beginPath(); ctx.ellipse(x + sx * u, y - 3.2 * u, 3.2 * u, 3.2 * u, 0, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(x - 6 * u, y - 3.2 * u); ctx.lineTo(x - 1 * u, y - 9 * u); ctx.lineTo(x + 4.5 * u, y - 9 * u); ctx.lineTo(x + 6 * u, y - 3.2 * u); ctx.moveTo(x - 1 * u, y - 9 * u); ctx.lineTo(x + 0.5 * u, y - 3.4 * u); ctx.stroke();
    y -= 6 * u;
  }
  y -= bob;
  const feet = look.bike ? [Math.sin(phase) * 2 * u, -Math.sin(phase) * 2 * u] : [step * 2.4 * u, -step * 2.4 * u], end = look.bike ? 3.5 : 1;
  [[-2, feet[0]], [2, feet[1]]].forEach(([ox, f]) => {
    const x0 = x + ox * u, y0 = y - 10 * u, x1 = x0 + f, y1 = y - end * u;
    if (look.shorts) { ctx.strokeStyle = look.skin; ctx.lineWidth = 2.5 * u; ln(x0, y0, x1, y1); ctx.strokeStyle = look.pants; ctx.lineWidth = 3.4 * u; ln(x0, y0, x0 + f * 0.4, y0 + (y1 - y0) * 0.4); }
    else { ctx.strokeStyle = look.pants; ctx.lineWidth = 3.2 * u; ln(x0, y0, x1, y1); }
  });
  if (look.box) { ctx.fillStyle = look.box; ctx.fillRect(x - 8 * u, y - 25 * u, 7 * u, 7 * u); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 8 * u, y - 25 * u, 7 * u, 1.4 * u); }
  const coat = wx === 'cold', torsoH = coat ? 15 : 12;
  ctx.fillStyle = coat ? darken(look.shirt, 0.45) : look.shirt; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 5 * u, y - 21 * u, 10 * u, torsoH * u, 3 * u) : ctx.rect(x - 5 * u, y - 21 * u, 10 * u, torsoH * u); ctx.fill();
  if (coat) { ctx.fillStyle = '#c92a2a'; ctx.fillRect(x - 4.5 * u, y - 21.5 * u, 9 * u, 2.2 * u); }   // scarf
  if (look.tie) { ctx.strokeStyle = look.tie; ctx.lineWidth = 1.6 * u; ln(x, y - 20.4 * u, x, y - 13.5 * u); }
  if (look.camera) { ctx.fillStyle = '#212529'; ctx.fillRect(x - 2.2 * u, y - 17.5 * u, 4.4 * u, 3 * u); circle(ctx, x, y - 16 * u, 0.9 * u, '#74c0fc'); }
  const umb = wx === 'rain' && !look.bike && !look.shorts;
  ctx.strokeStyle = look.skin; ctx.lineWidth = 2.4 * u;
  if (look.bike) { ln(x - 5 * u, y - 19 * u, x + 3.5 * u, y - 14 * u); ln(x + 5 * u, y - 19 * u, x + 5 * u, y - 14 * u); }
  else {
    ln(x - 5 * u, y - 19 * u, x - 6.4 * u - step * 1.4 * u, y - 11 * u);
    if (umb) ln(x + 5 * u, y - 19 * u, x + 6 * u, y - 24 * u); else ln(x + 5 * u, y - 19 * u, x + 6.4 * u + step * 1.4 * u, y - 11 * u);
    if (look.bag && !umb) { ctx.fillStyle = '#5c3d2e'; ctx.fillRect(x + 4.8 * u + step * 1.4 * u, y - 11 * u, 4.4 * u, 3.4 * u); }
  }
  circle(ctx, x, y - 26 * u, 5.3 * u, look.skin);
  ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(x, y - 27 * u, 5.7 * u, Math.PI, 0); ctx.fill();
  if (look.long) { ctx.fillRect(x - 5.7 * u, y - 27 * u, 2.1 * u, 7 * u); ctx.fillRect(x + 3.6 * u, y - 27 * u, 2.1 * u, 7 * u); }
  const hat = look.hat || (wx === 'hot' && look.sun ? '#f1e3c0' : null);
  if (hat && !umb) { ellipse(ctx, x, y - 30 * u, 8 * u, 2.4 * u, hat); ctx.fillStyle = hat; ctx.beginPath(); ctx.arc(x, y - 30.5 * u, 4.4 * u, Math.PI, 0); ctx.fill(); }
  if (umb) {
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.2 * u; ln(x + 6 * u, y - 23 * u, x + 3 * u, y - 39 * u);
    ctx.fillStyle = look.umb || '#1971c2'; ctx.beginPath(); ctx.ellipse(x + 3 * u, y - 38 * u, 11 * u, 6 * u, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x + 3 * u, y - 38 * u, 11 * u, 6 * u, 0, Math.PI, Math.PI * 1.35); ctx.lineTo(x + 3 * u, y - 38 * u); ctx.fill();
  }
  if (gem) {
    const py = y - (umb ? 48 : 39) * u + Math.sin(now / 420 + phase) * 1.4 * u, w = 3.4 * u * (0.6 + 0.4 * Math.abs(Math.cos(now / 650 + phase)));
    poly(ctx, [[x, py - 5.5 * u], [x + w, py], [x, py + 5.5 * u], [x - w, py]], gem, 'rgba(0,0,0,.25)');
    poly(ctx, [[x, py - 5.5 * u], [x + w, py], [x, py]], 'rgba(255,255,255,.4)');
  }
}
// pins are drawn many times a second: paint each colour/emoji once into a small bitmap and reuse it
const SPRITES = new Map();
function pinSprite(color, emoji, r, ring) {
  const k = color + emoji + r + ring; let c = SPRITES.get(k); if (c) return c;
  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1), css = Math.ceil((r + 2) * 2 + 2);
  c = document.createElement('canvas'); c.width = c.height = Math.ceil(css * dpr); c.css = css;
  const g = c.getContext('2d'); g.scale(dpr, dpr); const m = css / 2;
  circle(g, m, m, r + 1.8, ring); circle(g, m, m, r, color);
  g.font = `${Math.round(r * 1.05)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, m, m + 1);
  SPRITES.set(k, c); return c;
}
// every label claims its box on screen; a later label that would overlap one already drawn is skipped
let TAKEN = null;
function fits(x0, y0, x1, y1, force) {
  if (!TAKEN) return true;
  if (!force) for (const t of TAKEN) if (x0 < t[2] && x1 > t[0] && y0 < t[3] && y1 > t[1]) return false;
  TAKEN.push([x0, y0, x1, y1]); return true;
}
function pillFit(ctx, x, y, text, size, bg, fg) {
  ctx.font = `600 ${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  const w = ctx.measureText(text).width + size * 0.9, h = size * 1.55;
  if (!fits(x - w / 2 - 2, y - h / 2 - 1, x + w / 2 + 2, y + h / 2 + 1)) return false;
  pill(ctx, x, y, text, size, bg, fg); return true;
}
const hexA = (h, a) => { const n = parseInt((h || '#e8590c').slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; };
const TUNNEL_COLORS = { 'N. Travis Tunnel': '#7048e8', 'Downtown Tunnel Loop': '#e03131', 'N. Louisiana Tunnel': '#1c7ed6', 'E. McKinney Tunnel': '#f76707', 'Lamar Tunnel': '#d6c41c', 'W. Walker Tunnel': '#15aabf' };
const tunnelSection = (s) => s?.places?.find((p) => p.tunnel)?.tunnel || null;
export { TUNNEL_COLORS, tunnelSection };
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
    this.v = new View(); this.mode = 'street'; this.scene = 'day'; this.hide = {}; this.highlight = null; this.pick = null; this.hover = null;
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
    // real street centrelines (OpenStreetMap): take the grid's true heading from the avenues themselves
    const SN = this.opts.streets?.streets || [], skey = (t) => norm(String(t).replace(/^(north|south|east|west|n|s|e|w)\.?\s+/i, '').replace(/\s+(street|st|avenue|ave|boulevard|blvd|parkway|pkwy)\.?$/i, ''));
    const AVN = new Set(AVENUES.map(norm)), CSN = new Set(CROSS.map(norm)), core = (p) => p[0] > 29.7485 && p[0] < 29.7665 && p[1] > -95.3735 && p[1] < -95.3545;
    { let sx = 0, sy = 0; for (const [nm, , pl] of SN) { if (!AVN.has(skey(nm))) continue; for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i]; if (!core(a) || !core(b)) continue; let dx = (b[1] - a[1]) * M_LNG, dy = (b[0] - a[0]) * M_LAT; const l = Math.hypot(dx, dy); if (l < 8) continue; if (dx * vx + dy * vy < 0) { dx = -dx; dy = -dy; } sx += dx; sy += dy; } }
      const l = Math.hypot(sx, sy); if (l > 200) { const nx = sx / l, ny = sy / l; if (Math.abs(nx * vx + ny * vy) > 0.97) { vx = nx; vy = ny; this.osmHeading = true; } } }
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
    this.alignToStops(proj);
    this.alignToOSM(proj, SN, skey);
    this.proj = proj;
    // real geography to draw: bayous, freeways, parks and street trees
    const SD = this.opts.streets;
    if (SD) {
      const pl = (l) => l.map(([la, ln]) => proj(la, ln));
      this.geo = {
        roads: SN.filter(([, k]) => /^(motorway|motorway_link|trunk|trunk_link)$/.test(k)).map(([n, k, l, lanes, br, layer]) => ({ k, n, pts: pl(l), w: k === 'motorway' || k === 'trunk' ? 0.62 + Math.min(4, lanes || 3) * 0.17 : 0.55, z: br || layer > 0 ? 0.7 * Math.max(1, Math.min(3, layer || 1)) : 0 })),
        bridges: SN.filter(([, k, , , br]) => br && !/^(motorway|motorway_link|trunk|trunk_link)$/.test(k)).map(([n, k, l]) => ({ n, pts: pl(l), w: k === 'pedestrian' ? 0.35 : 0.9 })),
        paths: (SD.paths || []).map(([n, k, l, br]) => ({ n, k, pts: pl(l), br })),
        tunnels: (SD.tunnels || []).map(([n, k, l]) => ({ n, k, pts: pl(l) })),   // the real tunnel corridors, as mapped in OpenStreetMap
        rivers: (SD.rivers || []).map(([n, l]) => ({ n, pts: pl(l), w: /buffalo/i.test(n) ? 2.2 : /white oak/i.test(n) ? 1.4 : 0.9 })),
        water: (SD.water || []).map(pl),
        parks: (SD.parks || []).map(([n, k, l]) => ({ n, k, pts: pl(l) })).filter((p) => p.pts.length > 2),
        trees: (SD.trees || []).map(([la, ln]) => proj(la, ln)),
      };
    }
    this.avenues.sort((a, b) => a.x - b.x); this.cross.sort((a, b) => a.y - b.y);
    this.avX = Object.fromEntries(this.avenues.map((a) => [a.n, a.x])); this.csY = Object.fromEntries(this.cross.map((c) => [c.n, c.y]));
    this.streetW = Math.min(this.blockW, this.blockD) * 0.078;   // ~15 m curb to curb; sidewalks run to the building line

    // --- spots (restaurants grouped by building) ---
    // food halls, malls and hotels with several places (The Highlight, GreenStreet, POST…) become one pin
    const venueOf = (p) => { let v = p.official?.venue || p.venue; if (!v || /^(suite|unit|#|\()/i.test(v.trim())) return null; v = v.replace(/ Houston$/, '').trim(); return /^(finn hall|the finn)$/i.test(v) ? 'The Finn' : v; };
    const addrKey = (p) => (p.address || '').toLowerCase().replace(/,.*$/, '').replace(/\b(street|st)\b\.?/g, 'st').trim();
    const byAddr = {}; for (const p of pts) { const v = venueOf(p); if (v && !p.tunnel) byAddr[addrKey(p)] = v; }
    const venueOf0 = venueOf, venueOfA0 = (p) => venueOf0(p); const venueOfA = (p) => venueOf0(p) || (!p.tunnel && byAddr[addrKey(p)]) || null;
    const vCount = {}; for (const p of pts) { const v = venueOfA(p); if (v) vCount[(p.tunnel ? 'T' : '') + v] = (vCount[(p.tunnel ? 'T' : '') + v] || 0) + 1; }
    const groups = new Map();
    const XA = this.avenues, XC = this.cross, offMap = ([x, y]) => x < XA[0].x - this.blockW * 2.4 || x > XA[XA.length - 1].x + this.blockW * 1.8 || y < XC[0].y - this.blockD * 3 || y > XC[XC.length - 1].y + this.blockD * 1.4;
    this.offMap = new Set();
    for (const p of pts) {
      if (offMap(proj(p.lat, p.lng))) { this.offMap.add(p.id); continue; }   // beyond the edge of the map: no pin (the app sends you to Maps instead)
      const [x, y] = proj(p.lat, p.lng), v = venueOfA(p);
      const key = v && vCount[(p.tunnel ? 'T' : '') + v] > 1 ? (p.tunnel ? 'VT' : 'V') + v + '@' + this.cellIdx(x, y).join(',') : (p.tunnel ? 'T' : 'S') + Math.round(x) + ':' + Math.round(y);   // a venue spread over several blocks (Discovery Green, GreenStreet) gets a pin per block
      if (!groups.has(key)) groups.set(key, { x: 0, y: 0, tunnel: !!p.tunnel, places: [], venue: key[0] === 'V' ? v : null });
      const g = groups.get(key); g.places.push(p); g.x += (x - g.x) / g.places.length; g.y += (y - g.y) / g.places.length;
    }
    this.spots = [...groups.values()];
    this.snapSpots();
    for (const s of this.spots) {
      s.style = styleFor(s.places[0]);
      if (s.venue && s.places.length === 1) s.venue = null;
      if (!s.venue && s.places.length > 1) { const vs = s.places.map(venueOfA0); if (vs[0] && vs.every((x) => x === vs[0])) s.venue = vs[0]; }   // a tunnel food court (Understory) is named for its hall   // the only one from its venue on this block: just show its own name
      s.label = s.venue ? s.venue : s.places.length > 2 ? (s.places.find((p) => /hall|post htx|finn|lyric/i.test(p.name))?.name || `${s.places.length} spots`) : s.places[0].name;
      if (s.venue) s.style = { ...s.style, emoji: /hotel|marriott|seasons|meridien|hyatt|embassy|laura|icon|rice|whitehall/i.test(s.venue) ? '🏨' : '🏬', color: '#7048e8' };
      s.cell = this.cellOf(s.x, s.y);
    }
    const A = this.avenues, C = this.cross;
    this.bounds = { x0: A[0].x - this.blockW * 2.2, x1: A[A.length - 1].x + this.blockW * 1.6, y0: C[0].y - this.blockD * 2.8, y1: C[C.length - 1].y + this.blockD * 1.2 };
    for (const s of this.spots) { const b = this.bounds; b.x0 = Math.min(b.x0, s.x - 4); b.x1 = Math.max(b.x1, s.x + 4); b.y0 = Math.min(b.y0, s.y - 4); b.y1 = Math.max(b.y1, s.y + 4); }
    this.bayouY = C[0].y - this.blockD * 1.4;
    this.v.cx = (this.avX.Main ?? 0); this.v.cy = (this.csY.Walker ?? 0);
    this.northW = [uy, vy];   // which way true north points in map units
    this.eastW = [ux, vx];
    this.proj = proj;
    this.buildCity(); this.pinToBuildings(); this.buildRail(); this.spawnTraffic(); this.buildTunnels(); this.spawnNpcs(); this.buildDoors(); this.markTerraces();
  }

  // METRO publishes the exact location of every bus stop, named by corner ("Fannin St @ Texas Ave").
  // Each corner tells us where two streets cross, so use them to put every street exactly where it is.
  // Put every grid street exactly on its real centreline: median position of that street's OpenStreetMap segments
  alignToOSM(proj, SN, skey) {
    if (!SN.length) return;
    const xs = {}, ys = {}, y0 = this.cross[0].y - 4, y1 = this.cross[this.cross.length - 1].y + 4, x0 = this.avenues[0].x - 4, x1 = this.avenues[this.avenues.length - 1].x + 4;
    const AV = new Map(AVENUES.map((n) => [norm(n), n])), CS = new Map(CROSS.map((n) => [norm(n), n]));
    for (const [nm, kind, pl] of SN) {
      const k = skey(nm), av = AV.get(k), cs = CS.get(k); if (!av && !cs) continue;
      const P = pl.map(([la, ln]) => proj(la, ln));
      for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); if (L < 0.4) continue;
        for (let t = 0; t <= 1; t += 0.25) { const x = ax + dx * t, y = ay + dy * t;
          if (av && Math.abs(dy) > Math.abs(dx) * 3 && y > y0 && y < y1) (xs[av] = xs[av] || []).push(x);
          if (cs && Math.abs(dx) > Math.abs(dy) * 3 && x > x0 && x < x1) (ys[cs] = ys[cs] || []).push(y); } }
    }
    let moved = 0;
    for (const a of this.avenues) if (xs[a.n]?.length >= 6) { const nx = median(xs[a.n]); moved = Math.max(moved, Math.abs(nx - a.x)); a.x = nx; }
    for (const c of this.cross) if (ys[c.n]?.length >= 6) { const ny = median(ys[c.n]); moved = Math.max(moved, Math.abs(ny - c.y)); c.y = ny; }
    // keep the order sane (a bad match must never fold the grid)
    const okOrder = (l, p) => l.every((s, k) => k === 0 || s[p] > l[k - 1][p] + 3);
    if (!okOrder(this.avenues, 'x') || !okOrder(this.cross, 'y')) { console.warn('OSM street alignment rejected'); return; }
    const gaps = (l, p) => l.slice(1).map((s, k) => Math.abs(s[p] - l[k][p]));
    this.blockW = median(gaps(this.avenues, 'x')); this.blockD = median(gaps(this.cross, 'y'));
    this.avX = Object.fromEntries(this.avenues.map((a) => [a.n, a.x])); this.csY = Object.fromEntries(this.cross.map((c) => [c.n, c.y]));
    if (this.avenues[0].num != null) { this.fitX = lsq(this.avenues.map((a) => [a.num, a.x])); this.fitY = lsq(this.cross.map((c) => [c.num, c.y])); }
    this.alignedToOSM = { moved: +moved.toFixed(2), av: Object.keys(xs).length, cs: Object.keys(ys).length };
  }
  alignToStops(proj) {
    const stops = this.opts.stops; if (!stops) return;
    const key = (t) => norm(t.replace(/^(n|s|e|w)\.?\s+/i, '').replace(/\s+(st|street|ave|avenue|blvd|pkwy)\.?$/i, ''));
    const AV = new Map(AVENUES.map((n) => [norm(n), n])), CS = new Map(CROSS.map((n) => [norm(n), n]));
    const xs = {}, ys = {};
    for (const [lat, lng, name] of Object.values(stops)) {
      const m = /^(.+?)\s*@\s*(.+)$/.exec(name || ''); if (!m) continue;
      const a = key(m[1]), b = key(m[2]), av = AV.get(a) || AV.get(b), cs = CS.get(a) || CS.get(b);
      if (!av || !cs) continue;
      const [x, y] = proj(lat, lng); (xs[av] = xs[av] || []).push(x); (ys[cs] = ys[cs] || []).push(y);
    }
    const fill = (list, obs, prop) => {
      const known = list.map((s, k) => [k, obs[s.n] && obs[s.n].length >= 2 ? median(obs[s.n]) : null]).filter(([, v]) => v != null);
      if (known.length < 3) return false;
      const f = lsq(known);   // index → position, for streets with no stops nearby
      list.forEach((s, k) => { const o = known.find(([kk]) => kk === k); s[prop] = o ? o[1] : f.a + f.b * k; });
      return true;
    };
    const okA = fill(this.avenues, xs, 'x'), okC = fill(this.cross, ys, 'y');
    if (!okA || !okC) return;
    const gaps = (l, p) => l.slice(1).map((s, k) => Math.abs(s[p] - l[k][p]));
    this.blockW = median(gaps(this.avenues, 'x')); this.blockD = median(gaps(this.cross, 'y'));
    this.avX = Object.fromEntries(this.avenues.map((a) => [a.n, a.x])); this.csY = Object.fromEntries(this.cross.map((c) => [c.n, c.y]));
    if (this.avenues[0].num != null) { this.fitX = lsq(this.avenues.map((a) => [a.num, a.x])); this.fitY = lsq(this.cross.map((c) => [c.num, c.y])); }
    this.alignedToStops = true;
  }
  // Keep every pin inside a building: move it into the block it belongs to (never on the asphalt),
  // and lay out several pins in one block on a tidy sub-grid so they don't pile up.
  snapSpots() {
    const A = this.avenues, C = this.cross, sw = this.streetW, pad = 0.9;
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
      if (list[0].tunnel) {   // tunnel pins: stay at their real spot, just nudged apart so they don't overlap
        for (const s of list) { s.x = Math.min(x1, Math.max(x0, s.x)); s.y = Math.min(y1, Math.max(y0, s.y)); }
        for (let it = 0; it < 30; it++) { let moved = false; for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) { const p = list[a], q = list[b]; let dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d >= 1.3) continue; if (d < 1e-3) { dx = Math.cos(a + b); dy = Math.sin(a + b); d = 1; } const k = (1.3 - d) / 2 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k; moved = true; } for (const s of list) { s.x = Math.min(x1, Math.max(x0, s.x)); s.y = Math.min(y1, Math.max(y0, s.y)); } if (!moved) break; }
        continue;
      }
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
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, w = (r.x1 - r.x0) * (l.kind === 'twin' ? 0.9 : l.kind === 'post' || l.kind === 'aquarium' ? 0.97 : 0.72), d = (r.y1 - r.y0) * (l.kind === 'post' || l.kind === 'aquarium' ? 0.95 : 0.72);
      this.landmarks.push({ ...l, x: cx - w / 2, y: cy - d / 2, w, d }); taken.push(r);
    }
    if (this.opts.buildings && this.buildOsm()) return;   // real footprints and heights: no stand-in boxes needed
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
    return this.spots.filter((s) => s.places.some((p) => this.sceneOk(p))).map((s) => ({ s, d: Math.hypot(s.x - x, s.y - y) })).filter((o) => o.d <= r).sort((p, q) => p.d - q.d);
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
    const R = this.rail, L = VEH.train.L, W = VEH.train.W;
    if (t.line === 'red') return { x: R.x - W / 2 + (t.dir > 0 ? 0.28 : -0.28), y: t.pos - L / 2, w: W, d: L, along: 'y' };
    const y = t.track === 'cap' ? R.capY : R.ruskY; return { x: t.pos - L / 2, y: y - W / 2, w: L, d: W, along: 'x' };
  }
  drawTrain(t, N, alpha) {
    const ctx = this.ctx, v = this.v, b = this.trainBox(t), h = VEH.train.H, body = N ? '#cfd4da' : '#f8f9fa', stripe = t.line === 'red' ? '#e03131' : t.color;
    box(ctx, v, b.x, b.y, b.w, b.d, h, body, 0.03, { alpha });
    ctx.globalAlpha = alpha;
    band(ctx, v, b.x, b.y, b.w, b.d, h * 0.25, h * 0.45, stripe, 0.06); band(ctx, v, b.x, b.y, b.w, b.d, h * 0.58, h * 0.88, N ? 'rgba(255,224,140,.9)' : 'rgba(40,54,74,.85)', 0.15);
    // pantographs reaching up to the overhead wire
    ctx.strokeStyle = N ? '#adb5bd' : '#495057'; ctx.lineWidth = Math.max(1, v.s * 1.4); ctx.beginPath();
    for (const k of [0.3, 0.7]) { const q = b.along === 'y' ? [b.x + b.w / 2, b.y + b.d * k] : [b.x + b.w * k, b.y + b.d / 2]; ctx.moveTo(...v.p(...q, h + 0.03)); ctx.lineTo(...v.p(q[0] + (b.along === 'y' ? 0 : 0.2), q[1] + (b.along === 'y' ? 0.2 : 0), h + 0.3)); ctx.lineTo(...v.p(...q, h + 0.4)); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawRail(N) {
    const R = this.rail; if (!R) return; const ctx = this.ctx, v = this.v;
    const quad = (x0, y0, x1, y1, col) => poly(ctx, [v.p(x0, y0, 0.02), v.p(x1, y0, 0.02), v.p(x1, y1, 0.02), v.p(x0, y1, 0.02)], col);
    const line = (x0, y0, x1, y1, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...v.p(x0, y0, 0.03)); ctx.lineTo(...v.p(x1, y1, 0.03)); ctx.stroke(); };
    const detail = v.s > 0.55, bed = N ? '#4a3a3a' : '#cdbfb8';
    // Red Line: two tracks down the middle of Main
    quad(R.x - 0.6, R.y0, R.x + 0.6, R.y1, bed);
    if (detail) {
      ctx.strokeStyle = N ? '#5b5050' : '#8f8178'; ctx.lineWidth = 1; ctx.beginPath();
      const [, sy0] = v.p(R.x, R.y0), step = 0.55;
      for (let y = R.y0; y < R.y1; y += step) { const p = v.p(R.x, y); if (p[1] < -20 || p[1] > this.H + 20 || p[0] < -40 || p[0] > this.W + 40) continue; for (const o of [-0.28, 0.28]) { ctx.moveTo(...v.p(R.x + o - 0.17, y, 0.03)); ctx.lineTo(...v.p(R.x + o + 0.17, y, 0.03)); } }
      ctx.stroke();
      for (const o of [-0.4, -0.16, 0.16, 0.4]) line(R.x + o, R.y0, R.x + o, R.y1, N ? '#a7a9ad' : '#5c626b', 1);
    }
    line(R.x, R.y0, R.x, R.y1, 'rgba(224,49,49,' + (detail ? '.55' : '.95') + ')', detail ? 1.6 : Math.max(2.5, v.s * 9));
    // Green + Purple: single track each on Capitol (eastbound) and Rusk (westbound)
    for (const y of [R.capY, R.ruskY]) {
      quad(R.xW, y - 0.3, R.xE, y + 0.3, bed);
      if (detail) for (const o of [-0.12, 0.12]) line(R.xW, y + o, R.xE, y + o, N ? '#a7a9ad' : '#5c626b', 1);
      line(R.xW, y - (detail ? 0.08 : 0.12), R.xE, y - (detail ? 0.08 : 0.12), 'rgba(47,158,68,.9)', detail ? 1.4 : Math.max(2, v.s * 6));
      line(R.xW, y + (detail ? 0.08 : 0.12), R.xE, y + (detail ? 0.08 : 0.12), 'rgba(112,72,232,.85)', detail ? 1.4 : Math.max(2, v.s * 6));
    }
    // platforms
    for (const st of R.stations) for (const p of st.plats) {
      const col = st.line === 'red' ? '#e03131' : '#2f9e44';
      if (detail) {
        const along = st.line === 'red';
        const pw = along ? 0.24 : 2.4, pd = along ? 2.4 : 0.22, px = along ? p.x + 0.52 : p.x - pw / 2, py = along ? p.y - pd / 2 : p.y + 0.34;   // platforms sit inside the street, beside the tracks
        box(ctx, v, px, py, pw, pd, 0.06, N ? '#6b7280' : '#e9ecef');
        box(ctx, v, px - (along ? 0.04 : 0), py - (along ? 0 : 0.04), pw + (along ? 0.08 : 0), pd + (along ? 0 : 0.08), 0.04, col, 0.42);
        for (const k of [0.15, 0.85]) { const [x, yy] = along ? v.p(px + pw / 2, py + pd * k, 0.06) : v.p(px + pw * k, py + pd / 2, 0.06); const [, y2] = along ? v.p(px + pw / 2, py + pd * k, 0.42) : v.p(px + pw * k, py + pd / 2, 0.42); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, y2); ctx.stroke(); }
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
      path.forEach((n, k) => { if (k % 3 === 1) this.busStops.push({ a: n, b: path[(k + 1) % path.length], route: li }); });   // stops sit mid-block, at the curb
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
    const P = c.P || this.carPos(c), { L, W } = VEH[c.kind] || VEH.waymo;
    return P.dx ? { x: P.x - L / 2, y: P.y - W / 2, w: L, d: W, P } : { x: P.x - W / 2, y: P.y - L / 2, w: W, d: L, P };
  }
  stepTraffic(dt) {
    const cars = this.cars || []; if (!cars.length) return;
    const key = (c) => { const [a, b] = this.carEnds(c); return a + '>' + b; }, lanes = new Map();
    for (const c of cars) { const k = key(c); (lanes.get(k) || lanes.set(k, []).get(k)).push(c); }
    for (const c of cars) {
      const t0 = c.t, k0 = c.k, at0 = c.at; this.stepCar(c, dt, key, lanes);
      c.moving = c.t !== t0 || c.k !== k0 || c.at !== at0;
    }
  }
  stepCar(c, dt, key, lanes) {
    {
      if (c.wait > 0) { c.wait -= dt; return; }
      const P = this.carPos(c), gap = VEH[c.kind].L + (c.kind === 'bus' ? 0.6 : 0.4);
      const gapT = gap / P.len;
      if (lanes.get(key(c)).some((o) => o !== c && o.t > c.t && o.t - c.t < gapT)) return;   // don't rear-end the car ahead
      if (c.kind === 'bus' && c.t < 1 && this.trainNear(P)) return;
      if (this.personAhead(c, P)) return;   // stop for pedestrians
      const nt = c.t + (c.speed * dt) / P.len, stopT = 1 - (this.streetW + 0.55 + VEH[c.kind].L / 2) / P.len, end = this.carEnds(c)[1];
      if (c.t <= stopT && nt > stopT && this.signal(end[0], end[1], P.dx ? 'c' : 'a') !== 'g') { c.t = stopT; return; }   // wait at red / yellow
      if (c.kind === 'bus' && c.k % 3 === 1 && !c.served && c.t < 0.5 && nt >= 0.5) { c.t = 0.5; c.served = true; c.wait = 2.6; return; }   // pull in at the stop
      c.t = nt;
      if (c.t < 1) return;
      c.t = 0;
      if (c.kind === 'bus') { c.k = (c.k + 1) % c.path.length; c.served = false; }
      else { c.from = c.at; c.at = c.to; this.pickNext(c); if (Math.random() < 0.45) c.wait = 0.4 + Math.random() * 0.6; }
    }
  }
  trainNear() { return false; }
  personAhead(c, P) {   // anyone in the roadway in front of this vehicle (or just stepping off the curb)?
    const half = VEH[c.kind].L / 2, reach = half + 0.9, lane = this.streetW * 0.5, sw = this.streetW;
    const cx = P.x + P.dy * lane, cy = P.y - P.dx * lane;   // centre line of the street this vehicle is on
    for (const n of this.npcs) {
      if (n.under || n.inside > 0) continue;
      const rx = n.x - P.x, ry = n.y - P.y, along = rx * P.dx + ry * P.dy;
      if (along < -half || along > reach) continue;
      const fromCentre = Math.abs((n.x - cx) * -P.dy + (n.y - cy) * P.dx);
      if (fromCentre < sw - 0.02) return true;   // actually in the road (people waiting at the curb do not block)
    }
    return false;
  }
  drawCar(c, N, alpha, now) {
    const ctx = this.ctx, v = this.v, b = this.carBox(c), V = VEH[c.kind] || VEH.waymo, H = V.H;
    const strip = (z0, z1, col, ins) => band(ctx, v, b.x, b.y, b.w, b.d, z0, z1, col, ins);
    if (c.kind === 'train') {
      box(ctx, v, b.x, b.y, b.w, b.d, H, N ? '#cfd4da' : '#f8f9fa', 0.03, { alpha }); ctx.globalAlpha = alpha;
      strip(H * 0.25, H * 0.45, c.color || '#e03131', 0.06); strip(H * 0.58, H * 0.88, N ? 'rgba(255,224,140,.9)' : 'rgba(40,54,74,.85)', 0.15);
      ctx.globalAlpha = 1;
      if (v.s > 0.7) { const [x, y] = v.p(b.x + b.w / 2, b.y + b.d / 2, 1.6); pill(ctx, x, y, '● LIVE 🚊 ' + (c.route || ''), 9, 'rgba(224,49,49,.95)', '#fff'); }
    } else if (c.kind === 'bus') {
      box(ctx, v, b.x, b.y, b.w, b.d, H, N ? '#ced4da' : '#f8f9fa', 0.05, { alpha }); ctx.globalAlpha = alpha;
      strip(H * 0.12, H * 0.3, '#1c5fa8', 0.03); strip(H * 0.3, H * 0.36, '#e03131', 0.03); strip(H * 0.5, H * 0.9, N ? 'rgba(255,224,140,.9)' : 'rgba(40,54,74,.82)', 0.1);
      ctx.globalAlpha = 1;
      if (v.s > (c.live ? 0.7 : 1.1)) { const [x, y] = v.p(b.x + b.w / 2, b.y + b.d / 2, 1.4); pill(ctx, x, y, c.live ? '● LIVE 🚌 ' + (c.route || '') : '🚌 ' + ['82', '11', '85', '40'][c.route % 4], 9, c.live ? 'rgba(224,49,49,.95)' : 'rgba(28,95,168,.92)', '#fff'); }
    } else {   // Waymo: white Jaguar I-PACE, dark glass cabin, spinning lidar dome
      const P = b.P;
      box(ctx, v, b.x, b.y, b.w, b.d, H * 0.55, N ? '#dee2e6' : '#ffffff', 0.04, { alpha });
      const cw = b.w * (P.dx ? 0.55 : 0.84), cd = b.d * (P.dx ? 0.84 : 0.55), sh = 0.04;
      box(ctx, v, b.x + (b.w - cw) / 2 - P.dx * sh, b.y + (b.d - cd) / 2 - P.dy * sh, cw, cd, H * 0.38, N ? '#55647a' : '#3d4b5e', 0.04 + H * 0.55, { alpha, top: N ? '#e9ecef' : '#f8f9fa' });
      const dome = 0.1, cx = b.x + b.w / 2 - P.dx * sh, cy = b.y + b.d / 2 - P.dy * sh;
      box(ctx, v, cx - dome / 2, cy - dome / 2, dome, dome, 0.07, '#212529', 0.04 + H * 0.93, { alpha });
      if (v.s > 0.9) { const [x, y] = v.p(cx, cy, H + 0.12), a = now / 120; ctx.globalAlpha = alpha; circle(ctx, x + Math.cos(a) * 1.2 * v.s, y + Math.sin(a) * 0.6 * v.s, Math.max(0.8, v.s * 0.9), '#4dabf7'); ctx.globalAlpha = 1; }
    }
  }
  // ---------- live METRO (from /api/metro): real positions, or positions estimated from predicted stop times ----------
  setLive(data, stat) { this.liveData = data; this.liveStat = stat || this.liveStat; if (!data) this.liveCars = []; }
  computeLive() {
    const L = this.liveData; if (!L) { this.liveCars = []; return; }
    const now = Date.now() / 1000, R = (this.liveStat && this.liveStat.routes) || {}, S = (this.liveStat && this.liveStat.stops) || {};
    const raw = [], seen = new Set();
    for (const v of L.vehicles || []) { const [x, y] = this.proj(v.lat, v.lng); raw.push({ id: 'v' + (v.id || v.trip), trip: v.trip, route: v.route, x, y, vid: v.id }); if (v.trip) seen.add(v.trip); }
    for (const t of L.trips || []) {
      if (seen.has(t.id)) continue;
      const st = t.s.filter(([sid]) => S[sid]).sort((a, b) => a[1] - b[1]); let pos = null;
      let seg = null;
      for (let i = 0; i < st.length - 1; i++) if (st[i][1] <= now && now < st[i + 1][1]) {
        const a = S[st[i][0]], b = S[st[i + 1][0]], f = (now - st[i][1]) / Math.max(1, st[i + 1][1] - st[i][1]);
        pos = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        const pa = this.proj(a[0], a[1]), pb = this.proj(b[0], b[1]); seg = [pb[0] - pa[0], pb[1] - pa[1]]; break;
      }
      if (!pos) continue;
      const [x, y] = this.proj(pos[0], pos[1]); raw.push({ id: 't' + t.id, trip: t.id, route: t.route, x, y, vid: t.vid, est: true, seg });
    }
    const prev = this.livePrev || new Map(), next = new Map(), B = this.bounds, out = [];
    const A = this.avenues, C = this.cross, R2 = this.rail;
    for (const o of raw) {
      if (o.x < B.x0 || o.x > B.x1 || o.y < B.y0 || o.y > B.y1) continue;
      const ri = R[o.route] || [o.route || '', 3, '', ''], kind = ri[1] === 0 || ri[1] === 1 || ri[1] === 2 ? 'train' : 'bus';
      const p = prev.get(o.id);
      const sx = p ? p.sx + (o.x - p.sx) * 0.06 : o.x, sy = p ? p.sy + (o.y - p.sy) * 0.06 : o.y;   // glide toward each new fix
      let hx = p ? p.hx : 0, hy = p ? p.hy : 1; const mx = o.x - (p ? p.sx : o.x), my = o.y - (p ? p.sy : o.y);
      if (o.seg && Math.hypot(...o.seg) > 0.5) { hx = o.seg[0]; hy = o.seg[1]; } else if (Math.hypot(mx, my) > 0.3) { hx = mx; hy = my; }
      next.set(o.id, { sx, sy, hx, hy });
      // keep vehicles on the roads/tracks
      let x = sx, y = sy, dx = 0, dy = 0;
      const nm = (ri[0] + ' ' + ri[3]).toLowerCase(), onMain = /red/.test(nm) || (!/green|purple/.test(nm) && R2 && Math.abs(x - R2.x) < Math.min(Math.abs(y - R2.capY), Math.abs(y - R2.ruskY)));
      if (kind === 'train' && R2 && onMain && Math.abs(x - R2.x) < 8) { dy = hy >= 0 ? 1 : -1; x = R2.x + (dy > 0 ? 0.32 : -0.32); }
      else if (kind === 'train' && R2 && !onMain && Math.min(Math.abs(y - R2.capY), Math.abs(y - R2.ruskY)) < 8) { dx = hx >= 0 ? 1 : -1; y = dx > 0 ? R2.capY : R2.ruskY; }
      else {
        const na = A.reduce((b, a) => (Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b)), nc = C.reduce((b, c) => (Math.abs(c.y - y) < Math.abs(b.y - y) ? c : b));
        const lane = this.streetW * 0.5;
        const alongAvenue = Math.abs(hx) > 0.01 || Math.abs(hy) > 0.01 ? Math.abs(hy) >= Math.abs(hx) : Math.abs(na.x - x) < Math.abs(nc.y - y);
        if (alongAvenue) { dy = hy >= 0 ? 1 : -1; x = na.x - dy * lane; } else { dx = hx >= 0 ? 1 : -1; y = nc.y + dx * lane; }
      }
      const tname = (ri[3] || '').replace(/^metro\s*rail\s*/i, '').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
      out.push({ kind, live: true, est: o.est, P: { x, y, dx, dy }, route: kind === 'train' && tname ? tname : ri[0] || o.route, color: ri[2] ? '#' + ri[2] : kind === 'train' ? '#e03131' : null, rname: ri[3], vid: o.vid });
    }
    this.livePrev = next; this.liveCars = out;
    // keep the animated trains unless METRO's feed actually carries rail trips right now
    this.liveRailSeen = (L.trips || []).some((t) => { const r = R[t.route]; return r && (r[1] === 0 || r[1] === 1 || r[1] === 2); });
  }
  // Each street pin goes inside an actual building footprint: the one at its address if the geocode
  // lands inside one, otherwise the nearest building on the same block (never a parking garage if avoidable).
  pinToBuildings() {
    if (!this.osm) return;
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const near = (x, y, P) => { let best = null, bd = 1e9; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)), px = a[0] + t * dx, py = a[1] + t * dy, d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = [px, py]; } } return [best, bd]; };
    const sameBlock = (a, b) => { const p = this.cellIdx(a[0], a[1]), q = this.cellIdx(b[0], b[1]); return p[0] === q[0] && p[1] === q[1]; };
    const used = [];
    for (const s of this.spots) {
      if (s.tunnel) continue;
      const refs = [[s.ox ?? s.x, s.oy ?? s.y], [s.x, s.y]];
      let best = null, best0 = null;
      for (const o of this.osm) {
        if (o.h < 0.6) continue;
        for (const [ri, [rx, ry]] of refs.entries()) {
          if (rx < o.bb.x0 - 6 || rx > o.bb.x1 + 6 || ry < o.bb.y0 - 6 || ry > o.bb.y1 + 6) continue;
          const inside = inPoly(rx, ry, o.pts), [pt, d] = inside ? [[rx, ry], 0] : near(rx, ry, o.pts);
          const score = d + (o.type === 'parking' ? 4 : 0) + (sameBlock([o.cx, o.cy], [s.x, s.y]) ? 0 : 1.5) + (ri ? 2.5 : 0);   // the real address point beats the tidy grid slot
          if (score < 7 && (!best || score < best.score)) best = { o, pt, inside, score, d, ri };
          if (!ri && (!best0 || d < best0.d)) best0 = { o, pt, inside, score, d, ri };
        }
      }
      if (s.ox != null && (!best0 || best0.d > 2.2)) {   // nothing mapped at the real address: stand a building up right there, not in a tower down the block
        const [i0, j0] = this.cellIdx(s.ox, s.oy), A0 = this.avenues, C0 = this.cross, w0 = this.streetW + 0.5;
        if (i0 > 0 && i0 < A0.length && j0 > 0 && j0 < C0.length) { s.x = Math.min(A0[i0].x - w0 - 1, Math.max(A0[i0 - 1].x + w0 + 1, s.ox)); s.y = Math.min(C0[j0].y - w0 - 1, Math.max(C0[j0 - 1].y + w0 + 1, s.oy)); }
        best = null;
      } else if (best0 && best && best.ri) best = best0;
      if (!best) {
        const inLM = this.landmarks.some((l) => s.x > l.x - 0.5 && s.x < l.x + l.w + 0.5 && s.y > l.y - 0.5 && s.y < l.y + l.d + 0.5) || this.areas.some((a) => ['grb', 'arena', 'ballpark'].includes(a.kind) && s.x > a.r.x0 && s.x < a.r.x1 && s.y > a.r.y0 && s.y < a.r.y1);
        if (inLM) continue;
        // OpenStreetMap has no footprint here (new or unmapped building): put up a simple mid-rise for the pin to sit in
        const [i, j] = this.cellIdx(s.x, s.y), A = this.avenues, C = this.cross, sw = this.streetW + 0.32;
        const R = { x0: i > 0 ? A[i - 1].x + sw : s.x - 2, x1: i < A.length ? A[i].x - sw : s.x + 2, y0: j > 0 ? C[j - 1].y + sw : s.y - 2, y1: j < C.length ? C[j].y - sw : s.y + 2 };
        const x0 = Math.max(R.x0, s.x - 1.4), x1 = Math.min(R.x1, s.x + 1.4), y0 = Math.max(R.y0, s.y - 1.4), y1 = Math.min(R.y1, s.y + 1.4);
        if (x1 - x0 < 0.8 || y1 - y0 < 0.8) continue;
        const k = hash(s.places[0].name), pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        const ob = { pts, bb: { x0, x1, y0, y1 }, h: 2 + k * 2.5, z0: 0, c: LOW[Math.floor(k * LOW.length)], glass: false, name: null, type: 'standin', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
        this.osm.push(ob); s.x = ob.cx; s.y = ob.cy; s.cell = this.cellOf(s.x, s.y); s.bldg = ob; used.push([s.x, s.y]); continue;
      }
      let [x, y] = best.pt; const o = best.o;
      if (!best.inside || !inPoly(x, y, o.pts)) {   // step in from the wall toward the middle of the building
        let ok = false; const L = Math.hypot(o.cx - x, o.cy - y) || 1;   // just inside the wall nearest the real address, not halfway across a big building
        for (const dd of [0.45, 0.7, 1, 1.4, 2]) { if (dd >= L) break; const nx = x + (o.cx - x) / L * dd, ny = y + (o.cy - y) / L * dd; if (inPoly(nx, ny, o.pts) && near(nx, ny, o.pts)[1] > 0.25) { x = nx; y = ny; ok = true; break; } }
        if (!ok) for (const f of [0.25, 0.4, 0.6, 0.8]) { const nx = x + (o.cx - x) * f, ny = y + (o.cy - y) * f; if (inPoly(nx, ny, o.pts) && near(nx, ny, o.pts)[1] > 0.25) { x = nx; y = ny; ok = true; break; } }
        if (!ok) { x = o.cx; y = o.cy; }
      }
      // two pins in one building: fan them out a little, staying inside
      for (let k = 0; k < 6 && used.some(([ux, uy]) => Math.hypot(ux - x, uy - y) < 0.7); k++) { const a = k * 2.1, nx = x + Math.cos(a) * 0.8, ny = y + Math.sin(a) * 0.8; if (inPoly(nx, ny, o.pts)) { x = nx; y = ny; } }
      used.push([x, y]); s.x = x; s.y = y; s.cell = this.cellOf(x, y); s.bldg = o;
      if (!s.places[0]?.tunnel) (o.shops ||= []).push({ pt: best.pt.slice(), c: AWN[Math.floor(hash(s.places[0].name + 'a') * AWN.length)], name: s.places.length > 1 ? (s.places[0].venue || s.places[0].name) : s.places[0].name });
    }
  }
  // ---------- you are here + walking navigation ----------
  setUser(u) {
    if (!u) { this.user = null; return; }
    const [x, y] = this.proj(u.lat, u.lng), B = this.bounds;
    this.user = { ...u, x, y, inside: x > B.x0 - 5 && x < B.x1 + 5 && y > B.y0 - 5 && y < B.y1 + 5 };
    const prev = this.userPrev; if (!prev || Math.hypot(x - prev[0], y - prev[1]) > 0.4) { if (prev) this.moveDir = [x - prev[0], y - prev[1]]; this.userPrev = [x, y]; }
    if (this.walkView && this.user.inside) this.headingUp();
    if (this.follow && this.user.inside && !this.pointers?.size) this.zoomTo(x, y, this.walkView ? 1.9 : Math.max(this.v.s, this.nav ? 1.1 : 0.9), 0, true);
    if (this.nav) this.updateNav();
  }
  // Walk view: zoomed in at street level, map turns so the way you're facing (or walking) is straight up
  setWalkView(on) {
    this.walkView = on;
    if (on && this.user?.inside) { this.follow = true; this.headingUp(true); this.zoomTo(this.user.x, this.user.y, 1.9, 0, true); }
    if (!on) { this.zoomTo(this.v.cx, this.v.cy, Math.min(this.v.s, 0.9)); }
    return !!this.user?.inside;
  }
  headingUp(snap) {
    const u = this.user; let dir = null;
    if (u.heading != null && !Number.isNaN(u.heading)) { const h = (u.heading * Math.PI) / 180, N = this.northW, E = this.eastW; dir = [N[0] * Math.cos(h) + E[0] * Math.sin(h), N[1] * Math.cos(h) + E[1] * Math.sin(h)]; }
    else if (this.nav?.pts && this.nav.cum) {   // look ~25 m down the route
      const n = this.nav, want = Math.min(n.total, (n.along || 0) + 2.5); let q = n.pts[n.pts.length - 1];
      for (let i = 1; i < n.pts.length; i++) if (n.cum[i] >= want) { const a = n.pts[i - 1], b = n.pts[i], L = n.cum[i] - n.cum[i - 1] || 1, t = (want - n.cum[i - 1]) / L; q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; break; }
      dir = [q[0] - u.x, q[1] - u.y];
    }
    else if (this.moveDir) dir = this.moveDir;
    if (!dir || Math.hypot(dir[0], dir[1]) < 1e-6) return;
    const v = this.v, ang = (r) => { v.setRot(r); const a = v.p(0, 0), b = v.p(dir[0], dir[1]); return Math.atan2(b[0] - a[0], -(b[1] - a[1])); };
    const r0 = v.r; let best = r0, bd = 9;
    for (let k = 0; k < 120; k++) { const r = (k / 120) * Math.PI * 2, d = Math.abs(ang(r)); if (d < bd) { bd = d; best = r; } }
    for (let s = 0.03; s > 0.002; s /= 2) for (const r of [best - s, best + s]) { const d = Math.abs(ang(r)); if (d < bd) { bd = d; best = r; } }
    let diff = ((best - r0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (!snap && Math.abs(diff) < 0.06) diff = 0;   // ignore compass jitter
    v.setRot(r0 + diff * (snap ? 1 : 0.35)); this.opts.onRotate?.(this.compass());
  }
  locateMe() { if (!this.user?.inside) return false; this.follow = true; this.zoomTo(this.user.x, this.user.y, Math.max(this.v.s, 1.0)); return true; }
  // street-grid walking route on the sidewalks, with turn-by-turn steps
  startNav(target) {
    if (!this.user?.inside) return null;
    if (this.mode === 'tunnel') this.setMode('street');
    this.nav = { target, rerouted: 0 }; this.follow = true; this.buildRoute(); this.updateNav();
    return this.nav;
  }
  stopNav() { this.nav = null; this.follow = false; this.opts.onNav?.(null); }
  tunnelsOpen(d = new Date()) { const day = d.getDay(), h = d.getHours() + d.getMinutes() / 60; return day >= 1 && day <= 5 && h >= 6.5 && h < 18; }   // weekday business hours
  // when it's raining or hot (and the tunnels are open), go underground at the nearest street entrance and come up close to the destination
  tunnelPlan(u, t) {
    if (!this.preferTunnel || !this.tunnelsOpen() || !this.doors?.length || (this.tunnelSpots || []).length < 2) return null;
    const md = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y), door = this.doors.reduce((p, q) => (md(u, q) < md(u, p) ? q : p));
    const T = this.tunnelSpots, near = (p) => T.reduce((bi, s, i) => (md(p, s) < md(p, T[bi]) ? i : bi), 0), a = near(door), b = near(t);
    if (md(u, door) > md(u, t) * 0.7 || md(T[b], t) > 4 || a === b && md(door, t) < 3) return null;   // only worth it if the entrance is on the way and the tunnel reaches the destination
    const prev = new Map([[a, -1]]), q = [a]; while (q.length) { const i = q.shift(); if (i === b) break; for (const j of this.tunnelAdj[i]) if (!prev.has(j)) { prev.set(j, i); q.push(j); } }
    const real = this.tunnelPath(door, t); if (real) return { door, under: [[door.x, door.y], ...real.pts, [t.x, t.y]], real: true };
    if (!prev.has(b)) return null; const chain = []; for (let i = b; i !== -1; i = prev.get(i)) chain.unshift([T[i].x, T[i].y]);
    return { door, under: [[door.x, door.y], ...chain, [t.x, t.y]] };
  }
  buildRoute() {
    const n = this.nav, u = this.user, t = n.target, tp = this.tunnelPlan(u, t);
    if (tp) {   // street to the tunnel entrance, then the underground leg
      let pts = [[u.x, u.y], ...this.routeStreet({ x: u.x, y: u.y }, { x: tp.door.x, y: tp.door.y })]; pts = pts.filter((q, i) => !i || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.05);
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const ul = Math.min(tp.under.reduce((s, q, i) => (i ? s + Math.abs(q[0] - tp.under[i - 1][0]) + Math.abs(q[1] - tp.under[i - 1][1]) : 0), 0), (tp.real ? 1e9 : (Math.abs(tp.door.x - t.x) + Math.abs(tp.door.y - t.y)) * 1.3));   // the drawn tunnel line is a guide, so don't overstate the distance
      const steps = this.routeSteps(pts, cum, { ...t, label: tp.door.n, tunnel: false }).filter((s) => !s.end);
      steps.push({ at: cum[cum.length - 1], icon: '⬇️', text: `Go down at ${tp.door.n} — ${tp.door.note.toLowerCase()}`, len: 0 });
      steps.push({ at: cum[cum.length - 1] + 0.01, icon: '🚇', text: `Follow the tunnel signs toward ${t.label || 'your destination'} (roughly ${Math.round(ul) * 10} m underground)`, len: Math.round(ul * 10) });
      steps.push({ at: cum[cum.length - 1] + 0.02, icon: '🏁', text: `${t.label || 'Destination'}${t.tunnel ? ' is on the tunnel level' : ' — take the escalator up to the street'}`, len: 0, end: true });
      n.pts = pts; n.cum = cum; n.total = cum[cum.length - 1] + ul; n.steps = steps; n.under = tp.under; n.builtAt = performance.now(); return;
    }
    n.under = null;
    let pts = [[u.x, u.y], ...this.routeStreet({ x: u.x, y: u.y }, { x: t.x, y: t.y })];
    pts = pts.filter((q, i) => !i || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.05);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    n.pts = pts; n.cum = cum; n.total = cum[cum.length - 1]; n.steps = this.routeSteps(pts, cum, t); n.builtAt = performance.now();
  }
  streetAlong(a, b) {   // which street a sidewalk segment runs along
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, alongAv = Math.abs(b[1] - a[1]) >= Math.abs(b[0] - a[0]);
    if (alongAv) { const av = this.avenues.reduce((p, q) => (Math.abs(q.x - mx) < Math.abs(p.x - mx) ? q : p)); return Math.abs(av.x - mx) < this.streetW + 1.2 ? SUFFIX(av.n) : null; }
    const cs = this.cross.reduce((p, q) => (Math.abs(q.y - my) < Math.abs(p.y - my) ? q : p)); return Math.abs(cs.y - my) < this.streetW + 1.2 ? SUFFIX(cs.n) : null;
  }
  compassWord(dx, dy) {   // downtown's grid is skewed, but Houstonians call Main St north–south: use the grid's own directions
    if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'north' : 'south';
    return dx > 0 ? 'east' : 'west';
  }
  trueCompassWord(dx, dy) {
    const N = this.northW, E = this.eastW, n = dx * N[0] + dy * N[1], e = dx * E[0] + dy * E[1], a = (Math.atan2(e, n) * 180) / Math.PI;
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][((Math.round(a / 45) % 8) + 8) % 8];
  }
  routeSteps(pts, cum, t) {
    const legs = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = cum[i] - cum[i - 1]; if (d < 0.05) continue;
      const dir = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], last = legs[legs.length - 1];
      if (last && Math.abs(last.dir[0] * dir[0] + last.dir[1] * dir[1]) > 0.98) { last.to = i; last.len += d; continue; }
      legs.push({ from: i - 1, to: i, len: d, dir, street: this.streetAlong(a, b) });
    }
    // ignore the little jogs onto and across the sidewalk: keep legs of ~20 m or more, then re-merge
    let L2 = legs.filter((L, k) => L.len >= 1.8 || legs.length === 1 || (k === legs.length - 1 && !L.street));
    const merged = []; for (const L of L2) { const last = merged[merged.length - 1]; if (last && Math.abs(last.dir[0] * L.dir[0] + last.dir[1] * L.dir[1]) > 0.98) { last.len += L.len; last.to = L.to; } else merged.push({ ...L }); }
    legs.length = 0; legs.push(...merged);
    const steps = []; const m = (u) => Math.round(u * 10);
    legs.forEach((L, k) => {
      const prev = legs[k - 1], meters = m(L.len), lastLeg = k === legs.length - 1;
      if (lastLeg && !L.street) { steps.push({ at: cum[L.from], icon: '🏁', text: `${t.label || 'Destination'} is right here${t.tunnel ? ' — take the escalator down to the tunnel level' : ''}`, len: meters, end: true }); return; }
      if (!prev) { if (L.len < 0.6 && !L.street) return; steps.push({ at: cum[L.from], icon: '⬆️', text: `Head ${this.compassWord(...L.dir)}${L.street ? ' on ' + L.street : ' to the sidewalk'}`, len: meters }); return; }
      const cr = prev.dir[0] * L.dir[1] - prev.dir[1] * L.dir[0], turn = cr > 0 ? 'right' : 'left';
      steps.push({ at: cum[L.from], icon: turn === 'right' ? '➡️' : '⬅️', text: `Turn ${turn}${L.street ? ' onto ' + L.street : ''}`, len: meters, crossing: false });
    });
    if (!steps.length || !steps[steps.length - 1].end) steps.push({ at: cum[cum.length - 1], icon: '🏁', text: `Arrive at ${t.label || 'your destination'}${t.tunnel ? ' — take the escalator down to the tunnel level' : ''}`, len: 0, end: true });
    return steps;
  }
  updateNav() {
    const n = this.nav, u = this.user; if (!n || !u) return;
    let best = { d: 1e9, along: 0, i: 0 };
    for (let i = 1; i < n.pts.length; i++) {
      const a = n.pts[i - 1], b = n.pts[i], vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1e-9;
      const t = Math.max(0, Math.min(1, ((u.x - a[0]) * vx + (u.y - a[1]) * vy) / L2)), px = a[0] + vx * t, py = a[1] + vy * t, d = Math.hypot(u.x - px, u.y - py);
      if (d < best.d) best = { d, along: n.cum[i - 1] + t * Math.sqrt(L2), i };
    }
    const now = performance.now();
    if (best.d > 3 && now - n.builtAt > 4000) { n.rerouted++; this.buildRoute(); return this.updateNav(); }   // off the route by 30 m+: find a new way
    n.along = best.along; n.seg = best.i - 1; const remaining = Math.max(0, n.total - best.along);
    const stepIdx = Math.max(0, n.steps.findIndex((s, k) => k === n.steps.length - 1 || n.steps[k + 1].at > best.along + 0.05));
    const next = n.steps[Math.min(stepIdx + 1, n.steps.length - 1)], cur = n.steps[stepIdx];
    const arrived = remaining < 2;
    this.opts.onNav?.({ cur, next: next !== cur ? next : null, toNext: Math.round(Math.max(0, (next?.at ?? n.total) - best.along) * 10), remaining: Math.round(remaining * 10), minutes: Math.max(1, Math.round((remaining * 10) / 80)), arrived, target: n.target, rerouted: n.rerouted, steps: n.steps });
  }
  drawRoute(now) {
    const n = this.nav; if (!n?.pts || this.mode === 'tunnel') return; const ctx = this.ctx, v = this.v;
    const P = n.pts.map((q) => v.p(q[0], q[1], 0.06));
    const path = () => { ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    path(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(7, v.s * 11); ctx.stroke();
    path(); ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = Math.max(4.5, v.s * 7); ctx.stroke();
    path(); ctx.setLineDash([2, 12]); ctx.lineDashOffset = -now / 35; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(2, v.s * 3); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    if (n.under) { const U = n.under.map((q) => v.p(q[0], q[1], 0.05)); ctx.beginPath(); U.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.setLineDash([8, 8]); ctx.lineDashOffset = -now / 40; ctx.strokeStyle = '#12b886'; ctx.lineWidth = Math.max(3.5, v.s * 6); ctx.stroke(); ctx.setLineDash([]); }   // the underground leg, dashed green
    if (v.s > 0.35 && n.cum?.length > 1) {   // a see-through you walks the route ahead of you, on a loop
      const tot = n.cum[n.cum.length - 1], at = ((now / 1000) * 1.8) % (tot + 2.5); if (at <= tot) { let i = 1; while (i < n.cum.length - 1 && n.cum[i] < at) i++; const a = n.pts[i - 1], b = n.pts[i], f = (at - n.cum[i - 1]) / Math.max(1e-6, n.cum[i] - n.cum[i - 1]), [gx, gy] = v.p(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0.05);
        ctx.globalAlpha = 0.55; drawPerson(ctx, gx, gy, Math.max(0.6, this.u() * 0.8), ME_LOOK, now / 90, true, '#2fdc5a', now, ''); ctx.globalAlpha = 1; } }
    const t = n.target, [fx, fy] = v.p(t.x, t.y, 0.05), [, ft] = v.p(t.x, t.y, 2.2);   // destination flag
    ctx.strokeStyle = '#212529'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, ft); ctx.stroke();
    poly(ctx, [[fx, ft], [fx + 16, ft + 6], [fx, ft + 12]], '#e03131', '#fff', 1.5); ellipse(ctx, fx, fy, 5, 2.5, 'rgba(0,0,0,.25)');
  }
  drawUser(now) {
    const u = this.user; if (!u?.inside || this.mode === 'tunnel') return; const ctx = this.ctx, v = this.v;
    const ring = (r, z = 0.03) => { const pts = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; pts.push(v.p(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, z)); } return pts; };
    const accU = Math.min(12, Math.max(0.4, (u.acc || 20) / 10));
    poly(ctx, ring(accU), 'rgba(28,126,214,.12)', 'rgba(28,126,214,.4)', 1);
    if (u.heading != null && !Number.isNaN(u.heading)) {   // which way you're facing
      const h = (u.heading * Math.PI) / 180, N = this.northW, E = this.eastW, R = 2.2, cone = [v.p(u.x, u.y, 0.04)];
      for (let k = -1; k <= 1; k += 0.25) { const a = h + k * 0.45, dx = N[0] * Math.cos(a) + E[0] * Math.sin(a), dy = N[1] * Math.cos(a) + E[1] * Math.sin(a); cone.push(v.p(u.x + dx * R, u.y + dy * R, 0.04)); }
      poly(ctx, cone, 'rgba(28,126,214,.28)');
    }
    const [x, y] = v.p(u.x, u.y, 0.05), pulse = (now / 1600) % 1;
    ctx.strokeStyle = `rgba(28,126,214,${0.6 * (1 - pulse)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 8 + pulse * 22, (8 + pulse * 22) / 2, 0, 0, 7); ctx.stroke();
    if (v.s > 0.35 && !this.walkView) {   // you, as a Sim: your own little person with a big green plumbob
      const uu = Math.max(0.7, this.u() * 0.95), mv = this._meLast && Math.hypot(this._meLast[0] - u.x, this._meLast[1] - u.y) > 0.01; this._meLast = [u.x, u.y];
      this._mePh = (this._mePh || 0) + (mv ? 0.35 : 0);
      drawPerson(ctx, x, y, uu, ME_LOOK, this._mePh, mv, '#2fdc5a', now, this._wxNow || '');
      if (!this.nav) pill(ctx, x, y - 58 * uu, u.demo ? 'You (demo)' : 'You', 11, 'rgba(28,126,214,.95)', '#fff');
    } else { circle(ctx, x, y, 9, '#fff'); circle(ctx, x, y, 6.5, '#1c7ed6'); }
  }
  spotForPlace(id) { return this.spots.find((s) => s.places.some((p) => p.id === id)); }

  // ---------- ambience: sun shadows, clouds, signals, streetlights, beacons, birds ----------
  sun() {   // shadow direction for the real time of day in Houston: long in the morning/evening, short at noon
    const d = new Date(), key = d.getHours() * 60 + d.getMinutes(); if (this._sunK === key) return this._sun;
    const h = key / 60; let out = null;
    if (h > 6.9 && h < 17.6) {
      const t = (h - 6.9) / (17.6 - 6.9), elev = Math.max(0.16, Math.sin(Math.PI * t) * 0.82), a = Math.PI * t, E = this.eastW, Nn = this.northW;
      const sx = E[0] * Math.cos(a) - Nn[0] * Math.sin(a), sy = E[1] * Math.cos(a) - Nn[1] * Math.sin(a), L = Math.min(2.4, 1 / Math.tan(elev)) * 0.6;
      out = [-sx * L, -sy * L];
    }
    this._sunK = key; this._sun = out; return out;
  }
  drawShadows() {
    const sv = this.sun(); if (!sv || this.mode === 'tunnel') return;
    const ctx = this.ctx, v = this.v, W = this.W, H = this.H;
    const hull = (P) => { P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
    ctx.beginPath();
    const add = (x, y, w, d, h) => {
      if (h < 0.4) return; const [cx, cy] = v.p(x + w / 2 + sv[0] * h / 2, y + d / 2 + sv[1] * h / 2), r = (w + d + h * 3) * TW * 0.5 * v.s; if (cx < -r || cx > W + r || cy < -r || cy > H + r) return;
      const dx = sv[0] * h, dy = sv[1] * h, pts = hull([[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x + dx, y + dy], [x + w + dx, y + dy], [x + w + dx, y + d + dy], [x + dx, y + d + dy]].map((q) => v.p(q[0], q[1])));
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
    };
    for (const f of this.fill) if (!f.lot) add(f.x, f.y, f.w, f.d, f.h);
    for (const l of this.landmarks) add(l.x, l.y, l.w, l.d, l.h);
    for (const o of this.osm || []) {
      if (o.h < 0.5) continue; const top = o.z0 + o.h, [cx, cy] = v.p(o.cx + sv[0] * top / 2, o.cy + sv[1] * top / 2), r = ((o.bb.x1 - o.bb.x0) + (o.bb.y1 - o.bb.y0) + top * 3) * TW * 0.5 * v.s; if (cx < -r || cx > W + r || cy < -r || cy > H + r) continue;
      const pts = hull([...o.pts, ...o.pts.map((p) => [p[0] + sv[0] * top, p[1] + sv[1] * top])].map((q) => v.p(q[0], q[1])));
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
    }
    for (const a of this.areas) if (['ballpark', 'arena', 'grb'].includes(a.kind)) add(a.r.x0 + 0.6, a.r.y0 + 0.6, a.r.x1 - a.r.x0 - 1.2, a.r.y1 - a.r.y0 - 1.2, 3.8);
    ctx.fillStyle = 'rgba(38,48,74,.15)'; ctx.fill('nonzero'); ctx.strokeStyle = 'rgba(38,48,74,.05)'; ctx.lineWidth = Math.max(2, 4 * v.s); ctx.lineJoin = 'round'; ctx.stroke();
  }
  drawClouds(now, N) {   // big soft cloud shadows drifting over the city
    if (N || this.mode === 'tunnel') return; const ctx = this.ctx, v = this.v, B = this.bounds;
    if (!this._cloud) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(40,52,80,.55)'); gr.addColorStop(0.6, 'rgba(40,52,80,.25)'); gr.addColorStop(1, 'rgba(40,52,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); this._cloud = c; }
    const Lx = B.x1 - B.x0 + 80; ctx.globalAlpha = 0.22;
    for (let i = 0; i < 5; i++) {
      const wx = B.x0 - 40 + ((now / 1000) * 0.7 + i * (Lx / 5) + hash('cx' + i) * 30) % Lx, wy = B.y0 + (B.y1 - B.y0) * (0.1 + 0.8 * hash('cy' + i)), [x, y] = v.p(wx, wy), r = (30 + hash('cr' + i) * 25) * TW * 0.5 * v.s;
      if (x < -r || x > this.W + r || y < -r || y > this.H + r) continue;
      ctx.drawImage(this._cloud, x - r, y - r * 0.5, r * 2, r);
    }
    ctx.globalAlpha = 1;
  }
  signal(i, j, axis, now = performance.now()) {   // 18-second cycle, staggered along the avenues like a green wave
    const ph = ((now / 1000 + i * 1.4 + j * 0.6) % 18) / 18;
    return axis === 'a' ? (ph < 0.44 ? 'g' : ph < 0.5 ? 'y' : 'r') : ph < 0.5 ? 'r' : ph < 0.94 ? 'g' : 'y';
  }
  drawSignals(now) {
    const v = this.v; if (v.s < 0.75 || this.mode === 'tunnel') return; const ctx = this.ctx, sw = this.streetW, COL = { g: '#40c057', y: '#fab005', r: '#fa5252' };
    this.avenues.forEach((a, i) => this.cross.forEach((c, j) => {
      const [sx, sy] = v.p(a.x, c.y); if (sx < -40 || sx > this.W + 40 || sy < -60 || sy > this.H + 40) return;
      for (const [ox, oy, ax] of [[sw + 0.3, -sw - 0.3, 'a'], [-sw - 0.3, sw + 0.3, 'c']]) {
        const [x, y] = v.p(a.x + ox, c.y + oy), [, yt] = v.p(a.x + ox, c.y + oy, 1.5), st = this.signal(i, j, ax, now);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = Math.max(1, v.s * 1.2); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yt); ctx.stroke();
        const r = Math.max(1.6, v.s * 2.2); ctx.fillStyle = '#212529'; ctx.fillRect(x - r * 1.2, yt - r * 1.2, r * 2.4, r * 2.4); circle(ctx, x, yt, r, COL[st]);
      }
    }));
  }
  drawStreetlights(N) {
    if (!N || this.mode === 'tunnel') return; const ctx = this.ctx, v = this.v, sw = this.streetW;
    if (!this._glow) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,140,.7)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this._glow = c; }
    const fade = Math.max(0, Math.min(1, (v.s - 0.3) / 0.5)); if (fade <= 0.02) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * fade; const r = Math.max(6, 16 * v.s);
    for (const a of this.avenues) for (const c of this.cross) for (const [ox, oy] of [[sw + 0.4, sw + 0.4], [-sw - 0.4, -sw - 0.4]]) {
      const [x, y] = v.p(a.x + ox, c.y + oy); if (x < -r || x > this.W + r || y < -r || y > this.H + r) continue; ctx.drawImage(this._glow, x - r, y - r / 2, r * 2, r);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  drawBeacons(now, N) {   // red aviation lights blink on the tallest towers
    const ctx = this.ctx, v = this.v, on = (now % 1600) < 260; if (!on || this.mode === 'tunnel') return;
    for (const o of this.osmNamed || []) if (o.h > 19) { const [x, y] = v.p(o.cx, o.cy, o.z0 + o.h + 0.2); circle(ctx, x, y, N ? 4 : 2.6, 'rgba(255,40,40,.35)'); circle(ctx, x, y, N ? 2 : 1.4, '#ff3b3b'); }
    for (const l of this.landmarks) if (l.h > 19) { const [x, y] = v.p(l.x + l.w / 2, l.y + l.d / 2, l.h + (l.kind === 'mayan' ? 1.6 : 0.2)); circle(ctx, x, y, N ? 4 : 2.6, 'rgba(255,40,40,.35)'); circle(ctx, x, y, N ? 2 : 1.4, '#ff3b3b'); }
  }
  drawBirds(now, N) {   // now and then a small flock crosses the sky
    if (N || this.mode === 'tunnel') return; const t = (now / 1000) % 40; if (t > 14) return;
    const ctx = this.ctx, k = t / 14, bx = -60 + k * (this.W + 120), by = this.H * 0.22 + Math.sin(k * 3) * 20;
    ctx.strokeStyle = 'rgba(52,58,64,.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const x = bx - (i % 3) * 14 - Math.floor(i / 3) * 8, y = by + (i % 3) * 9 * (i < 3 ? 1 : -1) * 0.7 + (i >= 3 ? 14 : 0), f = Math.sin(now / 110 + i) * 3.5; ctx.beginPath(); ctx.moveTo(x - 5, y - f); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - f); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  drawBusStops(N) {
    if (this.v.s < 0.6 || !this.busStops) return; const ctx = this.ctx, v = this.v, sw = this.streetW;
    for (const st of this.busStops) {
      const A = this.node(st.a), Bn = this.node(st.b), dx = Math.sign(Bn[0] - A[0]), dy = Math.sign(Bn[1] - A[1]);
      const px = (A[0] + Bn[0]) / 2 - dy * (sw + 0.25), py = (A[1] + Bn[1]) / 2 + dx * (sw + 0.25);   // right-hand curb, mid-block
      const [x, y] = v.p(px, py), [, yt] = v.p(px, py, 2.1);
      if (x < -20 || x > this.W + 20 || y < -40 || y > this.H + 20) continue;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = Math.max(1, v.s * 1.3); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yt); ctx.stroke();
      const r = Math.max(3, v.s * 4.5); ctx.fillStyle = '#1c5fa8'; ctx.fillRect(x - r, yt - r * 1.4, r * 2, r * 1.4); ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', x, yt - r * 0.7);
    }
  }

  // ---------- street signs & crosswalks ----------
  drawCrosswalks(N) {
    const v = this.v; if (v.s < 0.7) return;
    const ctx = this.ctx, sw = this.streetW, k = 0.42;
    ctx.strokeStyle = N ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, v.s * 1.6); ctx.beginPath();
    for (const a of this.avenues) for (const c of this.cross) {
      const [sx, sy] = v.p(a.x, c.y); if (sx < -80 || sx > this.W + 80 || sy < -80 || sy > this.H + 80) continue;
      for (let i = 0; i <= 5; i++) {
        const t = -sw + (2 * sw) * i / 5;
        for (const yy of [c.y - sw + 0.1 - k, c.y + sw - 0.1]) { ctx.moveTo(...v.p(a.x + t, yy)); ctx.lineTo(...v.p(a.x + t, yy + k)); }
        for (const xx of [a.x - sw + 0.1 - k, a.x + sw - 0.1]) { ctx.moveTo(...v.p(xx, c.y + t)); ctx.lineTo(...v.p(xx + k, c.y + t)); }
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
    const covered = (wx, wy) => this.landmarks.some((l) => l.kind === 'post' && wx > l.x && wx < l.x + l.w && wy > l.y && wy < l.y + l.d);
    const sign = (x, y, text, ang, major, num) => {
      if (x < -120 || x > this.W + 120 || y < -30 || y > this.H + 30) return;
      ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
      const label = num ? `${text}  ·  ${num}` : text, w = ctx.measureText(label).width + size * 1.1, h = size * 1.55;
      { const c = Math.abs(Math.cos(ang)), s2 = Math.abs(Math.sin(ang)), bw = (w * c + h * s2) * 0.42, bh = (w * s2 + h * c) * 0.42; if (!fits(x - bw, y - bh, x + bw, y + bh)) return; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2 + 1, -h / 2 + 2, w, h, 4) : ctx.rect(-w / 2 + 1, -h / 2 + 2, w, h); ctx.fill();
      ctx.fillStyle = major ? '#1b6e3f' : '#2b7a4b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 4) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0.5);
      ctx.restore();
    };
    for (let i = 0; i < A.length; i++) for (let j = 0; j < C.length - 1; j++) {
      if ((j + i) % kA || covered(A[i].x, (C[j].y + C[j + 1].y) / 2)) continue; const [x, y] = v.p(A[i].x, (C[j].y + C[j + 1].y) / 2);
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
        const t = `${a.n} / ${c.n}`, w = ctx.measureText(t).width + 8; if (!fits(x - w / 2, y - 8, x + w / 2, y + 8)) continue; ctx.fillStyle = '#1b6e3f'; ctx.fillRect(x - w / 2, y - 7, w, 14); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y + 0.5);
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

  // ---------- real buildings from OpenStreetMap ----------
  buildOsm() {
    const list = this.opts.buildings && this.opts.buildings.b; if (!list || list.length < 50) return false;
    const B = this.bounds, keepKinds = new Set(['post', 'aquarium']);
    this.allLandmarks = this.landmarks; this.landmarks = this.landmarks.filter((l) => keepKinds.has(l.kind));   // hand-drawn only where OSM can't show what makes them special
    const skip = [...this.landmarks.map((l) => ({ x0: l.x - 0.5, x1: l.x + l.w + 0.5, y0: l.y - 0.5, y1: l.y + l.d + 0.5 })), ...this.areas.filter((a) => ['ballpark', 'arena', 'grb'].includes(a.kind)).map((a) => a.r)];
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const fixes = STYLE_FIX.map((f) => ({ ...f, p: this.proj(f.at[0], f.at[1]) }));
    this.osm = []; this.osmLots = [];
    const A = this.avenues, C = this.cross, sw = this.streetW, side = 0.32;   // building line: curb + ~3 m of sidewalk
    const clip = (P, r) => {   // Sutherland–Hodgman against the block rectangle
      const edges = [[(p) => p[0] >= r.x0, (a, b) => { const t = (r.x0 - a[0]) / (b[0] - a[0]); return [r.x0, a[1] + t * (b[1] - a[1])]; }], [(p) => p[0] <= r.x1, (a, b) => { const t = (r.x1 - a[0]) / (b[0] - a[0]); return [r.x1, a[1] + t * (b[1] - a[1])]; }],
        [(p) => p[1] >= r.y0, (a, b) => { const t = (r.y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.y0]; }], [(p) => p[1] <= r.y1, (a, b) => { const t = (r.y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.y1]; }]];
      for (const [inside, cut] of edges) { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) out.push(cut(a, b)); } P = out; if (P.length < 3) return P; }
      return P;
    };
    const blockOf = (x, y) => { const [i, j] = this.cellIdx(x, y); return { x0: i > 0 ? A[i - 1].x + sw + side : -1e9, x1: i < A.length ? A[i].x - sw - side : 1e9, y0: j > 0 ? C[j - 1].y + sw + side : -1e9, y1: j < C.length ? C[j].y - sw - side : 1e9 }; };
    // hand-built tops for towers whose crowns OpenStreetMap doesn't describe: [scale of footprint, share of height, colour]
    // how the big towers actually look: cladding colour, glass or stone, rooftop masts
    const LOOK = {
      'JPMorgan Chase Tower': { c: '#8a8f95', glass: false, roofC: '#6d7278' },          // grey granite, ribbon windows
      'One Shell Plaza': { c: '#ece6d8', glass: false, ant: 8.5, roofC: '#d9d3c4' },     // white travertine tube, broadcast mast
      'Wells Fargo Plaza': { c: '#2c5a60', glass: true },                                 // blue-green curtain wall
      'Heritage Plaza': { c: '#9fb3c6', glass: true },                                    // silver-blue glass under the Mayan top
      '1 Houston Center': { c: '#4a3428', glass: true },
      'First City Tower': { c: '#5d7a86', glass: true },
      'Fulbright Tower': { c: '#9a9590', glass: false },
      'Three Allen Center': { c: '#a7a39b', glass: true },
      '609 Main': { c: '#5f86a3', glass: true },
    };
    const CROWNS = { 'Wells Fargo Plaza': [[0.9, 0.04], [0.78, 0.035], [0.62, 0.03]], 'JPMorgan Chase Tower': [[0.82, 0.03, '#a9adb3']], 'One Shell Plaza': [[0.7, 0.02, '#e6e1d6']], 'Fulbright Tower': [[0.8, 0.03]], '1400 Smith Street': [[0.75, 0.04]] };
    const MAT = { brick: ['#a35a44', '#9a5240', '#b0684e'], stone: ['#d3c4a3', '#cbb994'], limestone: ['#d8cbae'], sandstone: ['#d4b98e'], granite: ['#9d918a', '#8d8078'], marble: ['#e7e2d8'], concrete: ['#bfc2c4', '#b3b7ba'], metal: ['#9aa3ab'], steel: ['#8f99a3'], plaster: ['#e4d8c3'], stucco: ['#e2d3b9'], wood: ['#a5835b'], cement_block: ['#c4c2bc'] };
    for (const [ring, hM, minM, type, name, colour, material, roofShape, roofColour, roofH, roofDir] of list) {
      let pts = ring.slice(0, -1).map(([la, ln]) => this.proj(la, ln)); if (pts.length < 3) continue;
      { // keep the part in whichever block holds most of the footprint (the fitted street grid can be a few metres off the real streets)
        const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const areaOf = (Q) => { let s = 0; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
        let best = null, ba = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const r = blockOf(mx + dx * this.blockW * 0.5, my + dy * this.blockD * 0.5), q = clip(pts, r); if (q.length >= 3) { const a = areaOf(q); if (a > ba) { ba = a; best = q; } } }
        if (!best || ba < 0.15) continue; pts = best; }
      let ar = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ar += a[0] * b[1] - b[0] * a[1]; }
      if (ar < 0) pts.reverse();   // counter-clockwise, so each wall's outward side is known
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), bb = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      if (bb.x1 < B.x0 || bb.x0 > B.x1 || bb.y1 < B.y0 || bb.y0 > B.y1) continue;
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      if (type === 'lot') { this.osmLots.push({ pts, bb }); continue; }
      if (skip.some((r) => cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1)) continue;
      const z0 = (minM || 0) / 10, h = Math.max(0.35, hM / 10 - z0), k = hash(cx.toFixed(1) + cy.toFixed(1));
      const glass = hM >= 85 && !/house|terrace/.test(type);
      let c = /^#[0-9a-f]{6}$/i.test(colour || '') ? colour : glass ? GLASS[Math.floor(k * GLASS.length)] : hM >= 25 ? CONCRETE[Math.floor(k * CONCRETE.length)] : LOW[Math.floor(k * LOW.length)];
      const mat = String(material || '').toLowerCase().split(';')[0];
      if (!/^#[0-9a-f]{6}$/i.test(colour || '') && MAT[mat]) c = MAT[mat][Math.floor(k * MAT[mat].length)];
      const lum = /^#[0-9a-f]{6}$/i.test(colour || '') ? rgb(colour).reduce((a, x, i) => a + x * [0.3, 0.59, 0.11][i], 0) / 255 : 1;
      const isGlass = glass || mat === 'glass' || /glass/.test(mat) || (h >= 8 && lum < 0.38 && !/brick|stone|concrete/.test(mat));   // dark towers downtown are tinted glass
      if (mat === 'glass' && !glass) c = GLASS[Math.floor(k * GLASS.length)];
      if (type === 'parking') c = '#b9bcc2';
      const o = { pts, bb, h, z0, c, glass: isGlass, name, type, cx, cy };
      if (/^#[0-9a-f]{6}$/i.test(roofColour || '')) o.roofC = roofColour; else if (/^(red|green|grey|gray|black|white|brown|blue)$/i.test(roofColour || '')) o.roofC = { red: '#a5463a', green: '#4f7a5a', grey: '#8a8f96', gray: '#8a8f96', black: '#3a3d42', white: '#eceae4', brown: '#7a5a44', blue: '#4a6c9a' }[roofColour.toLowerCase()];
      const rs = String(roofShape || '').toLowerCase();
      if (/^(pyramidal|hipped|gabled|dome|onion|round|half-hipped|skillion)$/.test(rs)) {
        const span = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0); o.roof = rs;
        // OpenStreetMap's height already includes the roof, so the walls stop where the roof begins
        if (roofH && roofH / 10 < h * 0.9) { o.rh = roofH / 10; o.h = h - o.rh; } else o.rh = Math.min(h * 0.5, rs === 'dome' || rs === 'onion' || rs === 'round' ? span * 0.45 : rs === 'skillion' ? span * 0.15 : span * 0.32);
        // drop corner points that lie on a straight wall (left by clipping), so a box is four corners again
        const sp = pts.filter((p, i) => { const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; const cr = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]); return Math.abs(cr) > 0.02 * Math.hypot(p[0] - a[0], p[1] - a[1]) * Math.hypot(b[0] - p[0], b[1] - p[1]); });
        o.rp = sp.length >= 3 ? sp : pts;
        if (rs === 'gabled' && o.rp.length !== 4) o.roof = 'hipped';
        if (rs === 'skillion') {   // single slope: downhill toward roof:direction, else away from the longest wall
          let d = null; const deg = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 }[String(roofDir || '').toUpperCase()] ?? parseFloat(roofDir);
          if (Number.isFinite(deg)) { const [la, ln] = ring[0], t = deg * Math.PI / 180, a0 = this.proj(la, ln), a1 = this.proj(la + Math.cos(t) * 1e-4, ln + Math.sin(t) * 1e-4 / Math.cos(la * Math.PI / 180)); const L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]); if (L) d = [(a1[0] - a0[0]) / L, (a1[1] - a0[1]) / L]; }
          if (!d) { let bi = 0, bl = 0; const P = o.rp; P.forEach((a, i) => { const b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; bi = i; } }); const a = P[bi], b = P[(bi + 1) % P.length]; d = [-(b[1] - a[1]) / bl, (b[0] - a[0]) / bl]; if ((cx - a[0]) * d[0] + (cy - a[1]) * d[1] < 0) d = [-d[0], -d[1]]; }
          const ts = o.rp.map((p) => p[0] * d[0] + p[1] * d[1]), t0 = Math.min(...ts), t1 = Math.max(...ts); o.rz = ts.map((t) => o.rh * (t1 - t) / ((t1 - t0) || 1));
        }
      }
      if (type === 'church' || type === 'cathedral') { o.c = o.c === c ? (MAT[mat]?.[0] || '#d3c4a3') : o.c; if (!o.roof) { o.roof = 'gabled'; o.rh = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.3; o.roofC = o.roofC || '#6d7378'; } }
      const fx = fixes.find((f) => hM >= (f.minH || 0) && (inPoly(f.p[0], f.p[1], pts) || Math.hypot(f.p[0] - cx, f.p[1] - cy) < 0.6)); if (fx) { o.c = fx.c; o.grid = fx.grid; o.glass = false; if (o.h > 6) o.name = fx.name; if (fx.pool && o.h < 7 && o.h > 1.5) o.pool = true; }
      const ls = LOOK[o.name]; if (ls) { if (ls.c) o.c = ls.c; if (ls.glass != null) o.glass = ls.glass; if (ls.ant) o.ant = ls.ant; if (ls.roofC) o.roofC = ls.roofC; }
      this.osm.push(o);
      const cr = CROWNS[o.name]; if (cr) { let top = o.z0 + o.h; o.h -= cr.reduce((a, [, f]) => a + f * h, 0); top = o.z0 + o.h;
        for (const [s, f, cc] of cr) { const q = pts.map((p) => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]), qx = q.map((p) => p[0]), qy = q.map((p) => p[1]); this.osm.push({ pts: q, bb: { x0: Math.min(...qx), x1: Math.max(...qx), y0: Math.min(...qy), y1: Math.max(...qy) }, h: f * h, z0: top, c: cc || o.c, glass: o.glass, name: '', type: 'crown', cx, cy }); top += f * h; } }
    }
    // drop upper parts left floating because the tower under them isn't mapped
    this.osm = this.osm.filter((o) => !(o.z0 > 0.5) || o.type === 'crown' || this.osm.some((u) => u !== o && u.z0 < o.z0 && u.z0 + u.h >= o.z0 - 0.6 && inPoly(o.cx, o.cy, u.pts)));
    if (this.osm.length < 50) { this.osm = null; this.osmLots = []; this.landmarks = this.allLandmarks; return false; }   // bad download: fall back to the drawn city
    // a few blocks OpenStreetMap hasn't mapped yet, drawn by hand (fractions run west→east and north→south across the block)
    const FILL = [
      { av: ['Travis', 'Main'], cr: ['Clay', 'Bell'], parts: [
        { f: [0.5, 0.06, 0.94, 0.5], h: 2.4, c: '#d9ccb2', name: 'First Methodist Houston', type: 'church' },
        { f: [0.72, 0.06, 0.94, 0.24], h: 5.2, c: '#d2c4a8', type: 'church' },
        { f: [0.5, 0.56, 0.94, 0.94], h: 1.8, c: '#cbbd9f', type: 'yes' },
        { f: [0.06, 0.06, 0.44, 0.94], h: 2.2, c: '#b9bcc2', type: 'parking' }] },
    ];
    const ai = (n) => A.findIndex((a) => a.n === n), ci = (n) => C.findIndex((c) => c.n === n);
    for (const F of FILL) {
      const i0 = ai(F.av[0]), i1 = ai(F.av[1]), j0 = ci(F.cr[0]), j1 = ci(F.cr[1]); if (i0 < 0 || i1 < 0 || j0 < 0 || j1 < 0) continue;
      const x0 = Math.min(A[i0].x, A[i1].x) + sw + side, x1 = Math.max(A[i0].x, A[i1].x) - sw - side, y0 = Math.min(C[j0].y, C[j1].y) + sw + side, y1 = Math.max(C[j0].y, C[j1].y) - sw - side;
      if (this.osm.some((o) => o.cx > x0 && o.cx < x1 && o.cy > y0 && o.cy < y1 && o.h > 0.9)) continue;   // mapped since — use the real thing
      for (const p of F.parts) {
        const [a, b, c, d] = p.f, px0 = x0 + (x1 - x0) * a, px1 = x0 + (x1 - x0) * c, py0 = y0 + (y1 - y0) * b, py1 = y0 + (y1 - y0) * d;
        this.osm.push({ pts: [[px0, py0], [px1, py0], [px1, py1], [px0, py1]], bb: { x0: px0, x1: px1, y0: py0, y1: py1 }, h: p.h, z0: 0, c: p.c, glass: false, name: p.name || null, type: p.type, cx: (px0 + px1) / 2, cy: (py0 + py1) / 2 });
      }
    }
    this.osmNamed = this.osm.filter((o) => o.name && o.h >= 6).sort((a, b) => b.h - a.h);
    return true;
  }
  osmDepth(o) { let m = -Infinity; for (const p of o.pts) { const d = this.v.depth(p[0], p[1]); if (d > m) m = d; } return m; }
  drawOsm(o, N, alpha) {
    const ctx = this.ctx, v = this.v, P = o.pts, n = P.length, z0 = o.z0, z1 = o.z0 + o.h;
    ctx.globalAlpha = alpha;
    const col = N ? darken(o.c, 0.5) : o.c, walls = [];
    if (!(v.s < 0.3 && o.h < 1.5)) for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.05) continue;
      const nx = dy / L, ny = -dx / L, [f, r] = v.vis(nx, ny); if (f <= 0.001) continue;
      walls.push({ a, b, L, nx, ny, sun: Math.max(0, -r / Math.SQRT2), shade: 0.125 + 0.105 * r / Math.SQRT2, d: v.depth((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) });
    }
    walls.sort((p, q) => p.d - q.d);
    const fancy = v.s >= 0.3 && o.h > 1.2, warm = this._warm || 0;
    for (const w of walls) {
      const quad = [v.p(w.a[0], w.a[1], z1), v.p(w.b[0], w.b[1], z1), v.p(w.b[0], w.b[1], z0), v.p(w.a[0], w.a[1], z0)];
      let base = darken(col, w.shade);
      if (!N && warm > 0 && w.sun > 0) base = mixC(base, '#ffb36b', warm * 0.32 * w.sun);   // sun-facing walls catch the warm light
      if (fancy) {   // lighter toward the top, darker at the street, glass picks up the sky
        const mx = (quad[0][0] + quad[1][0]) / 2, g = ctx.createLinearGradient(mx, (quad[0][1] + quad[1][1]) / 2, mx, (quad[2][1] + quad[3][1]) / 2);
        if (o.glass && !N) { const sky = warm > 0.3 ? mixC('#c9d9ef', '#ffc58f', Math.min(1, (warm - 0.3) * 1.6)) : '#d4e3f5'; g.addColorStop(0, mixC(base, sky, 0.42)); g.addColorStop(0.45, mixC(base, sky, 0.12)); g.addColorStop(0.55, base); g.addColorStop(1, darken(base, 0.16)); }
        else if (o.glass) { g.addColorStop(0, lighten(base, 0.12)); g.addColorStop(1, darken(base, 0.2)); }
        else { g.addColorStop(0, lighten(base, N ? 0.04 : 0.09)); g.addColorStop(0.8, base); g.addColorStop(1, darken(base, 0.14)); }
        poly(ctx, quad, g);
      } else poly(ctx, quad, base);
      if (fancy && o.glass && o.h > 2 && v.s > 0.45) {   // spandrel bands between floors
        ctx.strokeStyle = N ? 'rgba(0,0,0,.18)' : 'rgba(20,40,70,.12)'; ctx.lineWidth = 1; ctx.beginPath();
        const step = o.h > 15 ? 0.84 : 0.42; for (let z = z0 + step; z < z1 - 0.1; z += step) { ctx.moveTo(...v.p(w.a[0], w.a[1], z)); ctx.lineTo(...v.p(w.b[0], w.b[1], z)); } ctx.stroke();
      }
      if (v.s < 0.32 || w.L < 0.4) continue;
      if (o.grid) {   // punched windows in a grid (Four Seasons)
        ctx.strokeStyle = N ? 'rgba(255,214,140,.55)' : o.grid; ctx.lineWidth = Math.max(1, v.s * 1.6); ctx.globalAlpha = alpha * 0.55; ctx.beginPath();
        const nv = Math.max(2, Math.round(w.L / 0.32)); for (let i = 1; i < nv; i++) { const q = lerp2(w.a, w.b, i / nv); ctx.moveTo(...v.p(q[0], q[1], z0 + 0.5)); ctx.lineTo(...v.p(q[0], q[1], z1 - 0.15)); }
        ctx.stroke(); ctx.globalAlpha = alpha;
      } else if (o.glass) {
        ctx.strokeStyle = N ? 'rgba(255,214,140,.35)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath();
        const nv = Math.max(2, Math.round(w.L / 0.5)); for (let i = 1; i < nv; i++) { const q = lerp2(w.a, w.b, i / nv); ctx.moveTo(...v.p(q[0], q[1], z0 + 0.3)); ctx.lineTo(...v.p(q[0], q[1], z1 - 0.1)); }
        ctx.stroke();
      } else if (o.h > 1 && v.s > 0.45) {
        const pa = v.p(w.a[0], w.a[1], z0), pb = v.p(w.b[0], w.b[1], z0), sl = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
        if (/parking|garage/.test(o.type || '')) {   // open garage decks: dark slots between the slabs
          ctx.strokeStyle = N ? 'rgba(0,0,0,.45)' : 'rgba(40,44,52,.38)'; ctx.lineWidth = Math.max(1, 0.2 * ZU * v.s); ctx.beginPath();
          for (let z = z0 + 0.2; z < z1 - 0.1; z += 0.34) { ctx.moveTo(...v.p(w.a[0], w.a[1], z)); ctx.lineTo(...v.p(w.b[0], w.b[1], z)); } ctx.stroke();
        } else if (sl > 12) {   // punched windows: one dashed band per floor
          const cols = Math.max(2, Math.round(w.L / 0.3)), seg = sl / cols; ctx.setLineDash([seg * 0.55, seg * 0.45]); ctx.lineDashOffset = -seg * 0.22;
          ctx.strokeStyle = N ? 'rgba(20,24,40,.55)' : mixC(darken(col, 0.45), '#33465e', 0.55) + 'b0'; ctx.lineWidth = Math.max(1, 0.15 * ZU * v.s); ctx.beginPath();
          for (let z = z0 + 0.42; z < z1 - 0.12; z += 0.36) { ctx.moveTo(...v.p(w.a[0], w.a[1], z)); ctx.lineTo(...v.p(w.b[0], w.b[1], z)); } ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
      }
      if (z0 < 0.05 && o.h > 0.8 && v.s > 0.45 && !/parking|garage|church|lot/.test(o.type || '')) {   // ground-floor storefronts
        const sz = 0.42, q = [v.p(w.a[0], w.a[1], 0.03), v.p(w.b[0], w.b[1], 0.03), v.p(w.b[0], w.b[1], sz), v.p(w.a[0], w.a[1], sz)];
        poly(ctx, q, N ? 'rgba(255,205,130,.6)' : '#4a6072');
        ctx.strokeStyle = N ? 'rgba(120,80,30,.5)' : 'rgba(225,235,242,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...q[3]); ctx.lineTo(...q[2]);   // lintel and mullions
        if (v.s > 0.8) { const nm = Math.max(1, Math.round(w.L / 0.28)); for (let i = 1; i < nm; i++) { const p = lerp2(w.a, w.b, i / nm); ctx.moveTo(...v.p(p[0], p[1], 0.03)); ctx.lineTo(...v.p(p[0], p[1], sz)); } } ctx.stroke();
        for (const sh of o.shops || []) {   // a coloured awning over each restaurant's door
          const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1], t = ((sh.pt[0] - w.a[0]) * dx + (sh.pt[1] - w.a[1]) * dy) / (w.L * w.L); if (t < -0.05 || t > 1.05) continue;
          const px = w.a[0] + dx * t, py = w.a[1] + dy * t; if (Math.hypot(px - sh.pt[0], py - sh.pt[1]) > 1.1) continue;
          const hw = Math.min(0.4, w.L / 2) / w.L, t0 = Math.max(0, Math.min(1, t) - hw), t1 = Math.min(1, Math.max(0, t) + hw), A0 = lerp2(w.a, w.b, t0), A1 = lerp2(w.a, w.b, t1), o2 = 0.13, ac = N ? darken(sh.c, 0.3) : sh.c;
          const F0 = [A0[0] + w.nx * o2, A0[1] + w.ny * o2], F1 = [A1[0] + w.nx * o2, A1[1] + w.ny * o2];
          poly(ctx, [v.p(A0[0], A0[1], 0.56), v.p(A1[0], A1[1], 0.56), v.p(...F1, 0.46), v.p(...F0, 0.46)], lighten(ac, 0.12));   // sloped canopy
          poly(ctx, [v.p(...F0, 0.46), v.p(...F1, 0.46), v.p(...F1, 0.39), v.p(...F0, 0.39)], ac, 'rgba(0,0,0,.18)');   // front valance
        }
      }
      const lit = this._dusk || 0;
      if (lit > 0.12 && o.glass && o.h > 2 && v.s > 0.3) {   // whole lit floors on glass towers
        const step = o.h > 15 ? 0.84 : 0.42, nf = Math.floor((o.h - 0.3) / step); ctx.globalAlpha = alpha * Math.min(1, lit * 1.4);
        for (let f = 0; f < nf; f++) { const r = hash(o.cx + ':' + f + ':' + w.a[0]); if (r > 0.18 + lit * 0.32) continue; const zz = z0 + 0.15 + f * step, t = r * 0.5, t2 = Math.min(1, t + 0.25 + hash(f + 'w' + w.b[1]) * 0.5), q1 = lerp2(w.a, w.b, t), q2 = lerp2(w.a, w.b, t2);
          poly(ctx, [v.p(...q1, zz), v.p(...q2, zz), v.p(...q2, zz + step * 0.55), v.p(...q1, zz + step * 0.55)], 'rgba(255,214,140,.6)'); }
        ctx.globalAlpha = alpha;
      }
      if (lit > 0.12 && !o.glass && o.h > 1.2 && v.s > 0.3) for (let i = 0; i < Math.min(10, w.L * o.h * 0.6); i++) {
        const r = hash(w.a[0] + ',' + w.a[1] + ',' + i); if (r < 1 - 0.45 * Math.min(1, lit * 1.3)) continue; const t = 0.1 + hash(i + ':' + w.b[0]) * 0.8, t2 = Math.min(1, t + 0.18 / w.L), zz = z0 + 0.3 + r * (o.h - 0.6), q1 = lerp2(w.a, w.b, t), q2 = lerp2(w.a, w.b, t2);
        poly(ctx, [v.p(...q1, zz), v.p(...q2, zz), v.p(...q2, zz + 0.16), v.p(...q1, zz + 0.16)], 'rgba(255,212,120,.85)');
      }
    }
    if (v.s >= 0.3 && o.h > 1.2 && walls.length) {   // light catching the corners and the top edge
      ctx.strokeStyle = N ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const w of walls) { ctx.moveTo(...v.p(w.a[0], w.a[1], z0)); ctx.lineTo(...v.p(w.a[0], w.a[1], z1)); ctx.lineTo(...v.p(w.b[0], w.b[1], z1)); } ctx.stroke();
    }
    const rk = hash(o.cx * 7 + ':' + o.cy * 3), roofTone = o.roofC || (o.type === 'crown' ? lighten(col, 0.12) : o.glass ? (rk < 0.5 ? '#7d858e' : '#959ca4') : rk < 0.4 ? '#c9cbcc' : rk < 0.75 ? '#dfe0dd' : '#a9adb1');
    poly(ctx, P.map((p) => v.p(p[0], p[1], z1)), N ? darken(mixC(roofTone, col, 0.25), 0.5) : mixC(roofTone, col, o.type === 'crown' ? 0 : 0.18), 'rgba(255,255,255,.2)');
    if (!o.roof && !o.pool && o.h > 2.5 && v.s > 0.3 && o.type !== 'lot' && o.type !== 'parking') {
      const sx = o.bb.x1 - o.bb.x0, sy = o.bb.y1 - o.bb.y0, k = hash(o.cx + ':' + o.cy);
      if (sx > 1 && sy > 1) {   // parapet line, then a rooftop mechanical penthouse
        poly(ctx, P.map((p) => v.p(o.cx + (p[0] - o.cx) * 0.9, o.cy + (p[1] - o.cy) * 0.9, z1 + 0.005)), null, N ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.1)');
        if (o.type !== "crown" && ptIn(o.cx, o.cy, P)) { const w2 = Math.min(sx, sy) * (0.22 + k * 0.16), d2 = w2 * (0.7 + k * 0.6), hh = 0.18 + k * 0.3;
          prism(ctx, v, o.cx - w2 / 2 + (k - 0.5) * sx * 0.2, o.cy - d2 / 2, w2, d2, z1, [hh, hh, hh, hh], N ? darken(col, 0.2) : mixC(col, '#d9dde2', 0.5), N ? darken(col, 0.05) : mixC(lighten(col, 0.1), '#e8ebee', 0.5)); }
      }
    }
    if (o.roof) this.drawRoof(o, N);
    if (o.terrace && v.s > 0.4) this.drawTerrace(o, N);
    if (o.ant) {   // rooftop mast with a blinking red light
      const b = v.p(o.cx, o.cy, z1), t = v.p(o.cx, o.cy, z1 + o.ant); ctx.strokeStyle = N ? '#9aa1ad' : '#7d838b'; ctx.lineWidth = Math.max(1.2, v.s * 2.2); ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...t); ctx.stroke();
      ctx.lineWidth = Math.max(1, v.s * 1.2); ctx.beginPath(); for (const f of [0.3, 0.55, 0.8]) { const q = v.p(o.cx, o.cy, z1 + o.ant * f); ctx.moveTo(q[0] - 3 * v.s, q[1]); ctx.lineTo(q[0] + 3 * v.s, q[1]); } ctx.stroke();
      if (Math.floor(performance.now() / 900) % 2 === 0 || N) circle(ctx, t[0], t[1], Math.max(1.6, v.s * 2.4), '#ff3b3b');
    }
    if (o.pool && v.s > 0.3) {   // rooftop pool deck
      const cx = o.cx, cy = o.cy, s2 = Math.min(o.bb.x1 - o.bb.x0, o.bb.y1 - o.bb.y0) * 0.22;
      poly(ctx, [v.p(cx - s2, cy - s2 * 0.6, z1 + 0.01), v.p(cx + s2, cy - s2 * 0.6, z1 + 0.01), v.p(cx + s2, cy + s2 * 0.6, z1 + 0.01), v.p(cx - s2, cy + s2 * 0.6, z1 + 0.01)], N ? '#1d4f77' : '#4dabf7');
    }
    if (o.name === 'Heritage Plaza') { const w = (o.bb.x1 - o.bb.x0) * 0.3; pyramid(ctx, v, o.cx - w / 2, o.cy - w / 2, w, w, z1, 1.6, col); }
    ctx.globalAlpha = 1;
  }

  // pitched, pyramid and domed roofs where OpenStreetMap records them
  drawRoof(o, N) {
    const ctx = this.ctx, v = this.v, P = o.rp || o.pts, z1 = o.z0 + o.h, rh = o.rh, base = N ? darken(o.roofC || darken(o.c, 0.25), 0.45) : (o.roofC || darken(o.c, 0.25));
    const face = (pts, nx, ny) => { const [, r] = v.vis(nx, ny); poly(ctx, pts.map((q) => v.p(q[0], q[1], q[2])), darken(base, 0.06 + 0.1 * (1 - (r + 1.41) / 2.82))); };
    if (o.roof === 'dome' || o.roof === 'onion' || o.roof === 'round') {
      const rings = 6; for (let k = 0; k < rings; k++) { const t0 = k / rings, t1 = (k + 1) / rings, s0 = Math.cos(t0 * Math.PI / 2), s1 = Math.cos(t1 * Math.PI / 2), h0 = Math.sin(t0 * Math.PI / 2) * rh, h1 = Math.sin(t1 * Math.PI / 2) * rh;
        poly(ctx, P.map((p) => v.p(o.cx + (p[0] - o.cx) * s0, o.cy + (p[1] - o.cy) * s0, z1 + h0)), lighten(base, k * 0.05)); poly(ctx, P.map((p) => v.p(o.cx + (p[0] - o.cx) * s1, o.cy + (p[1] - o.cy) * s1, z1 + h1)), lighten(base, (k + 1) * 0.05)); }
      return;
    }
    if (o.roof === 'skillion' && o.rz) {   // one sloping plane, with the wedge of wall under its high side
      const Z = o.rz; P.map((a, i) => { const j = (i + 1) % P.length, b = P[j]; return { f: [[...a, z1], [...b, z1], [...b, z1 + Z[j]], [...a, z1 + Z[i]]], d: v.depth((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), mx: (a[0] + b[0]) / 2 - o.cx, my: (a[1] + b[1]) / 2 - o.cy, z: Z[i] + Z[j] }; })
        .filter((e) => e.z > 0.01).sort((a, b) => a.d - b.d).forEach((e) => { const [, rr] = v.vis(e.mx, e.my); poly(ctx, e.f.map((q) => v.p(q[0], q[1], q[2])), darken(N ? darken(o.c, 0.45) : o.c, 0.08 + 0.12 * (1 - (rr + 1.41) / 2.82))); });
      poly(ctx, P.map((p, i) => v.p(p[0], p[1], z1 + Z[i])), lighten(o.roofC || o.c, N ? 0 : 0.14), 'rgba(255,255,255,.25)');
      return;
    }
    if (o.roof === 'gabled' && P.length === 4) {   // ridge along the long side
      const e = [0, 1, 2, 3].map((i) => Math.hypot(P[(i + 1) % 4][0] - P[i][0], P[(i + 1) % 4][1] - P[i][1])), s = e[0] + e[2] < e[1] + e[3] ? 0 : 1;
      const m1 = lerp2(P[s], P[s + 1], 0.5), m2 = lerp2(P[s + 2], P[(s + 3) % 4], 0.5), R1 = [...m1, z1 + rh], R2 = [...m2, z1 + rh];
      const fs = [[[...P[s + 1], z1], [...P[s + 2], z1], R2, R1], [[...P[(s + 3) % 4], z1], [...P[s], z1], R1, R2], [[...P[s], z1], [...P[s + 1], z1], R1], [[...P[s + 2], z1], [...P[(s + 3) % 4], z1], R2]];
      fs.map((f) => ({ f, d: v.depth(f.reduce((a, q) => a + q[0], 0) / f.length, f.reduce((a, q) => a + q[1], 0) / f.length) })).sort((a, b) => a.d - b.d).forEach(({ f }) => { const mx = f.reduce((a, q) => a + q[0], 0) / f.length - o.cx, my = f.reduce((a, q) => a + q[1], 0) / f.length - o.cy; face(f, mx, my); });
      return;
    }
    // pyramidal / hipped / anything else: every wall slopes up to an apex
    const ap = [o.cx, o.cy, z1 + rh], fs = P.map((a, i) => { const b = P[(i + 1) % P.length]; return { f: [[...a, z1], [...b, z1], ap], d: v.depth((a[0] + b[0] + o.cx) / 3, (a[1] + b[1] + o.cy) / 3), nx: (a[1] + b[1]) / 2 - o.cy, ny: -((a[0] + b[0]) / 2 - o.cx) }; });
    fs.sort((a, b) => a.d - b.d).forEach(({ f }) => { const mx = (f[0][0] + f[1][0]) / 2 - o.cx, my = (f[0][1] + f[1][1]) / 2 - o.cy; face(f, mx, my); });
  }
  // a walkable graph of the real tunnel corridors: corridor ends within ~8 m are treated as joined
  tunnelNet() {
    if (this._tnet !== undefined) return this._tnet; const L = this.geo?.tunnels || []; if (L.length < 15) return (this._tnet = null);
    const nodes = [], adj = [], key = (p) => { for (let i = 0; i < nodes.length; i++) if (Math.abs(nodes[i][0] - p[0]) < 0.8 && Math.abs(nodes[i][1] - p[1]) < 0.8) return i; nodes.push([p[0], p[1]]); adj.push([]); return nodes.length - 1; };
    for (const t of L) for (let i = 1; i < t.pts.length; i++) { const a = key(t.pts[i - 1]), b = key(t.pts[i]); if (a === b) continue; const d = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); adj[a].push([b, d]); adj[b].push([a, d]); }
    return (this._tnet = { nodes, adj });
  }
  tunnelPath(from, to) {   // shortest path along the corridors (Dijkstra), from the corridor point nearest each end
    const N = this.tunnelNet(); if (!N) return null; const near = (p) => N.nodes.reduce((bi, q, i) => (Math.hypot(q[0] - p.x, q[1] - p.y) < Math.hypot(N.nodes[bi][0] - p.x, N.nodes[bi][1] - p.y) ? i : bi), 0);
    const a = near(from), b = near(to); if (Math.hypot(N.nodes[a][0] - from.x, N.nodes[a][1] - from.y) > 3 || Math.hypot(N.nodes[b][0] - to.x, N.nodes[b][1] - to.y) > 3) return null;
    const dist = new Float64Array(N.nodes.length).fill(Infinity), prev = new Int32Array(N.nodes.length).fill(-1), done = new Uint8Array(N.nodes.length); dist[a] = 0;
    for (;;) { let u = -1, best = Infinity; for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; } if (u < 0 || u === b) break; done[u] = 1; for (const [w, d] of N.adj[u]) if (dist[u] + d < dist[w]) { dist[w] = dist[u] + d; prev[w] = u; } }
    if (!isFinite(dist[b])) return null; const out = []; for (let i = b; i !== -1; i = prev[i]) out.unshift(N.nodes[i]); return { pts: out, len: dist[b] };
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

  // the two street-level ways into the tunnels, plus the easy lobby entrance at Enterprise Plaza
  buildDoors() {
    const X = this.avX || {}, Y = this.csY || {}, sw = this.streetW, out = [];
    const wf = (this.osm || []).find((o) => o.name === 'Wells Fargo Plaza');
    if (wf) { const L = X.Louisiana ?? wf.cx, P = [...wf.pts].sort((a, b) => Math.abs(a[0] - L) - Math.abs(b[0] - L)).slice(0, 3), px = P.reduce((s, p) => s + p[0], 0) / P.length, py = P.reduce((s, p) => s + p[1], 0) / P.length;
      out.push({ n: 'Wells Fargo Plaza', note: 'Street-level escalators straight down', x: px + Math.sign(L - px || 1) * 0.35, y: py }); }   // on the Louisiana St side, outside the tower
    if (X.Main != null && Y.McKinney != null) out.push({ n: 'McKinney Garage on Main', note: 'Street entrance at Main & McKinney', x: X.Main + sw + 0.5, y: Y.McKinney + sw + 0.5 });
    if (X.Louisiana != null && Y.Dallas != null) out.push({ n: 'Enterprise Plaza', note: 'Lobby escalators (office hours)', x: X.Louisiana - sw - 0.6, y: Y.Dallas - sw - 0.6 });
    this.doors = out;
  }
  drawDoors(N) {
    if (!this.doors || this.v.s < 0.35) return; const ctx = this.ctx, v = this.v, under = this.mode === 'tunnel';
    for (const d of this.doors) {
      const [x, y] = v.p(d.x, d.y, under ? this.tunnelZ() : 0.05), s = Math.max(0.8, Math.min(1.3, v.s)), w = 30 * s, h = 18 * s;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w * 0.45, h * 0.25, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#12b886'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h - 10 * s, w, h, 6 * s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${11 * s}px Inter,system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚇⬇', x, y - h / 2 - 10 * s);
      if (v.s > 0.7 && !this.hide.labels && (!TAKEN || pillFit(x, y - h - 22 * s, d.n))) { const t = d.n + ' · tunnel entrance'; ctx.font = `600 ${10.5 * s}px Inter,system-ui`; const tw = ctx.measureText(t).width + 12; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - h - 30 * s, tw, 15 * s, 7); ctx.fill(); ctx.fillStyle = '#0b7a5a'; ctx.fillText(t, x, y - h - 22.5 * s); }
    }
  }
  // bars up on the roof get a terrace: deck, umbrellas, and string lights after dark
  markTerraces() {
    for (const s of this.spots || []) if (s.bldg && s.places.some((p) => /rooftop|roof deck|sky ?bar|\bon 23\b|23rd floor|skylawn/i.test((p.name || '') + ' ' + (p.note || '') + ' ' + (p.type || '')))) s.bldg.terrace = true;
  }
  drawTerrace(o, N) {
    const ctx = this.ctx, v = this.v, z = o.z0 + o.h + 0.01, sx = o.bb.x1 - o.bb.x0, sy = o.bb.y1 - o.bb.y0, w = sx * 0.62, d = sy * 0.62, x0 = o.cx - w / 2, y0 = o.cy - d / 2;
    poly(ctx, [v.p(x0, y0, z), v.p(x0 + w, y0, z), v.p(x0 + w, y0 + d, z), v.p(x0, y0 + d, z)], N ? '#5a4632' : '#b88d5e', 'rgba(0,0,0,.15)');
    const cols = ['#e8590c', '#f8f9fa', '#1c7ed6', '#2b8a3e'];
    if (this._wxNow !== 'rain') for (let i = 0; i < 5; i++) { const k = hash(o.cx + 'u' + i), ux = x0 + w * (0.15 + 0.7 * k), uy = y0 + d * (0.15 + 0.7 * hash(o.cy + 'v' + i)), [px, py] = v.p(ux, uy, z), [tx, ty] = v.p(ux, uy, z + 0.28), r = Math.max(3, v.s * 7);
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(tx, ty, r, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
    if (N || (this._dusk || 0) > 0.3) { ctx.fillStyle = '#ffd27a'; const P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]]; for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4]; for (let t = 0; t <= 1; t += 0.12) { const q = lerp2(a, b, t), [px, py] = v.p(q[0], q[1], z + 0.22 - Math.sin(t * Math.PI) * 0.06); ctx.beginPath(); ctx.arc(px, py, Math.max(1, v.s * 1.6), 0, 7); ctx.fill(); } } }
  }
  // game days: crowds stream toward Toyota Center or Daikin Park from 3 hours before the start until an hour after
  setEvents(list) { this.events = list || []; this.checkEvent(); }
  checkEvent() {
    const now = Date.now(), e = (this.events || []).find((x) => { const t = Date.parse(x.start); return now > t - 3 * 3600e3 && now < t + 3600e3; }) || null;
    if ((e && e.start) === (this.eventNow && this.eventNow.start)) return; this.eventNow = e;
    for (const n of this.npcs || []) if (n.fan) { if (n.atSpot) n.atSpot.inn = Math.max(0, (n.atSpot.inn || 0) - 1); this.leaveQueue(n); if (this.followN === n) this.followN = null; }
    this.npcs = (this.npcs || []).filter((n) => !n.fan);
    const a = e && this.areas.find((x) => x.n === e.venue); if (!a) return;
    for (let i = 0; i < 70; i++) { const n = this.newNpc(5000 + i, false, { role: 'fan' }), side = i % 4, t = hash(i + 'f'); n.fan = true;
      n.x = side < 2 ? a.r.x0 + (a.r.x1 - a.r.x0) * t : side === 2 ? a.r.x0 - this.streetW * 0.6 : a.r.x1 + this.streetW * 0.6; n.y = side === 0 ? a.r.y0 - this.streetW * 0.6 : side === 1 ? a.r.y1 + this.streetW * 0.6 : a.r.y0 + (a.r.y1 - a.r.y0) * t;
      n.look.shirt = e.team === 'Astros' ? (i % 3 ? '#eb6e1f' : '#002d62') : (i % 3 ? '#ce1141' : '#c4ced4'); this.npcs.push(n); }
  }
  walkOff() { return this.streetW + 0.2; }   // pedestrians keep to the middle of the sidewalk
  // walk on sidewalks only: out to the nearest sidewalk, along it, and across streets only at the crosswalks
  routeStreet(n, t) {
    const o = this.walkOff(), LX = this.avenues.flatMap((a) => [a.x - o, a.x + o]), LY = this.cross.flatMap((c) => [c.y - o, c.y + o]);
    const near = (L, v) => L.reduce((b, a) => (Math.abs(a - v) < Math.abs(b - v) ? a : b));
    const y1 = near(LY, n.y), x1 = near(LX, n.x), y2 = near(LY, t.y);
    return [[n.x, y1], [x1, y1], [x1, y2], [t.x, y2], [t.x, t.y]].filter((q, i, arr) => !i || Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) > 0.05);
  }
  routeTunnel(n, goal) {
    const T = this.tunnelSpots, start = n.node ?? 0, end = T.indexOf(goal);
    const prev = new Map([[start, -1]]), q = [start];
    while (q.length) { const c = q.shift(); if (c === end) break; for (const m of this.tunnelAdj[c]) if (!prev.has(m)) { prev.set(m, c); q.push(m); } }
    const nodes = []; for (let c = end; c !== -1 && c !== undefined; c = prev.get(c)) nodes.unshift(c);
    const pts = []; for (let i = 1; i < nodes.length; i++) { const a = T[nodes[i - 1]], b = T[nodes[i]]; pts.push([b.x, a.y], [b.x, b.y]); }
    n.node = end; return pts;
  }
  // ---------- Sims-style people: daily routines, needs, lines, jobs, weather, chats, nightlife ----------
  clockH() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  isWeekend() { const g = new Date().getDay(); return g === 0 || g === 6; }
  wxState() { const w = this.weather; if (!w) return ''; if (w.rain > 0.1 || w.code >= 51) return 'rain'; if (w.temp >= 93) return 'hot'; if (w.temp <= 50) return 'cold'; return ''; }
  lastCall() { const h = this.clockH(); return h >= 1.75 && h < 2.25; }
  phaseName() {
    const h = this.clockH(), we = this.isWeekend();
    if (h >= 1.75 && h < 2.25) return '🔔 Last call';
    if (h >= 2.25 && h < 5.5) return '🌙 Late night';
    if (h < 1.75) return '🌃 Nightlife';
    if (we) return h < 10 ? '☕ Slow weekend morning' : h < 14.5 ? '🥞 Weekend brunch' : h < 18 ? '🛍️ Weekend afternoon' : h < 21 ? '🍽️ Dinner out' : '🌃 Nightlife';
    return h < 7 ? '🌅 Early birds' : h < 9.5 ? '🚊 Morning commute' : h < 11.3 ? '☕ Coffee runs' : h < 13.8 ? '🍔 Lunch rush' : h < 16 ? '😴 Afternoon lull' : h < 19 ? '🍹 After-work crowd' : h < 21 ? '🍽️ Dinner time' : '🌃 Nightlife';
  }
  popTarget() {
    const h = this.clockH(), day = new Date().getDay(), we = day === 0 || day === 6;
    const W = [[0, 34], [2, 12], [5, 10], [6.5, 32], [8, 72], [9.5, 44], [11.3, 58], [12.2, 125], [13.5, 72], [15, 48], [17, 96], [18.5, 86], [20, 62], [22, 56], [24, 34]];
    const E = [[0, 58], [2, 18], [5, 8], [8, 18], [10, 44], [12.5, 78], [15, 60], [18, 66], [21, 88], [23, 82], [24, 58]];
    const L = we ? E : W; let base = L[0][1];
    for (let i = 1; i < L.length; i++) if (h <= L[i][0]) { const [a, va] = L[i - 1], [b, vb] = L[i]; base = va + (vb - va) * ((h - a) / (b - a)); break; }
    let k = 1; if ((day === 5 || day === 6) && (h >= 20 || h < 2)) k *= 1.2;
    const w = this.wxState(); if (w === 'rain') k *= 0.5; else if (w === 'hot') k *= 0.72; else if (w === 'cold') k *= 0.8;
    return Math.round(Math.min(140, base * k * (this.lite ? 0.6 : 1)));
  }
  underTarget() {
    if (!this.tunnelsOpen?.() || (this.tunnelSpots || []).length < 2) return 0;
    let n = Math.min(25, this.tunnelSpots.length * 1.2); const h = this.clockH();
    if (h > 11.3 && h < 13.8) n *= 1.6; if (['rain', 'hot', 'cold'].includes(this.wxState())) n *= 1.6;   // bad weather sends everyone underground
    return Math.round(n);
  }
  needWeights() {
    const h = this.clockH();
    if (h >= 5 && h < 10.5) return { energy: 3, hunger: 1, thirst: 0.1, fun: 0.2 };
    if (h >= 10.5 && h < 14) return { hunger: 3, energy: 0.8, thirst: 0.3, fun: 0.3 };
    if (h >= 14 && h < 16) return { energy: 1.6, hunger: 1, fun: 0.6, thirst: 0.4 };
    if (h >= 16 && h < 20) return { thirst: 3, hunger: 1.7, fun: 0.8, energy: 0.3 };
    return { fun: 2.6, thirst: 2, hunger: 1, energy: 0.1 };
  }
  rollNeeds(n) { const w = this.needWeights(); for (const k in NEED) n.needs[k] = Math.min(1, Math.random() * 0.35 + (w[k] || 0) * 0.2 * (0.6 + Math.random() * 0.6)); n.need = Object.keys(n.needs).reduce((a, b) => (n.needs[a] >= n.needs[b] ? a : b)); }
  pickRole(r) {
    const h = this.clockH(), we = this.isWeekend(), wx = this.wxState(), o = [['local', 2], ['tourist', we ? 2.6 : 0.9]];
    if (!we && h > 6.5 && h < 19.5) o.push(['office', 5]);
    if (((h > 6 && h < 9.2) || (h > 17 && h < 20)) && wx !== 'rain') o.push(['jogger', 0.9]);
    if (h > 10.5 && h < 22.5) o.push(['courier', 0.7]);
    if (h >= 21 || h < 3) o.push(['night', 6]);
    let x = r * o.reduce((s, q) => s + q[1], 0); for (const [k, w] of o) { x -= w; if (x <= 0) return k; } return 'local';
  }
  dressFor(n, r) {
    const L = n.look, pick = (a, k) => a[Math.floor(hash(n.id + k) * a.length)];
    if (n.role === 'office') { L.shirt = pick(['#f8f9fa', '#dee2e6', '#a5d8ff', '#343a40', '#e7f5ff'], 's'); L.pants = pick(['#212529', '#343a40', '#1c2a3a', '#495057'], 'p'); L.tie = r > 0.35 ? pick(['#c92a2a', '#1864ab', '#5f3dc4', '#2b8a3e', '#e67700'], 't') : null; L.bag = r > 0.55; }
    if (n.role === 'tourist') { L.hat = pick(['#f4e3b5', '#ffffff', '#ffd43b', '#e03131'], 'h'); L.camera = true; L.shirt = pick(['#ffa94d', '#74c0fc', '#f783ac', '#ffe066', '#ffffff'], 's'); }
    if (n.role === 'jogger') { L.shorts = true; L.shirt = pick(['#ff6b6b', '#51cf66', '#fcc419', '#22b8cf', '#f06595'], 's'); L.pants = '#212529'; n.speed = 2.3 + r * 0.4; }
    if (n.role === 'courier') { L.bike = true; L.box = pick(['#2f9e44', '#e8590c', '#f03e3e', '#1971c2'], 'b'); L.shirt = L.box; n.speed = 3 + r * 0.5; }
    if (n.role === 'night') { L.shirt = pick(['#e64980', '#7048e8', '#15aabf', '#212529', '#f8f9fa', '#fab005'], 's'); L.pants = pick(['#212529', '#343a40', '#364fc7'], 'p'); }
  }
  getHomes() {
    if (this._homes) return this._homes; const H = [], A = this.avenues, C = this.cross;
    if (!A?.length || !C?.length) return (this._homes = []);
    const ok = ([x, y]) => x > A[1].x - 1 && x < A[A.length - 2].x + 1 && y > C[1].y - 1 && y < C[C.length - 2].y + 1;
    for (const s of this.rail?.stations || []) { const p = this.snapWalk(s.x, s.y); if (ok(p)) H.push({ p, kind: 'station', n: s.n + ' station' }); }
    for (const o of [...(this.osm || [])].filter((o) => o.h > 9).sort((a, b) => b.h - a.h).slice(0, 34)) { const p = this.snapWalk(o.cx, o.cy); if (ok(p)) H.push({ p, kind: 'tower', n: o.name || 'an office tower' }); }
    if (H.length < 6) for (let i = 2; i < A.length - 2; i += 2) for (let j = 2; j < C.length - 2; j += 2) H.push({ p: [A[i].x + this.walkOff(), C[j].y + this.walkOff()], kind: 'street', n: 'home' });
    return (this._homes = H);
  }
  snapWalk(x, y) {
    const o = this.walkOff(), A = this.avenues, C = this.cross;
    const a = A.reduce((p, q) => (Math.abs(q.x - x) < Math.abs(p.x - x) ? q : p)), c = C.reduce((p, q) => (Math.abs(q.y - y) < Math.abs(p.y - y) ? q : p));
    const ax = a.x + (x >= a.x ? o : -o), cy = c.y + (y >= c.y ? o : -o);
    return Math.abs(ax - x) < Math.abs(cy - y) ? [ax, y] : [x, cy];
  }
  spotKind(s) { if (!s._kinds) { s._kinds = new Set(s.places.map(placeKind)); s._pop = 0.55 + hash(s.label + 'pop') * 2.4 + (s.places.some((p) => (p.vibes || []).includes('group')) ? 0.6 : 0); } return s._kinds; }
  qCap(s) { return 2 + Math.min(6, s.places.length * 2); }
  spawnNpcs() {
    this.npcs = []; this._seed = 10000; this.rides = [];
    const want = this.popTarget(), H = this.getHomes();
    for (let i = 0; i < want; i++) this.npcs.push(this.newNpc(i, false));
    for (let i = 0; i < this.underTarget(); i++) this.npcs.push(this.newNpc(i + 1000, true));
    for (const n of this.npcs) if (Math.random() < 0.3 && n.role !== 'jogger' && n.role !== 'courier') {   // the city doesn't start empty: some people are already inside somewhere
      const t = this.chooseTarget(n); if (!t || (t.inn || 0) >= this.qCap(t)) continue; this.enterSpot(n, t); n.inside *= Math.random(); n.x = t.x; n.y = t.y; if (n.under) n.node = this.tunnelSpots.indexOf(t);
    }
    void H;
  }
  newNpc(seed, under, opt = {}) {
    const r = (k) => hash(seed + ':' + k);
    const look = { skin: SKIN[Math.floor(r(1) * SKIN.length)], hair: HAIR[Math.floor(r(2) * HAIR.length)], shirt: SHIRT[Math.floor(r(3) * SHIRT.length)], pants: PANTS[Math.floor(r(4) * PANTS.length)], long: r(5) > 0.55 };
    const n = { id: seed, under, look, phase: r(6) * 6, speed: 0.8 + r(7) * 0.5, wait: opt.fresh ? 0 : r(8) * 5, path: [], target: null, inside: 0, thought: null, thoughtT: 0, name: NAMES[Math.floor(r(13) * NAMES.length)], needs: {}, mood: 0.7, chatCD: 4 + r(14) * 14, legs: 0 };
    n.role = opt.role || (under ? (this.isWeekend() ? 'local' : r(15) < 0.7 ? 'office' : 'local') : this.pickRole(r(15)));
    this.dressFor(n, r(16)); this.rollNeeds(n);
    if (opt.at) { n.x = opt.at[0]; n.y = opt.at[1]; }
    else if (under) { const k = Math.floor(r(9) * this.tunnelSpots.length); const s = this.tunnelSpots[k]; n.x = s.x; n.y = s.y; n.node = k; }
    else { const a = this.avenues[2 + Math.floor(r(9) * (this.avenues.length - 6))], c = this.cross[2 + Math.floor(r(10) * (this.cross.length - 6))], o = this.walkOff(); n.x = a.x + (r(11) > 0.5 ? o : -o); n.y = c.y + (r(12) > 0.5 ? o : -o); }
    return n;
  }
  chooseTarget(n) {
    const pool = this.spots.filter((s) => s.tunnel === n.under); if (!pool.length) return null;
    const want = NEED[n.need]?.kinds || ['food'], h = this.clockH();
    const w = pool.map((s) => {
      const kinds = this.spotKind(s); let k = (1 + s.places.length * 0.2) * s._pop;
      k *= want.some((x) => kinds.has(x)) ? 4 : 0.25;
      if (n.role === 'night' && kinds.has('bar')) k *= 3;
      if (this.highlight) k *= s.places.some((p) => this.highlight.has(p.id)) ? 6 : 0.3;
      if (!s.places.some((p) => this.openC(p))) k *= 0.05;
      if (this.opts.hhNow && h >= 15 && h < 20 && s.places.some((p) => this.hhC(p))) k *= 2.2;   // happy hour pulls the after-work crowd
      if (this.pick != null && s.places.some((p) => p.id === this.pick)) k *= 10;
      if (!n.under) k /= 1 + (Math.hypot(s.x - n.x, s.y - n.y) / 16) ** 2;   // people prefer somewhere close by
      return k;
    });
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }
  randomWalkPoint() { const A = this.avenues, C = this.cross, o = this.walkOff(), a = A[1 + Math.floor(Math.random() * (A.length - 2))], c = C[1 + Math.floor(Math.random() * (C.length - 2))]; return Math.random() < 0.5 ? { x: a.x + (Math.random() < 0.5 ? o : -o), y: c.y + (Math.random() - 0.5) * 3 } : { x: a.x + (Math.random() - 0.5) * 3, y: c.y + (Math.random() < 0.5 ? o : -o) }; }
  sendHome(n) {
    if (n.leaving) return; const H = this.getHomes(), h = this.clockH();
    if (n.atSpot) { n.atSpot.inn = Math.max(0, (n.atSpot.inn || 0) - 1); n.atSpot = null; } this.leaveQueue(n);
    if (n.reserved && n.target) { n.target.inn = Math.max(0, (n.target.inn || 0) - 1); n.reserved = false; }
    n.target = null; n.inside = 0; n.chat = null;
    if (n.under) { n.gone = true; return; }
    if ((h >= 21 || h < 3.5) && Math.random() < 0.65) { n.leaving = 'ride'; n.path = []; this.callRide(n); return; }
    if (!H.length) { n.gone = true; return; }
    const near = [...H].sort((a, b) => Math.hypot(a.p[0] - n.x, a.p[1] - n.y) - Math.hypot(b.p[0] - n.x, b.p[1] - n.y)).slice(0, 6), home = near[Math.floor(Math.random() * near.length)];
    n.leaving = 'home'; n.home = home; n.path = this.routeStreet(n, { x: home.p[0], y: home.p[1] }); n.thought = home.kind === 'station' ? '🚊' : '🏠'; n.thoughtT = 3;
  }
  callRide(n) {
    const sw = this.streetW, a = this.avenues.reduce((p, q) => (Math.abs(q.x - n.x) < Math.abs(p.x - n.x) ? q : p)), c = this.cross.reduce((p, q) => (Math.abs(q.y - n.y) < Math.abs(p.y - n.y) ? q : p));
    const onAv = Math.abs(a.x - n.x) < Math.abs(c.y - n.y), sd = onAv ? Math.sign(n.x - a.x) || 1 : Math.sign(n.y - c.y) || 1;
    const r = onAv ? { x: a.x + sd * sw * 0.45, y: n.y, dx: 0, dy: sd } : { x: n.x, y: c.y + sd * sw * 0.45, dx: -sd, dy: 0 };
    (this.rides = this.rides || []).push({ ...r, t: 0, n, state: 'come', col: ['#212529', '#f8f9fa', '#495057', '#1c2a3a'][Math.floor(Math.random() * 4)] });
    n.thought = '🚕'; n.thoughtT = 6; n.wait = 99;
  }
  stepRides(dt) {
    for (const r of this.rides || []) {
      r.t += dt;
      if (r.state === 'come' && r.t > 1.6) { r.state = 'wait'; r.t = 0; }
      else if (r.state === 'wait' && r.t > 1.2) { r.state = 'go'; r.t = 0; if (r.n) r.n.gone = true; }
    }
    this.rides = (this.rides || []).filter((r) => !(r.state === 'go' && r.t > 2.2));
  }
  ridePos(r) { const k = r.state === 'come' ? -5 * Math.pow(1 - r.t / 1.6, 2) : r.state === 'go' ? 5 * Math.pow(r.t / 2.2, 1.5) : 0; return [r.x + r.dx * k, r.y + r.dy * k]; }
  drawRide(r, N) {
    const [x, y] = this.ridePos(r), along = r.dy !== 0, w = along ? 0.46 : 0.95, d = along ? 0.95 : 0.46;
    box(this.ctx, this.v, x - w / 2, y - d / 2, w, d, 0.26, N ? darken(r.col, 0.3) : r.col, 0.05);
    box(this.ctx, this.v, x - w * 0.36, y - d * 0.3, w * 0.72, d * 0.6, 0.16, N ? '#8fb8de' : '#4dabf7', 0.31);
    const [lx, ly] = this.v.p(x, y, 0.52), g = 0.6 + 0.4 * Math.sin(performance.now() / 180);
    this.ctx.shadowColor = '#f783ac'; this.ctx.shadowBlur = 10 * g; circle(this.ctx, lx, ly, Math.max(2, this.v.s * 3.2), '#f06595'); this.ctx.shadowBlur = 0;
  }
  leaveQueue(n) { if (!n.queue) return; const q = n.queue.q || []; const i = q.indexOf(n); if (i >= 0) q.splice(i, 1); if (!q.length) n.queue.qBase = null; n.queue = null; }
  joinQueue(n, s) {
    s.q = s.q || []; n.queue = s; n.path = []; s.q.push(n);
    if (!s.qBase) { const d = n.lastDir || [1, 0]; s.qBase = [n.x, n.y]; s.qDir = [-d[0], -d[1]]; }
    n.thought = '⏳'; n.thoughtT = 2;
  }
  enterSpot(n, s) {
    n.atSpot = s; s.inn = (s.inn || 0) + 1; n.target = null; n.admitted = false;
    const kinds = this.spotKind(s); n.inside = kinds.has('bar') ? 25 + Math.random() * 25 : kinds.has('coffee') ? 6 + Math.random() * 6 : 14 + Math.random() * 16;
  }
  finishVisit(n) {
    const s = n.atSpot; if (s) s.inn = Math.max(0, (s.inn || 0) - 1); n.atSpot = null;
    n.needs[n.need] = 0; n.mood = Math.min(1, n.mood + 0.35);
    const street = this.npcs.filter((m) => !m.under && !m.fan && !m.leaving).length;
    if (n.fan || Math.random() < 0.3 || (!n.under && street > this.popTarget() + 2)) { if (!n.fan) return this.sendHome(n); }
    this.rollNeeds(n); n.wait = 0.5 + Math.random() * 2;
  }
  managePop(dt) {
    this._popT = (this._popT || 0) - dt; if (this._popT > 0) return; this._popT = 0.8;
    const street = this.npcs.filter((n) => !n.under && !n.fan && !n.leaving), under = this.npcs.filter((n) => n.under && !n.gone);
    const want = this.popTarget(), wantU = this.underTarget();
    if (street.length < want) { const H = this.getHomes(); for (let i = 0; i < Math.min(4, want - street.length) && H.length; i++) { const h = H[Math.floor(Math.random() * H.length)], n = this.newNpc(++this._seed, false, { at: h.p, fresh: true }); n.from = h; n.wait = Math.random() * 0.6; n.thought = h.kind === 'station' ? '🚊' : '👋'; n.thoughtT = 2; this.npcs.push(n); } }
    else if (street.length > want + 4) { const c = street.filter((n) => n.inside <= 0 && !n.queue && !n.chat); for (let i = 0; i < Math.min(3, street.length - want - 4, c.length); i++) this.sendHome(c[Math.floor(Math.random() * c.length)]); }
    if (under.length < wantU) for (let i = 0; i < Math.min(3, wantU - under.length); i++) { const n = this.newNpc(++this._seed, true); n.wait = 0; this.npcs.push(n); }
    else if (under.length > wantU) under.filter((n) => n.inside <= 0).slice(0, under.length - wantU).forEach((n) => { if (n.atSpot) n.atSpot.inn = Math.max(0, n.atSpot.inn - 1); n.gone = true; });
    const ws = this.wxState(); if (ws !== this._wxWas) { this._wxWas = ws; for (const n of this.npcs) if (!n.under && ws === 'rain' && Math.random() < 0.5 && n.inside <= 0 && !n.leaving) { n.thought = '☔'; n.thoughtT = 3; } }
    for (const n of this.npcs) if (n.gone) { this.leaveQueue(n); if (this.followN === n) { this.followN = null; this.opts.onNpcGone?.(n); } }
    this.npcs = this.npcs.filter((n) => !n.gone);
    this._statT = (this._statT || 0) - 0.8; if (this._statT <= 0) { this._statT = 2; this.computeStats(); }
  }
  trySocial(dt) {
    this._socT = (this._socT || 0) - dt; if (this._socT > 0) return; this._socT = 0.4;
    const free = this.npcs.filter((n) => !n.under && n.inside <= 0 && !n.queue && !n.chat && !n.leaving && n.role !== 'courier' && n.role !== 'jogger' && n.chatCD <= 0 && n.path.length && !n.atLight);
    const E = ['😄', '👋', '😂', '🙌', '👀', '🤝', '🥳', '☕?', '🍕?'];
    for (let i = 0; i < 3 && free.length > 1; i++) {
      const a = free[Math.floor(Math.random() * free.length)], b = free.find((m) => m !== a && !m.chat && Math.abs(m.x - a.x) < 0.7 && Math.abs(m.y - a.y) < 0.7); if (!b || a.chat) continue;
      const T = 3 + Math.random() * 3; a.chat = { w: b, t: T, e: E[Math.floor(Math.random() * E.length)] }; b.chat = { w: a, t: T, e: E[Math.floor(Math.random() * E.length)] };
      a.chatCD = b.chatCD = 30 + Math.random() * 40;
      if (Math.random() < 0.45 && a.target && !a.target.tunnel) b.joinWith = a;   // "let's go together"
    }
  }
  stepNpcs(dt) {
    this.managePop(dt); this.trySocial(dt); this.stepRides(dt);
    const hot = this.wxState() === 'hot', last = this.lastCall();
    for (const s of this.spots || []) {   // lines: let the next person in when there's room, and shuffle everyone up
      if (!s.q?.length) continue;
      while (s.q.length && (s.inn || 0) < this.qCap(s)) { const m = s.q.shift(); m.queue = null; m.admitted = true; m.target = s; m.path = [[s.x, s.y]]; s.inn = (s.inn || 0) + 1; m.reserved = true; }
      if (!s.q.length) { s.qBase = null; continue; }
      s.q.forEach((m, k) => { const tx = s.qBase[0] + s.qDir[0] * 0.55 * k, ty = s.qBase[1] + s.qDir[1] * 0.55 * k, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), sp = m.speed * dt * 1.4; if (d > 0.02) { m.x += d <= sp ? dx : dx / d * sp; m.y += d <= sp ? dy : dy / d * sp; m.phase += dt * 6; m.qMoving = true; } else m.qMoving = false; m.mood = Math.max(0.1, m.mood - dt * 0.012); });
    }
    for (const n of this.npcs) {
      n.thoughtT -= dt; n.chatCD -= dt;
      if (n.gone) continue;
      if (n.inside > 0) { n.inside -= dt; if (last && n.atSpot && this.spotKind(n.atSpot).has('bar') && Math.random() < dt * 0.6) n.inside = 0; if (n.inside <= 0) this.finishVisit(n); continue; }
      if (n.queue) continue;
      if (n.chat) { n.chat.t -= dt; if (n.chat.t <= 0) { const j = n.joinWith; n.chat = null; n.joinWith = null; if (j && j.target && !j.gone && !n.leaving) { if (n.reserved && n.target) { n.target.inn = Math.max(0, n.target.inn - 1); n.reserved = false; } n.target = j.target; n.need = j.need; n.path = this.routeStreet(n, j.target); n.thought = '👫'; n.thoughtT = 3; } } continue; }
      if (n.wait > 0) { n.wait -= dt; continue; }
      if (!n.path.length) {
        if (n.leaving === 'home') { n.gone = true; continue; }
        if (n.leaving) continue;
        if (n.role === 'jogger') { if (++n.legs > 4) { this.sendHome(n); continue; } const p = this.randomWalkPoint(); n.path = this.routeStreet(n, p); continue; }
        if (n.role === 'courier') {
          if (n.legs > 5) { this.sendHome(n); continue; }
          if (n.carry) { n.thought = '✅'; n.thoughtT = 2; n.carry = null; n.wait = 0.8; n.legs++; continue; }
          if (n.target) { n.carry = n.target; n.target = null; n.thought = '📦'; n.thoughtT = 2.5; n.wait = 2; const H = this.getHomes(), h = H[Math.floor(Math.random() * H.length)]; if (h) n.path = this.routeStreet(n, { x: h.p[0], y: h.p[1] }); n.dropTo = h; continue; }
          n.need = 'hunger'; const t = this.chooseTarget(n); if (!t) { n.wait = 2; continue; } n.target = t; n.path = this.routeStreet(n, this.snapPt(t)); n.legs++; continue;
        }
        if (n.role === 'tourist' && !n.target && Math.random() < 0.35) { const parks = this.areas.filter((a) => a.kind === 'park' || a.kind === 'plaza'); if (parks.length) { const a = parks[Math.floor(Math.random() * parks.length)]; if (n.sight === a) { n.sight = null; } else { n.sight = a; n.path = this.routeStreet(n, { x: (a.r.x0 + a.r.x1) / 2 + (Math.random() - 0.5) * 2, y: (a.r.y0 + a.r.y1) / 2 + (Math.random() - 0.5) * 2 }); n.thought = '📸'; n.thoughtT = 3; n.wait = 0; continue; } } }
        if (n.sight) { n.sight = null; n.wait = 4 + Math.random() * 4; n.thought = '📸'; n.thoughtT = 3; continue; }
        if (n.target) {   // arrived at the door
          if (n.reserved) { n.reserved = false; n.atSpot = n.target; n.target = null; const k = this.spotKind(n.atSpot); n.inside = k.has('bar') ? 25 + Math.random() * 25 : k.has('coffee') ? 6 + Math.random() * 6 : 14 + Math.random() * 16; continue; }
          this.enterSpot(n, n.target); continue;
        }
        const t = this.chooseTarget(n); if (!t) { n.wait = 2; continue; }
        n.target = t; n.path = (n.under ? this.routeTunnel(n, t) : this.routeStreet(n, t)).filter(Boolean);
        if (!n.path.length) { n.wait = 1 + Math.random() * 3; n.target = null; continue; }
        const pl = t.places[Math.floor(Math.random() * t.places.length)];
        n.thought = (NEED[n.need]?.e || '') + styleFor(pl).emoji; n.thoughtFor = pl; n.thoughtT = 3.5;
      }
      // about to walk in the door: join the line if the place is full
      if (!n.under && n.target && !n.admitted && !n.reserved && n.path.length === 1 && n.role !== 'courier' && (n.target.inn || 0) >= this.qCap(n.target)) { this.joinQueue(n, n.target); continue; }
      const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), sp = n.speed * dt * 2 * (hot && n.role !== 'courier' ? 0.8 : 1);
      const nx = d <= sp ? tx : n.x + dx / d * sp, ny = d <= sp ? ty : n.y + dy / d * sp;
      if (!n.under && this.mustWait(n.x, n.y, nx, ny)) { n.atLight = true; continue; }
      n.atLight = false; if (d > 1e-6) n.lastDir = [dx / d, dy / d];
      if (d <= sp) { n.x = tx; n.y = ty; n.path.shift(); } else { n.x = nx; n.y = ny; }
      n.phase += dt * 8 * Math.min(n.speed, 1.6);
      if (hot && n.role !== 'courier' && Math.random() < dt * 0.02) { n.thought = '🥵'; n.thoughtT = 2.5; }
    }
  }
  snapPt(s) { const [x, y] = this.snapWalk(s.x, s.y); return { x, y }; }
  computeStats() {
    const A = this.avenues, C = this.cross, bins = new Map(), add = (x, y, k = 1) => { const i = A.reduce((b, a, m) => (Math.abs(a.x - x) < Math.abs(A[b].x - x) ? m : b), 0), j = C.reduce((b, c, m) => (Math.abs(c.y - y) < Math.abs(C[b].y - y) ? m : b), 0), key = i + ',' + j; bins.set(key, (bins.get(key) || 0) + k); };
    let walking = 0, inside = 0, inLine = 0, hh = 0, under = 0, riding = (this.rides || []).length;
    for (const n of this.npcs) {
      if (n.under) { under++; continue; }
      if (n.inside > 0) { inside++; if (n.atSpot) { add(n.atSpot.x, n.atSpot.y); if (this.opts.hhNow && n.atSpot.places.some((p) => this.hhC(p))) hh++; } }
      else { if (n.queue) inLine++; else walking++; add(n.x, n.y); }
    }
    let best = null, bv = 0; for (const [k, c] of bins) if (c > bv) { bv = c; best = k; }
    const [bi, bj] = best ? best.split(',').map(Number) : [0, 0];
    this.stats = { total: this.npcs.length, walking, inside, inLine, hh, under, riding, busiest: best ? `${A[bi].n} & ${C[bj].n}` : null, busiestN: bv, phase: this.phaseName(), weather: this.wxState() };
    this.opts.onStats?.(this.stats);
  }
  npcInfo(n) {
    const R = ROLE[n.role] || ROLE.local, need = NEED[n.need], nm = (s) => s?.places?.[0]?.name || s?.label || 'somewhere';
    let doing;
    if (n.leaving === 'ride') doing = '🚕 Catching a ride home';
    else if (n.leaving) doing = n.home?.kind === 'station' ? `🚊 Heading to ${n.home.n}` : '🏠 Heading home';
    else if (n.chat) doing = `💬 Chatting with ${n.chat.w.name}`;
    else if (n.queue) doing = `⏳ Waiting in line at ${nm(n.queue)} (${(n.queue.q || []).indexOf(n) + 1} of ${(n.queue.q || []).length})`;
    else if (n.inside > 0) doing = `${n.atSpot && this.spotKind(n.atSpot).has('bar') ? '🍸' : '🍽️'} Inside ${nm(n.atSpot)}`;
    else if (n.role === 'jogger') doing = '🏃 Out for a run';
    else if (n.role === 'courier') doing = n.carry ? `📦 Delivering an order from ${nm(n.carry)}` : n.target ? `🛵 Picking up from ${nm(n.target)}` : '🛵 Waiting for the next order';
    else if (n.sight) doing = `📸 Sightseeing at ${n.sight.n}`;
    else if (n.target) doing = `${need?.e || '🚶'} ${need?.l || 'Walking'} — walking to ${n.thoughtFor?.name || nm(n.target)}`;
    else if (n.atLight) doing = '🚦 Waiting to cross';
    else doing = '🚶 Wandering downtown';
    const mood = n.mood > 0.75 ? '😊 Great' : n.mood > 0.5 ? '🙂 Fine' : n.mood > 0.3 ? '😐 Getting impatient' : '😤 Grumpy';
    return { name: n.name, role: R[1], emoji: R[0], doing, mood, wx: this.wxState(), under: n.under, place: n.thoughtFor || null, following: this.followN === n };
  }
  followNpc(n) { this.followN = n || null; if (n) { this.follow = false; const z = n.under ? this.tunnelZ() : 0; this.zoomTo(n.x, n.y, Math.max(this.v.s, 1.1), z); } }
  stepFollowNpc(dt) {
    const n = this.followN; if (!n || this.pointers?.size || this.anim) return;
    const [px, py] = this.v.p(n.x, n.y, n.under && this.mode !== 'street' ? this.tunnelZ() : 0), k = Math.min(1, dt * 3);
    this.v.ox += (this.W / 2 - px) * k; this.v.oy += (this.H * 0.55 - py) * k;
  }
  drawNightGlow(now) {   // neon puddles outside busy bars after dark
    if ((this._dusk || 0) < 0.45) return; const ctx = this.ctx, v = this.v;
    for (const s of this.spots || []) {
      if (s.tunnel || !(s.inn > 0 || s.q?.length) || !this.spotKind(s).has('bar')) continue;
      const [x, y] = v.p(s.x, s.y, 0.02), r = Math.max(10, v.s * 46) * (1 + Math.min(1, (s.inn + (s.q?.length || 0)) / 8) * 0.6), p = 0.7 + 0.3 * Math.sin(now / 400 + s.x);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r), c = hash(s.label + 'neon') > 0.5 ? '230,73,128' : '132,94,247';
      g.addColorStop(0, `rgba(${c},${0.42 * p})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.fill();
    }
  }

  // about to step off the curb? only cross when the cars on that street have a red light
  mustWait(x, y, nx, ny) {
    const sw = this.streetW, now = performance.now();
    let i, j, crossing;
    if (Math.abs(ny - y) > Math.abs(nx - x)) {   // walking along an avenue → crossing a cross street
      j = this.cross.findIndex((c) => Math.abs(c.y - ny) < sw && Math.abs(c.y - y) >= sw - 1e-6); if (j < 0) return false;
      i = this.avenues.reduce((b, a, k) => (Math.abs(a.x - x) < Math.abs(this.avenues[b].x - x) ? k : b), 0); crossing = 'c';
    } else {
      i = this.avenues.findIndex((a) => Math.abs(a.x - nx) < sw && Math.abs(a.x - x) >= sw - 1e-6); if (i < 0) return false;
      j = this.cross.reduce((b, c, k) => (Math.abs(c.y - y) < Math.abs(this.cross[b].y - y) ? k : b), 0); crossing = 'a';
    }
    // "walk" only while that street's cars are held at red, with a moment's clearance at each end
    const ph = ((now / 1000 + i * 1.4 + j * 0.6) % 18) / 18;
    const walk = crossing === 'c' ? ph > 0.12 && ph < 0.4 : ph > 0.62 && ph < 0.9;
    if (!walk) return true;
    // and never step out while a vehicle is in, or about to roll into, the crossing
    const r = crossing === 'a'
      ? { x0: this.avenues[i].x - sw - 0.2, x1: this.avenues[i].x + sw + 0.2, y0: y - 2, y1: y + 2 }
      : { x0: x - 2, x1: x + 2, y0: this.cross[j].y - sw - 0.2, y1: this.cross[j].y + sw + 0.2 };
    // (cars already stopped at their red light don't count unless they're actually in the crosswalk)
    const tight = crossing === 'a' ? { ...r, y0: y - 0.45, y1: y + 0.45 } : { ...r, x0: x - 0.45, x1: x + 0.45 };
    return [...(this.cars || []), ...(this.liveCars || []).map((c) => ({ ...c, moving: true }))].some((c) => { const b = this.carBox(c), R = c.moving ? r : tight; return b.x < R.x1 && b.x + b.w > R.x0 && b.y < R.y1 && b.y + b.d > R.y0; });
  }

  // ---------- view / input ----------
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(this.maxDpr || 2, window.devicePixelRatio || 1);
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
    const cv = this.cv; let drag = null, pinch = null, moved = 0, lastTap = null, tapTimer = null; const pointers = new Map();
    this.pointers = pointers;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const two = () => { const [a, b] = [...pointers.values()]; return { d: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; };
    const startDrag = (p, rot) => { drag = { p, ox: this.v.ox, oy: this.v.oy, rot, vx: 0, vy: 0, t: performance.now() }; };
    const stopMotion = () => { this.anim = null; this.rotAnim = null; this.fling = null; this.zoomAnim = null; };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      pointers.set(e.pointerId, pt(e)); stopMotion();
      if (this.follow) { this.follow = false; this.opts.onFollow?.(false); }
      if (this.followN) { this.followN = null; this.opts.onNpcFollow?.(false); }
      if (pointers.size === 1) { moved = 0; startDrag(pt(e), e.button === 2 || e.shiftKey || e.altKey); }
      else if (pointers.size === 2) { const g = two(); pinch = { ...g, s: this.v.s, r: this.v.r, ang0: g.ang, rotating: false }; drag = null; moved += 20; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) { if (e.pointerType === 'mouse') { this.hover = this.hit(...pt(e)); cv.style.cursor = this.hover ? 'pointer' : 'grab'; } return; }
      pointers.set(e.pointerId, pt(e));
      if (pinch && pointers.size >= 2) {
        const g = two();
        this.v.ox += g.m[0] - pinch.m[0]; this.v.oy += g.m[1] - pinch.m[1]; pinch.m = g.m;            // two fingers move the map
        this.zoomAt(g.m[0], g.m[1], (pinch.s * g.d) / pinch.d / this.v.s);                           // pinch to zoom
        // twisting only kicks in after a clear turn (~17°), so ordinary pinches never spin the map
        let da = g.ang - pinch.ang0; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (!pinch.rotating && Math.abs(da) > 0.3) { pinch.rotating = true; pinch.ang0 = g.ang; pinch.r = this.v.r; }
        if (pinch.rotating) { let d2 = g.ang - pinch.ang0; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); this.rotateTo(pinch.r + d2, g.m[0], g.m[1]); }
        return;
      }
      if (!drag) return;
      const p = pt(e), now = performance.now();
      if (drag.rot) { const dx = p[0] - drag.p[0]; moved += Math.abs(dx); this.rotateBy(-dx * 0.008); drag.p = p; return; }
      const nx = drag.ox + p[0] - drag.p[0], ny = drag.oy + p[1] - drag.p[1], dt = Math.max(1, now - drag.t);
      drag.vx = drag.vx * 0.6 + ((nx - this.v.ox) / dt) * 0.4; drag.vy = drag.vy * 0.6 + ((ny - this.v.oy) / dt) * 0.4; drag.t = now;   // px per ms, for a glide on release
      moved = Math.max(moved, Math.hypot(p[0] - drag.p[0], p[1] - drag.p[1]));
      this.v.ox = nx; this.v.oy = ny;
    });
    const tap = (p) => {
      const h = this.hit(...p);
      if (h?.cluster) return this.zoomTo(h.cluster.x, h.cluster.y, Math.max(0.75, this.v.s * 2.4), h.cluster.z);
      if (h?.spot) return this.opts.onSelect?.(h.spot.places, h.spot);
      if (h?.npc) return this.opts.onNpc?.(h.npc);
      if (h?.vehicle) return this.opts.onVehicle?.(h.vehicle);
      if (h?.landmark) return this.opts.onLandmark?.(h.landmark);
      if (this.mode === 'tunnel') return;
      // empty map: a second tap within 300 ms zooms in there; a single tap on a street names the corner
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(p[0] - lastTap.p[0], p[1] - lastTap.p[1]) < 40) { clearTimeout(tapTimer); lastTap = null; this.zoomBy(2, p[0], p[1]); return; }
      lastTap = { t: now, p };
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        const [wx, wy] = this.toWorld(...p), c = this.nearestCorner(wx, wy), near = Math.min(Math.abs(wx - c.x), Math.abs(wy - c.y));
        if (near < this.streetW + 1.2) { this.markCorner(c.x, c.y, c.label, false); this.opts.onCorner?.(c, this.spotsNear(c.x, c.y)); }
      }, 330);
    };
    const up = (e) => {
      const wasPinch = !!pinch, p = pt(e);
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {   // lifted one finger of a pinch: keep dragging with the other
        pinch = null; startDrag([...pointers.values()][0], false); moved = 99; return;
      }
      if (pointers.size > 1) { const g = two(); pinch = { ...g, s: this.v.s, r: this.v.r, ang0: g.ang, rotating: false }; return; }
      pinch = null;
      if (drag && !drag.rot && !wasPinch && moved < 10 && e.type === 'pointerup') tap(p);
      else if (drag && !drag.rot && moved >= 10 && performance.now() - drag.t < 80) {
        const sp = Math.hypot(drag.vx, drag.vy); if (sp > 0.15) this.fling = { vx: drag.vx * 16, vy: drag.vy * 16 };   // px per frame
      }
      drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); stopMotion(); const [x, y] = pt(e); if (e.shiftKey && !e.ctrlKey) this.rotateBy((e.deltaY || e.deltaX) * 0.004, x, y); else this.zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); }, { passive: false });
    cv.addEventListener('dblclick', (e) => e.preventDefault());
    // Safari: stop the page itself from zooming; on a Mac trackpad, use the gesture to pinch and twist
    let g0 = null;
    cv.addEventListener('gesturestart', (e) => { e.preventDefault(); g0 = pointers.size ? null : { r: this.v.r, s: this.v.s }; });
    cv.addEventListener('gesturechange', (e) => { e.preventDefault(); if (!g0) return; const [x, y] = pt(e); this.zoomAt(x, y, (g0.s * e.scale) / this.v.s); if (Math.abs(e.rotation || 0) > 15) this.rotateTo(g0.r + ((e.rotation || 0) * Math.PI) / 180, x, y); });
    cv.addEventListener('gestureend', (e) => { e.preventDefault(); g0 = null; });
  }
  // smooth zoom by a factor around a screen point (double-tap, + / − buttons)
  zoomBy(k, sx = this.W / 2, sy = this.H / 2) { this.anim = null; this.zoomAnim = { k: Math.log(k), done: 0, sx, sy }; }
  // never let the city slide off-screen: gently pull the middle of the screen back over downtown
  keepInBounds() {
    const B = this.bounds, [wx, wy] = this.toWorld(this.W / 2, this.H / 2);
    const cx = Math.min(B.x1, Math.max(B.x0, wx)), cy = Math.min(B.y1, Math.max(B.y0, wy));
    if (cx === wx && cy === wy) return;
    const a = this.v.p(wx, wy), b = this.v.p(cx, cy); this.v.ox -= (b[0] - a[0]) * 0.18; this.v.oy -= (b[1] - a[1]) * 0.18;
    if (this.fling) this.fling = null;
  }
  zoomAt(x, y, k) { const ns = Math.min(3, Math.max(0.08, this.v.s * k)); k = ns / this.v.s; this.v.ox = x - (x - this.v.ox) * k; this.v.oy = y - (y - this.v.oy) * k; this.v.s = ns; }
  zoom(k) { this.zoomBy(k); }
  setMode(m) {
    const prev = this.mode; this.mode = m; this.opts.onMode?.(m);
    if (m === 'tunnel' && prev !== 'tunnel' && this.tunnelSpots.length && this.pick == null) {
      const T = this.tunnelSpots; this.zoomTo(T.reduce((a, s) => a + s.x, 0) / T.length, T.reduce((a, s) => a + s.y, 0) / T.length, Math.max(this.v.s, 0.55), 0, true);
    }
  }
  // opening hours are parsed from text, so remember each answer for 30 s instead of re-parsing every frame
  hhC(p) { if (!this.opts.hhNow) return false; const now = Date.now(), m = (this._hh = this._hh || new Map()), c = m.get(p.id); if (c && now - c[1] < 60000) return c[0]; const v = !!this.opts.hhNow(p); m.set(p.id, [v, now]); return v; }
  openC(p) { const now = Date.now(), c = (this._open = this._open || new Map()).get(p.id); if (c && now - c[1] < 30000) return c[0]; const v = this.openFn(p); this._open.set(p.id, [v, now]); return v; }
  setHighlight(ids) { this.highlight = ids; }
  screenCenter() {   // the ground point under the middle of the screen
    const v = this.v, sx = this.W / 2, sy = this.H * 0.55, a = (sx - v.ox) / (TW / 2 * v.s), b = (sy - v.oy) / (TH / 2 * v.s), X = (a + b) / 2, Y = (b - a) / 2;
    return { x: v.cx + X * v.c + Y * v.sn, y: v.cy - X * v.sn + Y * v.c };
  }
  setPick(id) { this.pick = id; if (id != null) this.focus(id); }

  lod() { const s = this.v.s; return s < 0.5 ? 'cluster' : s < 1.0 ? 'pin' : 'label'; }
  tunnelZ() { return this.mode === 'tunnel' ? 0 : -3; }
  // Day map = food spots; Night map = bars, lounges and clubs only
  sceneOk(p) { return this.scene === 'night' ? !!p.night : p.day !== false; }
  setScene(sc) { this.scene = sc; this.themeNight = sc === 'night'; this.pinCache?.clear?.(); }
  visibleSpots(under) { return this.spots.filter((s) => s.tunnel === under && s.places.some((p) => this.sceneOk(p)) && (!this.highlight || s.places.some((p) => this.highlight.has(p.id)))); }
  clusters(under) {
    const m = new Map(), k = this.clusterSpan();
    for (const s of this.visibleSpots(under)) {
      const [i, j] = this.cellIdx(s.x, s.y), key = Math.floor(i / k) + ':' + Math.floor(j / k);
      const c = m.get(key) || { n: 0, x: 0, y: 0, open: 0 };
      c.n += s.places.length; c.x += s.x * s.places.length; c.y += s.y * s.places.length; c.open += s.places.filter((p) => this.openC(p)).length; m.set(key, c);
    }
    return [...m.values()].map((c) => ({ ...c, x: c.x / c.n, y: c.y / c.n, z: under && this.mode !== 'street' ? this.tunnelZ() : 0 }));
  }
  layers() { return this.mode === 'tunnel' ? [true] : this.mode === 'both' ? [true, false] : [false]; }
  hit(sx, sy) {
    const lod = this.lod();
    for (const n of this.npcs) {
      if (n.inside > 0 || n.gone || !this.layers().includes(n.under)) continue;
      const [x, y] = this.v.p(n.x, n.y, n.under ? this.tunnelZ() : 0), u = Math.max(0.55, this.u() * 0.8);
      if (Math.abs(sx - x) < 7 * u + 4 && sy < y + 3 && sy > y - 30 * u) return { npc: n };
    }
    const liveOn = !!this.liveData;
    if (this.mode !== 'tunnel' && this.v.s > 0.35) for (const c of [...(this.liveCars || []), ...(this.cars || []).filter((c) => !liveOn || c.kind !== 'bus'), ...(liveOn && this.liveRailSeen ? [] : (this.trains || []).map((t) => ({ ...this.trainBox(t), kind: 'train', line: t.line, sim: true })))]) {
      const b = c.sim ? c : this.carBox(c), [x, y] = this.v.p(b.x + b.w / 2, b.y + b.d / 2, 0.8);
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
    if (!best && this.mode !== 'tunnel') for (const o of this.osmNamed || []) {
      const [x, y] = this.v.p(o.cx, o.cy, o.z0 + o.h + 1.2); if (Math.abs(sx - x) < 50 && Math.abs(sy - y) < 10) return { landmark: { n: `${o.name} · ${Math.round(o.h * 10)} m tall` } };
    }
    if (!best && this.mode !== 'tunnel') for (const l of this.landmarks) {
      const [x, y] = this.v.p(l.x + l.w / 2, l.y + l.d / 2, l.h * 0.6);
      if (Math.abs(sx - x) < l.w * TW * this.v.s * 0.4 && Math.abs(sy - y) < l.h * ZU * this.v.s * 0.4) return { landmark: l };
    }
    return best;
  }
  u() { return Math.min(1.1, Math.max(0.5, this.v.s * 1.1)); }
  pinLift() { return 16 * Math.min(1.2, Math.max(0.8, this.v.s)); }
  // [top of sky, horizon] for the time of day: pale blue by day, violet-to-orange at sunset, navy at night
  skyColors(night, warm) {
    const day = ['#bcd4ee', '#e6eef6'], sunset = ['#7a6fb3', '#f6a55c'], dusk = ['#3b3f7a', '#c77a6b'], nite = ['#0c1024', '#27305a'];
    if (night >= 0.85) return nite;
    if (night > 0.2) { const t = (night - 0.2) / 0.65; return [mixC(dusk[0], nite[0], t), mixC(dusk[1], nite[1], t)]; }
    const s = Math.min(1, Math.max(0, (warm - 0.25) / 0.6)), base = night > 0 ? [mixC(sunset[0], dusk[0], night / 0.2), mixC(sunset[1], dusk[1], night / 0.2)] : sunset;
    return [mixC(day[0], base[0], s), mixC(day[1], base[1], s)];
  }
  warmAmount(d = new Date()) {   // 0..1, peaks around sunset
    if (this.themeNight === true) return 0; if (this.themeNight === false) return 0.22; const h = d.getHours() + d.getMinutes() / 60;
    return Math.max(0, 1 - Math.abs(h - 17.9) / 1.6) * 0.9 + Math.max(0, 1 - Math.abs(h - 7.3) / 1.0) * 0.5; }
  nightAmount(d = new Date()) {
    if (this.themeNight != null) return this.themeNight ? 1 : 0; const h = d.getHours() + d.getMinutes() / 60; return h < 6 ? 1 : h < 7.5 ? (7.5 - h) / 1.5 : h < 18 ? 0 : h < 19.5 ? (h - 18) / 1.5 : 1; }

  frame(t) {
    this._warm = this.warmAmount();
    if (!this._evT || t - this._evT > 60000) { this._evT = t; if (this.events) this.checkEvent(); }
    const raw = (t - (this.last || t)) / 1000, dt = Math.min(0.05, raw); this.last = t;
    // if this device can't keep up, draw at a slightly lower resolution so panning stays smooth
    if (raw > 0 && raw < 0.5 && !document.hidden) {
      this.ema = (this.ema ?? 0.016) * 0.95 + raw * 0.05; this.slowFor = this.ema > 0.034 ? (this.slowFor || 0) + raw : 0;
      if (this.slowFor > 1.5 && (this.maxDpr || 2) > 1) { this.maxDpr = Math.max(1, (this.maxDpr || 2) - 0.5); this.slowFor = 0; this.resize(); }
    }
    if (this.zoomAnim) { const z = this.zoomAnim, step = Math.min(z.k - z.done, z.k * dt * 5) || 0; if (Math.abs(z.k - z.done) < 1e-3 || !step) this.zoomAnim = null; else { this.zoomAt(z.sx, z.sy, Math.exp(step)); z.done += step; } }
    if (this.fling) { const f = this.fling, k = Math.min(3, dt * 60); this.v.ox += f.vx * k; this.v.oy += f.vy * k; f.vx *= Math.pow(0.92, k); f.vy *= Math.pow(0.92, k); if (Math.hypot(f.vx, f.vy) < 0.3) this.fling = null; }
    if (!this.pointers?.size && !this.anim) this.keepInBounds();
    if (this.rotAnim) { const a = this.rotAnim; a.t = Math.min(1, a.t + dt * 2.2); const e = 1 - Math.pow(1 - a.t, 3); this.rotateTo(a.from + a.d * e); if (a.t >= 1) this.rotAnim = null; }
    this.stepTraffic(dt); this.computeLive();
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
    this.stepNpcs(dt); this.stepTrains(dt); this.stepFollowNpc(dt);
    if (!this.paused) this.draw(t);
  }

  draw(now) {
    const ctx = this.ctx, v = this.v, B = this.bounds, night = this.nightAmount(), mode = this.mode, lod = this.lod(), N = night > 0.5;
    ctx.fillStyle = mode === 'tunnel' ? '#121624' : N ? '#1d2338' : '#e9eef3'; ctx.fillRect(0, 0, this.W, this.H);
    this._dusk = night; this._wxNow = this.wxState(); const sky = mode === 'tunnel' ? null : this.skyColors(night, this._warm || 0);
    if (sky) { const g = ctx.createLinearGradient(0, 0, 0, this.H); g.addColorStop(0, sky[0]); g.addColorStop(0.45, sky[1]); g.addColorStop(1, N ? '#1d2338' : '#e9eef3'); ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H); }
    if (mode === 'tunnel') { this.drawGhostGrid(); this.drawTunnels(now); TAKEN = (this.reserved || []).map((r) => [...r]); this.drawMarkers(true); TAKEN = null; this.drawPickBeacon(now); return; }

    const walk = N ? '#3a4152' : '#e9e7e2', road = N ? '#20242f' : '#959ba3', inner = N ? '#343a4a' : '#dedbd4';
    for (const f of sides(v, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0)) poly(ctx, [v.p(...f.a), v.p(...f.b), v.p(...f.b, -0.8), v.p(...f.a, -0.8)], darken(N ? '#20253a' : '#d0d5db', f.shade));
    poly(ctx, [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x1, B.y1), v.p(B.x0, B.y1)], N ? '#2c3244' : '#dde2e7');
    this.drawBayouAndFreeways(N, now);
    const A = this.avenues, C = this.cross, sw = this.streetW;
    const ax0 = A[0].x - sw, ax1 = A[A.length - 1].x + sw, cy0 = C[0].y - sw, cy1 = C[C.length - 1].y + sw;
    poly(ctx, [v.p(ax0, cy0), v.p(ax1, cy0), v.p(ax1, cy1), v.p(ax0, cy1)], road);
    for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
      const x0 = A[i].x + sw, x1 = A[i + 1].x - sw, y0 = C[j].y + sw, y1 = C[j + 1].y - sw;
      poly(ctx, [v.p(x0, y0), v.p(x1, y0), v.p(x1, y1), v.p(x0, y1)], walk, N ? null : 'rgba(60,64,72,.22)');   // sidewalk, curb edge
      const ins = 0.28; if (x1 - x0 > 1 && y1 - y0 > 1) poly(ctx, [v.p(x0 + ins, y0 + ins), v.p(x1 - ins, y0 + ins), v.p(x1 - ins, y1 - ins), v.p(x0 + ins, y1 - ins)], inner);
    }
    if (v.s > 0.45) {
      ctx.strokeStyle = N ? 'rgba(255,214,120,.3)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
      for (const a of A) { ctx.beginPath(); ctx.moveTo(...v.p(a.x, cy0)); ctx.lineTo(...v.p(a.x, cy1)); ctx.stroke(); }
      for (const c of C) { ctx.beginPath(); ctx.moveTo(...v.p(ax0, c.y)); ctx.lineTo(...v.p(ax1, c.y)); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    this.drawCrosswalks(N);
    this.drawStreetlights(N);
    this.drawRail(N);
    this.drawBusStops(N);
    for (const a of this.areas) this.drawArea(a, N, 'flat');
    for (const f of this.fill) if (f.lot) this.drawLot(f, N);
    for (const l of this.osmLots || []) poly(ctx, l.pts.map((p) => v.p(p[0], p[1], 0.01)), N ? '#2a2f3b' : '#c9ced4');
    this.drawShadows();
    if (!this.hide.people) this.drawNightGlow(now);
    this.drawSignals(now);
    if (mode === 'both') for (const s of this.tunnelSpots) { const [x, y] = v.p(s.x, s.y); ellipse(ctx, x, y, 4, 2, 'rgba(32,201,151,.6)'); }

    const items = [];
    for (const f of this.fill) if (!f.lot) items.push({ k: v.boxDepth(f.x, f.y, f.w, f.d), f });
    for (const l of this.landmarks) items.push({ k: v.boxDepth(l.x, l.y, l.w, l.d), l });
    for (const o of this.osm || []) { const [sx, sy] = v.p(o.cx, o.cy), r = ((o.bb.x1 - o.bb.x0) + (o.bb.y1 - o.bb.y0)) * TW * 0.5 * v.s + 20, up = (o.z0 + o.h) * ZU * v.s; if (sx < -r || sx > this.W + r || sy + r < 0 || sy - up - r > this.H) continue; items.push({ k: this.osmDepth(o), o }); }
    for (const a of this.areas) if (['ballpark', 'arena', 'grb'].includes(a.kind)) items.push({ k: v.boxDepth(a.r.x0, a.r.y0, a.r.x1 - a.r.x0, a.r.y1 - a.r.y0), a });
    if (!this.hide.people) { for (const n of this.npcs) if (!n.under && n.inside <= 0 && !n.gone) items.push({ k: v.depth(n.x, n.y) + 0.5, n }); for (const r of this.rides || []) { const [rx, ry] = this.ridePos(r); items.push({ k: v.depth(rx, ry) + 0.4, rd: r }); } }
    if (!this._stTrees) { const T = [], sw = this.streetW, A = this.avenues, C = this.cross, mapped = this.geo?.trees || [];
      const near = (x, y) => mapped.some(([a, b]) => Math.abs(a - x) < 1.2 && Math.abs(b - y) < 1.2);
      for (const a of A) for (const sd of [-1, 1]) for (let j = 0; j < C.length - 1; j++) for (let y = C[j].y + sw + 1; y < C[j + 1].y - sw - 0.6; y += 2.4) { const x = a.x + sd * (sw + 0.16); if (hash(x + '|' + y) < 0.42 && !near(x, y)) T.push([x, y]); }
      for (const c of C) for (const sd of [-1, 1]) for (let i = 0; i < A.length - 1; i++) for (let x = A[i].x + sw + 1; x < A[i + 1].x - sw - 0.6; x += 2.4) { const y = c.y + sd * (sw + 0.16); if (hash(x + '~' + y) < 0.42 && !near(x, y)) T.push([x, y]); }
      this._stTrees = T.filter(([x, y]) => !(this.osm || []).some((o) => x > o.bb.x0 && x < o.bb.x1 && y > o.bb.y0 && y < o.bb.y1 && ptIn(x, y, o.pts))); }
    if (v.s > 0.5) for (const [x, y] of this._stTrees) { const [sx, sy] = v.p(x, y); if (sx < -30 || sx > this.W + 30 || sy < -10 || sy > this.H + 60) continue; items.push({ k: v.depth(x, y) + 0.4, tr: [x, y] }); }
    if (this.geo?.trees && v.s > 0.4) for (const [x, y] of this.geo.trees) { const [sx, sy] = v.p(x, y); if (sx < -30 || sx > this.W + 30 || sy < -10 || sy > this.H + 60) continue; items.push({ k: v.depth(x, y) + 0.4, tr: [x, y] }); }
    const live = !!this.liveData, liveRail = live && (this.liveCars || []).some((c) => c.kind === 'train') || this.liveRailSeen;
    if (!liveRail && !this.hide.trains) for (const t of this.trains || []) { const b = this.trainBox(t); items.push({ k: v.boxDepth(b.x, b.y, b.w, b.d), t }); }
    for (const c of [...(this.cars || []).filter((c) => !live || c.kind !== 'bus'), ...(this.liveCars || [])]) { if (c.kind === 'train' ? this.hide.trains : this.hide.traffic) continue; const b = this.carBox(c); items.push({ k: v.boxDepth(b.x, b.y, b.w, b.d), c }); }
    items.sort((p, q) => p.k - q.k);
    // skip anything that can't be on screen (most of the city once you're zoomed in)
    const W = this.W, H = this.H, off = (x, y, w, d, h) => { const [sx, sy] = v.p(x + w / 2, y + d / 2), r = (w + d) * TW * 0.5 * v.s + 20, up = h * ZU * v.s + r; return sx < -r || sx > W + r || sy < -r * 0.6 || sy - up > H; };
    const ghost = mode === 'both' ? 0.4 : 1;
    for (const it of items) {
      if (it.f ? off(it.f.x, it.f.y, it.f.w, it.f.d, it.f.h) : it.l ? off(it.l.x, it.l.y, it.l.w, it.l.d, it.l.h + 3) : it.a ? off(it.a.r.x0, it.a.r.y0, it.a.r.x1 - it.a.r.x0, it.a.r.y1 - it.a.r.y0, 6) : false) continue;
      if (it.f) {
        box(ctx, v, it.f.x, it.f.y, it.f.w, it.f.d, it.f.h, N ? darken(it.f.c, 0.5) : it.f.c, 0, { alpha: ghost, mullions: it.f.glass, night: N });
        if (it.f.h > 7 && v.s > 0.5) { const f = it.f, k = hash(f.x + ':' + f.y); box(ctx, v, f.x + f.w * (0.2 + k * 0.3), f.y + f.d * (0.25 + (1 - k) * 0.25), f.w * 0.28, f.d * 0.3, 0.7, N ? '#3b4252' : '#b8bec6', f.h, { alpha: ghost }); }   // rooftop plant room
      }
      else if (it.l) this.drawLandmark(it.l, N, ghost);
      else if (it.a) this.drawArea(it.a, N, '3d', ghost);
      else if (it.o) this.drawOsm(it.o, N, ghost);
      else if (it.t) this.drawTrain(it.t, N, ghost);
      else if (it.c) this.drawCar(it.c, N, ghost, now);
      else if (it.tr) this.drawStreetTree(it.tr[0], it.tr[1], N, ghost);
      else if (it.rd) this.drawRide(it.rd, N);
      else this.drawNpc(it.n, now, 0);
    }
    { const f = this.followN; if (f && !f.under && f.inside <= 0 && !f.gone && !this.hide.people) this.drawNpc(f, now, 0); }   // the person you're following stays visible even behind a tower
    if (sky && !this.hide.sky) {   // distant sky over the far edge of the city, and a warm wash at golden hour (under pins and labels)
      const hz = this.H * 0.24, g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, sky[0] + 'e0'); g.addColorStop(0.5, sky[1] + '70'); g.addColorStop(1, sky[1] + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, hz);
      const wm = (this._warm || 0) * (1 - night); if (wm > 0.25) { ctx.fillStyle = `rgba(255,150,70,${(wm - 0.25) * 0.1})`; ctx.fillRect(0, 0, this.W, this.H); }
    }
    if (!this.hide.sky) { this.drawBeacons(now, N); this.drawClouds(now, N); }
    const W0 = this.weather; if (W0 && (W0.rain > 0.1 || W0.code >= 51) && !this.hide.sky) {   // it's raining downtown: grey it down and draw falling rain
      ctx.fillStyle = N ? 'rgba(10,14,28,.18)' : 'rgba(70,84,104,.16)'; ctx.fillRect(0, 0, this.W, this.H);
      if (!this._rain) this._rain = Array.from({ length: 140 }, (_, i) => [hash(i + 'rx'), hash(i + 'ry'), 0.6 + hash(i + 'rs') * 0.8]);
      ctx.strokeStyle = N ? 'rgba(170,190,220,.35)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const [rx, ry, sp] of this._rain) { const x = (rx * this.W + now * 0.05 * sp) % this.W, y = (ry * this.H + now * 0.6 * sp) % this.H; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 11 * sp); } ctx.stroke();
    }
    if (mode === 'both') { ctx.fillStyle = 'rgba(14,18,30,.3)'; ctx.fillRect(0, 0, this.W, this.H); this.drawTunnels(now); this.drawMarkers(true); }
    this.drawRailOverlay();
    this.drawDoors(N);
    if (!this.hide.sky) this.drawBirds(now, N);
    TAKEN = (this.reserved || []).map((r) => [...r]);   // map controls count as taken, so labels don't hide under them
    this.drawRoute(now);
    this.drawMarkers(false);
    if (!this.hide.signs) this.drawStreetSigns(N);
    if (this.showParking && mode !== 'tunnel') this.drawParking();
    this.drawUser(now);
    if (!this.hide.labels) this.drawLabels(N);
    TAKEN = null;
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
      // Downtown Aquarium: teal hall with a blue crown, a white tower with a red roof, a pool and the big Ferris wheel
      const now = performance.now(), hallD = l.d * 0.5, q = (x0, y0, x1, y1, z, col) => poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], col);
      q(l.x, l.y + hallD, l.x + l.w, l.y + l.d, 0.02, N ? '#3a4a58' : '#e9e1cf');                                   // plaza
      q(l.x + 0.4, l.y + hallD + 0.6, l.x + l.w * 0.55, l.y + l.d - 0.6, 0.04, N ? '#1d4f77' : '#74c0fc');           // pool
      if (v.s > 0.4) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { const t = ((now / 2500 + i / 3) % 1), yy = l.y + hallD + 0.8 + t * (l.d - hallD - 1.6); ctx.moveTo(...v.p(l.x + 0.7, yy, 0.05)); ctx.lineTo(...v.p(l.x + l.w * 0.5, yy, 0.05)); } ctx.stroke(); }
      box(ctx, v, l.x, l.y, l.w, hallD, 2.6, N ? '#2b5f73' : c, 0, { ...o, top: N ? '#3d6f84' : '#9bd1e3' });
      ctx.globalAlpha = alpha; band(ctx, v, l.x, l.y, l.w, hallD, 1.9, 2.45, N ? '#ffd43b' : '#1864ab', 0.02); band(ctx, v, l.x, l.y, l.w, hallD, 0.25, 1.0, N ? 'rgba(255,224,140,.85)' : 'rgba(25,60,90,.55)', 0.5);
      box(ctx, v, l.x + l.w * 0.55, l.y + hallD * 0.25, 1.1, 1.1, 4.4, '#f1f3f5', 0, o); ctx.globalAlpha = alpha; pyramid(ctx, v, l.x + l.w * 0.55, l.y + hallD * 0.25, 1.1, 1.1, 4.4, 1.2, '#e03131');
      // Ferris wheel: a real vertical ring in 3D, turning slowly, with gondolas
      const R = 2.3, wx = l.x + l.w * 0.72, wy = l.y + hallD + (l.d - hallD) * 0.55, wz = R + 0.5, ang = now / 9000;
      const P = (a, r = R) => v.p(wx, wy + Math.cos(a) * r, wz + Math.sin(a) * r);
      ctx.lineWidth = Math.max(1, v.s * 1.6); ctx.strokeStyle = N ? '#adb5bd' : '#868e96'; ctx.beginPath();
      for (const dy of [-0.9, 0.9]) { ctx.moveTo(...v.p(wx - 0.3, wy + dy, 0)); ctx.lineTo(...v.p(wx, wy, wz)); ctx.lineTo(...v.p(wx + 0.3, wy + dy, 0)); }
      ctx.stroke();
      ctx.strokeStyle = N ? '#fff3bf' : '#f8f9fa'; ctx.lineWidth = Math.max(1.2, v.s * 2.2); ctx.beginPath();
      for (let i = 0; i <= 36; i++) { const pp = P((i / 36) * Math.PI * 2); i ? ctx.lineTo(...pp) : ctx.moveTo(...pp); } ctx.stroke();
      ctx.lineWidth = Math.max(0.6, v.s * 0.8); ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.moveTo(...v.p(wx, wy, wz)); ctx.lineTo(...P(ang + (i / 12) * Math.PI * 2)); } ctx.stroke();
      const GC = ['#e03131', '#1c7ed6', '#fcc419', '#2f9e44', '#ae3ec9', '#f76707'];
      for (let i = 0; i < 12; i++) { const a = ang + (i / 12) * Math.PI * 2, [gx, gy] = v.p(wx, wy + Math.cos(a) * R, wz + Math.sin(a) * R - 0.35); circle(ctx, gx, gy, Math.max(1.4, v.s * 2.6), N ? (i % 2 ? '#ffe066' : '#ff8787') : GC[i % 6]); }
      circle(ctx, ...v.p(wx, wy, wz), Math.max(1.5, v.s * 2.4), '#495057');
    } else if (l.kind === 'post') {
      // POST Houston: the old post office — long and low, ribbon windows, with the Skylawn rooftop park and farm
      box(ctx, v, l.x, l.y, l.w, l.d, l.h, N ? darken(c, 0.4) : c, 0, { ...o, top: N ? '#2f5a3a' : '#9ccc78' });
      ctx.globalAlpha = alpha;
      for (const z of [0.7, 1.55, 2.4]) band(ctx, v, l.x, l.y, l.w, l.d, z, z + 0.42, N ? 'rgba(255,214,140,.8)' : 'rgba(46,58,74,.72)', 0.35);
      band(ctx, v, l.x, l.y, l.w, l.d, 0, 0.45, N ? '#ffd43b' : '#f08c00', l.w * 0.3);   // street-level food hall frontage
      const rz = l.h + 0.02, q = (x0, y0, x1, y1, col) => poly(ctx, [v.p(x0, y0, rz), v.p(x1, y0, rz), v.p(x1, y1, rz), v.p(x0, y1, rz)], col);
      q(l.x + 0.3, l.y + 0.3, l.x + l.w - 0.3, l.y + 0.6, N ? '#59606e' : '#efe9db'); q(l.x + 0.3, l.y + l.d - 0.6, l.x + l.w - 0.3, l.y + l.d - 0.3, N ? '#59606e' : '#efe9db');   // parapet
      if (v.s > 0.3) {
        q(l.x + 0.8, l.y + l.d / 2 - 0.3, l.x + l.w - 0.8, l.y + l.d / 2 + 0.3, N ? '#6b7280' : '#e6dcc4');                     // promenade
        for (let i = 0; i < 7; i++) { const yy = l.y + 0.9 + i * ((l.d / 2 - 1.4) / 7); q(l.x + 0.9, yy, l.x + l.w * 0.42, yy + 0.22, N ? '#2f5a3a' : '#5c9440'); }   // rooftop farm rows
        box(ctx, v, l.x + l.w * 0.48, l.y + 1, l.w * 0.12, l.d / 2 - 1.6, 0.7, '#b9d7e8', rz, { alpha, mullions: true });   // greenhouse
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 14; i++) { const tx = l.x + 0.9 + hash('pt' + i) * (l.w - 1.8), ty = l.y + l.d / 2 + 0.7 + hash('pq' + i) * (l.d / 2 - 1.3), [x, y] = v.p(tx, ty, rz), k = Math.max(0.5, v.s * 1.6); ellipse(ctx, x, y, 3 * k, 1.4 * k, 'rgba(0,0,0,.15)'); circle(ctx, x, y - 3.4 * k, 3 * k, N ? '#2f6b45' : '#4f9e4f'); circle(ctx, x - k, y - 4.4 * k, 1.5 * k, N ? '#3d8a59' : '#74b866'); }
        const [sx, sy] = v.p(l.x + l.w * 0.82, l.y + l.d * 0.25, rz + 1.2); pill(ctx, sx, sy, 'POST', Math.max(9, Math.min(14, v.s * 13)), N ? 'rgba(255,212,59,.95)' : 'rgba(33,37,41,.9)', N ? '#212529' : '#fff');
      }
    } else box(ctx, v, l.x, l.y, l.w, l.d, l.h, c, 0, { ...o, mullions: l.kind === 'glass' });
    ctx.globalAlpha = 1;
  }

  drawArea(a, N, pass, alpha = 1) {
    const ctx = this.ctx, v = this.v, r = a.r;
    const quad = (x0, y0, x1, y1, z, f) => poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], f);
    if (pass === 'flat') {
      if (a.kind === 'park') {
        quad(r.x0, r.y0, r.x1, r.y1, 0, N ? '#24452f' : '#acd38f');
        if (a.n === 'Discovery Green') {
          const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; quad(cx - 2.5, cy + 0.5, cx + 2, cy + 3, 0.02, N ? '#2a4d6e' : '#8fd0f2');
          if (v.s > 0.35) { const t = (performance.now() / 2600) % 1, [x, y] = v.p(cx - 0.25, cy + 1.75, 0.03); ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - t)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 4 + t * 26 * v.s, (4 + t * 26 * v.s) / 2, 0, 0, 7); ctx.stroke(); }
        }
        if (v.s > 0.22) for (let i = 0; i < 7; i++) { const tx = r.x0 + (r.x1 - r.x0) * (0.1 + hash(a.n + i) * 0.8), ty = r.y0 + (r.y1 - r.y0) * (0.1 + hash(i + a.n) * 0.8); const [x, y] = v.p(tx, ty); const k = v.s * 2.2; ellipse(ctx, x, y, 6 * k, 3 * k, 'rgba(0,0,0,.12)'); circle(ctx, x, y - 6 * k, 5.2 * k, N ? '#2f6b45' : '#5fae5a'); circle(ctx, x - 1.6 * k, y - 7.6 * k, 2.6 * k, N ? '#3d8a59' : '#7cc576'); }
      } else {
        quad(r.x0, r.y0, r.x1, r.y1, 0, N ? '#3d4456' : '#e7dfd0');
        if (a.n === 'Main Street Square' && v.s > 0.4) {   // the dancing fountain jets in the square
          const now = performance.now(); ctx.lineCap = 'round';
          for (let i = 0; i < 8; i++) { const fx = r.x0 + (r.x1 - r.x0) * (0.2 + 0.6 * ((i % 4) / 3)), fy = r.y0 + (r.y1 - r.y0) * (i < 4 ? 0.35 : 0.65), hgt = 0.4 + 1.1 * Math.abs(Math.sin(now / 700 + i * 0.8)), [x0, y0] = v.p(fx, fy, 0), [, y1] = v.p(fx, fy, hgt);
            ellipse(ctx, x0, y0, 3 * v.s + 1, 1.5 * v.s + 0.5, N ? 'rgba(116,192,252,.5)' : 'rgba(116,192,252,.8)'); ctx.strokeStyle = N ? 'rgba(208,235,255,.8)' : 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1, v.s * 1.6); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke(); }
          ctx.lineCap = 'butt';
        }
      }
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

  drawStreetTree(x, y, N, ghost) {
    const ctx = this.ctx, v = this.v, [bx, by] = v.p(x, y), [, ty] = v.p(x, y, 0.95), r = Math.max(2.5, 0.42 * TW * v.s * 0.5), k = hash(x.toFixed(2) + y.toFixed(2));
    ctx.globalAlpha = ghost; ctx.strokeStyle = N ? '#2b2218' : '#7a5a3c'; ctx.lineWidth = Math.max(1, v.s * 1.4); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, ty); ctx.stroke();
    const g = ctx.createRadialGradient(bx - r * 0.3, ty - r * 0.4, r * 0.2, bx, ty - r * 0.2, r * 1.1);
    const c0 = N ? '#3b6b4a' : ['#79b85a', '#6aa84f', '#86c06a'][Math.floor(k * 3)], c1 = N ? '#1d3a28' : '#3f7a34';
    g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, ty - r * 0.25, r, r * 0.92, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  drawGeo(N, now) {
    const ctx = this.ctx, v = this.v, B = this.bounds, G = this.geo;
    ctx.save(); ctx.beginPath(); const c = [v.p(B.x0, B.y0), v.p(B.x1, B.y0), v.p(B.x1, B.y1), v.p(B.x0, B.y1)]; ctx.moveTo(...c[0]); for (const q of c.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.clip();
    const path = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...v.p(p[0], p[1])) : ctx.moveTo(...v.p(p[0], p[1])))); };
    const strokeW = (w) => Math.max(1, w * TW * v.s * 0.72);
    ctx.lineCap = ctx.lineJoin = 'round';
    // parks & plazas
    for (const p of G.parks) { path(p.pts); ctx.closePath(); ctx.fillStyle = p.k === 'plaza' ? (N ? '#3a3f4f' : '#e6e1d6') : (N ? '#243d2c' : '#b9dc9f'); ctx.fill(); }
    // bayous: green banks, then water
    for (const r of G.rivers) { path(r.pts); ctx.strokeStyle = N ? '#1f3a29' : '#a8d08d'; ctx.lineWidth = strokeW(r.w * 2.6); ctx.stroke(); }
    for (const w of G.water) { path(w); ctx.closePath(); ctx.fillStyle = N ? '#1c3a57' : '#7fbbd9'; ctx.fill(); }
    for (const r of G.rivers) { path(r.pts); ctx.strokeStyle = N ? '#1c3a57' : '#7fbbd9'; ctx.lineWidth = strokeW(r.w); ctx.stroke(); }
    if (v.s > 0.25) for (const r of G.rivers.filter((x) => /buffalo/i.test(x.n))) { ctx.strokeStyle = N ? 'rgba(165,216,255,.35)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, v.s * 1.4); ctx.setLineDash([3 * v.s + 2, 14 * v.s + 6]); ctx.lineDashOffset = -now / 60; path(r.pts); ctx.stroke(); ctx.setLineDash([]); }
    // trails along the bayous and through the parks
    if (v.s > 0.35) { ctx.strokeStyle = N ? 'rgba(214,196,160,.45)' : '#d9c9a5'; ctx.lineWidth = Math.max(1.2, v.s * 2.2); for (const p of G.paths || []) { path(p.pts); ctx.stroke(); } }
    // street bridges over the bayou: deck with white railings
    for (const b of G.bridges || []) { path(b.pts); ctx.strokeStyle = N ? '#3a3f4c' : '#c9ccd1'; ctx.lineWidth = strokeW(b.w) + 3; ctx.stroke(); path(b.pts); ctx.strokeStyle = N ? '#2b303c' : '#a3a9b2'; ctx.lineWidth = strokeW(b.w); ctx.stroke(); }
    // freeways and ramps, as mapped — bridges and flyovers lifted on piers, with their shadow underneath
    const road = N ? '#2b303c' : '#b7bcc4', edge = N ? '#1b1f29' : '#9aa1aa';
    const pathZ = (pts, z) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...v.p(p[0], p[1], z)) : ctx.moveTo(...v.p(p[0], p[1], z)))); };
    const ground = G.roads.filter((g) => !g.z), raised = G.roads.filter((g) => g.z).sort((a, b) => a.z - b.z);
    for (const g of ground) { path(g.pts); ctx.strokeStyle = edge; ctx.lineWidth = strokeW(g.w) + 2; ctx.stroke(); }
    for (const g of ground) { path(g.pts); ctx.strokeStyle = road; ctx.lineWidth = strokeW(g.w); ctx.stroke(); }
    for (const g of raised) { path(g.pts); ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = strokeW(g.w) + 4; ctx.stroke(); }
    for (const g of raised) {
      if (v.s > 0.3) { ctx.strokeStyle = N ? '#3d4250' : '#c3c7cc'; ctx.lineWidth = Math.max(2, v.s * 4); ctx.beginPath(); let acc = 0; for (let i = 1; i < g.pts.length; i++) { const a = g.pts[i - 1], b = g.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = (3 - acc) / (L || 1); t < 1; t += 3 / (L || 1)) { const q = lerp2(a, b, t); ctx.moveTo(...v.p(q[0], q[1], 0)); ctx.lineTo(...v.p(q[0], q[1], g.z)); } acc = (acc + L) % 3; } ctx.stroke(); }
      pathZ(g.pts, g.z - 0.12); ctx.strokeStyle = N ? '#161a22' : '#8d939c'; ctx.lineWidth = strokeW(g.w) + 2; ctx.stroke();
      pathZ(g.pts, g.z); ctx.strokeStyle = edge; ctx.lineWidth = strokeW(g.w) + 2; ctx.stroke(); pathZ(g.pts, g.z); ctx.strokeStyle = road; ctx.lineWidth = strokeW(g.w); ctx.stroke();
    }
    if (v.s > 0.5) { ctx.strokeStyle = N ? 'rgba(255,214,120,.35)' : 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]); for (const g of G.roads) if (g.k === 'motorway') { pathZ(g.pts, g.z); ctx.stroke(); } ctx.setLineDash([]); }
    ctx.restore(); ctx.lineCap = 'butt';
  }
  drawBayouAndFreeways(N, now = performance.now()) {
    if (this.geo) return this.drawGeo(N, now);
    const ctx = this.ctx, v = this.v, B = this.bounds, A = this.avenues, C = this.cross;
    const yb = C[0].y - this.blockD * 1.4, pts = [];
    for (let x = B.x0; x <= B.x1; x += 2) pts.push([x, yb + Math.sin(x / 9) * 2 + Math.sin(x / 23) * 1.3]);
    const band = (w, col) => poly(ctx, [...pts.map(([x, y]) => v.p(x, y - w)), ...pts.slice().reverse().map(([x, y]) => v.p(x, y + w))], col);
    band(4, N ? '#24452f' : '#b6d79c'); band(1.9, N ? '#1c3a57' : '#7fbbd9');
    // the bayou flows: little glints drift downstream
    if (v.s > 0.2) {
      const L = B.x1 - B.x0, ry = (x) => yb + Math.sin(x / 9) * 2 + Math.sin(x / 23) * 1.3;
      ctx.strokeStyle = N ? 'rgba(165,216,255,.35)' : 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, v.s * 1.5); ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 26; i++) { const x = B.x0 + ((now / 1000) * 0.9 + i * (L / 26) + hash('g' + i) * 6) % L, off = (hash('o' + i) - 0.5) * 2.4; ctx.moveTo(...v.p(x, ry(x) + off)); ctx.lineTo(...v.p(x + 1.6, ry(x + 1.6) + off)); }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
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

  drawParking() {
    const ctx = this.ctx, v = this.v, W = this.W, H = this.H, r = Math.max(7, Math.min(13, 10 * v.s));
    const badge = (x, y, big) => { if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; ctx.fillStyle = big ? '#1c7ed6' : '#4dabf7'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - r, y - r, r * 2, r * 2, 4) : ctx.rect(x - r, y - r, r * 2, r * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(r * 1.25)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', x, y + 1); };
    for (const o of this.osm || []) if (o.type === 'parking' && o.h >= 0.8) { const [x, y] = v.p(o.cx, o.cy, o.z0 + o.h + 0.15); badge(x, y, true); }
    if (v.s > 0.6) for (const l of this.osmLots || []) { const [x, y] = v.p((l.bb.x0 + l.bb.x1) / 2, (l.bb.y0 + l.bb.y1) / 2, 0.05); badge(x, y, false); }
  }
  drawTunnels(now) {
    const ctx = this.ctx, v = this.v, z = this.tunnelZ(), T = this.tunnelSpots; if (!T.length) return;
    const w = 0.8;
    const seg = (ax, ay, bx, by) => { const x0 = Math.min(ax, bx) - w, x1 = Math.max(ax, bx) + w, y0 = Math.min(ay, by) - w, y1 = Math.max(ay, by) + w; poly(ctx, [v.p(x0, y0, z), v.p(x1, y0, z), v.p(x1, y1, z), v.p(x0, y1, z)], '#34425c'); for (const f of sides(v, x0, y0, x1 - x0, y1 - y0)) poly(ctx, [v.p(...f.a, z), v.p(...f.b, z), v.p(...f.b, z + 0.5), v.p(...f.a, z + 0.5)], '#26324a'); };
    const realT = this.geo?.tunnels?.length >= 15 ? this.geo.tunnels : null;
    if (realT) {   // the actual corridors from OpenStreetMap: a lit floor with a bright centre line
      const path = (pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...v.p(q[0], q[1], z)) : ctx.moveTo(...v.p(q[0], q[1], z)))); };
      ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#2b3550'; ctx.lineWidth = Math.max(5, v.s * 14); for (const t of realT) { path(t.pts); ctx.stroke(); }
      const OSMC = { 'North Travis Tunnel': '#7048e8', 'Tunnel Loop': '#e03131', 'North Louisiana Tunnel': '#1c7ed6', 'South Louisiana Tunnel': '#4dabf7', 'East McKinney Tunnel': '#f76707', 'Lamar Tunnel': '#d6c41c', 'West Walker Tunnel': '#15aabf', 'West Dallas Tunnel': '#ae3ec9', 'Harris County Tunnel': '#868e96' }, col = (t) => OSMC[t.n] || '#38d9a9';
      ctx.lineWidth = Math.max(1.6, v.s * 3); for (const t of realT) { const c = col(t); ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8; path(t.pts); ctx.stroke(); } ctx.shadowBlur = 0;
      if (v.s > 0.5) { const done = new Set(); for (const t of [...realT].sort((a, b) => b.pts.length - a.pts.length)) if (t.n && !done.has(t.n) && t.pts.length > 1) { done.add(t.n); const q = t.pts[Math.floor(t.pts.length / 2)], [x, y] = v.p(q[0], q[1], z); pill(ctx, x, y - 10, t.n, 10, col(t), '#fff'); } }
      for (const n of this.npcs) if (n.under && n.inside <= 0) this.drawNpc(n, now, z);
      return;
    }
    for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b]; seg(A.x, A.y, Bn.x, A.y); seg(Bn.x, A.y, Bn.x, Bn.y); }
    // each tunnel section in its own colour, like the official tunnel map
    const groups = new Map(); for (const [a, b] of this.tunnelEdges) { const A = T[a], Bn = T[b], sec = tunnelSection(Bn) || tunnelSection(A) || 'Tunnel'; if (!groups.has(sec)) groups.set(sec, []); groups.get(sec).push([A, Bn]); }
    ctx.lineWidth = Math.max(1.6, v.s * 3.2); ctx.lineCap = ctx.lineJoin = 'round';
    for (const [sec, E] of groups) { const c = TUNNEL_COLORS[sec] || '#38d9a9'; ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8; ctx.beginPath(); for (const [A, Bn] of E) { ctx.moveTo(...v.p(A.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, A.y, z)); ctx.lineTo(...v.p(Bn.x, Bn.y, z)); } ctx.stroke(); }
    ctx.shadowBlur = 0;
    if (v.s > 0.55) for (const [sec, E] of groups) { const [A, Bn] = E[Math.floor(E.length / 2)], [x, y] = v.p((A.x + Bn.x) / 2, A.y, z); pill(ctx, x, y - 10, sec, 10.5, TUNNEL_COLORS[sec] || '#38d9a9', '#fff'); }
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
    const lift = this.pinLift(), list = this.visibleSpots(under).sort((a, b) => v.depth(a.x, a.y) - v.depth(b.x, b.y)), lbl = new Map();
    if (TAKEN) {
      const rr = lod === 'label' ? 12 : 10;
      for (const s of list) { const [x, y] = v.p(s.x, s.y, z); fits(x - rr, y - lift - rr, x + rr, y - lift + rr, true); }
      for (let k = list.length - 1; k >= 0; k--) { const s = list[k]; if (!((lod === 'label' && !this.hide.pinNames) || this.hover?.spot === s)) continue; const [x, y] = v.p(s.x, s.y, z), t = s.label.length > 24 ? s.label.slice(0, 23) + '…' : s.label; ctx.font = '600 11px system-ui, sans-serif'; const w = ctx.measureText(t).width + 10, yy = y - lift - rr - 12;
        if (this.hover?.spot === s || this.pick != null && s.places.some((p) => p.id === this.pick)) { fits(x - w / 2, yy - 9, x + w / 2, yy + 9, true); lbl.set(s, 0); continue; }
        // try above the pin, then below it, then to either side
        const tries = [[0, yy], [0, y - lift + rr + 12], [w / 2 + rr + 4, y - lift], [-(w / 2 + rr + 4), y - lift]];
        for (const [dx, ty] of tries) if (fits(x + dx - w / 2 - 2, ty - 10, x + dx + w / 2 + 2, ty + 10)) { lbl.set(s, [dx, ty - yy]); break; } }
    }
    for (const s of list) {
      const [x, y] = v.p(s.x, s.y, z), open = s.places.some((p) => this.openC(p)), r = lod === 'label' ? 12 : 10;
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - lift + r); ctx.stroke();
      ellipse(ctx, x, y, 3, 1.5, 'rgba(0,0,0,.25)');
      if (this.highlight && s.places.some((p) => this.highlight.has(p.id))) { const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 320 + s.x), g = ctx.createRadialGradient(x, y - lift, r * 0.6, x, y - lift, r * 2.4); g.addColorStop(0, hexA(s.style.color, 0.55 * pulse)); g.addColorStop(1, hexA(s.style.color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - lift, r * 2.4, 0, 7); ctx.fill(); }
      const spr = pinSprite(open ? s.style.color : '#adb5bd', s.style.emoji, r, under ? '#c3fae8' : '#fff'); ctx.drawImage(spr, x - spr.css / 2, y - lift - spr.css / 2, spr.css, spr.css);
      if (s.places.length > 1) { circle(ctx, x + r * 0.85, y - lift - r * 0.8, 7, '#212529'); ctx.fillStyle = '#fff'; ctx.font = '700 9px system-ui, sans-serif'; ctx.fillText(String(s.places.length), x + r * 0.85, y - lift - r * 0.8 + 0.5); }
      if (((lod === 'label' && !this.hide.pinNames) || this.hover?.spot === s) && (!TAKEN || lbl.has(s))) { const off = lbl.get(s) || [0, 0]; pill(ctx, x + off[0], y - lift - r - 12 + off[1], s.label.length > 24 ? s.label.slice(0, 23) + '…' : s.label, 11, under ? 'rgba(18,184,134,.92)' : 'rgba(255,255,255,.94)', under ? '#fff' : '#212529'); }
    }
  }

  drawNpc(n, now, z) {
    const [x, y] = this.v.p(n.x, n.y, z), u = Math.max(0.55, this.u() * 0.8), ctx = this.ctx;
    if (x < -40 || y < -60 || x > this.W + 40 || y > this.H + 40) return;
    const L = n.look; if (L.umb == null) { L.umb = UMB[Math.floor(hash(n.id + 'u') * UMB.length)]; L.sun = hash(n.id + 'sun') < 0.4; }
    const wx = n.under ? '' : this._wxNow || '', fol = this.followN === n;
    const gem = this.pick != null && (n.target || n.atSpot)?.places?.some((p) => p.id === this.pick) ? '#ffd43b' : n.mood > 0.6 ? '#40c057' : n.mood > 0.35 ? '#a9e34b' : '#ff922b';
    const moving = (!!n.path.length && n.wait <= 0 && !n.chat && !n.atLight) || !!n.qMoving;
    if (fol) { const p = 0.5 + 0.5 * Math.sin(now / 250); ctx.strokeStyle = `rgba(250,176,5,${0.5 + p * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 11 * u + p * 3, (11 * u + p * 3) / 2, 0, 0, 7); ctx.stroke(); }
    drawPerson(ctx, x, y, u, L, n.phase, moving, gem, now, wx);
    let b = null;
    if (n.chat) b = '💬' + n.chat.e;
    else if (n.thought && n.thoughtT > 0) b = n.thought;
    else if (n.queue && n.queue.q?.[0] === n && this.v.s > 0.55) b = '⏳';
    else if ((this.v.s > 1 || fol) && n.target && n.path.length && NEED[n.need] && n.role !== 'courier') b = NEED[n.need].e;
    if (b && this.v.s > 0.3) pill(ctx, x + 12 * u, y - (wx === 'rain' ? 52 : 40) * u, b, 11, 'rgba(255,255,255,.95)');
    if (fol) pill(ctx, x, y + 12 * u, '⭐ ' + n.name, 11, 'rgba(255,212,59,.96)');
  }

  drawLabels(N) {
    const ctx = this.ctx, v = this.v, A = this.avenues, C = this.cross;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(Math.min(13, 9 + v.s * 4))}px system-ui, sans-serif`; ctx.fillStyle = N ? 'rgba(255,255,255,.8)' : 'rgba(33,37,41,.85)';
    const all = v.s > 0.5;
    for (const a of A) if (all || MAJOR.has(a.n)) { const [x, y] = v.p(a.x, C[0].y - 1.6), w = ctx.measureText(a.n).width; if (fits(x - w / 2, y - 8, x + w / 2, y + 8)) ctx.fillText(a.n, x, y); }
    for (const c of C) if (all || MAJOR.has(c.n)) { const [x, y] = v.p(A[0].x - 2.4, c.y), w = ctx.measureText(c.n).width; if (fits(x - w / 2, y - 8, x + w / 2, y + 8)) ctx.fillText(c.n, x, y); }
    for (const f of this.freewayLabels || []) { const [x, y] = v.p(f.x, f.y); pillFit(ctx, x, y, f.t, 10, f.water ? 'rgba(25,113,194,.85)' : 'rgba(33,37,41,.75)', '#fff'); }
    if (v.s > 0.3) {
      for (const a of this.areas) { const [x, y] = v.p((a.r.x0 + a.r.x1) / 2, (a.r.y0 + a.r.y1) / 2, a.kind === 'park' || a.kind === 'plaza' ? 0.5 : 7); pillFit(ctx, x, y, a.n, 10, a.kind === 'park' ? 'rgba(47,158,68,.88)' : 'rgba(73,80,87,.85)', '#fff'); }
      for (const st of this.rail?.stations || []) { const [x, y] = v.p(st.x + (st.line === 'red' ? 0.6 : 0), st.y, 1.6); pillFit(ctx, x, y, '🚊 ' + st.n, 10, st.line === 'red' ? 'rgba(224,49,49,.92)' : 'rgba(47,158,68,.92)', '#fff'); }
      if (v.s > 0.42) { const lim = v.s > 0.8 ? 60 : 14; for (const o of (this.osmNamed || []).slice(0, lim)) { const [x, y] = v.p(o.cx, o.cy, o.z0 + o.h + 1.2); if (x > -60 && x < this.W + 60 && y > -20 && y < this.H + 20) pillFit(ctx, x, y, o.name, 10, 'rgba(255,255,255,.88)', '#343a40'); } }
      if (v.s > 0.42) for (const l of this.landmarks) { const [x, y] = v.p(l.x + l.w / 2, l.y + l.d / 2, l.h + 1.5); pillFit(ctx, x, y, l.n, 10, 'rgba(255,255,255,.88)', '#343a40'); }
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
    ctx.font = '15px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍽️', x, py - 26);
  }
}
