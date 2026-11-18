// First-person street view: the same downtown (real OpenStreetMap buildings, the same people, cars,
// trains and pins) seen from eye level. three.js is loaded only when this view is opened.
import { TUNNEL_COLORS, tunnelSection } from './map.js';
const S = 10;          // 1 map unit = 10 m
const EYE = 1.7;       // metres

let THREE = null;
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// stand on the sidewalk across the street from a spot, looking at it
export function standFor(city, s) {
  const A = city.avenues, C = city.cross, sw = city.streetW, [i, j] = city.cellIdx(s.x, s.y);
  const edges = [];
  if (i > 0) edges.push({ d: s.x - A[i - 1].x, at: [A[i - 1].x - sw - 0.35, s.y] });
  if (i < A.length) edges.push({ d: A[i].x - s.x, at: [A[i].x + sw + 0.35, s.y] });
  if (j > 0) edges.push({ d: s.y - C[j - 1].y, at: [s.x, C[j - 1].y - sw - 0.35] });
  if (j < C.length) edges.push({ d: C[j].y - s.y, at: [s.x, C[j].y + sw + 0.35] });
  edges.sort((a, b) => a.d - b.d);
  let [x, y] = edges[0]?.at || [s.x, s.y + 3];
  // step ~25 m down the sidewalk so the building is seen at an angle, not nose-to-wall
  const alongX = edges[0] && edges[0].at[1] === s.y ? 0 : 1, k = hash(s.label) > 0.5 ? 1 : -1;
  if (alongX) x += 2.4 * k; else y += 2.4 * k;
  return { x, y, yaw: Math.atan2(-(s.x - x), -(s.y - y)), pitch: 0.08 };
}

export async function openPOV(city, opts = {}) {
  if (!THREE) THREE = await import('./vendor/three.module.min.js');
  const T = THREE, wrap = document.createElement('div');
  wrap.className = 'pov';
  wrap.innerHTML = `<canvas></canvas>
    <div class="pov-top"><button class="pov-btn" data-a="close">✕ Map</button><div class="pov-title">🧍 Street view</div><button class="pov-btn" data-a="follow" hidden>📍 Follow me</button></div>
    <div class="pov-nav" hidden></div>
    <div class="pov-hint">Drag to look around · use the pad to walk · tap a pin for details</div>
    <div class="pov-pad"><div class="pov-knob"></div></div>
    <div class="pov-side"><button class="pov-btn round" data-a="tunnel" title="Go down to the tunnels">🚇</button><button class="pov-btn round" data-a="labels" title="Show or hide pins">📍</button><button class="pov-btn round" data-a="people" title="Show or hide people and traffic">🚶</button></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), $ = (q) => wrap.querySelector(q);
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(70, 1, 0.1, 2600);
  camera.rotation.order = 'YXZ';
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  const night = city.nightAmount() > 0.5;
  const sky = new T.Color(night ? '#18213f' : '#c9e1f2');
  { const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 512; const sg = sc.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 512);
    if (night) { gr.addColorStop(0, '#05081a'); gr.addColorStop(0.42, '#141c3a'); gr.addColorStop(0.5, '#2a2f52'); gr.addColorStop(1, '#141824'); } else { gr.addColorStop(0, '#5d9fd8'); gr.addColorStop(0.45, '#a9cfee'); gr.addColorStop(0.5, '#e4eef5'); gr.addColorStop(1, '#cfd6dc'); }
    sg.fillStyle = gr; sg.fillRect(0, 0, 1024, 512);
    if (night) { sg.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { const x = hash(i + 's') * 1024, y = hash(i + 't') * 230; sg.globalAlpha = 0.3 + hash(i + 'a') * 0.7; sg.fillRect(x, y, 1.6, 1.6); } sg.globalAlpha = 1; sg.fillStyle = '#f6f1d9'; sg.beginPath(); sg.arc(760, 90, 14, 0, 7); sg.fill(); }
    else { sg.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 14; i++) { const x = hash(i + 'c') * 1024, y = 60 + hash(i + 'd') * 140, w = 60 + hash(i + 'e') * 120; sg.beginPath(); sg.ellipse(x, y, w, w * 0.22, 0, 0, 7); sg.fill(); } }
    const st = keep(new T.CanvasTexture(sc)); st.mapping = T.EquirectangularReflectionMapping; st.colorSpace = T.SRGBColorSpace; scene.background = st; }
  scene.fog = new T.Fog(sky, 220, night ? 1000 : 1700);
  scene.add(new T.HemisphereLight(night ? '#8090c8' : '#eaf4ff', night ? '#2a2c34' : '#8a8172', night ? 1.35 : 1.6));
  const sun = new T.DirectionalLight(night ? '#9fb0ff' : '#fff2d8', night ? 0.35 : 1.8); sun.position.set(-300, 500, -200); scene.add(sun);

  const B = city.bounds, A = city.avenues, C = city.cross, sw = city.streetW;
  const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3(), col = new T.Color(), up = new T.Vector3(0, 1, 0);
  // ground + blocks (sidewalks raised a curb's height) + parks
  const ground = new T.Mesh(keep(new T.PlaneGeometry((B.x1 - B.x0 + 60) * S, (B.y1 - B.y0 + 60) * S)), keep(new T.MeshLambertMaterial({ color: night ? '#2f333c' : '#5a5f68' })));
  ground.rotation.x = -Math.PI / 2; ground.position.set(((B.x0 + B.x1) / 2) * S, 0, ((B.y0 + B.y1) / 2) * S); scene.add(ground);
  const slabs = [], parks = [];
  for (let i = 0; i <= A.length; i++) for (let j = 0; j <= C.length; j++) {
    const x0 = i > 0 ? A[i - 1].x + sw : B.x0 - 20, x1 = i < A.length ? A[i].x - sw : B.x1 + 20, y0 = j > 0 ? C[j - 1].y + sw : B.y0 - 20, y1 = j < C.length ? C[j].y - sw : B.y1 + 20;
    if (x1 > x0 && y1 > y0) slabs.push([x0, y0, x1, y1]);
  }
  for (const a of city.areas || []) if (a.kind === 'park' || a.kind === 'plaza') parks.push([a.r.x0, a.r.y0, a.r.x1, a.r.y1, a.kind]);
  const slabGeo = (rects, h, y = 0) => { const pos = []; for (const [x0, y0, x1, y1] of rects) { const g = new T.BoxGeometry((x1 - x0) * S, h, (y1 - y0) * S).toNonIndexed(); g.translate(((x0 + x1) / 2) * S, y + h / 2, ((y0 + y1) / 2) * S); pos.push(g); } return merge(pos); };
  scene.add(new T.Mesh(keep(slabGeo(slabs, 0.15)), keep(new T.MeshLambertMaterial({ color: night ? '#4a4c53' : '#c9c5bc' }))));
  if (parks.length) scene.add(new T.Mesh(keep(slabGeo(parks, 0.1, 0.15)), keep(new T.MeshLambertMaterial({ color: night ? '#1f3a26' : '#6fae5a' }))));
  // lane markings
  { const pts = []; const dash = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 0.9); for (let k = 0; k < n; k += 2) { const t0 = k / n, t1 = (k + 1) / n; pts.push(new T.Vector3((ax + (bx - ax) * t0) * S, 0.03, (ay + (by - ay) * t0) * S), new T.Vector3((ax + (bx - ax) * t1) * S, 0.03, (ay + (by - ay) * t1) * S)); } };
    for (const a of A) dash(a.x, B.y0, a.x, B.y1); for (const c of C) dash(B.x0, c.y, B.x1, c.y);
    scene.add(new T.LineSegments(keep(new T.BufferGeometry().setFromPoints(pts)), keep(new T.LineBasicMaterial({ color: night ? '#9a8f5a' : '#f1f3f5' })))); }
  // METRORail track beds
  { const R = city.rail; if (R) { const beds = [[R.x - 0.55, R.y0, R.x + 0.55, R.y1]]; if (R.xW != null) for (const y of [R.capY, R.ruskY]) beds.push([R.xW, y - 0.3, R.xE, y + 0.3]);
    scene.add(new T.Mesh(keep(slabGeo(beds, 0.08, 0.01)), keep(new T.MeshLambertMaterial({ color: night ? '#2c2a2a' : '#7c7470' })))); } }

  // buildings: one merged mesh for walls (with windows), one for roofs
  const winTex = (lit) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = lit ? '#000' : '#fff'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const on = lit ? hash(i * 7 + j * 13 + 'w') > 0.55 : true; if (!on) continue; g.fillStyle = lit ? '#ffd890' : '#a9b7c6'; g.fillRect(i * 64 + 12, j * 64 + 14, 40, 34); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / (3.2 * 4), 1 / (3.6 * 4)); t.colorSpace = T.SRGBColorSpace; return keep(t); };
  const wallParts = [], roofParts = [];
  const glassParts = [], shopParts = [];
  const pushBuilding = (pts, h, z0, color, glass, shops) => {
    const shape = new T.Shape(pts.map(([x, y]) => new T.Vector2(x * S, -y * S)));
    let g; try { g = new T.ExtrudeGeometry(shape, { depth: Math.max(2, h * S), bevelEnabled: false }); } catch (e) { return; }
    g.rotateX(-Math.PI / 2); g.translate(0, z0 * S, 0);
    const col = new T.Color(color), roof = col.clone().multiplyScalar(0.82);
    for (const gr of g.groups) { const part = sliceGroup(g, gr.start, gr.count), n = part.attributes.position.count, cols = new Float32Array(n * 3), c = gr.materialIndex === 0 ? roof : col; for (let k = 0; k < n; k++) { cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b; } part.setAttribute('color', new T.BufferAttribute(cols, 3)); (gr.materialIndex === 0 ? roofParts : glass ? glassParts : wallParts).push(part); }
    g.dispose();
    if (shops && !(z0 > 0.05)) {   // a lit shopfront band around the ground floor
      let cx = 0, cy = 0; for (const q of pts) { cx += q[0] / pts.length; cy += q[1] / pts.length; }
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) * S; if (L < 4) continue;
        let nx = (b[1] - a[1]), ny = -(b[0] - a[0]); const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const o = 0.06 / S, ax = (a[0] + nx * o) * S, az = (a[1] + ny * o) * S, bx = (b[0] + nx * o) * S, bz = (b[1] + ny * o) * S, y0 = 0.35, y1 = 4.1, u = L / 3.2;
        const g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.BufferAttribute(new Float32Array([ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az]), 3));
        g2.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, u, 0, u, 1, 0, 0, u, 1, 0, 1]), 2)); g2.computeVertexNormals(); shopParts.push(g2); } }
  };
  const solids = [];   // for walking collisions, in map units
  for (const o of city.osm || []) { pushBuilding(o.pts, o.h, o.z0 || 0, o.c, o.glass || o.h >= 8.5, o.h >= 0.6 && !/parking|church|garage|standin/.test(o.type || '')); if (o.h >= 0.3 && !(o.z0 > 0.3)) solids.push({ bb: o.bb, pts: o.pts }); }
  for (const l of city.landmarks || []) { const p = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.d], [l.x, l.y + l.d]]; pushBuilding(p, l.h || 2, 0, l.kind === 'aquarium' ? '#5c9fd6' : '#b9a58c'); solids.push({ bb: { x0: l.x, x1: l.x + l.w, y0: l.y, y1: l.y + l.d }, pts: p }); }
  for (const a of city.areas || []) if (['grb', 'arena', 'ballpark'].includes(a.kind)) { const r = a.r, p = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]]; pushBuilding(p, a.kind === 'grb' ? 3.2 : a.kind === 'arena' ? 4 : 5, 0, a.kind === 'grb' ? '#d9dee3' : a.kind === 'arena' ? '#7b8794' : '#c8b9a2'); solids.push({ bb: { x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1 }, pts: p }); }
  const blocked = (x, y) => solids.some((o) => x > o.bb.x0 - 0.05 && x < o.bb.x1 + 0.05 && y > o.bb.y0 - 0.05 && y < o.bb.y1 + 0.05 && inPoly(x, y, o.pts));
  const walls = new T.Mesh(keep(merge(wallParts)), keep(new T.MeshLambertMaterial({ vertexColors: true, map: winTex(false), emissive: night ? '#ffcf7a' : '#000', emissiveMap: night ? winTex(true) : null, emissiveIntensity: night ? 1.1 : 0 })));
  const roofs = new T.Mesh(keep(merge(roofParts)), keep(new T.MeshLambertMaterial({ vertexColors: true })));
  scene.add(walls, roofs);
  if (glassParts.length) { const gm = new T.Mesh(keep(merge(glassParts)), keep(new T.MeshStandardMaterial({ vertexColors: true, map: winTex(false), metalness: 0.55, roughness: 0.22, envMap: scene.background, envMapIntensity: night ? 0.35 : 1.1, emissive: night ? '#ffcf7a' : '#000', emissiveMap: night ? winTex(true) : null, emissiveIntensity: night ? 1 : 0 }))); scene.add(gm); }
  if (shopParts.length) { const sc2 = document.createElement('canvas'); sc2.width = 256; sc2.height = 256; const s2 = sc2.getContext('2d');
    s2.fillStyle = night ? '#1b1d22' : '#2a2f36'; s2.fillRect(0, 0, 256, 256); s2.fillStyle = night ? '#ffd9a0' : '#7f97ab'; s2.fillRect(14, 70, 228, 176); s2.fillStyle = night ? '#e8b46a' : '#5f7486'; s2.fillRect(14, 70, 228, 30);
    s2.fillStyle = night ? '#1b1d22' : '#2a2f36'; for (let k = 0; k < 4; k++) s2.fillRect(14 + k * 76, 70, 6, 176); s2.fillStyle = night ? '#ff8a5c' : '#b0503a'; s2.fillRect(14, 20, 228, 34);
    const stx = keep(new T.CanvasTexture(sc2)); stx.wrapS = T.RepeatWrapping; stx.colorSpace = T.SRGBColorSpace;
    const sm = new T.Mesh(keep(merge(shopParts)), keep(new T.MeshLambertMaterial({ map: stx, emissive: night ? '#ffffff' : '#000', emissiveMap: night ? stx : null, emissiveIntensity: night ? 0.75 : 0, side: T.DoubleSide }))); scene.add(sm); }
  wallParts.forEach((g) => g.dispose()); roofParts.forEach((g) => g.dispose()); glassParts.forEach((g) => g.dispose()); shopParts.forEach((g) => g.dispose());

  // people and vehicles, mirrored from the map's own simulation
  const MAXP = 200, MAXV = 120;
  const bodies = new T.InstancedMesh(keep(new T.CylinderGeometry(0.22, 0.26, 1.45, 8)), keep(new T.MeshLambertMaterial()), MAXP);
  const heads = new T.InstancedMesh(keep(new T.SphereGeometry(0.15, 10, 8)), keep(new T.MeshLambertMaterial()), MAXP);
  const vehicles = new T.InstancedMesh(keep(new T.BoxGeometry(1, 1, 1)), keep(new T.MeshLambertMaterial()), MAXV);
  const glassBand = new T.InstancedMesh(keep(new T.BoxGeometry(1, 1, 1)), keep(new T.MeshLambertMaterial({ color: night ? '#ffe39a' : '#2f3b4a', emissive: night ? '#7a5a1a' : '#000' })), MAXV);
  for (const m of [bodies, heads, vehicles, glassBand]) { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); }
  const REAL = { waymo: [4.9, 2.0, 1.6, '#f1f3f5'], bus: [12, 2.6, 3.2, '#3b6fb6'], train: [30, 2.65, 3.6, '#e03131'] };

  // pins (AR-style: visible through walls, nearest ones only) and corner signs
  const labelTex = (txt, emoji, bg) => { const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 512; c.height = 128; g.font = '700 40px system-ui, sans-serif'; const w = Math.min(500, g.measureText(txt).width + 120);
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 512, 128); g.fillStyle = bg; rr(g, (512 - w) / 2, 22, w, 84, 42); g.fill();
    g.font = '44px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(emoji, (512 - w) / 2 + 22, 66); g.font = '700 40px system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(txt.length > 22 ? txt.slice(0, 21) + '…' : txt, (512 - w) / 2 + 92, 66);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return keep(t); };
  const pins = [];
  for (const s of city.spots) {
    if (s.tunnel || !s.places.some((p) => city.sceneOk(p))) continue;
    const st = s.style || {}, mat = keep(new T.SpriteMaterial({ map: labelTex(s.label, st.emoji || '📍', city.scene === 'night' ? 'rgba(95,61,196,.92)' : 'rgba(232,89,12,.92)'), depthTest: false, transparent: true }));
    const sp = new T.Sprite(mat); sp.scale.set(12, 3, 1); sp.position.set(s.x * S, 9 + (s.bldg ? Math.min(6, s.bldg.h * 2) : 0), s.y * S); sp.renderOrder = 10; sp.userData.spot = s; sp.visible = false; scene.add(sp); pins.push(sp);
  }
  // street furniture: blade signs on every corner, streetlights, crosswalks and street trees
  const signs = [];
  const nameTex = {}; const texFor = (n) => nameTex[n] || (nameTex[n] = (() => { const c2 = document.createElement('canvas'); c2.width = 512; c2.height = 96; const g = c2.getContext('2d'); g.fillStyle = '#1e6b3a'; rr(g, 2, 2, 508, 92, 10); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; rr(g, 8, 8, 496, 80, 8); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 50px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(/ (St|Ave|Pkwy|Blvd)$/.test(n) ? n : n + ' St', 256, 51); const t = keep(new T.CanvasTexture(c2)); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; })());
  const bladeGeo = keep(new T.PlaneGeometry(1.9, 0.36)), poleGeo = keep(new T.CylinderGeometry(0.05, 0.06, 3.9, 6)), poleMat = keep(new T.MeshLambertMaterial({ color: '#33373e' }));
  const blade = (name, x, z, rotY, y) => { const m = keep(new T.MeshBasicMaterial({ map: texFor(name), side: T.FrontSide })), g = new T.Group(); const f = new T.Mesh(bladeGeo, m), b = new T.Mesh(bladeGeo, m); b.rotation.y = Math.PI; g.add(f, b); g.position.set(x, y, z); g.rotation.y = rotY; return g; };
  for (const a of A) for (const c of C) {
    const px = (a.x + sw + 0.15) * S, pz = (c.y + sw + 0.15) * S, g = new T.Group();
    const pole = new T.Mesh(poleGeo, poleMat); pole.position.set(px, 1.95, pz); g.add(pole);
    g.add(blade(a.n, px - 0.95 * 0, pz - 0.95, Math.PI / 2, 3.55));   // parallel to the avenue
    g.add(blade(c.n, px - 0.95, pz, 0, 3.15));                          // parallel to the cross street
    g.visible = false; g.userData.x = px / S; g.userData.y = pz / S; scene.add(g); signs.push(g);
  }
  const corners = []; for (const a of A) for (const c of C) for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) corners.push([a.x + sx * (sw + 0.3), c.y + sy * (sw + 0.3)]);
  // streetlights on every corner (heads glow after dark)
  { const n = corners.length, poles = new T.InstancedMesh(keep(new T.CylinderGeometry(0.07, 0.09, 7, 6)), poleMat, n), heads = new T.InstancedMesh(keep(new T.BoxGeometry(0.9, 0.18, 0.35)), keep(new T.MeshLambertMaterial({ color: night ? '#fff3c4' : '#dfe3e8', emissive: night ? '#ffd27a' : '#000', emissiveIntensity: night ? 1.4 : 0 })), n);
    corners.forEach(([x, y], i) => { M.makeTranslation(x * S, 3.5, y * S); poles.setMatrixAt(i, M); M.makeTranslation(x * S, 7, y * S); heads.setMatrixAt(i, M); });
    scene.add(poles, heads);
    if (night) { const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d'), gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128);
      const glow = new T.InstancedMesh(keep(new T.PlaneGeometry(14, 14)), keep(new T.MeshBasicMaterial({ map: keep(new T.CanvasTexture(gc)), transparent: true, depthWrite: false, blending: T.AdditiveBlending })), n);
      corners.forEach(([x, y], i) => { Q.setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2); M.compose(V.set(x * S, 0.18, y * S), Q, SC.set(1, 1, 1)); glow.setMatrixAt(i, M); }); scene.add(glow); } }
  // zebra crosswalks at every intersection
  { const bars = []; for (const a of A) for (const c of C) { const L = sw * 2 * S; for (let k = -2; k <= 2; k++) { const o = k * 1.2; bars.push([a.x * S + o, (c.y - sw - 0.35) * S, 0], [a.x * S + o, (c.y + sw + 0.35) * S, 0], [(a.x - sw - 0.35) * S, c.y * S + o, 1], [(a.x + sw + 0.35) * S, c.y * S + o, 1]); } }
    const cw = new T.InstancedMesh(keep(new T.BoxGeometry(0.6, 0.02, 3)), keep(new T.MeshLambertMaterial({ color: night ? '#8d8f94' : '#f1f3f5' })), bars.length);
    bars.forEach(([x, z, rot], i) => { Q.setFromAxisAngle(up, rot ? Math.PI / 2 : 0); M.compose(V.set(x, 0.03, z), Q, SC.set(1, 1, 1)); cw.setMatrixAt(i, M); }); scene.add(cw); }
  // street trees along the sidewalks, wherever there's room
  { const pts = [], step = 2.6, off = sw + 0.28;
    const nearCross = (v, arr, key) => arr.some((q) => Math.abs(q[key] - v) < sw + 0.9);
    for (const a of A) for (const side of [-1, 1]) for (let y = C[0].y; y < C[C.length - 1].y; y += step) { const x = a.x + side * off; if (!nearCross(y, C, 'y') && !blocked(x, y) && hash(x.toFixed(1) + y.toFixed(1)) > 0.3) pts.push([x, y]); }
    for (const c of C) for (const side of [-1, 1]) for (let x = A[0].x; x < A[A.length - 1].x; x += step) { const y = c.y + side * off; if (!nearCross(x, A, 'x') && !blocked(x, y) && hash(x.toFixed(1) + y.toFixed(1)) > 0.3) pts.push([x, y]); }
    const trunks = new T.InstancedMesh(keep(new T.CylinderGeometry(0.12, 0.16, 2.4, 6)), keep(new T.MeshLambertMaterial({ color: '#5c4433' })), pts.length);
    const crowns = new T.InstancedMesh(keep(new T.IcosahedronGeometry(1.6, 0)), keep(new T.MeshLambertMaterial({ color: night ? '#3c6b4a' : '#4f8a3c', flatShading: true })), pts.length);
    pts.forEach(([x, y], i) => { const k = 0.8 + hash(y.toFixed(2) + x.toFixed(2)) * 0.5; M.makeTranslation(x * S, 1.35, y * S); trunks.setMatrixAt(i, M); M.compose(V.set(x * S, 3.3 * k, y * S), Q.identity(), SC.set(k, k * 1.15, k)); crowns.setMatrixAt(i, M); crowns.setColorAt(i, col.set(night ? ['#3c6b4a', '#42744f', '#365f43'][i % 3] : ['#4f8a3c', '#5d9945', '#457a35'][i % 3])); });
    scene.add(trunks, crowns); }
  // METRORail platforms: raised platform, canopy on posts, and a name board
  { const R = city.rail; if (R?.stations) { const plat = [], roof = [], posts = [];
      for (const st of R.stations) for (const pl of st.plats || [st]) { const alongY = st.line === 'red' || Math.abs(pl.x - R.x) < 0.5;
        for (const side of [-1, 1]) { const ox = alongY ? side * 0.95 : 0, oy = alongY ? 0 : side * 0.62, cx = (pl.x + ox) * S, cz = (pl.y + oy) * S, Lx = alongY ? 3 : 28, Lz = alongY ? 28 : 3;
          plat.push([cx, cz, Lx, Lz]); roof.push([cx, cz, Lx + 0.6, Lz * 0.7]); for (const k of [-1, 0, 1]) posts.push([cx + (alongY ? 0 : k * 9), cz + (alongY ? k * 9 : 0)]); }
        const sgc = document.createElement('canvas'); sgc.width = 512; sgc.height = 96; const sg = sgc.getContext('2d'); sg.fillStyle = st.line === 'red' ? '#c92a2a' : st.line === 'green' ? '#2b8a3e' : '#5f3dc4'; rr(sg, 2, 2, 508, 92, 12); sg.fill(); sg.fillStyle = '#fff'; sg.font = '700 44px system-ui, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('🚉 ' + st.n, 256, 50);
        const bt = keep(new T.CanvasTexture(sgc)); bt.colorSpace = T.SRGBColorSpace; const sp = new T.Sprite(keep(new T.SpriteMaterial({ map: bt }))); sp.scale.set(8, 1.5, 1); sp.position.set(pl.x * S, 5.4, pl.y * S); scene.add(sp); }
      const box = (arr, h, y, colr) => { const parts = arr.map(([x, z, lx, lz]) => { const g = new T.BoxGeometry(lx, h, lz).toNonIndexed(); g.translate(x, y, z); return g; }); const m = new T.Mesh(keep(merge(parts)), keep(new T.MeshLambertMaterial({ color: colr }))); parts.forEach((g) => g.dispose()); scene.add(m); };
      box(plat, 0.45, 0.22, night ? '#55585f' : '#c8c3b8'); box(roof, 0.2, 4.2, night ? '#3d4a5c' : '#9fb3c8');
      const pm = new T.InstancedMesh(keep(new T.CylinderGeometry(0.1, 0.1, 3.8, 6)), poleMat, posts.length); posts.forEach(([x, z], i) => { M.makeTranslation(x, 2.3, z); pm.setMatrixAt(i, M); }); scene.add(pm);
      const rails = []; const addR = (ax, ay, bx, by) => { for (const o of [-0.08, 0.08]) { const alongY = Math.abs(bx - ax) < 1e-6, L = (alongY ? Math.abs(by - ay) : Math.abs(bx - ax)) * S; const g = new T.BoxGeometry(alongY ? 0.08 : L, 0.12, alongY ? L : 0.08).toNonIndexed(); g.translate(((ax + bx) / 2 + (alongY ? o : 0)) * S, 0.15, ((ay + by) / 2 + (alongY ? 0 : o)) * S); rails.push(g); } };
      for (const side of [-0.32, 0.32]) addR(R.x + side, R.y0, R.x + side, R.y1); if (R.xW != null) for (const y of [R.capY, R.ruskY]) addR(R.xW, y, R.xE, y);
      const rm = new T.Mesh(keep(merge(rails)), keep(new T.MeshLambertMaterial({ color: '#9aa1a8' }))); rails.forEach((g) => g.dispose()); scene.add(rm); } }

  // walking route, when navigation is on
  let routeMesh = null, routeBuilt = null;
  const routeMat = keep(new T.MeshBasicMaterial({ color: '#1c7ed6', transparent: true, opacity: 0.85 }));
  const syncRoute = () => {
    const n = city.nav; if ((n?.builtAt || null) === routeBuilt) return; routeBuilt = n?.builtAt || null;
    if (routeMesh) { scene.remove(routeMesh); routeMesh.geometry.dispose(); routeMesh = null; }
    if (!n?.pts) return; const parts = [];
    for (let k = 1; k < n.pts.length; k++) { const [ax, ay] = n.pts[k - 1], [bx, by] = n.pts[k], L = Math.hypot(bx - ax, by - ay) * S; if (L < 0.05) continue; const g = new T.BoxGeometry(1.1, 0.06, L + 1.1).toNonIndexed(); g.rotateY(Math.atan2(bx - ax, by - ay)); g.translate(((ax + bx) / 2) * S, 0.2, ((ay + by) / 2) * S); parts.push(g); }
    routeMesh = new T.Mesh(merge(parts), routeMat); parts.forEach((g) => g.dispose()); scene.add(routeMesh);
    const arr = []; for (let k = 1; k < n.pts.length; k++) { const [ax, ay] = n.pts[k - 1], [bx, by] = n.pts[k], L = Math.hypot(bx - ax, by - ay) * S, ang = Math.atan2(bx - ax, by - ay); for (let d = 2; d < L - 1; d += 5) { const t = d / L; arr.push([(ax + (bx - ax) * t) * S, (ay + (by - ay) * t) * S, ang]); } }
    const sh = new T.Shape(); sh.moveTo(0, 0.9); sh.lineTo(0.75, -0.2); sh.lineTo(0.42, -0.2); sh.lineTo(0, 0.38); sh.lineTo(-0.42, -0.2); sh.lineTo(-0.75, -0.2); sh.closePath();
    const ag = new T.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); ag.rotateY(Math.PI);
    const am = new T.InstancedMesh(ag, arrowMat, arr.length); arr.forEach(([x, z, ang], i) => { Q.setFromAxisAngle(up, ang); M.compose(V.set(x, 0.26, z), Q, SC.set(1, 1, 1)); am.setMatrixAt(i, M); }); routeMesh.add(am);
  };
  const arrowMat = keep(new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }));

  // ---- the tunnel network, one level down: lit corridors linking the tunnel shops ----
  const streetObjs = scene.children.filter((o) => !o.isLight);
  const tunnel = new T.Group(); tunnel.visible = false; scene.add(tunnel);
  const TW2 = 0.24, legs = [];   // half-width in map units (~5 m corridors)
  { const TS = city.tunnelSpots || []; for (const [a, b] of city.tunnelEdges || []) { const A0 = TS[a], B0 = TS[b]; if (!A0 || !B0) continue; const sec = tunnelSection(B0) || tunnelSection(A0); for (const L of [[A0.x, A0.y, B0.x, A0.y], [B0.x, A0.y, B0.x, B0.y]]) if (Math.hypot(L[2] - L[0], L[3] - L[1]) > 0.05) { L.sec = sec; legs.push(L); } }
    const fl = [], ce = [], wl = [];
    for (const [ax, ay, bx, by] of legs) { const x0 = Math.min(ax, bx) - TW2, x1 = Math.max(ax, bx) + TW2, y0 = Math.min(ay, by) - TW2, y1 = Math.max(ay, by) + TW2; if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) continue;
      const g = new T.BoxGeometry((x1 - x0) * S, 0.1, (y1 - y0) * S).toNonIndexed(); g.translate(((x0 + x1) / 2) * S, -0.05, ((y0 + y1) / 2) * S); fl.push(g);
      const c2 = g.clone(); c2.translate(0, 3.6, 0); ce.push(c2);
      const horiz = Math.abs(bx - ax) > Math.abs(by - ay);
      for (const sd of [-1, 1]) { const w = horiz ? new T.BoxGeometry((x1 - x0) * S, 3.6, 0.15) : new T.BoxGeometry(0.15, 3.6, (y1 - y0) * S); const wg = w.toNonIndexed(); w.dispose(); wg.translate(horiz ? ((x0 + x1) / 2) * S : (sd < 0 ? x0 : x1) * S, 1.8, horiz ? (sd < 0 ? y0 : y1) * S : ((y0 + y1) / 2) * S); wl.push(wg); } }
    if (fl.length) {
      const tm = (arr, colr, em) => { const m = new T.Mesh(keep(merge(arr)), keep(new T.MeshLambertMaterial({ color: colr, emissive: em || '#000', side: T.DoubleSide }))); arr.forEach((g) => g.dispose()); tunnel.add(m); };
      tm(fl, '#c9c2b4'); tm(ce, '#eef1f4', '#9aa3ad');
      { const m = new T.Mesh(keep(merge(wl)), keep(new T.MeshLambertMaterial({ color: '#e7d9c4', emissive: '#5a4e40', transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }))); wl.forEach((g) => g.dispose()); tunnel.add(m); }
      // ceiling light strips
      const strips = []; for (const [ax, ay, bx, by] of legs) { const L = Math.hypot(bx - ax, by - ay) * S; if (L < 1) continue; const g = new T.BoxGeometry(Math.abs(bx - ax) > 1e-6 ? L : 0.5, 0.05, Math.abs(bx - ax) > 1e-6 ? 0.5 : L).toNonIndexed(); g.translate(((ax + bx) / 2) * S, 3.52, ((ay + by) / 2) * S); strips.push(g); }
      const lm = new T.Mesh(keep(merge(strips)), keep(new T.MeshBasicMaterial({ color: '#fffbea' }))); strips.forEach((g) => g.dispose()); tunnel.add(lm);
      // a coloured stripe down the middle of each corridor, in that tunnel section's map colour
      const bySec = new Map(); for (const L of legs) { const c = TUNNEL_COLORS[L.sec] || '#38d9a9'; if (!bySec.has(c)) bySec.set(c, []); const [ax, ay, bx, by] = L, len = Math.hypot(bx - ax, by - ay) * S; const g = new T.BoxGeometry(Math.abs(bx - ax) > 1e-6 ? len : 0.7, 0.02, Math.abs(bx - ax) > 1e-6 ? 0.7 : len).toNonIndexed(); g.translate(((ax + bx) / 2) * S, 0.01, ((ay + by) / 2) * S); bySec.get(c).push(g); }
      for (const [c, arr] of bySec) { const mm = new T.Mesh(keep(merge(arr)), keep(new T.MeshBasicMaterial({ color: c }))); arr.forEach((g) => g.dispose()); tunnel.add(mm); }
    }
  }
  const tunnelPins = [];
  for (const s of (city.tunnelSpots || [])) { if (!s.places?.length) continue; const st = s.style || {}, sp = new T.Sprite(keep(new T.SpriteMaterial({ map: labelTex(s.label, st.emoji || '📍', 'rgba(18,184,134,.95)'), depthTest: false, transparent: true }))); sp.scale.set(7, 1.75, 1); sp.position.set(s.x * S, 2.6, s.y * S); sp.renderOrder = 10; sp.userData.spot = s; sp.visible = false; tunnel.add(sp); tunnelPins.push(sp); }
  tunnel.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  const inTunnel = (x, y) => legs.some(([ax, ay, bx, by]) => x > Math.min(ax, bx) - TW2 + 0.04 && x < Math.max(ax, bx) + TW2 - 0.04 && y > Math.min(ay, by) - TW2 + 0.04 && y < Math.max(ay, by) + TW2 - 0.04);
  let under = false, streetPos = null;
  const setUnder = (u) => {
    if (u && !legs.length) return;
    under = u; tunnel.visible = u; for (const o of streetObjs) o.visible = !u ? (o.userData.wasVis ?? true) : (o.userData.wasVis = o.visible, false);
    if (u) { streetPos = { x: me.x, y: me.y }; let best = null, bd = 1e9; for (const [ax, ay, bx, by] of legs) for (let t = 0.05; t <= 0.951; t += 0.1) { const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, d = Math.hypot(x - me.x, y - me.y); if (d < bd) { bd = d; best = t <= 0.5 ? [x, y, bx - ax, by - ay] : [x, y, ax - bx, ay - by]; } }
      me.x = best[0]; me.y = best[1]; me.yaw = Math.atan2(-best[2], -best[3]); me.pitch = -0.12; scene.fog = new T.Fog('#2b2a27', 20, 140); scene.background = new T.Color('#2b2a27'); hemi.intensity = 2.2; hemi.color.set('#fff6e6'); hemi.groundColor.set('#8a8172');
      $('.pov-title').textContent = '🚇 Downtown tunnels'; follow = false; }
    else { const tp = { x: me.x, y: me.y }; if (blocked(tp.x, tp.y)) { for (let rad = 0.3; rad < 8 && blocked(tp.x, tp.y); rad += 0.3) for (let a = 0; a < 6.28; a += 0.4) if (!blocked(me.x + Math.cos(a) * rad, me.y + Math.sin(a) * rad)) { tp.x = me.x + Math.cos(a) * rad; tp.y = me.y + Math.sin(a) * rad; break; } }
      me.x = tp.x; me.y = tp.y; scene.fog = streetFog; scene.background = streetBg; hemi.intensity = hemiI; hemi.color.copy(hemiC); hemi.groundColor.copy(hemiG); $('.pov-title').textContent = '🧍 Street view'; }
    $('[data-a=tunnel]').textContent = u ? '⬆️' : '🚇'; $('[data-a=tunnel]').title = u ? 'Back up to the street' : 'Go down to the tunnels';
  };
  const streetFog = scene.fog, streetBg = scene.background, hemi = scene.children.find((o) => o.isHemisphereLight), hemiI = hemi.intensity, hemiC = hemi.color.clone(), hemiG = hemi.groundColor.clone();

  // ---- the walker ----
  const me = { x: opts.start?.x ?? city.v.cx, y: opts.start?.y ?? city.v.cy, yaw: opts.start?.yaw ?? 0, pitch: opts.start?.pitch ?? 0.02 };
  let follow = !!opts.follow && !!city.user?.inside, showPins = true, showLife = !(city.hide?.people && city.hide?.traffic);
  if (blocked(me.x, me.y)) { for (let r = 0.3; r < 6 && blocked(me.x, me.y); r += 0.3) for (let a = 0; a < 6.28; a += 0.5) if (!blocked(me.x + Math.cos(a) * r, me.y + Math.sin(a) * r)) { me.x += Math.cos(a) * r; me.y += Math.sin(a) * r; break; } }
  const fb = $('[data-a=follow]'); const setFollow = (f) => { follow = f && !!city.user?.inside; fb.classList.toggle('on', follow); fb.textContent = follow ? '📍 Following you' : '📍 Follow me'; };
  fb.hidden = !city.user?.inside; setFollow(follow);
  const keys = new Set(); let pad = [0, 0];
  const onKey = (e) => { if (/^(Arrow|Key[WASD])/.test(e.code)) { e.type === 'keydown' ? keys.add(e.code) : keys.delete(e.code); e.preventDefault(); } if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  // look by dragging; tap a pin
  let drag = null; const ray = new T.Raycaster(), ndc = new T.Vector2();
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); me.yaw += dx * 0.0055; me.pitch = Math.max(-1.1, Math.min(1.1, me.pitch + dy * 0.004)); if (drag.moved > 8 && follow && city.user?.heading != null) setFollow(false); });
  cv.addEventListener('pointerup', (e) => { if (drag && drag.moved < 8) { const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects([...pins, ...tunnelPins].filter((p) => p.visible))[0]; if (hit) opts.onPick?.(hit.object.userData.spot); } drag = null; });
  // joystick
  const padEl = $('.pov-pad'), knob = $('.pov-knob'); let padId = null;
  const padMove = (e) => { const r = padEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } pad = [dx, dy]; knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`; };
  padEl.addEventListener('pointerdown', (e) => { padId = e.pointerId; try { padEl.setPointerCapture(e.pointerId); } catch (_) {} padMove(e); if (follow) setFollow(false); e.preventDefault(); });
  padEl.addEventListener('pointermove', (e) => { if (e.pointerId === padId) padMove(e); });
  const padEnd = () => { padId = null; pad = [0, 0]; knob.style.transform = ''; }; padEl.addEventListener('pointerup', padEnd); padEl.addEventListener('pointercancel', padEnd);
  wrap.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'close') close(); if (a === 'tunnel') setUnder(!under); if (a === 'follow') setFollow(!follow); if (a === 'labels') { showPins = !showPins; e.target.closest('button').classList.toggle('off', !showPins); } if (a === 'people') { showLife = !showLife; e.target.closest('button').classList.toggle('off', !showLife); } });
  const resize = () => { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();
  city.paused = true;
  setTimeout(() => $('.pov-hint')?.classList.add('fade'), 5000);

  let raf = 0, last = performance.now(), navTick = 0, moveTick = 0, secTick = 0;
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    // movement: pad / keys, in the direction you're looking
    let f = -pad[1], s = pad[0];
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1; if (keys.has('KeyA')) s -= 1; if (keys.has('KeyD')) s += 1;
    if (keys.has('ArrowLeft')) me.yaw += dt * 1.8; if (keys.has('ArrowRight')) me.yaw -= dt * 1.8;
    if (f || s) { const sp = 0.75 * dt, dx = (-Math.sin(me.yaw) * f + Math.cos(me.yaw) * s) * sp, dy = (-Math.cos(me.yaw) * f - Math.sin(me.yaw) * s) * sp;
      const ok = (x, y) => (under ? inTunnel(x, y) : !blocked(x, y)); if (ok(me.x + dx, me.y)) me.x += dx; if (ok(me.x, me.y + dy)) me.y += dy;
      me.x = Math.max(B.x0 - 10, Math.min(B.x1 + 10, me.x)); me.y = Math.max(B.y0 - 10, Math.min(B.y1 + 10, me.y)); }
    if (follow && city.user?.inside) { const u = city.user; me.x += (u.x - me.x) * Math.min(1, dt * 3); me.y += (u.y - me.y) * Math.min(1, dt * 3);
      if (u.heading != null && !Number.isNaN(u.heading)) { const h = (u.heading * Math.PI) / 180, N = city.northW, E = city.eastW, dx = N[0] * Math.cos(h) + E[0] * Math.sin(h), dy = N[1] * Math.cos(h) + E[1] * Math.sin(h), want = Math.atan2(-dx, -dy); let d = ((want - me.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; me.yaw += d * Math.min(1, dt * 4); } }
    if (under) { follow = false; if ((secTick += dt) > 0.5) { secTick = 0; const L = legs.find(([ax, ay, bx, by]) => me.x > Math.min(ax, bx) - TW2 && me.x < Math.max(ax, bx) + TW2 && me.y > Math.min(ay, by) - TW2 && me.y < Math.max(ay, by) + TW2); if (L) $('.pov-title').textContent = '🚇 ' + (L.sec || 'Downtown tunnels'); } }
    camera.position.set(me.x * S, EYE + Math.sin(t / 180) * ((f || s) ? 0.04 : 0), me.y * S);
    if (opts.onMove && (moveTick += dt) > 0.3) { moveTick = 0; opts.onMove({ x: me.x, y: me.y, yaw: me.yaw, under }); } camera.rotation.set(me.pitch, me.yaw, 0);
    // pins & signs: nearest only
    const near = pins.map((p) => [p, Math.hypot(p.position.x / S - me.x, p.position.z / S - me.y)]).filter(([, d]) => d < 30).sort((a, b) => a[1] - b[1]).slice(0, 18);
    for (const p of tunnelPins) { const d = Math.hypot(p.position.x / S - me.x, p.position.z / S - me.y); p.visible = under && showPins && d < 25; }
    for (const p of pins) p.visible = false; if (showPins && !under) for (const [p, d] of near) { p.visible = true; const k = Math.max(0.85, Math.min(1.8, d / 8)); p.scale.set(12 * k, 3 * k, 1); }
    for (const sg of signs) sg.visible = !under && Math.hypot(sg.userData.x - me.x, sg.userData.y - me.y) < 22;
    // people
    let np = 0;
    if (showLife) for (const n of city.npcs) { if (!!n.under !== under || n.inside > 0 || np >= MAXP) continue; const bob = Math.abs(Math.sin((n.phase || 0) * 2)) * 0.05;
      M.makeTranslation(n.x * S, 0.15 + 0.72 + bob, n.y * S); bodies.setMatrixAt(np, M); bodies.setColorAt(np, col.set(n.look?.shirt || '#4dabf7'));
      M.makeTranslation(n.x * S, 0.15 + 1.6 + bob, n.y * S); heads.setMatrixAt(np, M); heads.setColorAt(np, col.set(n.look?.skin || '#c68642')); np++; }
    bodies.count = heads.count = np; bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true; if (np) { bodies.instanceColor.needsUpdate = heads.instanceColor.needsUpdate = true; }
    // vehicles
    let nv = 0; const live = !!city.liveData, liveRail = (live && (city.liveCars || []).some((c) => c.kind === 'train')) || city.liveRailSeen;
    const put = (b, kind, colr) => { if (nv >= MAXV) return; const [L, W, H, c0] = REAL[kind] || REAL.waymo, alongX = b.w > b.d; Q.setFromAxisAngle(up, alongX ? Math.PI / 2 : 0);
      V.set((b.x + b.w / 2) * S, H / 2 + 0.05, (b.y + b.d / 2) * S); SC.set(W, H, L); M.compose(V, Q, SC); vehicles.setMatrixAt(nv, M); vehicles.setColorAt(nv, col.set(colr || c0));
      V.y = H * 0.68; SC.set(W * 1.02, H * 0.28, L * 0.92); M.compose(V, Q, SC); glassBand.setMatrixAt(nv, M); nv++; };
    if (showLife && !under) {
      for (const c of [...(city.cars || []).filter((c) => !live || c.kind !== 'bus'), ...(city.liveCars || [])]) put(city.carBox(c), c.kind, c.kind === 'train' ? '#e03131' : null);
      if (!liveRail) for (const tr of city.trains || []) put(city.trainBox(tr), 'train');
    }
    vehicles.count = glassBand.count = nv; vehicles.instanceMatrix.needsUpdate = glassBand.instanceMatrix.needsUpdate = true; if (nv) vehicles.instanceColor.needsUpdate = true;
    syncRoute();
    if ((navTick += dt) > 0.5) { navTick = 0; const txt = opts.navText?.(); const el = $('.pov-nav'); el.hidden = !txt; if (txt) el.textContent = txt; }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function close() {
    cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', resize);
    scene.traverse((o) => { if (o.isMesh || o.isSprite || o.isLineSegments) { o.geometry?.dispose?.(); } });
    disposables.forEach((d) => d.dispose?.()); renderer.dispose(); renderer.forceContextLoss?.(); wrap.remove();
    city.paused = false; opts.onClose?.({ x: me.x, y: me.y });
  }
  return { close, where: () => ({ ...me }), under: () => under, _dbg: () => ({ legs: legs.length, kids: tunnel.children.length, vis: tunnel.visible, me: { ...me }, cam: camera.position.toArray(), inT: inTunnel(me.x, me.y), meshes: tunnel.children.filter((c) => c.isMesh).map((c) => [c.visible, c.geometry.attributes.position.count, c.geometry.boundingSphere && c.geometry.boundingSphere.center.toArray().map((v) => Math.round(v)), c.material.type, c.material.opacity]), legs0: legs.slice(0, 3) }) };

  // ---- helpers (hoisted) ----
  function merge(geos) {
    let n = 0; const hasUv = geos.every((g) => g.attributes.uv), hasCol = geos.every((g) => g.attributes.color); for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = hasUv ? new Float32Array(n * 2) : null, colr = hasCol ? new Float32Array(n * 3) : null; let o = 0;
    for (const g of geos) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (uv) uv.set(g.attributes.uv.array, o * 2); if (colr) colr.set(g.attributes.color.array, o * 3); o += c; }
    const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); if (uv) out.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (colr) out.setAttribute('color', new T.BufferAttribute(colr, 3));
    if (!geos.every((g) => g.attributes.normal)) out.computeVertexNormals(); out.computeBoundingSphere(); return out;
  }
  function sliceGroup(g, start, count) {
    const out = new T.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; if (!a) continue; out.setAttribute(k, new T.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize)); } return out;
  }
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
