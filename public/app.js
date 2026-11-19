import { openState, parseHours, fmt } from './hours.js';
import { CityMap, styleFor, parseStreetQuery } from './map.js';

const $ = (s) => document.querySelector(s);
const store = { get(k, d) { try { const v = localStorage.getItem('dte_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('dte_' + k, JSON.stringify(v)); } catch (e) {} } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $$ = (n) => '$'.repeat(n);
const PRICE_TXT = { 1: 'under $15', 2: '$15–30', 3: '$30–60', 4: '$60+' };   // per person, food before drinks
const q = encodeURIComponent;
// app theme: follows the phone by default; the header button cycles Auto → Light → Dark
const THEMES = ['auto', 'light', 'dark'], THEME_ICON = { auto: '🌓', light: '☀️', dark: '🌙' };
function applyTheme(t) { const h = document.documentElement; if (t === 'auto') delete h.dataset.theme; else h.dataset.theme = t; const b = document.querySelector('#themeBtn'); if (b) { b.textContent = THEME_ICON[t]; b.title = 'Theme: ' + t; }
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#17120f' : '#d9481e'); }
let THEME = (() => { try { return localStorage.getItem('theme') || 'auto'; } catch (e) { return 'auto'; } })(); applyTheme(THEME);
document.addEventListener('click', (e) => { if (e.target.id !== 'themeBtn') return; THEME = THEMES[(THEMES.indexOf(THEME) + 1) % 3]; try { localStorage.setItem('theme', THEME); } catch (_) {} applyTheme(THEME); toast(THEME === 'auto' ? '🌓 Theme follows your phone' : THEME === 'dark' ? '🌙 Dark theme' : '☀️ Light theme'); });
// bigger text for easier reading: the header "A" button steps 100% → 115% → 130%
const ZOOMS = [1, 1.15, 1.3]; let ZOOM = +(store.get('zoom', 1)); const applyZoom = () => { document.documentElement.style.setProperty('--zoom', ZOOM); const b = document.querySelector('#textBtn'); if (b) b.setAttribute('aria-label', `Text size ${Math.round(ZOOM * 100)}%`); }; applyZoom();
document.addEventListener('click', (e) => { if (e.target.id !== 'textBtn') return; ZOOM = ZOOMS[(ZOOMS.indexOf(ZOOM) + 1) % ZOOMS.length] || 1; store.set('zoom', ZOOM); applyZoom(); toast(`Text ${Math.round(ZOOM * 100)}%`); });
const buzz = (p = 10) => { try { navigator.vibrate?.(p); } catch (e) {} };   // a light tap on phones that support it
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._); t._ = setTimeout(() => t.classList.remove('on'), 2200); };

let HFIX = store.get('hoursFix', {}), GEO_P = Promise.resolve(), GEO_READY = false;
let DATA = [], FOOD = [], HH = { spots: {} }, META = {}, HCHK = {}, EVENTS = [];
const MOODS = [
  { k: 'quick', e: '⚡', l: 'Quick bite' }, { k: 'healthy', e: '🥗', l: 'Light & healthy' }, { k: 'comfort', e: '🍔', l: 'Comfort food' },
  { k: 'spicy', e: '🌶️', l: 'Spicy' }, { k: 'adventurous', e: '🧭', l: 'Adventurous' }, { k: 'date', e: '🕯️', l: 'Date night' },
  { k: 'client', e: '💼', l: 'Client / work' }, { k: 'upscale', e: '🥩', l: 'Treat myself' }, { k: 'drinks', e: '🍸', l: 'Drinks too' },
  { k: 'group', e: '👯', l: 'Group outing' }, { k: 'sweet', e: '🍰', l: 'Something sweet' }, { k: 'caffeine', e: '☕', l: 'Coffee fix' },
  { k: 'sports', e: '⚾', l: 'Game day' }, { k: 'veg', e: '🌱', l: 'Veg-friendly' }];
const MEALS = ['Any', 'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Happy Hour', 'Late Night'];
const BUDGET = [{ k: 0, l: 'Any' }, { k: 1, l: 'Under $15' }, { k: 2, l: 'Under $30' }, { k: 3, l: 'Under $60' }];
const EXTRAS = [{ k: 'open', l: '🟢 Open now' }, { k: 'tunnel', l: '🚇 In the tunnels' }, { k: 'street', l: '🏙️ Street level' }, { k: 'Patio', l: '☀️ Patio' }, { k: 'Pet Friendly', l: '🐶 Pet friendly' }, { k: 'Food Hall', l: '🏛️ Food hall' }, { k: 'Full Service', l: '🍽️ Sit-down' }, { k: 'notfav', l: '🆕 Somewhere new' }];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const st = { moods: new Set(store.get('moods', [])), meal: store.get('meal', 'Any'), budget: store.get('budget', 0), extras: new Set(store.get('extras', [])) };
let favs = new Set(store.get('favs', [])), visits = store.get('visits', {});
let week = store.get('week', { slot: 'Lunch', days: {} });
let SYNC = store.get('syncKey', null), _syncT = null;
function syncData() { return { v: 1, at: Date.now(), favs: [...favs], visits, log: store.get('log', []), week, diet: store.get('diet', []), office: store.get('office', null), hfix: store.get('hoursFix', {}) }; }
function syncSoon() { if (!SYNC) return; clearTimeout(_syncT); _syncT = setTimeout(() => rpc('de_sync_put', { p_key: SYNC, p_data: syncData() }).catch(() => {}), 1500); }
async function syncPull() {
  if (!SYNC) return; try { const d = await rpc('de_sync_get', { p_key: SYNC }); if (!d) { syncSoon(); return; }
    for (const n of d.favs || []) favs.add(n); for (const [n, c] of Object.entries(d.visits || {})) visits[n] = Math.max(visits[n] || 0, c);
    const seen = new Set(LOG.map((x) => x.t + x.n)); for (const x of d.log || []) if (!seen.has(x.t + x.n)) LOG.push(x); LOG.sort((a, b) => a.t - b.t); store.set('log', LOG);
    if (d.week && (d.at || 0) > (store.get('syncAt', 0))) week = d.week; if (d.diet) { DIET = new Set([...DIET, ...d.diet]); store.set('diet', [...DIET]); }
    if (!OFFICE && d.office) { OFFICE = d.office; store.set('office', OFFICE); } Object.assign(HFIX, d.hfix || {}); store.set('hoursFix', HFIX);
    store.set('syncAt', Date.now()); save(); renderPick(); } catch (e) {}
}
// ---------- small backend (Supabase): live votes, sync across devices, push reminders ----------
const SB = 'https://bazjlrualnmbanmhiuau.supabase.co', SBK = 'sb_publishable_ez3TVctnbFIUHqr_dMOUeQ_5WpsYEHs', VAPID = 'BCJegSVrwj6kYQkAfHScuzrJlWI6srf_3uKYobxu7nZ_u1ozmTSWNpX3zHckkxYVYD61hXbUsm-OxU-Gq0FpX-M';
async function sb(path, opt = {}) { const r = await fetch(SB + '/rest/v1/' + path, { ...opt, headers: { apikey: SBK, 'content-type': 'application/json', ...(opt.headers || {}) } }); if (!r.ok) throw new Error(await r.text()); const t = await r.text(); return t ? JSON.parse(t) : null; }
const rpc = (fn, args) => sb('rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });
const save = () => { store.set('moods', [...st.moods]); store.set('meal', st.meal); store.set('budget', st.budget); store.set('extras', [...st.extras]); store.set('favs', [...favs]); store.set('visits', visits); store.set('week', week); syncSoon(); };

const hhFor = (r) => HH.spots[r.name] || null;
// is happy hour on right now? (the "when" text uses the same day/time grammar as opening hours)
// is happy hour on right now? (the "when" text uses the same day/time grammar as opening hours)
// Not on days the place is closed, and never past closing time; "till" is shown as a clock time.
const closedAllDay = (r, d) => { const p = parseHours(r.hours); if (!p || p.always) return false; const day = d.getDay(); return !p.rules.some((x) => !x.closed && x.days.includes(day)); };
const hhNow = (r, d = new Date()) => { const h = hhFor(r); if (!h) return null; const s = openState(h.when.replace(/[“”"][^“”"]*[“”"]/g, '').replace(/\(.*?\)/g, ''), d); if (!(s.known && s.open)) return null;
  if (closedAllDay(r, d)) return null; const o = openState(r.hours, d); let end = s.closesAt; if (o.known && o.open && o.closesAt != null && o.closesAt < end) end = o.closesAt;
  return { ...s, end, closesAt: end != null ? fmt(end) : null }; };
const navLinks = (r) => { const dest = r.lat ? `${r.lat},${r.lng}` : encodeURIComponent(r.address); return { apple: `https://maps.apple.com/?daddr=${dest}&dirflg=w`, google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking` }; };
let USER = null;   // { lat, lng, acc, heading }
let OFFICE = store.get('office', null);   // { name, lat, lng } — walk times start here when your location is off
function walkMinsTo(r) {   // along the street grid, ~80 m a minute
  const U = USER || OFFICE; if (!U || !r.lat) return null; const dy = (r.lat - U.lat) * 110850, dx = (r.lng - U.lng) * 96680, m = (Math.abs(dx) + Math.abs(dy)) * 0.95;
  return m > 4000 ? null : Math.max(1, Math.round(m / 80));
}
const isOpen = (r, d) => { const s = openState(r.hours, d); return s.known ? s.open : (r.tunnel ? null : null); };
const openLabel = (r) => openState(r.hours);
const links = (r) => ({
  maps: 'https://www.google.com/maps/search/?api=1&query=' + q(r.name + ' ' + r.address),
  menu: r.menuUrl || 'https://www.google.com/search?q=' + q(r.name + ' downtown Houston menu'),
  specials: 'https://www.google.com/search?q=' + q(r.name + ' downtown Houston happy hour specials'),
  ig: r.instagram || 'https://www.google.com/search?q=' + q(r.name + ' Houston instagram'),
  reviews: 'https://www.google.com/search?q=' + q(r.name + ' ' + r.address + ' reviews'),
});

// ---------- filtering ----------
// dietary needs stay on across visits; matched from what the listing says (a best guess, so check the menu)
const DIETS = [{ k: 'veg', l: '🌱 Vegetarian', re: /vegetarian|veggie|vegan|plant/i }, { k: 'vegan', l: '🥦 Vegan', re: /vegan|plant-based/i }, { k: 'gf', l: '🌾 Gluten-free', re: /gluten/i }, { k: 'halal', l: '☪️ Halal', re: /halal/i }];
let DIET = new Set(store.get('diet', []));
const dietText = (r) => [r.type, r.note, r.tryit, ...(r.cuisines || []), ...(r.vibes || []), ...(r.meals || [])].join(' ');
const dietOk = (r) => [...DIET].every((k) => { const d = DIETS.find((x) => x.k === k); return d && (d.re.test(dietText(r)) || (k === 'veg' && (r.vibes || []).includes('veg'))); });
function matches(r, opt = {}) {
  if (DIET.size && !dietOk(r)) return false;
  const meal = opt.meal ?? st.meal;
  if (meal !== 'Any') {
    if (meal === 'Happy Hour' && hhFor(r)) {/* verified happy hour counts */ }
    else if (r.meals.length && !r.meals.includes(meal)) return false;
    else if (!r.meals.length && ['Breakfast', 'Brunch', 'Late Night', 'Happy Hour'].includes(meal)) return false;
  }
  if (st.budget && r.price > st.budget) return false;
  for (const x of st.extras) {
    if (x === 'tunnel') { if (!r.tunnel) return false; }
    else if (x === 'street') { if (r.tunnel) return false; }
    else if (x === 'open') { if (opt.date === undefined && isOpen(r) === false) return false; }
    else if (x === 'notfav') { if (favs.has(r.name) || visits[r.name]) return false; }
    else if (!r.meals.includes(x)) return false;
  }
  if (opt.date && isOpen(r, opt.date) === false) return false;
  return true;
}
// what suits right now: the time of day and the weather outside
const isPatio = (r) => r.meals.includes('Patio') || /patio|rooftop|terrace|garden|deck/i.test((r.note || '') + ' ' + (r.type || ''));
function timeFit(r, d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60, has = (m) => r.meals.includes(m);
  if (h >= 6 && h < 10.5) return has('Breakfast') || isCoffee(r) ? 1 : -0.5;
  if (h >= 10.5 && h < 14) return (has('Lunch') ? 0.8 : 0) + (r.price <= 2 ? 0.3 : 0);
  if (h >= 14 && h < 16) return isCoffee(r) || /bak|dessert|sweet/i.test(r.type) ? 0.6 : 0;
  if (h >= 16 && h < 19) return hhNow(r, d) ? 1.2 : has('Happy Hour') ? 0.5 : has('Dinner') ? 0.3 : 0;
  if (h >= 19 && h < 22) return has('Dinner') ? 0.8 : 0;
  return has('Late Night') || openLate(r) ? 1 : -0.3;
}
let WX = null;   // { temp °F, rain mm, code } for downtown Houston, from Open-Meteo
const wxBad = () => WX && (WX.rain > 0.1 || WX.code >= 51 || WX.temp >= 93 || WX.temp <= 45);
const wxNice = () => WX && !wxBad() && WX.temp >= 62 && WX.temp <= 86;
const weatherFit = (r) => !WX ? 0 : wxBad() ? (r.tunnel ? 1 : 0) - (isPatio(r) ? 0.8 : 0) : wxNice() && isPatio(r) ? 0.8 : 0;
function eventLine(d = new Date()) {   // a home game today: warn about crowds around the venue
  const e = EVENTS.find((x) => { const t = new Date(x.start); return t.toDateString() === d.toDateString() && t.getTime() + 3600e3 > d.getTime(); }); if (!e) return '';
  const t = new Date(e.start), tm = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: t.getMinutes() ? '2-digit' : undefined, timeZone: 'America/Chicago' }).toLowerCase().replace(' ', '');
  return `${e.emoji} ${e.team}${e.vs ? ' vs ' + e.vs.replace(/^.* /, '') : ''} at ${tm} — busy around ${e.venue}`;
}
function wxLine() {
  if (!WX) return ''; const t = Math.round(WX.temp);
  if (WX.rain > 0.1 || WX.code >= 51) return `☔ ${t}° and wet — tunnel spots first, patios skipped`;
  if (WX.temp >= 93) return `🥵 ${t}° — air-conditioned and tunnel spots first`;
  if (WX.temp <= 45) return `🧥 ${t}° — staying indoors, tunnel spots first`;
  if (wxNice()) return `☀️ ${t}° — patio weather, patios get a boost`;
  return `🌤️ ${t}° downtown`;
}
async function loadWeather() {
  try { const j = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=29.76&longitude=-95.37&current=temperature_2m,precipitation,weather_code&temperature_unit=fahrenheit')).json();
    WX = { temp: j.current.temperature_2m, rain: j.current.precipitation, code: j.current.weather_code }; renderPick(); if (city) { city.preferTunnel = wxBad(); city.weather = WX; } } catch (e) {}
}
// what you've eaten lately: skip repeats, nudge toward what you haven't had in a while
let LOG = store.get('log', []);   // [{ n: name, t: ms, c: cuisine type, $: spent }]
const daysAgo = (t) => (Date.now() - t) / 864e5;
const kind = (r) => (r.cuisines && r.cuisines[0]) || r.type || '';
function historyFit(r) {
  if (!LOG.length) return 0; let s = 0; const k = kind(r);
  const last = LOG.filter((x) => x.n === r.name).map((x) => daysAgo(x.t)).sort((a, b) => a - b)[0];
  if (last != null) s -= last < 3 ? 1.5 : last < 7 ? 0.6 : 0;
  if (LOG.some((x) => x.c === k && daysAgo(x.t) < 4)) s -= 0.5;
  if (k && k === missedKind()) s += 0.7;
  const liked = LOG.filter((x) => x.c === k && daysAgo(x.t) < 90).length; s += Math.min(0.6, liked * 0.15);
  return s;
}
let _missed = null;
function missedKind() {   // a cuisine you eat regularly but haven't had for 2+ weeks
  if (_missed !== null) return _missed; const by = {}; for (const x of LOG) if (x.c) (by[x.c] ||= []).push(daysAgo(x.t));
  const c = Object.entries(by).filter(([, ds]) => ds.length >= 2 && Math.min(...ds) >= 14).sort((a, b) => b[1].length - a[1].length)[0]; return (_missed = c ? c[0] : '');
}
function historyLine() { const k = missedKind(); if (!k) return ''; const d = Math.round(Math.min(...LOG.filter((x) => x.c === k).map((x) => daysAgo(x.t))) / 7); return `💡 You haven't had ${k} in ${d} week${d > 1 ? 's' : ''} — those get a boost`; }
function logVisit(r, spent) {
  visits[r.name] = (visits[r.name] || 0) + 1; LOG.push({ n: r.name, t: Date.now(), c: kind(r), $: spent || null }); LOG = LOG.slice(-400); store.set('log', LOG); _missed = null; save();
  buzz(12); toast('Logged — enjoy ' + r.name + '!'); askSpend(r);
}
function score(r) {
  let s = 0; for (const m of st.moods) if (r.vibes.includes(m)) s += 3;
  if (st.moods.has('upscale') && r.price >= 3) s += 1; if (st.moods.has('quick') && r.price <= 1) s += 1;
  if (favs.has(r.name)) s += 1; if (isOpen(r)) s += 0.5; return Math.max(0.1, s + timeFit(r) * 0.6 + weatherFit(r) * 0.6 + historyFit(r) * 0.6);
}
function ranked(opt) {
  const list = FOOD.filter((r) => matches(r, opt));
  if (!st.moods.size) {   // no mood picked: open now first, then happy hour, favourites, closest
    const k = (r) => (isOpen(r) === true ? 4 : isOpen(r) === false ? 0 : 2) + (hhNow(r) ? 1.5 : 0) + (favs.has(r.name) ? 1 : 0) - (walkMinsTo(r) ?? 8) / 40 + timeFit(r) + weatherFit(r) + historyFit(r);
    return list.map((r) => [r, 1 + (isOpen(r) ? 0.5 : 0), k(r)]).sort((x, y) => y[2] - x[2] || x[0].name.localeCompare(y[0].name)).map(([r, s]) => [r, s]);
  }
  return list.map((r) => [r, score(r)]).filter((x) => x[1] >= 1).sort((a, b) => b[1] - a[1]);
}
function weightedPick(list, avoid = new Set()) {
  const pool = list.filter(([r]) => !avoid.has(r.name)); const L = pool.length ? pool : list; if (!L.length) return null;
  const tot = L.reduce((a, [, s]) => a + s * s, 0); let x = Math.random() * tot;
  for (const [r, s] of L) { x -= s * s; if (x <= 0) return r; } return L[0][0];
}

// ---------- cards ----------
function statusTags(r) {
  const o = openLabel(r), hh = hhFor(r), hn = hhNow(r), w = walkMinsTo(r);
  return `${o.known ? `<span class="tag ${o.open ? 'open' : 'closed'}">${esc(o.label)}</span>` : ''}${hn ? `<span class="tag hh on">🍹 Happy hour now${hn.closesAt ? ' · till ' + esc(hn.closesAt) : ''}</span>` : hh ? '<span class="tag hh">🍹 Happy hour</span>' : ''}${w != null ? `<span class="tag">🚶 ${w} min</span>` : ''}${r.tunnel ? `<span class="tag t">🚇 ${esc(r.tunnel)}</span>` : ''}`;
}
const tile = (r) => `<span class="ctile" style="--tc:${styleFor(r).color || '#e8590c'}">${styleFor(r).emoji}</span>`;
// where a place sits on the street grid: nearest corner + a tiny block map (needs the city model, built in the background)
let SPOTOF = null;
function gridSpot(r) {
  if (!city || !city.spots) return null; if (!SPOTOF) { SPOTOF = new Map(); for (const s of city.spots) for (const p of s.places) SPOTOF.set(p.id, s); }
  const s = SPOTOF.get(r.id); if (!s) return null; const A = city.avenues, C = city.cross, [i, j] = city.cellIdx(s.x, s.y);
  if (i < 1 || j < 1 || i >= A.length || j >= C.length) return null;
  const fx = (s.x - A[i - 1].x) / (A[i].x - A[i - 1].x), fy = (s.y - C[j - 1].y) / (C[j].y - C[j - 1].y);
  return { fx, fy, av: fx < 0.5 ? A[i - 1].n : A[i].n, cr: fy < 0.5 ? C[j - 1].n : C[j].n, avs: [A[i - 1].n, A[i].n], crs: [C[j - 1].n, C[j].n] };
}
function miniMap(r) {
  const g = gridSpot(r); if (!g) return '';
  const c = styleFor(r).color || '#e8590c', px = 14 + g.fx * 36, py = 14 + g.fy * 36;
  return `<svg class="mini" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="var(--mini-bg)"/>
    <g fill="var(--mini-road)"><rect x="0" y="6" width="64" height="7"/><rect x="0" y="51" width="64" height="7"/><rect x="6" y="0" width="7" height="64"/><rect x="51" y="0" width="7" height="64"/></g>
    <rect x="14" y="14" width="36" height="36" rx="3" fill="var(--mini-block)"/>${r.tunnel ? '<rect x="14" y="30" width="36" height="4" rx="2" fill="#20c997" opacity=".55"/>' : ''}
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6.5" fill="${c}" stroke="#fff" stroke-width="2.5"/></svg>`;
}
const cornerTxt = (r) => { const g = gridSpot(r); return g ? `${g.av} & ${g.cr}` : ''; };
function card(r, hero, map) {
  return `<div class="card tap ${hero ? 'hero spin' : ''}" data-open="${r.id}">
  <button class="fav" data-fav="${r.id}" title="Favorite" aria-label="${favs.has(r.name) ? 'Remove ' + esc(r.name) + ' from favorites' : 'Save ' + esc(r.name) + ' to favorites'}">${favs.has(r.name) ? '♥' : '♡'}</button>
  <div class="chead">${tile(r)}<div><h3>${esc(r.name)}</h3>
  <div class="meta"><span class="price" title="${PRICE_TXT[r.price] || ''} per person">${$$(r.price)}</span> · ${esc(r.type)} · ${esc(r.address.replace(', Houston, TX', ''))}</div></div></div>
  ${map && miniMap(r) ? `<div class="locrow">${miniMap(r)}<div>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}<div class="corner">📍 ${esc(cornerTxt(r))}${r.tunnel ? ' · 🚇 tunnel level' : ''}</div></div></div>` : r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
  ${hero && r.tryit ? `<p class="try">Try: ${esc(r.tryit)}</p>` : ''}
  <div class="tags">${statusTags(r)}</div>
  ${hero ? `<button class="open-btn" data-open="${r.id}">Details, hours & specials →</button>` : ''}</div>`;
}
function chipRow(el, items, isOn, onClick, after = renderPick) {
  el.innerHTML = items.map((it, i) => `<button class="chip ${isOn(it) ? 'on' : ''}" data-i="${i}">${esc(it.l ?? it)}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; onClick(items[b.dataset.i]); save(); after(); };
}

// ---------- Pick ----------
// The match list renders in pages of 30 and keeps going as you scroll, so every match is reachable.
let pickList = [], pickShown = 0;
function morePicks(n) {
  const box = $('#matches'); box.querySelector('.morebar')?.remove();
  const next = pickList.slice(pickShown, pickShown + n); pickShown += next.length;
  box.insertAdjacentHTML('beforeend', next.map(([r]) => card(r)).join(''));
  const left = pickList.length - pickShown;
  if (left > 0) box.insertAdjacentHTML('beforeend', `<div class="morebar"><span class="meta">Showing ${pickShown} of ${pickList.length}</span><button class="btn ghost" data-more="30">Show ${Math.min(30, left)} more</button><button class="btn ghost" data-more="all">Show all ${pickList.length}</button></div>`);
}
$('#matches').addEventListener('click', (e) => { const b = e.target.closest('[data-more]'); if (!b) return; e.stopPropagation(); morePicks(b.dataset.more === 'all' ? 1e9 : 30); });
const moreObs = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting) && pickShown < pickList.length && $('#v-pick').classList.contains('on')) morePicks(30); }, { rootMargin: '400px' }) : null;
new MutationObserver(() => { const m = $('#matches .morebar'); if (m && moreObs) { moreObs.disconnect(); moreObs.observe(m); } }).observe($('#matches'), { childList: true });
function renderPick() {
  $('#moods').innerHTML = MOODS.map((m) => `<button data-m="${m.k}" class="${st.moods.has(m.k) ? 'on' : ''}"><b>${m.e}</b>${m.l}</button>`).join('');
  chipRow($('#meal'), MEALS, (x) => x === st.meal, (x) => (st.meal = x));
  chipRow($('#budget'), BUDGET, (x) => x.k === st.budget, (x) => (st.budget = x.k));
  $('#diet').innerHTML = DIETS.map((d) => `<button class="chip ${DIET.has(d.k) ? 'on' : ''}" data-diet="${d.k}">${d.l}</button>`).join('');
  chipRow($('#extras'), EXTRAS, (x) => st.extras.has(x.k), (x) => (st.extras.has(x.k) ? st.extras.delete(x.k) : st.extras.add(x.k)));
  const ex0 = DIET.size ? ` · ${[...DIET].map((k) => DIETS.find((d) => d.k === k).l.split(' ').pop()).join(', ')}` : '';
  const ex = ex0 + (st.extras.size ? ` · ${st.extras.size} extra${st.extras.size > 1 ? 's' : ''}` : '');
  const bl = (BUDGET.find((b) => b.k === st.budget) || {}).l; $('#filtSum').textContent = `${st.meal === 'Any' ? 'Any time' : st.meal} · ${!bl || bl === 'Any' ? 'Any budget' : bl}${ex}`;
  const list = ranked();
  $('#matchCount').textContent = list.length ? `${list.length} spots match — best for right now first` : '';
  $('#wxLine').textContent = [wxLine(), eventLine(), historyLine()].filter(Boolean).join('  ·  ');
  pickList = list; pickShown = 0;
  $('#matches').innerHTML = list.length ? '' : '<div class="empty">Nothing matches all of that. Try removing a filter or a mood.</div>';
  morePicks(30);
  if (city) city.setHighlight(mapMatch ? new Set(list.map(([r]) => r.id)) : null);
}
$('#diet').onclick = (e) => { const b = e.target.closest('[data-diet]'); if (!b) return; const k = b.dataset.diet; DIET.has(k) ? DIET.delete(k) : DIET.add(k); store.set('diet', [...DIET]); renderPick(); };
$('#moods').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const k = b.dataset.m; st.moods.has(k) ? st.moods.delete(k) : st.moods.add(k); save(); renderPick(); };
let lastPick = null;
$('#pickBtn').onclick = () => {
  buzz([6, 30, 6, 30, 14]);
  const r = weightedPick(ranked(), new Set(lastPick ? [lastPick] : []));
  if (!r) { $('#pickOut').innerHTML = '<div class="empty">No matches — loosen a filter.</div>'; return; }
  lastPick = r.name;
  $('#pickOut').innerHTML = card(r, true) + `<div class="heroacts"><button id="again"><span>🎲</span>Spin again</button><button id="seeMap"><span>🧭</span>Walk there</button><button id="going"><span>✅</span>I'm going</button><button id="sharePick"><span>📤</span>Share</button><button id="calPick"><span>📅</span>Calendar</button></div>`;
  $('#sharePick').onclick = () => sharePlace(r);
  $('#calPick').onclick = () => { const d = nextSlot(); downloadIcs('downtown-eats.ics', [{ r, start: d, mins: st.meal === 'Happy Hour' ? 90 : 60 }]); };
  $('#again').onclick = () => $('#pickBtn').click();
  $('#seeMap').onclick = () => walkTo(r);
  $('#going').onclick = () => logVisit(r);
  city?.setPick(r.id);
};

// live vote: everyone with the link taps a choice and sees the tally update
let _voteT = null;
async function openVote(id) {
  clearInterval(_voteT); show('pick');
  const draw = async () => { let p, votes; try { [p] = await sb('de_polls?id=eq.' + id + '&select=*'); votes = await sb('de_votes?poll_id=eq.' + id + '&select=voter,choice'); } catch (e) { return; } if (!p) { $('#pickOut').innerHTML = '<div class="empty">That vote link has expired.</div>'; return; }
    const me = store.get('voterName', ''), opts = p.options.map((n) => DATA.find((x) => x.name === n)).filter(Boolean), tally = opts.map((_, i) => votes.filter((v) => v.choice === i)), total = votes.length || 1, mine = votes.find((v) => v.voter === me);
    $('#pickOut').innerHTML = `<div class="card poll"><h3>🗳️ ${esc(p.title || 'Where should we eat?')}</h3><div class="meta">${votes.length} vote${votes.length === 1 ? '' : 's'} so far · updates live${me ? ` · you're “${esc(me)}”` : ''}</div>
      ${me ? '' : `<input id="voterName" class="vname" placeholder="Your name (so friends know who voted)" maxlength="40">`}
      ${opts.map((x, i) => `<button class="pollopt ${mine && mine.choice === i ? 'mine' : ''}" data-v="${i}">${tile(x)}<span><b>${esc(x.name)}</b><em>${$$(x.price)} · ${esc(x.type)} · ${esc(openLabel(x).label || '')}</em><i class="bar" style="width:${Math.round((tally[i].length / total) * 100)}%"></i><small>${tally[i].length} ${tally[i].length ? '· ' + esc(tally[i].map((v) => v.voter).join(', ')) : ''}</small></span></button>`).join('')}
      <div class="row" style="margin-top:8px"><button class="btn ghost sm" id="voteShare">📤 Share link</button>${votes.length ? `<button class="btn sm" id="voteGo">🧭 Go with the winner</button>` : ''}</div></div>`;
    $('#voteShare').onclick = () => shareText('Where should we eat?', 'Vote for where we eat — results update live', appUrl() + '#vote=' + id);
    if ($('#voteGo')) $('#voteGo').onclick = () => { const w = tally.map((t, i) => [t.length, i]).sort((a, b) => b[0] - a[0])[0][1]; clearInterval(_voteT); walkTo(opts[w]); };
    $('#pickOut').querySelectorAll('[data-v]').forEach((b) => (b.onclick = async () => { let name = store.get('voterName', '') || ($('#voterName')?.value || '').trim(); if (!name) { $('#voterName')?.focus(); toast('Add your name first'); return; } store.set('voterName', name);
      try { await sb('de_votes?on_conflict=poll_id,voter', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ poll_id: id, voter: name, choice: +b.dataset.v }) }); buzz(10); draw(); } catch (e) { toast('Vote didn’t go through — try again'); } }));
  };
  await draw(); _voteT = setInterval(() => { if ($('#v-pick').classList.contains('on') && document.visibilityState === 'visible') draw(); else clearInterval(_voteT); }, 5000);
}
// ---------- group pick: everyone adds their mood and budget, it finds one place that works for all ----------
const GMOODS = ['quick', 'healthy', 'comfort', 'spicy', 'adventurous', 'drinks', 'upscale', 'veg', 'sweet'];
let group = store.get('group', [{ n: 'Me', moods: [], budget: 0 }, { n: 'Friend', moods: [], budget: 0 }]);
function renderGroup() {
  $('#groupPeople').innerHTML = group.map((p, i) => `<div class="gp"><div class="gp-h"><input value="${esc(p.n)}" data-gn="${i}" aria-label="Name">${group.length > 2 ? `<button class="icon" data-gdel="${i}" title="Remove">✕</button>` : ''}</div>
    <div class="chips sm">${MOODS.filter((m) => GMOODS.includes(m.k)).map((m) => `<button class="chip ${p.moods.includes(m.k) ? 'on' : ''}" data-gm="${i}:${m.k}">${m.e} ${m.l}</button>`).join('')}</div>
    <div class="chips sm">${BUDGET.map((b) => `<button class="chip ${p.budget === b.k ? 'on' : ''}" data-gb="${i}:${b.k}">${b.k ? b.l : 'Any budget'}</button>`).join('')}</div></div>`).join('');
}
function groupPick() {
  const cap = Math.min(...group.map((p) => p.budget || 9)), avoid = new Set(lastPick ? [lastPick] : []);
  const list = FOOD.filter((r) => r.price <= cap && isOpen(r) !== false && matches(r)).map((r) => {
    let s = 0.5 + timeFit(r) * 0.5 + weatherFit(r) * 0.5, happy = 0; for (const p of group) { const hit = p.moods.filter((m) => r.vibes.includes(m)).length; s += hit * 2; if (!p.moods.length || hit) happy++; }
    return [r, s + (happy === group.length ? 3 : 0), happy];
  }).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const r = weightedPick(list.map(([r, s]) => [r, s]), avoid); if (!r) { $('#groupOut').innerHTML = '<div class="empty">Nothing open fits everyone — try loosening a budget.</div>'; return; }
  lastPick = r.name; const happy = list.find((x) => x[0] === r)[2];
  $('#groupOut').innerHTML = card(r, true) + `<div class="meta" style="margin:6px 2px">${happy === group.length ? '✅ Matches everyone’s mood' : `Fits ${happy} of ${group.length} moods`} · within ${cap < 9 ? '$'.repeat(cap) : 'any'} budget</div><div class="row"><button class="btn ghost" id="gAgain">🎲 Another</button><button class="btn ghost" id="gShare">📤 Send to the group</button></div>`;
  $('#gAgain').onclick = groupPick; $('#gShare').onclick = () => sharePlace(r);
  $('#groupOut').insertAdjacentHTML('beforeend', `<button class="btn ghost" id="gPoll" style="margin-top:8px">🗳️ Send a 3-way vote instead</button>`);
  $('#gPoll').onclick = async () => { const top = list.slice(0, 3).map(([x]) => x.name);
    try { const [p] = await sb('de_polls', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ options: top }) }); shareText('Where should we eat?', 'Vote for where we eat — results update live:\n' + top.map((n, i) => `${i + 1}. ${n}`).join('\n'), appUrl() + '#vote=' + p.id); openVote(p.id); }
    catch (e) { shareText('Where should we eat?', 'Vote for where we eat:\n' + top.map((n, i) => `${i + 1}. ${n}`).join('\n'), appUrl() + '#poll=' + encodeURIComponent(top.join('|'))); } };
}
$('#groupBtn').onclick = () => { $('#groupBox').classList.toggle('on'); renderGroup(); $('#groupOut').innerHTML = ''; };
$('#groupBox').addEventListener('click', (e) => {
  const m = e.target.closest('[data-gm]'), b = e.target.closest('[data-gb]'), d = e.target.closest('[data-gdel]');
  if (m) { const [i, k] = m.dataset.gm.split(':'); const p = group[+i]; p.moods = p.moods.includes(k) ? p.moods.filter((x) => x !== k) : [...p.moods, k]; }
  else if (b) { const [i, k] = b.dataset.gb.split(':'); group[+i].budget = +k; }
  else if (d) group.splice(+d.dataset.gdel, 1);
  else if (e.target.id === 'gAdd') group.push({ n: 'Friend ' + group.length, moods: [], budget: 0 });
  else if (e.target.id === 'gGo') { groupPick(); return; } else return;
  store.set('group', group); renderGroup();
});
$('#groupBox').addEventListener('input', (e) => { const i = e.target.dataset.gn; if (i != null) { group[+i].n = e.target.value; store.set('group', group); } });

// ---------- fuzzy search (typo-tolerant: "Benni" finds Benihana, "chipolte" finds Chipotle) ----------
const fold = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ');
function lev(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
// tiers: 4 name contains the phrase · 3 every word starts a name word · 2 typo match on the name
//        1 every word found (at a word start) in cuisine / dishes / street / notes
function searchScore(r, q) {
  const phrase = fold(q).replace(/\s+/g, ' ').trim(), words = phrase.split(' ').filter(Boolean); if (!words.length) return 1;
  const name = fold([r.name, ...(r.aliases || [])].join(' ')).replace(/\s+/g, ' ').trim(), nameWords = name.split(' '), flat = name.replace(/ /g, '');
  if (name.includes(phrase) || flat.includes(phrase.replace(/ /g, ''))) return 4;
  if (words.every((w) => nameWords.some((t) => t.startsWith(w)))) return 3;
  const close = (w, t) => { const k = w.length >= 5 ? 2 : w.length >= 3 ? 1 : 0; return k > 0 && (lev(w, t.slice(0, w.length)) <= k || lev(w, t) <= k); };
  if (words.every((w) => w.length >= 3 && (nameWords.some((t) => close(w, t)) || close(w, flat)))) return 2;
  const hay = ' ' + fold([r.type, r.address, r.note, r.tryit, r.tunnel, ...r.cuisines, ...r.meals].join(' ')).replace(/\s+/g, ' ') + ' ';
  if (words.every((w) => hay.includes(' ' + w) || (w.endsWith('s') && w.length > 3 && hay.includes(' ' + w.slice(0, -1))))) return 1;
  return 0;
}
function didYouMean(q) {
  const w = fold(q).replace(/ /g, '');
  return [...new Set(DATA.map((r) => r.name))].map((n) => [n, Math.min(lev(w, fold(n).replace(/ /g, '')), lev(w, fold(n).replace(/ /g, '').slice(0, w.length)) + 1)])
    .sort((a, b) => a[1] - b[1]).slice(0, 3).filter(([, d]) => d <= Math.max(3, w.length / 2)).map(([n]) => n);
}

// ---------- Browse ----------
let bq = '', fav1 = false, tun1 = false, open1 = false, hh1 = false, fc = new Set(), sortBy = 'name';
function renderBrowse() {
  const cuis = [...new Set(FOOD.flatMap((r) => r.cuisines))].sort();
  $('#fCuisine').innerHTML = cuis.map((c) => `<button class="chip ${fc.has(c) ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  const t = bq.trim();
  const sc = new Map();
  let list = FOOD.filter((r) => { if (!((!fav1 || favs.has(r.name)) && (!tun1 || r.tunnel) && (!open1 || isOpen(r)) && (!hh1 || hhFor(r)) && (!fc.size || r.cuisines.some((c) => fc.has(c))))) return false; if (!t) return true; const v = searchScore(r, t); sc.set(r, v); return v > 0; });
  list.sort(sortBy === 'name' ? (a, b) => (t ? sc.get(b) - sc.get(a) : 0) || a.name.localeCompare(b.name) : sortBy === 'price' ? (a, b) => a.price - b.price : (a, b) => b.price - a.price);
  $('#bCount').textContent = `${list.length} of ${FOOD.length} spots`;
  if (!list.length && t) {
    const sug = didYouMean(t);
    $('#browse').innerHTML = `<div class="empty">No exact matches for “${esc(t)}”.${sug.length ? `<div style="margin-top:10px">Did you mean ${sug.map((n) => `<button class="chip" data-sug="${esc(n)}">${esc(n)}</button>`).join(' ')}</div>` : ''}${fav1 || tun1 || open1 || hh1 || fc.size ? '<div class="meta" style="margin-top:8px">Some filters are on — try turning them off.</div>' : ''}</div>`;
  } else $('#browse').innerHTML = list.map((r) => card(r, false, true)).join('') || '<div class="empty">No results.</div>';
  const nflag = Object.keys(HCHK).length;
  if (nflag && !t) $('#browse').insertAdjacentHTML('afterbegin', `<div class="card review-card"><h3>⚠️ ${nflag} place${nflag > 1 ? 's' : ''} list different hours on their own website</h3><div class="meta">Tap one to compare, then keep ours or switch to theirs.</div><div class="chips sm" style="margin-top:8px">${Object.keys(HCHK).map((n) => { const x = DATA.find((r) => r.name === n); return x ? `<button class="chip" data-review="${x.id}">${esc(n)}</button>` : ''; }).join('')}</div></div>`);
  const stq = t && parseStreetQuery(t);
  if (stq) $('#browse').insertAdjacentHTML('afterbegin', `<div class="card corner-card"${stq.kind === 'parallel' ? '' : ' data-corner="1"'}><h3>📍 ${esc(stq.label)}</h3><div class="meta">${stq.kind === 'parallel' ? 'Pick one street from each direction, like Main & Texas.' : 'Tap to see it on the map with every spot within a block'}</div></div>`);
  if (stq && !list.length) $('#bCount').textContent = 'Street search';
  for (const [id, on] of [['#favOnly', fav1], ['#tunOnly', tun1], ['#openOnly', open1], ['#hhOnly', hh1]]) $(id).classList.toggle('on', on);
}
$('#q').oninput = (e) => { bq = e.target.value; renderBrowse(); };
$('#browse').addEventListener('click', (e) => {
  const rv = e.target.closest('[data-review]'); if (rv) { openSheet(+rv.dataset.review); return; }
  if (e.target.closest('[data-corner]')) { const q = parseStreetQuery(bq); show('map'); setTimeout(() => runFind({ st: q }), 60); return; }
  const b = e.target.closest('[data-sug]'); if (b) { $('#q').value = bq = b.dataset.sug; renderBrowse(); } });
$('#toggleF').onclick = () => $('#filters').classList.toggle('on');
$('#favOnly').onclick = () => { fav1 = !fav1; renderBrowse(); };
$('#tunOnly').onclick = () => { tun1 = !tun1; renderBrowse(); };
$('#openOnly').onclick = () => { open1 = !open1; renderBrowse(); };
$('#hhOnly').onclick = () => { hh1 = !hh1; renderBrowse(); };
$('#sort').onchange = (e) => { sortBy = e.target.value; renderBrowse(); };
$('#fCuisine').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c; fc.has(c) ? fc.delete(c) : fc.add(c); renderBrowse(); };

// ---------- Week ----------
const dayDate = (i, slot) => { const d = new Date(); const diff = (i + 1) - d.getDay(); d.setDate(d.getDate() + diff + (diff < 0 ? 7 : 0)); d.setHours({ Breakfast: 8, Lunch: 12, Dinner: 19, 'Happy Hour': 17 }[slot] || 12, 15, 0, 0); return d; };
function renderWeek() {
  chipRow($('#weekSlot'), ['Breakfast', 'Lunch', 'Dinner', 'Happy Hour'], (x) => x === week.slot, (x) => { week.slot = x; }, renderWeek);
  const today = new Date().getDay();
  $('#monthBox').innerHTML = monthLine() + officeLine() + `<div class="officerow">🔄 ${SYNC ? `Synced across devices · <button class="linkbtn" id="syncLink">add another device</button> · <button class="linkbtn" id="syncOff">turn off</button>` : `<button class="linkbtn" id="syncOn">Sync favourites, history and plan across your devices</button>`}</div>`;
  $('#week').innerHTML = DAYS.map((d, i) => {
    const e = week.days[d] || {}; const r = DATA.find((x) => x.name === e.name && x.address === e.address);
    const o = r ? openState(r.hours, dayDate(i, week.slot)) : null;
    return `<div class="day" style="${today === i + 1 ? 'outline:2px solid var(--accent)' : ''}"><div class="d">${d}<small>${today === i + 1 ? 'Today' : ''}</small></div>
    ${r ? tile(r) : '<span class="ctile blank">＋</span>'}<div>${r ? `<div class="nm" data-open="${r.id}">${esc(r.name)}</div><div class="meta"><span class="price">${$$(r.price)}</span> · ${esc(r.type)}${r.tunnel ? ' · 🚇' : ''}${o?.known && !o.open ? ' · ⚠️ may be closed' : ''}</div>` : '<div class="meta">Not planned</div>'}</div>
    <div class="acts"><button class="icon ${e.lock ? 'on' : ''}" data-lock="${d}" title="Lock">🔒</button><button class="icon" data-swap="${d}" title="Swap">🔄</button></div></div>`;
  }).join('');
}
function planDay(d, used) {
  const date = dayDate(DAYS.indexOf(d), week.slot);
  let list = ranked({ meal: week.slot, date });
  if (!list.filter(([r]) => !used.has(r.name)).length) list = FOOD.filter((r) => matches(r, { meal: week.slot, date })).map((r) => [r, score(r) + 1]);
  const usedTypes = new Set(Object.entries(week.days).filter(([k, v]) => k !== d && v.name).map(([, v]) => (DATA.find((x) => x.name === v.name) || {}).type));
  const varied = list.filter(([r]) => !usedTypes.has(r.type));
  const r = weightedPick(varied.length ? varied : list, used);
  if (r) { week.days[d] = { name: r.name, address: r.address, lock: false }; used.add(r.name); }
}
$('#planBtn').onclick = () => {
  const used = new Set(Object.values(week.days).filter((v) => v.lock).map((v) => v.name));
  DAYS.forEach((d) => { if (!(week.days[d] || {}).lock) delete week.days[d]; });
  DAYS.forEach((d) => { if (!week.days[d]) planDay(d, used); }); save(); renderWeek(); toast('Week planned');
};
$('#week').onclick = (e) => {
  const l = e.target.closest('[data-lock]'), s = e.target.closest('[data-swap]'), o = e.target.closest('[data-open]');
  if (l) { const d = l.dataset.lock; if (week.days[d]) { week.days[d].lock = !week.days[d].lock; save(); renderWeek(); } }
  if (s) { const d = s.dataset.swap; const used = new Set(Object.values(week.days).map((v) => v.name)); delete week.days[d]; planDay(d, used); save(); renderWeek(); }
  if (o) openSheet(+o.dataset.open);
};
// calendar: an .ics file your phone opens straight into Calendar, with the walk built in
function nextSlot(slot = st.meal) { const d = new Date(), at = { Breakfast: 8, Brunch: 11, Lunch: 12, Dinner: 19, 'Happy Hour': 17, 'Late Night': 22 }[slot]; if (at == null) { d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15 + 15, 0, 0); return d; } d.setHours(at, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; }
function downloadIcs(file, items) {
  const z = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), esc2 = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ev = items.map(({ r, start, mins }) => { const w = walkMinsTo(r), s = new Date(start.getTime() - (w || 0) * 60e3), e = new Date(start.getTime() + mins * 60e3);
    return ['BEGIN:VEVENT', 'UID:' + start.getTime() + '-' + r.id + '@downtown-eats', 'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(s), 'DTEND:' + z(e), 'SUMMARY:' + esc2((w ? '🚶 ' : '') + r.name), 'LOCATION:' + esc2(r.address), 'DESCRIPTION:' + esc2((w ? `${w} min walk included. ` : '') + (hhFor(r) ? 'Happy hour: ' + hhFor(r).when + '. ' : '') + appUrl() + '#p=' + encodeURIComponent(r.name)), 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2('Head to ' + r.name), 'END:VALARM', 'END:VEVENT'].join('\r\n'); });
  const blob = new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Downtown Eats//EN\r\n' + ev.join('\r\n') + '\r\nEND:VCALENDAR\r\n'], { type: 'text/calendar' });
  const u = URL.createObjectURL(blob), aEl = document.createElement('a'); aEl.href = u; aEl.download = file; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('📅 Calendar file ready — open it to add');
}
$('#calWeek').onclick = () => { const items = DAYS.map((d, i) => { const e = week.days[d], r = e && DATA.find((x) => x.name === e.name); return r ? { r, start: dayDate(i, week.slot), mins: 60 } : null; }).filter(Boolean); if (!items.length) { toast('Plan your week first'); return; } downloadIcs('downtown-week.ics', items); };
// spend log: optional, private to this phone
function askSpend(r) {
  const box = document.createElement('div'); box.className = 'spendask'; box.innerHTML = `<span>💵 Roughly what did you spend?</span>${[10, 20, 35, 60, 100].map((v) => `<button class="chip" data-sp="${v}">$${v}</button>`).join('')}<button class="chip" data-sp="0">Skip</button>`;
  document.body.appendChild(box); setTimeout(() => box.classList.add('on'), 20);
  box.onclick = (e) => { const b = e.target.closest('[data-sp]'); if (!b) return; const v = +b.dataset.sp; if (v) { LOG[LOG.length - 1].$ = v; store.set('log', LOG); toast('Saved'); } box.classList.remove('on'); setTimeout(() => box.remove(), 300); };
  setTimeout(() => { if (box.isConnected) { box.classList.remove('on'); setTimeout(() => box.remove(), 300); } }, 12000);
}
function officeLine() { return `<div class="officerow">🏢 ${OFFICE ? `Walk times start from <b>${esc(OFFICE.name)}</b> when location is off · <button class="linkbtn" id="clearOffice">change</button>` : 'Set your office from any place’s details (“🏢 I work near here”) to get walk times without GPS.'}</div>`; }
document.addEventListener('click', (e) => {
  if (e.target.id === 'syncOn') { const k = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(36).padStart(2, '0')).join(''); SYNC = k; store.set('syncKey', k); rpc('de_sync_put', { p_key: k, p_data: syncData() }).then(() => toast('🔄 Sync is on')).catch(() => toast('Couldn’t reach the sync server')); renderWeek(); }
  if (e.target.id === 'syncLink') shareText('Downtown Eats sync', 'Open this on your other device to sync (keep it private — anyone with it sees your list):', appUrl() + '#sync=' + SYNC);
  if (e.target.id === 'syncOff') { SYNC = null; store.set('syncKey', null); renderWeek(); toast('Sync off on this device'); }
});
document.addEventListener('click', (e) => { if (e.target.id === 'clearOffice') { OFFICE = null; store.set('office', null); renderWeek(); toast('Office cleared'); } });
function monthLine() {
  const now = new Date(), m = LOG.filter((x) => { const d = new Date(x.t); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }); if (!m.length) return '';
  const spent = m.reduce((s, x) => s + (x.$ || 0), 0), by = {}; for (const x of m) if (x.c) by[x.c] = (by[x.c] || 0) + 1; const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const places = {}; for (const x of m) places[x.n] = (places[x.n] || 0) + 1; const fav = Object.entries(places).sort((a, b) => b[1] - a[1])[0];
  return `<div class="card month"><h3>📊 ${now.toLocaleString('en-US', { month: 'long' })} so far</h3><div class="meta">${m.length} meal${m.length > 1 ? 's' : ''} out${spent ? ` · about $${spent}` : ''}${top ? ` · mostly ${esc(top[0])}` : ''}${fav && fav[1] > 1 ? ` · ${esc(fav[0])} ×${fav[1]}` : ''}</div><div class="meta" style="margin-top:4px">Only on this phone. Log a visit with ✅ I'm going.</div></div>`;
}
// sharing: a link that opens straight to the place (or the plan) in the app
const appUrl = () => location.origin + location.pathname;
async function shareText(title, text, url) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + (url ? '\n' + url : '')); toast('Link copied'); } catch (e) { toast('Copy blocked — long-press to select'); }
}
const sharePlace = (r) => shareText(r.name, `${r.name} — ${r.address.replace(', Houston, TX', '')}${hhFor(r) ? ' · 🍹 ' + hhFor(r).when : ''}`, appUrl() + '#p=' + encodeURIComponent(r.name));
$('#shareWeek').onclick = () => {
  const names = DAYS.map((d) => week.days[d]?.name || '');
  shareText('My downtown week', 'Downtown eats — ' + week.slot + '\n' + DAYS.map((d, i) => d + ': ' + (names[i] || '—')).join('\n'), appUrl() + '#plan=' + encodeURIComponent(week.slot + '|' + names.join('|')));
};
$('#copyWeek').onclick = async () => {
  const txt = 'Downtown eats — ' + week.slot + '\n' + DAYS.map((d) => { const e = week.days[d]; return d + ': ' + (e ? e.name + ' (' + e.address.replace(', Houston, TX', '') + ')' : '—'); }).join('\n');
  try { await navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Copy blocked — long-press to select'); }
};

// ---------- detail sheet ----------
let sheetFrom = null;
function openSheet(id, from = null) {
  if (!metroLast && !openSheet._m) { openSheet._m = true; fetch('api/metro', { cache: 'no-store' }).then((x) => x.json()).then(async (j) => { metroLast = j; if (!metroStatic) metroStatic = await fetch('metro-static.json').then((y) => y.json()).catch(() => null); if ($('#sheet').classList.contains('on')) openSheet(id, from); }).catch(() => {}); }
  sheetFrom = from;
  const r = DATA[id]; if (!r) return; const L = links(r), o = openLabel(r), hh = hhFor(r);
  const N = navLinks(r), ext = (u, label, icon) => `<a class="ds-link" href="${esc(u)}" target="_blank" rel="noopener"><span>${icon}</span>${label}<i>›</i></a>`;
  const tel = r.phone ? r.phone.replace(/[^\d+]/g, '') : '';
  $('#panel').innerHTML = `<div class="sheet-top"><button class="backbtn" id="sBack">‹ ${from ? 'Back to list' : 'Back'}</button><button class="close" id="cls">×</button></div>
  <div class="ds-head">
    <div class="ds-emoji">${styleFor(r).emoji}</div>
    <div><h2>${esc(r.name)}</h2>
    <div class="meta"><span class="price">${$$(r.price)}</span> · ${esc(r.type)}${r.venue ? ' · ' + esc(r.venue) : ''}</div>
    ${r.aliases?.length ? `<div class="meta">Also called ${r.aliases.map(esc).join(' · ')}</div>` : ''}</div>
  </div>
  <div class="tags">${statusTags(r)}</div>

  <div class="ds-actions">
    <button class="ds-act main" id="sNav"><span>🧭</span>Walk there</button>
    ${tel ? `<a class="ds-act" href="tel:${esc(tel)}"><span>📞</span>Call</a>` : r.website ? `<a class="ds-act" href="${esc(r.website)}" target="_blank" rel="noopener"><span>🌐</span>Website</a>` : `<a class="ds-act" href="${N.apple}" target="_blank" rel="noopener"><span>🗺️</span>Maps</a>`}
    <a class="ds-act" href="${esc(L.menu)}" target="_blank" rel="noopener"><span>📋</span>Menu</a>
    <button class="ds-act" id="sPov"><span>🧍</span>Street view</button>
  </div>

  <div class="ds-card">
    <div class="ds-row"><span>📍</span><div>${esc(r.address.replace(', Houston, TX', ''))}<div class="meta">${r.tunnel ? `🚇 Underground · ${esc(r.tunnel)} — tunnel shops are mostly weekday daytime` : 'Street level'}</div>${r.lat ? `<button class="linkbtn" data-office="${r.id}" style="font-size:12.5px;margin-top:3px">🏢 I work near here</button>` : ''}</div><a href="#" id="sMap" class="ds-mini">Map</a></div>
    <div class="ds-row"><span>🕒</span><div>${o.known ? `<b class="${o.open ? 'ok' : 'no'}">${esc(o.label)}</b>` : '<b>Hours</b>'}<div class="meta">${esc(r.hours || 'Not listed')}${r.corrected ? ' · from the restaurant' : ''}</div>${HCHK[r.name] ? `<div class="ds-warn">⚠️ Their website lists different hours: ${esc(HCHK[r.name].site)} — <a href="${esc(HCHK[r.name].url)}" target="_blank" rel="noopener">check</a><div class="row" style="margin-top:6px"><button class="btn sm" data-hfix="${r.id}">Use website hours</button><button class="btn ghost sm" data-hkeep="${r.id}">Ours are right</button></div></div>` : ''}${r.movedTo ? `<div class="ds-warn">📦 Moved to ${esc(r.movedTo)}</div>` : ''}</div></div>
    ${r.phone ? `<div class="ds-row"><span>📞</span><div><a href="tel:${esc(tel)}">${esc(r.phone)}</a></div></div>` : ''}
    ${r.website ? `<div class="ds-row"><span>🌐</span><div><a href="${esc(r.website)}" target="_blank" rel="noopener">${esc(r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 38))}</a></div></div>` : ''}
  </div>

  ${(() => { const nt = nextTrains(r); return nt && nt.arr.length ? `<div class="ds-card"><div class="ds-cap">🚊 Next trains · ${esc(nt.station)} (${nt.walk} min walk)</div>${nt.arr.map((x) => `<div class="trainrow"><i style="background:${x.color}"></i><span>${esc(x.line)}${x.toward && x.toward !== nt.station ? ' → ' + esc(x.toward) : ''}</span><b>${x.min ? x.min + ' min' : 'now'}</b></div>`).join('')}<div class="meta" style="margin-top:4px">Live from METRO</div></div>` : ''; })()}
  ${hh ? `<div class="ds-card hh"><div class="ds-cap">🍹 Happy hour</div><b>${esc(hh.when)}</b><div style="margin-top:4px">${esc(hh.deals)}</div>${!hhNow(r) && nextHH(r) ? `<button class="btn ghost sm" data-remind="${r.id}" style="margin-top:8px">🔔 Remind me before it starts (${esc(fmt(nextHH(r).m))})</button>` : ''}<div class="meta" style="margin-top:6px"><a href="${esc(hh.source)}" target="_blank" rel="noopener">${esc(new URL(hh.source).hostname.replace('www.', ''))}</a> · ${hh.confidence === 'verify' ? 'double-check before you go' : esc(hh.confidence)} · checked ${esc(HH.checked)}</div></div>`
    : r.meals.includes('Happy Hour') ? `<div class="ds-card hh"><div class="ds-cap">🍹 Happy hour</div>Listed as offering happy hour — times and prices aren't verified yet. <a href="${L.specials}" target="_blank" rel="noopener">Look up today's deals</a></div>` : ''}

  ${r.note || r.tryit ? `<div class="ds-card"><div class="ds-cap">About</div>${r.note ? `<div>${esc(r.note)}</div>` : ''}${r.tryit ? `<div class="meta" style="margin-top:6px"><b>Try:</b> ${esc(r.tryit)}</div>` : ''}
    <div class="tags" style="margin-top:8px">${[...r.cuisines, ...r.meals].map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div></div>` : ''}

  <div class="ds-quick">
    <button class="ds-chip" id="sFav">${favs.has(r.name) ? '♥ Saved' : '♡ Save'}</button>
    <button class="ds-chip" id="sGo">✅ I'm going${visits[r.name] ? ` · ${visits[r.name]}×` : ''}</button>
    <button class="ds-chip" id="sDay">🗓️ Add to today</button>
  </div>
  <button class="btn" id="sAsk" style="margin-top:10px;width:100%;display:none">✨ What should I order here?</button>
  <div class="ai h" id="sAi"></div>

  <details class="ds-more"><summary>More links</summary>
    ${ext(N.apple, 'Directions in Apple Maps', '')}
    ${ext(N.google, 'Directions in Google Maps', '🗺️')}
    ${ext(L.specials, "Today's specials", '🏷️')}
    ${ext(L.ig, 'Instagram', '📸')}
    ${r.facebook ? ext(r.facebook, 'Facebook', '👍') : ''}
    ${ext(L.reviews, 'Reviews', '⭐')}
    ${r.url ? ext(r.url, 'Downtown Houston listing', '🏙️') : ''}
  </details>
  <p class="disclaim">${r.extraSource ? `Not in the Downtown Houston directory — added from <a href="${esc(r.extraSource)}" target="_blank" rel="noopener">${esc(new URL(r.extraSource).hostname)}</a>. ` : ''}Hours, phone and website come from the Downtown Houston directory (refreshed daily${META.refreshed ? ', last ' + new Date(META.refreshed).toLocaleDateString() : ''}). Descriptions are Claude's.</p>`;
  $('#sheet').classList.add('on');
  $('#cls').onclick = closeSheet;
  $('#sBack').onclick = () => (from ? listSheet(from.places, from.title, from.walk) : closeSheet());
  $('#sheet').scrollTop = 0; $('#panel').scrollTop = 0;
  $('#sFav').onclick = () => { toggleFav(r); openSheet(id); };
  $('#sGo').onclick = () => { visits[r.name] = (visits[r.name] || 0) + 1; save(); toast('Logged'); openSheet(id); };
  $('#sDay').onclick = () => { const d = DAYS[new Date().getDay() - 1] || 'Mon'; week.days[d] = { name: r.name, address: r.address, lock: true }; save(); renderWeek(); toast('Added to ' + d); };
  $('#sMap').onclick = (e) => { e.preventDefault(); closeSheet(); show('map'); if (city && !city.sceneOk(r)) setScene(r.day ? 'day' : 'night', true); city?.setPick(r.id); };
  $('#sNav').onclick = () => { closeSheet(); if (povCtl) { const sp = city.spotForPlace(r.id); if (!sp) return; if (!(city.user?.inside && !city.user.virtual)) { const w = povCtl.where(); city.user = { x: w.x, y: w.y, inside: true, acc: 5, heading: null, virtual: true }; } city.startNav({ x: sp.x, y: sp.y, label: r.name, tunnel: !!r.tunnel, id: r.id, lat: r.lat, lng: r.lng }); toast('🧭 Follow the arrows on the sidewalk'); return; } walkTo(r); };
  $('#sPov').onclick = () => { closeSheet(); if (povCtl) { povCtl.close(); setTimeout(() => openStreetView(r), 50); return; } show('map'); if (city && !city.sceneOk(r)) setScene(r.day ? 'day' : 'night', true); openStreetView(r); };
  if (ASK) { const b = $('#sAsk'); b.style.display = 'block'; b.onclick = () => aboutPlace(r); }
}
let listCtx = null;
function listSheet(places, title, walk) {
  listCtx = { places, title, walk };
  $('#panel').innerHTML = `<div class="sheet-top"><button class="backbtn" id="lBack">‹ Back to map</button><button class="close" id="cls">×</button></div><h2>${esc(title)}</h2><p class="meta">${places.length} spots ${walk ? 'within about a block — closest first' : 'here' + (places[0].tunnel ? ' · underground' : '')}</p>
  ${!walk && places.length >= 3 ? `<div class="hallplan" aria-label="Stalls inside">${places.map((r) => { const o = openLabel(r); return `<button class="stall ${o.known ? (o.open ? 'open' : 'shut') : ''}" data-open="${r.id}" style="--tc:${styleFor(r).color || '#888'}"><span>${styleFor(r).emoji}</span><b>${esc(r.name.replace(/ at .*$| @ .*$/, ''))}</b></button>`; }).join('')}</div><p class="meta" style="margin:6px 0 10px">Stalls inside — green dot means open now. Layout is a guide, not to scale.</p>` : ''}
  ${places.map((r) => { const o = openLabel(r); return `<div class="list-item" data-open="${r.id}"><div><b>${styleFor(r).emoji} ${esc(r.name)}</b><div class="meta">${$$(r.price)} · ${esc(r.type)}${walk ? ` · ${r.tunnel ? '🚇 tunnel · ' : ''}~${walk.get(r.id)} min walk` : ''}</div></div><span class="tag ${o.known ? (o.open ? 'open' : 'closed') : ''}">${esc(o.known ? (o.open ? 'Open' : 'Closed') : '—')}</span></div>`; }).join('')}`;
  $('#sheet').classList.add('on'); $('#cls').onclick = closeSheet; $('#lBack').onclick = closeSheet; $('#panel').scrollTop = 0;
}
function closeSheet() { $('#sheet').classList.remove('on'); }
// happy-hour reminders: a notification 15 minutes before it starts (while the app is open), plus a toast
function nextHH(r, from = new Date()) {
  const h = hhFor(r); if (!h) return null; const clean = h.when.replace(/[“”"][^“”"]*[“”"]/g, '').replace(/\(.*?\)/g, '');
  for (let k = 5; k <= 12 * 60; k += 5) { const d = new Date(from.getTime() + k * 60e3); const s = openState(clean, d); if (s.known && s.open && !closedAllDay(r, d)) return { at: d, m: d.getHours() * 60 + d.getMinutes() }; }
  return null;
}
const REMIND = new Map();
async function pushSub() {   // web push needs the installed app on iPhone (Share → Add to Home Screen)
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try { const reg = await navigator.serviceWorker.ready; let s = await reg.pushManager.getSubscription(); if (!s) { if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return null; const key = Uint8Array.from(atob(VAPID.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID.length % 4) % 4)), (c) => c.charCodeAt(0)); s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); } return s.toJSON(); } catch (e) { return null; }
}
async function remindHH(r) {
  const n = nextHH(r); if (!n) return; const when = n.at.getTime() - 15 * 60e3, wait = Math.max(5e3, when - Date.now());
  const sub = await pushSub(); if (sub) { try { await rpc('de_remind', { p_sub: sub, p_title: '🍹 Happy hour soon', p_body: `${r.name} starts happy hour at ${fmt(n.m)} — ${hhFor(r).deals.slice(0, 90)}`, p_url: appUrl() + '#p=' + encodeURIComponent(r.name), p_at: new Date(when).toISOString() }); toast(`🔔 Reminder set for ${fmt(n.m - 15)} — it'll arrive even if the app is closed`); return; } catch (e) {} }
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch (e) {}
  clearTimeout(REMIND.get(r.name)); REMIND.set(r.name, setTimeout(() => { const msg = `🍹 Happy hour at ${r.name} starts in 15 min`; toast(msg); buzz([10, 60, 10]); try { if (Notification.permission === 'granted') new Notification('Downtown Eats', { body: msg, icon: 'icon-192.png' }); } catch (e) {} }, wait));
  toast(`🔔 I'll remind you at ${fmt(n.m - 15)} — keep the app open`);
}
function fixHours(r, useSite) {
  if (useSite) { HFIX[r.name] = HCHK[r.name].site; r.hours = HFIX[r.name]; r.corrected = 'your fix'; } else HFIX[r.name] = HFIX[r.name] || r.hours;
  delete HCHK[r.name]; store.set('hoursFix', HFIX); toast(useSite ? '✅ Updated to the website hours' : '👍 Kept — won’t ask again'); renderPick();
}
$('#sheet').onclick = (e) => {
  const rm = e.target.closest('[data-remind]'); if (rm) { remindHH(DATA[+rm.dataset.remind]); return; }
  const of = e.target.closest('[data-office]'); if (of) { const r = DATA[+of.dataset.office]; OFFICE = { name: r.venue || r.address.replace(', Houston, TX', ''), lat: r.lat, lng: r.lng }; store.set('office', OFFICE); toast('🏢 Walk times now start from ' + OFFICE.name); renderPick(); return; }
  const hf = e.target.closest('[data-hfix]'), hk = e.target.closest('[data-hkeep]');
  if (hf || hk) { const r = DATA[+(hf || hk).dataset[hf ? 'hfix' : 'hkeep']]; fixHours(r, !!hf); openSheet(r.id, sheetFrom); return; } if (e.target.id === 'sheet') closeSheet(); const li = e.target.closest('.list-item'); if (li) openSheet(+li.dataset.open, listCtx); };
// sheet "Back" returns to the same list (with walking times if it came from a corner search)
function toggleFav(r) { favs.has(r.name) ? favs.delete(r.name) : favs.add(r.name); save(); }
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-fav]'); if (f) { const r = DATA[+f.dataset.fav]; toggleFav(r); f.textContent = favs.has(r.name) ? '♥' : '♡'; f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); buzz(favs.has(r.name) ? [8, 40, 12] : 6); return; }
  if (e.target.closest('button, a, [data-walk], [data-fav]') && !e.target.closest('.open-btn, .bar-actions [data-open]')) return;
  const o = e.target.closest('.card [data-open], .card.tap[data-open]'); if (o && !o.closest('#nightList, #coffeeList')) openSheet(+o.dataset.open);
});

// ---------- Sims-style people on the map ----------
let simN = null, simTimer = null;
function renderSim() {
  const n = simN; if (!n || !city) return hideSim(); const i = city.npcInfo(n), b = $('#simCard');
  b.innerHTML = `<div class="sc-top"><span class="sc-av">${i.emoji}</span><div class="sc-who"><b>${esc(i.name)}</b><small>${esc(i.role)}${i.under ? ' · in the tunnels' : ''} · ${i.mood}</small></div><button class="sc-x" data-sim="x" aria-label="Close">✕</button></div>
    <div class="sc-doing">${esc(i.doing)}</div>
    <div class="sc-acts"><button data-sim="follow" class="${i.following ? 'on' : ''}">${i.following ? '⭐ Following' : '⭐ Follow'}</button>${i.place ? `<button data-sim="place">${esc(i.place.name)} ›</button>` : ''}</div>`;
  b.hidden = false;
}
function showSim(n) { simN = n; renderSim(); clearInterval(simTimer); simTimer = setInterval(renderSim, 1000); buzz(6); }
function hideSim() { simN = null; clearInterval(simTimer); const b = $('#simCard'); if (b) b.hidden = true; if (city) city.followNpc(null); }
$('#simCard').onclick = (e) => {
  const a = e.target.closest('[data-sim]')?.dataset.sim; if (!a || !simN) return;
  if (a === 'x') return hideSim();
  if (a === 'follow') { city.followNpc(city.followN === simN ? null : simN); renderSim(); return; }
  if (a === 'place') { const p = city.npcInfo(simN).place; if (p) openSheet(p.id); }
};
let simOpen = false, lastStats = null;
function renderSimStats(s) {
  lastStats = s; const b = $('#simStats'); if (!b || VIEW?.hide?.people) { if (b) b.hidden = true; return; }
  const people = s.walking + s.inside + s.inLine + s.under;
  b.hidden = false; b.setAttribute('aria-expanded', simOpen);
  b.innerHTML = simOpen
    ? `<b>${s.phase}</b><span>👥 ${people} sims · 🚶 ${s.walking} walking · 🍽️ ${s.inside} inside${s.inLine ? ` · ⏳ ${s.inLine} in line` : ''}${s.under ? ` · 🚇 ${s.under} in tunnels` : ''}${s.hh ? ` · 🍹 ${s.hh} at happy hour` : ''}${s.riding ? ` · 🚕 ${s.riding} rides` : ''}</span>${s.busiest ? `<span>🔥 Busiest block: ${esc(s.busiest)}</span>` : ''}<em>A simulation: crowds follow the time of day, weather and what's open, not live counts</em>`
    : `${s.phase.split(' ')[0]} 👥 ${people}${s.inLine ? ` · ⏳ ${s.inLine}` : ''}`;
}
$('#simStats').onclick = () => { simOpen = !simOpen; if (lastStats) renderSimStats(lastStats); };

// ---------- map ----------
let city = null, mapMatch = false, mapOpen = false;
function initMap() {
  if (city) return;
  city = new CityMap($('#city'), DATA, {
    stops: metroStatic && metroStatic.stops,
    buildings: BUILDINGS,   // real footprints and heights from OpenStreetMap
    streets: STREETS,       // real street centrelines, parks, water, rail and trees
    isOpen: (p) => isOpen(p) !== false,
    onSelect: (all, spot) => { const places = all.filter((p) => city.sceneOk(p)); return places.length === 1 ? openSheet(places[0].id) : listSheet(places, spot.label); },
    onNpc: (n) => showSim(n),
    hhNow: (p) => !!hhNow(p),
    onStats: (s) => renderSimStats(s),
    onNpcGone: (n) => { toast(`👋 ${n.name} left downtown`); hideSim(); },
    onNpcFollow: (on) => { if (!on && simN) renderSim(); },
    onHistory: (n) => $('#mapBack').classList.toggle('show', n > 0),
    onLandmark: (l) => toast(l.station ? l.n : `🏙️ ${l.n}`),
    onCorner: (c, near) => showFound(c.label, near),
    onRotate: (a) => { $('#needle').style.transform = `rotate(${a}rad)`; },
    onNav: (st) => { lastNav = st; renderNav(st); },
    onFollow: () => { const b = $('#nvFollow'); if (b) b.textContent = '📍 Recenter'; },
    onVehicle: (c) => toast(c.live
      ? `● LIVE ${c.kind === 'train' ? '🚊 METRORail' : '🚌 METRO route'} ${c.route || ''}${c.rname ? ' — ' + c.rname : ''}${c.est ? ' · position estimated from METRO arrival predictions' : ''}`
      : c.kind === 'waymo' ? '🚗 Waymo — a driverless robotaxi (animated)' : c.kind === 'bus' ? '🚌 METRO bus (animated) — stops at the blue M signs' : c.line === 'red' ? '🚊 METRORail Red Line (animated) — runs down Main St' : '🚊 METRORail Green / Purple line (animated) — Capitol & Rusk'),
    onMode: (m) => { $('#mapMsg').classList.remove('fade'); clearTimeout(window._mm); window._mm = setTimeout(() => $('#mapMsg').classList.add('fade'), 3500); document.querySelectorAll('#layerSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); $('#mapMsg').textContent = m === 'tunnel' ? 'Underground: the downtown tunnel food courts' : m === 'both' ? 'Street level on top · tunnels below' : 'Drag to move · pinch or double-tap to zoom'; },
  });
  if (EVENTS.length) city.setEvents(EVENTS);
  if (WX) { city.preferTunnel = wxBad(); city.weather = WX; }
  $('#needle').style.transform = `rotate(${city.compass()}rad)`; window._city = city;
  if (USER) city.setUser(USER);
  pollMetro(); setInterval(pollMetro, 20000);
  const tunnels = DATA.filter((r) => r.tunnel).length;
  setTimeout(() => $('#mapMsg').classList.add('fade'), 4500);
  $('#legend').innerHTML = `<button class="lgd-toggle" id="lgdToggle" aria-expanded="true">Key <b>▾</b></button><div class="lgd-body"><span><i class="dot" style="background:#e8590c"></i><b id="lgStreet" style="font-weight:inherit"></b></span><span><i class="dot" style="background:#12b886"></i><b id="lgTun" style="font-weight:inherit"></b></span><span><i class="dot" style="background:#868e96"></i>Closed</span><span><i class="dot" style="background:#e03131"></i>Red Line</span><span><i class="dot" style="background:linear-gradient(90deg,#2f9e44 50%,#7048e8 50%)"></i>Green/Purple</span><span>🚌 Bus</span><span>🚗 Waymo</span><p class="lgd-hint">Drag to move · pinch or double-tap to zoom · twist two fingers to rotate · tap a street to name the corner${BUILDINGS ? ' · buildings © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' : ''}</p></div>`;
  const lg = $('#legend'), setLg = (open) => { lg.classList.toggle('min', !open); $('#lgdToggle').setAttribute('aria-expanded', open); try { localStorage.setItem('lgdOpen', open ? '1' : '0'); } catch (e) {} };
  let lgOpen = innerWidth > 600; try { const s = localStorage.getItem('lgdOpen'); if (s != null) lgOpen = s === '1'; } catch (e) {}
  setLg(lgOpen); $('#lgdToggle').onclick = () => setLg(lg.classList.contains('min'));
  setScene(SCENE, true); applyView(); applyLight();
  renderPick();
}
document.querySelectorAll('#layerSeg button').forEach((b) => (b.onclick = () => city.setMode(b.dataset.m)));

// ---------- live METRO buses and trains (when the site's METRO_API_KEY is set) ----------
let metroStatic = null, metroLast = null, BUILDINGS = null, STREETS = null;
// next trains at the rail station nearest a place, from METRO's live predictions
function nextTrains(r) {
  const L = metroLast, S = metroStatic; if (!L || !L.ready || !S || !r.lat) return null; const R = S.routes || {}, ST = S.stops || {}, now = Date.now() / 1000;
  const rail = (L.trips || []).filter((t) => [0, 1, 2].includes((R[t.route] || [])[1])); if (!rail.length) return null;
  const railStops = new Set(rail.flatMap((t) => t.s.map(([sid]) => sid))), d2 = (sid) => { const s = ST[sid]; return s ? ((s[0] - r.lat) * 110.85) ** 2 + ((s[1] - r.lng) * 96.68) ** 2 : 1e9; };
  const best = [...railStops].sort((a, b) => d2(a) - d2(b))[0]; if (!best || d2(best) > 0.6 * 0.6) return null;   // within ~600 m
  const name = ST[best][2].replace(/ (Station|Stop).*$/, ''), same = [...railStops].filter((sid) => ST[sid] && ST[sid][2].replace(/ (Station|Stop).*$/, '') === name);
  const arr = []; for (const t of rail) for (const [sid, tm] of t.s) if (same.includes(sid) && tm > now - 30) { const last = t.s[t.s.length - 1]; arr.push({ line: (R[t.route] || [])[3] || t.route, color: '#' + ((R[t.route] || [])[2] || '888'), toward: ST[last[0]] ? ST[last[0]][2].replace(/ (Station|Stop).*$/, '') : '', min: Math.max(0, Math.round((tm - now) / 60)) }); }
  arr.sort((a, b) => a.min - b.min); const seen = new Set(), out = []; for (const x of arr) { const k = x.line + x.toward + x.min; if (!seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= 4) break; }
  return { station: name, walk: Math.max(1, Math.round(Math.sqrt(d2(best)) * 1000 / 80)), arr: out };
}
async function pollMetro() {
  if (!city || document.hidden) return;
  try {
    const r = await fetch('api/metro', { cache: 'no-store' }); if (!r.ok) return;
    const j = await r.json(); metroLast = j;
    if (!j.ready) { city.setLive(null); $('#liveChip').hidden = true; return; }
    if (!metroStatic) metroStatic = await fetch('metro-static.json').then((x) => (x.ok ? x.json() : null)).catch(() => null);
    const ok = j.stats.positions === 200 || j.stats.tripUpdates === 200;
    city.setLive(ok ? j : null, metroStatic);
    setTimeout(() => {
      const n = city.liveCars || [], tr = n.filter((c) => c.kind === 'train').length, bu = n.length - tr, chip = $('#liveChip');
      chip.hidden = false; chip.classList.toggle('warn', !ok);
      chip.textContent = ok ? `● LIVE · ${bu} 🚌${city.liveRailSeen ? ` · ${tr} 🚊` : ''}` : `⚠️ METRO live: ${j.stats.tripUpdates || 'no connection'}`;
    }, 300);
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollMetro(); });
$('#liveChip').onclick = () => {
  const j = metroLast; if (!j) return;
  const ok = j.stats.positions === 200 || j.stats.tripUpdates === 200;
  toast(ok ? `Live from METRO's real-time feed · updated ${new Date((j.feedTime || j.at) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ${city.liveRailSeen ? '' : 'METRO isn\'t sending train predictions right now, so trains are animated. '}Waymos are animated.`
    : `METRO's feed answered ${j.stats.tripUpdates || 'nothing'} — check the METRO_API_KEY. Showing animated traffic for now.`);
};

// ---------- find a corner, an address or a spot on the map ----------
const walkMin = (d) => Math.max(1, Math.round((d * 10) / 75));
function showFound(label, near) {
  const places = [], walk = new Map();
  for (const { s, d } of near) for (const p of s.places) if (!walk.has(p.id)) { places.push(p); walk.set(p.id, walkMin(d)); }
  const bar = $('#mapFound');
  bar.innerHTML = `<div><b>📍 ${esc(label)}</b><div class="meta">${places.length ? `${places.length} spots within about a block` : 'No restaurants right at this corner'}</div></div>${places.length ? '<button class="btn" id="fSee">See them</button>' : ''}<button class="close" id="fX" aria-label="Close">×</button>`;
  bar.classList.add('on');
  if (places.length) $('#fSee').onclick = () => listSheet(places, 'Near ' + label, walk);
  $('#fX').onclick = () => { bar.classList.remove('on'); if (city) city.mark = null; };
}
function findSuggestions(q) {
  const out = [], st = parseStreetQuery(q);
  if (st) out.push(st.kind === 'parallel' ? { t: '⚠️ ' + st.label } : { t: '📍 ' + st.label, st });
  if (q.trim().length >= 2) DATA.map((r) => [r, searchScore(r, q)]).filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]).slice(0, st ? 3 : 5).forEach(([r]) => out.push({ t: `${styleFor(r).emoji} ${r.name}${r.tunnel ? ' · tunnel' : ''}`, r }));
  return out;
}
function runFind(item) {
  $('#findBox').classList.remove('on'); $('#findIn').blur();
  if (item.st) { const res = city.goTo(item.st); if (res) showFound(item.st.label, res.near); else toast("Couldn't place that on the map"); }
  else if (item.r) { $('#mapFound').classList.remove('on'); if (!city.sceneOk(item.r)) setScene(item.r.day ? 'day' : 'night', true); city.setPick(item.r.id); lastFound = item.r; $('#findIn').value = item.r.name; toast(`📍 ${item.r.name} — tap ROUTE for walking directions`); }
}
$('#mapFind').onclick = () => { $('#moreBtn').click(); $('#findIn').focus(); };
$('#findIn').addEventListener('focus', () => { $('#findBox').classList.add('on'); renderFind(); });
$('#findIn').addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== $('#findIn')) $('#findBox').classList.remove('on'); }, 250));
let lastFound = null;
$('#sbRoute').onclick = () => {   // route to what's searched (or picked) — straight into walking directions
  const q = $('#findIn').value.trim(), top = q ? findSuggestions(q).find((x) => x.r || x.st) : null;
  const r = top?.r || (!q && (lastFound || (city?.pick != null ? DATA[city.pick] : null)));
  if (r) { $('#findBox').classList.remove('on'); $('#findIn').blur(); walkTo(r); return; }
  if (top?.st) { runFind(top); toast('Pick a spot near that corner, then tap ROUTE'); return; }
  $('#findIn').focus(); toast('Search for a place, then tap ROUTE');
};
// ---------- quick filters along the bottom of the map ----------
const CHIPS = [
  { k: 'all', l: 'All' },
  { k: 'open', l: '🟢 Open now', f: (r) => isOpen(r) === true },
  { k: 'hh', l: '🍹 Happy hour now', f: (r) => !!hhNow(r) },
  { k: 'saved', l: '♥ Saved', f: (r) => favs.has(r.name) },
  { k: 'coffee', l: '☕ Coffee', f: (r) => isCoffee(r) },
  { k: 'mex', l: '🌮 Mexican', re: /mexican|tex-mex|taco|taqueria|birria/i },
  { k: 'pizza', l: '🍕 Pizza', re: /pizza/i },
  { k: 'burger', l: '🍔 Burgers', re: /burger|american|diner/i },
  { k: 'asian', l: '🍜 Asian', re: /asian|chinese|vietnam|pho|thai|korean|ramen|noodle|dumpling/i },
  { k: 'sushi', l: '🍣 Sushi', re: /sushi|japanese|izakaya/i },
  { k: 'italian', l: '🍝 Italian', re: /italian|pasta/i },
  { k: 'steak', l: '🥩 Steak', re: /steak|chophouse/i },
  { k: 'bbq', l: '🍖 BBQ', re: /bbq|barbecue|smokehouse/i },
  { k: 'seafood', l: '🦐 Seafood', re: /seafood|oyster|fish|crab/i },
  { k: 'healthy', l: '🥗 Healthy', re: /salad|healthy|vegan|vegetarian|poke|bowl/i },
  { k: 'park', l: '🅿️ Parking' },
];
let chip = 'all';
const chipText = (r) => [r.name, r.type, ...(r.cuisines || [])].join(' ');
function renderChips() { $('#mapChips').innerHTML = CHIPS.map((c) => `<button class="mchip ${chip === c.k ? 'on' : ''}" data-c="${c.k}">${c.l}</button>`).join(''); }
function applyChip(quiet) {
  if (!city) return; const c = CHIPS.find((x) => x.k === chip);
  city.showParking = chip === 'park';
  if (chip === 'all' || chip === 'park') { city.setHighlight(null); if (chip === 'park' && !quiet) toast('🅿️ Garages in dark blue, surface lots in light blue'); return; }
  const ids = DATA.filter((r) => (c.f ? c.f(r) : c.re.test(chipText(r))) && city.sceneOk(r)).map((r) => r.id);
  city.setHighlight(new Set(ids)); if (!quiet) toast(ids.length ? `${c.l}: ${ids.length} spot${ids.length === 1 ? '' : 's'}` : `No ${c.l.replace(/^\S+ /, '').toLowerCase()} spots on this map`);
  mapOpen = false; $('#mapOpen')?.classList.remove('on');
}
$('#mapChips').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; chip = chip === b.dataset.c ? 'all' : b.dataset.c; renderChips(); applyChip(); };
renderChips();
$('#findMe').onclick = () => findMe();
function renderFind() {
  const q = $('#findIn').value, list = findSuggestions(q);
  $('#findList').innerHTML = list.length ? list.map((x, i) => `<button data-f="${i}" ${x.st || x.r ? '' : 'disabled'}>${esc(x.t)}</button>`).join('') : `<div class="meta">Try a corner like <b>Main &amp; Texas</b>, an address like <b>1000 Main</b>, or a restaurant name.</div>`;
  $('#findList').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) runFind(list[+b.dataset.f]); };
}
$('#findIn').oninput = renderFind;
$('#findForm').onsubmit = (e) => { e.preventDefault(); const l = findSuggestions($('#findIn').value).filter((x) => x.st || x.r); if (l.length) runFind(l[0]); else toast('No street corner or spot matches that'); };
$('#mapBack').onclick = () => { closeSheet(); city?.back(); };
// keep the Back pill and the directions panel just under the map controls, however many rows they wrap to
function placeUnderHud() {
  const hud = document.querySelector('#v-map .hud'); if (!hud) return; const b = hud.getBoundingClientRect(), top = b.bottom - hud.parentElement.getBoundingClientRect().top + 8;
  const np = $('#navPanel'), nh = np.classList.contains('on') ? np.offsetHeight + 8 : 0;
  np.style.top = top + 'px'; $('#mapBack').style.top = top + nh + 'px';
  reserveControls();
}
function reserveControls() {   // tell the map where the floating controls are so street and building labels avoid them
  if (!city) return; const c = $('#city').getBoundingClientRect();
  city.reserved = ['#v-map .hud', '#mapBack', '#legend', '#v-map .zoombox', '#navPanel', '#mapFound']
    .map((q) => document.querySelector(q)).filter((el) => el && el.offsetParent && getComputedStyle(el).display !== 'none' && !el.hidden)
    .map((el) => { const r = el.getBoundingClientRect(); return [r.left - c.left, r.top - c.top, r.right - c.left, r.bottom - c.top]; }).filter((r) => r[2] - r[0] > 2);
}
window.addEventListener('resize', placeUnderHud); { const ro = new ResizeObserver(placeUnderHud); for (const q of ['#v-map .hud', '#navPanel', '#legend', '#v-map .zoombox', '#mapBack', '#mapFound']) { const el = document.querySelector(q); if (el) ro.observe(el); } new MutationObserver(reserveControls).observe($('#v-map'), { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] }); }
$('#zcomp').onclick = () => city?.spin(0);
$('#zrot').onclick = () => city?.spin(city.v.r + Math.PI / 2);
$('#zin').onclick = () => city.zoom(1.4); $('#zout').onclick = () => city.zoom(1 / 1.4); $('#zfit').onclick = () => { city.anim = null; city.fitAll = !city.fitAll; city.fit(); };
$('#mapMatch').onclick = (e) => { mapMatch = !mapMatch; e.currentTarget.classList.toggle('on', mapMatch); renderPick(); toast(mapMatch ? 'Highlighting spots that match your Pick filters' : 'Showing everything'); };
$('#mapOpen').onclick = (e) => {
  mapOpen = !mapOpen; e.currentTarget.classList.toggle('on', mapOpen);
  city.setHighlight(mapOpen ? new Set(DATA.filter((r) => isOpen(r)).map((r) => r.id)) : (mapMatch ? new Set(ranked().map(([r]) => r.id)) : null));
};

// ---------- map scene: ☀️ Day (food) vs 🌙 Night (bars & clubs) ----------
let SCENE = 'day';
function renderLegend() {
  const L = DATA.filter((r) => (SCENE === 'night' ? r.night : r.day)), t = L.filter((r) => r.tunnel).length;
  if ($('#lgStreet')) { $('#lgStreet').textContent = `${SCENE === 'night' ? 'Bars' : 'Street'} (${L.length - t})`; $('#lgTun').textContent = `Tunnels (${t})`; }
}
function setScene(sc, quiet) {
  SCENE = sc; city?.setScene(sc); applyLight();
  document.querySelectorAll('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
  $('#v-map').classList.toggle('nightscene', sc === 'night');
  renderLegend();
  if (city && city.pick != null && DATA[city.pick] && !city.sceneOk(DATA[city.pick])) city.setPick(null);
  if (typeof applyChip === 'function' && chip !== 'all') applyChip(true);
  if (!quiet) toast(sc === 'night' ? `🌙 Night: ${DATA.filter((r) => r.night).length} bars, lounges & clubs` : `☀️ Day: ${FOOD.length} spots for breakfast, brunch, lunch, dinner & happy hour`);
}
document.querySelectorAll('#sceneSeg button').forEach((b) => (b.onclick = () => setScene(b.dataset.s)));

// ---------- Night: downtown bars, happy hours, late night ----------
const NIGHT_F = [
  { k: 'hh', l: '🍹 Happy hour now', f: (r) => !!hhNow(r) }, { k: 'open', l: '🟢 Open now', f: (r) => isOpen(r) === true }, { k: 'late', l: '🌃 Open late', f: (r) => openLate(r) },
  { k: 'cocktail', l: '🍸 Cocktails', re: /cocktail|speakeasy|lounge|spirit|bandista|angel share|bad news|foxheart|henke|behind closed/i }, { k: 'beer', l: '🍺 Beer', re: /pub|brew|tap|saloon|beer|ale|saucer|dive|icehouse/i },
  { k: 'wine', l: '🍷 Wine', re: /wine|vino|cellar/i }, { k: 'whiskey', l: '🥃 Whiskey', re: /bourbon|whiske?y|bottle|moonshin/i }, { k: 'sports', l: '📺 Sports', re: /sports|biggio|pub|saloon|tavern/i },
  { k: 'music', l: '🎶 Music & DJs', re: /blues|music|dj|jazz|piano|concert|club|cherry|distrito|bauhaus|dipper/i }, { k: 'club', l: '💃 Dance', re: /nightclub|club|dance|cherry|distrito/i },
  { k: 'patio', l: '🌇 Patio & rooftop', re: /patio|rooftop|roof|terrace|garden|lawn/i },
];
const nightText = (r) => [r.name, r.type, r.note, ...(r.cuisines || []), ...(r.meals || []), ...(r.vibes || [])].join(' ');
function openLate(r) { const d = new Date(); d.setDate(d.getDate() + (d.getHours() < 5 ? 0 : 1)); d.setHours(0, 45, 0, 0); return isOpen(r, d) === true || r.lateListed; }
let nightF = new Set(), nightSort = 'now';
function nightScore(r) { return (hhNow(r) ? 4 : 0) + (isOpen(r) === true ? 2 : 0) + (openLate(r) ? 1 : 0) + (r.bar && /bar|lounge|pub|club|saloon|brew/i.test(r.type) ? 0.5 : 0); }
function renderNight() {
  const bars = DATA.filter((r) => r.night);
  $('#nightChips').innerHTML = NIGHT_F.map((f) => `<button class="chip ${nightF.has(f.k) ? 'on' : ''}" data-nf="${f.k}">${f.l}</button>`).join('');
  let list = bars.filter((r) => [...nightF].every((k) => { const f = NIGHT_F.find((x) => x.k === k); return f.f ? f.f(r) : f.re.test(nightText(r)); }));
  const by = { now: (a, b) => nightScore(b) - nightScore(a) || a.name.localeCompare(b.name), near: (a, b) => (walkMinsTo(a) ?? 999) - (walkMinsTo(b) ?? 999), az: (a, b) => a.name.localeCompare(b.name) };
  list.sort(by[nightSort] || by.now);
  const onNow = bars.filter((r) => hhNow(r)), openNow = bars.filter((r) => isOpen(r) === true).length;
  $('#nightSub').textContent = `${bars.length} downtown bars & lounges · ${openNow} open now · ${onNow.length} happy hour${onNow.length === 1 ? '' : 's'} on right now`;
  $('#hhNowRow').innerHTML = onNow.length ? `<h3 class="nh">🍹 Happy hour right now</h3><div class="hscroll">${onNow.map((r) => { const s = hhNow(r), h = hhFor(r); return `<button class="hhcard" data-open="${r.id}"><b>${esc(r.name)}</b><span>${esc(h.deals)}</span><em>${s.closesAt ? 'Ends ' + esc(s.closesAt) : 'On now'}${walkMinsTo(r) != null ? ' · 🚶 ' + walkMinsTo(r) + ' min' : ''}</em></button>`; }).join('')}</div>` : `<div class="meta" style="margin:6px 0 4px">No verified happy hours on right now — tap 🍹 on a bar to see when its next one starts.</div>`;
  $('#nightList').innerHTML = list.map((r) => barCard(r)).join('') || '<div class="empty">No bars match all of those. Try removing a filter.</div>';
  $('#nightCount').textContent = `${list.length} spot${list.length === 1 ? '' : 's'}`;
}
function barCard(r) {
  const o = openLabel(r), h = hhFor(r), hn = hhNow(r), w = walkMinsTo(r);
  return `<div class="card bar">
  <button class="fav" data-fav="${r.id}" title="Favorite" aria-label="${favs.has(r.name) ? 'Remove ' + esc(r.name) + ' from favorites' : 'Save ' + esc(r.name) + ' to favorites'}">${favs.has(r.name) ? '♥' : '♡'}</button>
  <div class="chead">${tile(r)}<div><h3>${esc(r.name)}</h3>
  <div class="meta">${esc(r.type)} · ${esc((r.address || '').replace(', Houston, TX', ''))}${r.tunnel ? ' · 🚇 tunnel' : ''}</div></div></div>
  <div class="tags">${o.known ? `<span class="tag ${o.open ? 'open' : 'closed'}">${esc(o.label)}</span>` : ''}${openLate(r) ? '<span class="tag">🌃 Late</span>' : ''}${w != null ? `<span class="tag">🚶 ${w} min</span>` : ''}</div>
  ${h ? `<div class="hhbox ${hn ? 'on' : ''}"><b>🍹 ${hn ? 'Happy hour now' + (hn.closesAt ? ' · till ' + esc(hn.closesAt) : '') : esc(h.when)}</b><span>${esc(h.deals)}</span>${h.confidence === 'verify' ? '<em>Double-check before you go</em>' : ''}</div>`
      : r.hhListed ? `<div class="hhbox"><b>🍹 Listed for happy hour</b><span>Times and prices aren't published yet — check with the bar.</span></div>` : ''}
  <div class="row bar-actions"><button class="btn ghost sm" data-open="${r.id}">Details</button><button class="btn sm" data-walk="${r.id}">🧭 Walk there</button></div></div>`;
}
$('#nightChips').onclick = (e) => { const b = e.target.closest('[data-nf]'); if (!b) return; const k = b.dataset.nf; nightF.has(k) ? nightF.delete(k) : nightF.add(k); renderNight(); };
$('#nightSort').onchange = (e) => { nightSort = e.target.value; if (nightSort === 'near' && !USER) startLocate(); renderNight(); };
$('#nightMap').onclick = () => { show('map'); setScene('night'); };
document.addEventListener('click', (e) => { const w = e.target.closest('[data-walk]'); if (w) walkTo(DATA[+w.dataset.walk]); const o = e.target.closest('.hhcard[data-open], .bar-actions [data-open]'); if (o) openSheet(+o.dataset.open); });

// ---------- Coffee: cafés, espresso bars, tea & boba ----------
const isCoffee = (r) => /coffee|caf[eé]|espresso|tea\b|boba|roast/i.test(r.type || '') || /coffee|espresso|roaster|starbucks|\bboba\b|\btea\b|kopi|prelude|tenfold|blackwater|boomtown|day 6|slow drip|fifth vessel|three keys/i.test(r.name);
const COFFEE_F = [
  { k: 'open', l: '🟢 Open now', f: (r) => isOpen(r) === true },
  { k: 'local', l: '🏠 Local shops', f: (r) => !/starbucks|corner bakery|einstein|dunkin|panera/i.test(r.name) },
  { k: 'chain', l: '⭐ Starbucks & chains', f: (r) => /starbucks|corner bakery|einstein|dunkin|panera/i.test(r.name) },
  { k: 'tea', l: '🧋 Tea & boba', f: (r) => /tea|boba/i.test(r.name + ' ' + r.type) },
  { k: 'bakery', l: '🥐 Pastries & bakery', f: (r) => /bak|pastr|croissant|bagel|donut/i.test(r.name + ' ' + r.type + ' ' + (r.tryit || '')) },
  { k: 'tunnel', l: '🚇 In the tunnels', f: (r) => !!r.tunnel },
  { k: 'street', l: '🏙️ Street level', f: (r) => !r.tunnel },
];
let coffeeF = new Set(), coffeeSort = 'now';
function renderCoffee() {
  const all = DATA.filter(isCoffee);
  $('#coffeeChips').innerHTML = COFFEE_F.map((f) => `<button class="chip ${coffeeF.has(f.k) ? 'on' : ''}" data-cf="${f.k}">${f.l}</button>`).join('');
  const list = all.filter((r) => [...coffeeF].every((k) => COFFEE_F.find((x) => x.k === k).f(r)));
  const by = { now: (a, b) => (isOpen(b) === true) - (isOpen(a) === true) || (walkMinsTo(a) ?? 99) - (walkMinsTo(b) ?? 99) || a.name.localeCompare(b.name), near: (a, b) => (walkMinsTo(a) ?? 999) - (walkMinsTo(b) ?? 999), az: (a, b) => a.name.localeCompare(b.name) };
  list.sort(by[coffeeSort] || by.now);
  const open = all.filter((r) => isOpen(r) === true).length;
  $('#coffeeSub').textContent = `${all.length} coffee shops, cafés & tea spots · ${open} open now · ${all.filter((r) => r.tunnel).length} in the tunnels`;
  $('#coffeeList').innerHTML = list.map((r) => { const o = openLabel(r), w = walkMinsTo(r); return `<div class="card bar">
    <button class="fav" data-fav="${r.id}" title="Favorite" aria-label="${favs.has(r.name) ? 'Remove ' + esc(r.name) + ' from favorites' : 'Save ' + esc(r.name) + ' to favorites'}">${favs.has(r.name) ? '♥' : '♡'}</button>
    <div class="chead">${tile(r)}<div><h3>${esc(r.name)}</h3>
    <div class="meta">${esc(r.type)} · ${esc((r.address || '').replace(', Houston, TX', ''))}${r.venue ? ' · ' + esc(r.venue) : ''}</div></div></div>
    <div class="tags">${o.known ? `<span class="tag ${o.open ? 'open' : 'closed'}">${esc(o.label)}</span>` : ''}${r.tunnel ? '<span class="tag">🚇 Tunnel</span>' : ''}${w != null ? `<span class="tag">🚶 ${w} min</span>` : ''}</div>
    ${r.note ? `<div class="meta" style="margin-top:6px">${esc(r.note)}</div>` : ''}
    <div class="row bar-actions"><button class="btn ghost sm" data-open="${r.id}">Details</button><button class="btn sm" data-walk="${r.id}">🧭 Walk there</button></div></div>`; }).join('') || '<div class="empty">No coffee spots match all of those. Try removing a filter.</div>';
  $('#coffeeCount').textContent = `${list.length} spot${list.length === 1 ? '' : 's'}`;
}
$('#coffeeChips').onclick = (e) => { const b = e.target.closest('[data-cf]'); if (!b) return; const k = b.dataset.cf; coffeeF.has(k) ? coffeeF.delete(k) : coffeeF.add(k); renderCoffee(); };
$('#coffeeSort').onchange = (e) => { coffeeSort = e.target.value; if (coffeeSort === 'near' && !USER) startLocate(() => renderCoffee()); renderCoffee(); };
$('#coffeeMap').onclick = () => {
  show('map'); setScene('day', true); const ids = DATA.filter(isCoffee); city?.setHighlight(new Set(ids.map((r) => r.id)));
  const bar = $('#mapFound'); bar.innerHTML = `<div><b>☕ Coffee shops</b><div class="meta">${ids.filter((r) => !r.tunnel).length} on the street · ${ids.filter((r) => r.tunnel).length} in the tunnels (switch to Tunnels in ☰ More)</div></div><button class="btn ghost" id="fX">Show all</button>`;
  bar.classList.add('on'); $('#fX').onclick = () => { bar.classList.remove('on'); city.setHighlight(mapOpen ? new Set(DATA.filter((r) => isOpen(r)).map((r) => r.id)) : null); };
};
document.addEventListener('click', (e) => { const o = e.target.closest('#coffeeList .bar-actions [data-open]'); if (o) openSheet(+o.dataset.open); });

// ---------- you are here + walking navigation ----------
let watchId = null, compass = null;
const DEMO = { lat: 29.75935, lng: -95.36345, acc: 8, heading: null, demo: true };   // Main Street Square
function useDemo(cb) {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  USER = { ...DEMO }; city?.setUser(USER); $('#zloc').classList.add('on'); $('#findMe').classList.add('on');
  $('#navPanel').classList.remove('on'); toast('Demo: you\'re standing at Main Street Square'); cb ? cb() : city?.locateMe();
}
function locHelp(kind, cb) {
  const p = $('#navPanel'), ios = /iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const how = ios
    ? 'On iPhone/iPad: open <b>Settings → Privacy &amp; Security → Location Services</b>, make sure it\'s on, then tap <b>Safari Websites → While Using the App</b>. Back in Safari, tap <b>aA → Website Settings → Location → Allow</b>, then reload.'
    : 'Click the 🔒 / site-settings icon next to the address bar, set <b>Location → Allow</b>, then reload.';
  p.innerHTML = kind === 'far'
    ? `<div class="nv-main"><div class="nv-ico">📍</div><div><b>You're about ${milesFromDowntown()} mi from downtown</b><div class="meta">The map only covers downtown. Once you're there, tap 📍 Find me again — or try everything now from a demo spot.</div></div></div><div class="nv-row"><button class="btn sm" id="nvDemo">Try it from Main St Square</button><button class="btn sm ghost" id="nvEnd">Close</button></div>`
    : `<div class="nv-main"><div class="nv-ico">🔒</div><div><b>${kind === 'denied' ? 'Location is turned off for this site' : 'Couldn\'t get your location'}</b><div class="meta">${kind === 'denied' ? how : 'Make sure Location Services are on and you have a signal, then try again.'}</div></div></div><div class="nv-row"><button class="btn sm" id="nvRetry">Try again</button><button class="btn sm ghost" id="nvDemo">Use demo spot</button><button class="btn sm ghost" id="nvEnd">Close</button></div>`;
  p.classList.add('on');
  $('#nvEnd').onclick = () => p.classList.remove('on');
  $('#nvDemo').onclick = () => useDemo(cb);
  if ($('#nvRetry')) $('#nvRetry').onclick = () => { p.classList.remove('on'); startLocate(cb); };
}
function startLocate(cb) {
  if (!('geolocation' in navigator) || !window.isSecureContext) { locHelp('error', cb); return false; }
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then((s) => s === 'granted' && listenCompass()).catch(() => {}); else listenCompass();
  if (watchId != null) { cb?.(); return true; }
  let first = true;
  watchId = navigator.geolocation.watchPosition((pos) => {
    if (USER?.demo) return;
    USER = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, heading: compass ?? (pos.coords.heading ?? null) };
    city?.setUser(USER); $('#zloc').classList.add('on'); $('#findMe').classList.add('on');
    if (first) { first = false; cb?.(); }
    if ($('#v-night').classList.contains('on')) renderNight(); if ($('#v-coffee').classList.contains('on')) renderCoffee();
  }, (err) => { watchId = null; $('#zloc').classList.remove('on'); $('#findMe').classList.remove('on'); locHelp(err.code === 1 ? 'denied' : 'error', cb); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  return true;
}
function listenCompass() {
  if (listenCompass.on) return; listenCompass.on = true;
  const h = (e) => { const v = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (v != null) { compass = v; if (USER) { USER.heading = v; city?.setUser(USER); } } };
  window.addEventListener('deviceorientationabsolute', h); window.addEventListener('deviceorientation', h);
}
const findMe = () => { if (USER && city?.user) { if (!city.locateMe()) locHelp('far'); } else { toast('Finding you…'); startLocate(() => { if (!city?.locateMe()) locHelp('far'); }); } };
let walkOn = false;
function toggleWalk(force) {
  walkOn = force ?? !walkOn; $('#walkView').classList.toggle('on', walkOn);
  if (!walkOn) { city?.setWalkView(false); return; }
  const go = () => { if (!city.setWalkView(true)) { walkOn = false; $('#walkView').classList.remove('on'); locHelp('far', () => toggleWalk(true)); } else { $('#legend').classList.add('min'); toast('🧭 Following you — the map turns as you walk'); } };
  if (USER && city?.user) go(); else { toast('Finding you…'); startLocate(go); }
}
// ---------- compact controls + show/hide ----------
$('#moreBtn').onclick = () => { const m = $('#hudMore'), open = m.hidden; m.hidden = !open; $('#moreBtn').setAttribute('aria-expanded', open); $('#moreBtn').innerHTML = open ? '✕<span class="lbl"> Close</span>' : '☰<span class="lbl"> More</span>'; };
function applyLight() {   // live: sun and dark follow the clock; otherwise Day = daylight, Night = night
  let live = false; try { live = !!VIEW.liveLight; } catch (e) {}
  if (city) city.themeNight = live ? null : SCENE === 'night';
  const i = document.querySelector('#liveLight'); if (i) i.checked = live;
}
const VIEW = (() => { try { return JSON.parse(localStorage.getItem('mapView') || '{}'); } catch (e) { return {}; } })();
function applyView() {
  if (city) city.hide = { ...VIEW.hide };
  $('#v-map').classList.toggle('no-legend', VIEW.ui?.legend ?? true); $('#v-map').classList.toggle('no-zoom', !!VIEW.ui?.zoom);
  document.querySelectorAll('#hideToggles input').forEach((i) => { i.checked = i.dataset.h ? !VIEW.hide?.[i.dataset.h] : !(i.dataset.ui === 'legend' ? (VIEW.ui?.legend ?? true) : VIEW.ui?.[i.dataset.ui]); });
  try { localStorage.setItem('mapView', JSON.stringify(VIEW)); } catch (e) {}
}
$('#liveLight').onchange = (e) => { VIEW.liveLight = e.target.checked; applyLight(); applyView(); toast(VIEW.liveLight ? '🕒 Light now follows the time of day' : SCENE === 'night' ? '🌙 Always night lighting' : '☀️ Always daylight'); };
$('#hideToggles').onchange = (e) => { const i = e.target; if (!i.dataset.h && !i.dataset.ui) return; if (i.dataset.h) (VIEW.hide = VIEW.hide || {})[i.dataset.h] = !i.checked; else (VIEW.ui = VIEW.ui || {})[i.dataset.ui] = !i.checked; applyView(); };
$('#cleanMap').onclick = () => { const clean = !VIEW.clean; VIEW.clean = clean; VIEW.hide = clean ? { pinNames: true, signs: true, labels: true, people: true, traffic: true, trains: true, sky: true } : {}; VIEW.ui = clean ? { legend: true } : {}; $('#cleanMap').textContent = clean ? '↺ Show everything' : '✨ Clean map'; applyView(); toast(clean ? 'Clean map: just buildings and pins' : 'Showing everything'); };
// ---------- first-person street view ----------
let povCtl = null, lastNav = null;
async function openStreetView(r) {
  if (!city) return; if (povCtl) return;
  const { openPOV, standFor } = await import('./pov.js');
  let start = null, follow = false;
  const sp = r ? city.spotForPlace(r.id) : null;
  if (sp) start = standFor(city, sp);
  else if (city.user?.inside) { const u = city.user, h = u.heading; start = { x: u.x, y: u.y, yaw: h != null ? (() => { const a = (h * Math.PI) / 180, N = city.northW, E = city.eastW; return Math.atan2(-(N[0] * Math.cos(a) + E[0] * Math.sin(a)), -(N[1] * Math.cos(a) + E[1] * Math.sin(a))); })() : 0 }; follow = true; }
  else {   // stand at the street corner nearest the middle of the screen, looking up the avenue
    const c = city.screenCenter(), A = city.avenues, C = city.cross;
    const a = A.reduce((b, q) => (Math.abs(q.x - c.x) < Math.abs(b.x - c.x) ? q : b)), cr = C.reduce((b, q) => (Math.abs(q.y - c.y) < Math.abs(b.y - c.y) ? q : b));
    start = { x: a.x + city.streetW + 0.32, y: cr.y + city.streetW * 1.8, yaw: 0 };
  }
  toast('Loading street view…'); document.body.classList.add('in-pov');
  try {
    povCtl = await openPOV(city, { start, follow, under: !!r?.tunnel, placeId: r?.tunnel ? r.id : null,
      onPick: (s) => { const places = s.places.filter((p) => city.sceneOk(p)); places.length === 1 ? openSheet(places[0].id) : listSheet(places, s.label); },
      navText: () => (lastNav && !lastNav.arrived ? `${lastNav.next ? lastNav.next.icon + ' In ' + lastNav.toNext + ' m, ' + lastNav.next.text.charAt(0).toLowerCase() + lastNav.next.text.slice(1) : lastNav.cur.icon + ' ' + lastNav.cur.text} · ${lastNav.minutes} min` : lastNav?.arrived ? `🏁 You've arrived at ${lastNav.target.label}` : ''),
      onMove: (m) => { if (city.user?.virtual) { city.user.x = m.x; city.user.y = m.y; if (city.nav) city.updateNav(); } },
      onClose: (p) => { if (city.user?.virtual) { city.stopNav(); city.user = null; if (USER) city.setUser(USER); } povCtl = null; document.body.classList.remove('in-pov'); city.zoomTo(p.x, p.y, Math.max(city.v.s, 1.1)); } });
  } catch (e) { console.warn(e); toast('Street view needs WebGL, which this browser has turned off'); povCtl = null; document.body.classList.remove('in-pov'); }
}
$('#povBtn').onclick = () => openStreetView(null); window._pov = openStreetView; window._povc = () => povCtl;
$('#walkView').onclick = () => toggleWalk();
const milesFromDowntown = () => { if (!USER) return '?'; const dy = (USER.lat - 29.7575) * 110850, dx = (USER.lng + 95.364) * 96680; return (Math.hypot(dx, dy) / 1609).toFixed(1); };
function walkTo(r) {
  show('map'); closeSheet(); if (city && !city.sceneOk(r)) setScene(r.night && !r.day ? 'night' : 'day', true);
  const go = () => {
    if (!city) return;
    const sp = city.spotForPlace(r.id);
    if (!sp) { if (r.lat) { toast(`${r.name} is just past the edge of this map — opening directions in Maps`); window.open(navLinks(r)[/iP(hone|ad)|Mac/.test(navigator.userAgent) ? 'apple' : 'google'], '_blank'); } else toast('No map location for ' + r.name); return; }
    if (!city.user?.inside) { if (USER?.demo) return; showNavFar(r); return; }
    city.setPick(r.id); city.startNav({ x: sp.x, y: sp.y, label: r.name, tunnel: !!r.tunnel, id: r.id, lat: r.lat, lng: r.lng });
  };
  if (USER && city?.user) go(); else { toast('Finding you…'); startLocate(go); }
}
function showNavFar(r) {
  const L = navLinks(r), p = $('#navPanel');
  p.innerHTML = `<div class="nv-main"><div class="nv-ico">📍</div><div><b>You're ${milesFromDowntown()} mi from downtown</b><div class="meta">Use your maps app to get to ${esc(r.name)} — once you're downtown, tap 🧭 again for walking directions here.</div></div></div><div class="nv-row"><a class="btn sm" href="${L.apple}" target="_blank" rel="noopener"> Apple Maps</a><a class="btn sm ghost" href="${L.google}" target="_blank" rel="noopener">Google Maps</a><button class="btn sm ghost" id="nvDemo">Demo from Main St Sq</button><button class="btn sm ghost" id="nvEnd">Close</button></div>`;
  p.classList.add('on'); $('#nvEnd').onclick = () => p.classList.remove('on'); $('#nvDemo').onclick = () => useDemo(() => walkTo(r));
}
function renderNav(st) {
  const p = $('#navPanel');
  if (!st) { p.classList.remove('on'); return; }
  const r = DATA[st.target.id], L = r ? navLinks(r) : null, eta = new Date(Date.now() + st.minutes * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (st.arrived) {
    p.innerHTML = `<div class="nv-main"><div class="nv-ico">🏁</div><div><b>You've arrived at ${esc(st.target.label)}</b>${st.target.tunnel ? '<div class="meta">Take the escalator or stairs down to the tunnel level.</div>' : '<div class="meta">Enjoy!</div>'}</div></div><div class="nv-row"><button class="btn sm" id="nvEnd">Done</button></div>`;
    p.classList.add('on'); $('#nvEnd').onclick = () => city.stopNav(); return;
  }
  const dist = (m) => (m >= 1000 ? (m / 1609).toFixed(1) + ' mi' : m + ' m');
  p.innerHTML = `<div class="nv-main"><div class="nv-ico">${st.next ? st.next.icon : st.cur.icon}</div><div><b>${st.next ? `In ${dist(st.toNext)}, ${esc(st.next.text.charAt(0).toLowerCase() + st.next.text.slice(1))}` : esc(st.cur.text)}</b><div class="meta">${st.next ? 'Now: ' + esc(st.cur.text) + ' · ' : ''}${st.minutes} min · ${dist(st.remaining)} · arrive ${eta}${st.rerouted ? ' · rerouted' : ''}</div></div></div>
  <div class="nv-row"><button class="btn sm ghost" id="nvSteps">Steps</button>${L ? `<a class="btn sm ghost" href="${L.apple}" target="_blank" rel="noopener"> Maps</a>` : ''}<button class="btn sm ghost" id="nvFollow">${city.follow ? '📍 Following' : '📍 Recenter'}</button><button class="btn sm" id="nvEnd">End</button></div>
  <ol class="nv-steps" id="nvList" hidden>${st.steps.map((s) => `<li>${s.icon} ${esc(s.text)}${s.len ? ` <span class="meta">· ${dist(s.len)}</span>` : ''}</li>`).join('')}</ol>`;
  p.classList.add('on');
  $('#nvEnd').onclick = () => city.stopNav();
  $('#nvSteps').onclick = () => { const l = $('#nvList'); l.hidden = !l.hidden; navStepsOpen = !l.hidden; };
  $('#nvFollow').onclick = () => { city.locateMe(); renderNav(st); };
  if (navStepsOpen) $('#nvList').hidden = false;
}
let navStepsOpen = false;
$('#zloc').onclick = findMe;

document.addEventListener('click', (e) => { const b = e.target.closest('.subtabs [data-v]'); if (b) show(b.dataset.v); });
// ---------- tabs ----------
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => show(b.dataset.v)));
function show(v) {
  const grp = ['browse', 'coffee', 'night'].includes(v) ? 'explore' : null;
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x.dataset.v === v || (grp && x.dataset.group === grp)));
  document.querySelectorAll('.subtabs button').forEach((x) => x.classList.toggle('on', x.dataset.v === v));
  document.querySelectorAll('.view').forEach((x) => x.classList.toggle('on', x.id === 'v-' + v));
  $('#top').style.display = v === 'map' ? 'none' : '';
  if (v === 'browse') renderBrowse(); if (v === 'week') renderWeek(); if (v === 'night') renderNight(); if (v === 'coffee') renderCoffee();
  if (v === 'map' && !GEO_READY && !city) { GEO_P.then(() => { if ($('#v-map').classList.contains('on')) show('map'); }); return; }
  if (v === 'map') { initMap(); city.resize(); if (city._bgBuilt) { city._bgBuilt = false; city.anim = null; city.fit(); } }
  if (city) city.paused = v !== 'map';
  if (v !== 'map') window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + v); } catch (e) {}
}

// ---------- Claude (in claude.ai via the page capability, or /api/ask on the web) ----------
let ASK = null;
async function setupAsk() {
  for (let i = 0; i < 20 && !window.claude; i++) await new Promise((r) => setTimeout(r, 100));
  try { const c = window.claude && (await window.claude.use('sample')); if (c) { ASK = { text: async (p, onText) => (await c(p, { modelTier: 'default', onText: onText ? ({ text }) => onText(text) : undefined })).text }; return; } } catch (e) {}
  try {
    const r = await fetch('api/ask', { method: 'GET' });
    if (r.ok && (await r.json()).ready) ASK = { text: async (p) => { const res = await fetch('api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: p }) }); if (!res.ok) throw new Error('ask failed'); return (await res.json()).text; } };
  } catch (e) {}
  if (!ASK) { $('#askTab').style.display = 'none'; }
}
const IDEAS = ['Cold day, want soup or noodles', 'Quick lunch under $15 in the tunnels', 'Impress a client, not a steakhouse', 'Healthy but filling', 'Friday treat with a cocktail', 'Best happy hour near Discovery Green'];
$('#askIdeas').innerHTML = IDEAS.map((i) => `<button class="chip">${esc(i)}</button>`).join('');
$('#askIdeas').onclick = (e) => { if (e.target.matches('.chip')) $('#askTxt').value = e.target.textContent; };
function ctx() { const d = new Date(); return `Now: ${d.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })} in Houston. Favorites: ${[...favs].join(', ') || 'none'}. Recently visited: ${Object.keys(visits).slice(-10).join(', ') || 'none'}.`; }
$('#askBtn').onclick = async () => {
  const want = $('#askTxt').value.trim(); if (!want) { toast('Describe what you feel like'); return; }
  if (!ASK) { $('#askOut').innerHTML = '<div class="empty">Claude isn\'t connected here yet.</div>'; return; }
  const btn = $('#askBtn'); btn.disabled = true; btn.textContent = 'Thinking…';
  const list = DATA.map((r) => { const o = openLabel(r), hh = hhFor(r); return `${r.id}|${r.name}|${r.type}|${$$(r.price)}|${r.vibes.join(',')}|${r.tunnel ? 'tunnel' : 'street'}|${o.known ? o.label : '?'}|${hh ? 'HH ' + hh.when : ''}|${r.note}`; }).join('\n');
  const prompt = `You help someone choose where to eat in downtown Houston. Pick ONLY from this list (id|name|type|price|vibes|level|open status now|happy hour|note):\n${list}\n\n${ctx()}\nTheir request: "${want}"\n\nPrefer places open now unless they ask about later. Return JSON only: {"summary":"one friendly sentence","picks":[{"id":number,"why":"one or two sentences: why it fits and what to order"}]} with 3 to 5 picks, best first. Don't invent restaurants or prices.`;
  try {
    const text = await ASK.text(prompt);
    const out = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    const picks = (out.picks || []).filter((p) => DATA[p.id]);
    $('#askOut').innerHTML = `<p>${esc(out.summary || '')}</p><div class="grid">${picks.map((p) => card(DATA[p.id]).replace('<p class="note">', `<p class="note"><b>Why:</b> ${esc(p.why)}</p><p class="try" style="display:none">`)).join('')}</div>`;
    if (picks[0]) city?.setPick(picks[0].id);
  } catch (e) { $('#askOut').innerHTML = `<div class="empty">${e && e.code === 'rate_limited' ? 'Too many requests — try again in a minute.' : 'Something went wrong. Try again.'}</div>`; }
  btn.disabled = false; btn.textContent = '✨ Get recommendations';
};
async function aboutPlace(r) {
  const box = $('#sAi'); box.classList.remove('h'); box.textContent = 'Thinking…';
  try {
    const text = await ASK.text(`In 5 short bullet lines, tell a downtown Houston office worker about "${r.name}" (${r.type}, ${r.address}${r.tunnel ? ', in the ' + r.tunnel : ''}). Context: ${r.note}. Official hours: ${r.hours || 'not listed'}. Cover: what it's known for, what to order, typical price per person, vibe/best for, and one tip. If unsure, say so. Plain text.`, (t) => (box.textContent = t));
    box.textContent = text;
  } catch (e) { box.textContent = 'Couldn\'t reach Claude right now.'; }
}

// ---------- boot ----------
(async () => {
  try {
    // the big map files (~900 KB) load alongside, but the lists don't wait for them
    GEO_P = Promise.all([fetch('buildings.json').then((r) => (r.ok ? r.json() : null)).catch(() => null), fetch('streets.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)]).then(([bj, sj]) => { BUILDINGS = bj; STREETS = sj; GEO_READY = true; });
    const [pj, hj, oj, ms] = await Promise.all([fetch('places.json').then((r) => r.json()), fetch('happyhour.json').then((r) => r.json()).catch(() => ({ spots: {} })), fetch('overrides.json').then((r) => r.json()).catch(() => ({ spots: {} })), fetch('metro-static.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)]);
    metroStatic = ms;
    META = { refreshed: pj.refreshed }; HH = hj;
    fetch('hours-check.json').then((r) => r.json()).then((j) => { HCHK = j.flags || {}; for (const n of Object.keys(HFIX)) delete HCHK[n]; if ($('#v-browse').classList.contains('on')) renderBrowse(); }).catch(() => {});
    fetch('events.json').then((r) => r.json()).then((j) => { EVENTS = j.events || []; city?.setEvents(EVENTS); renderPick(); }).catch(() => {});
    DATA = pj.places.map((p, i) => {
      const o = { ...(p.official || {}) };
      if (o.facebook && /Downtown-Houston|115104521841645|\s/.test(o.facebook)) o.facebook = null;   // directory's own page, not the restaurant's
      const fix = (oj.spots || {})[p.name + '|' + ((p.address || '').match(/^\d+/) || [''])[0]] || (oj.spots || {})[p.name];
      if (fix) { Object.assign(o, fix); if (fix.hours) o.corrected = fix.source; o.aliases = fix.aliases || []; o.extraSource = fix.notInDirectory ? fix.source : null; }
      const cats = (p.official && p.official.cats) || {};
      return { ...p, id: i, status: o.status || null, movedTo: o.movedTo || null, bar: !!cats.bar || /\b(bar|pub|lounge|saloon|tavern|brew|nightclub|wine bar)\b/i.test(p.type || ''), hhListed: !!cats.hh, lateListed: !!cats.late, cuisines: p.cuisines || [], meals: p.meals || [], vibes: p.vibes || [], lat: o.lat, lng: o.lng, hours: o.hours, phone: o.phone, website: o.website, instagram: o.instagram, facebook: o.facebook, url: o.url, venue: o.venue && !/^(suite|unit|#|\()/i.test(String(o.venue).trim()) ? String(o.venue).replace(/ Houston$/, '').trim() : null, corrected: o.corrected, aliases: o.aliases || [], extraSource: o.extraSource };
    });
    DATA = DATA.filter((r) => r.status !== 'closed').map((r, i) => ({ ...r, id: i }));
    for (const r of DATA) if (HFIX[r.name]) { r.hours = HFIX[r.name]; r.corrected = 'your fix'; }   // fixes you chose in the hours review   // closed for good: drop, then renumber
    DATA.forEach((r) => {
      const barish = /\b(bar|lounge|pub|nightclub|club|saloon|tavern|nightlife|speakeasy)\b/i.test(r.type || '');
      const food = (r.meals || []).some((x) => /breakfast|brunch|lunch|dinner|full service|fast casual/i.test(x)) || !(barish || /bars?\b|nightlife|brew/i.test(r.type || ''));   // a steakhouse or diner with no meal tags still serves food
      const barName = /\bbar\b|lounge|tavern|\bpub\b|saloon|moonshin|bottle|cellar|hearsay|speakeasy|club/i.test(r.name);
      r.night = r.bar && (barish || barName || !food);            // night map: bars, lounges, clubs
      r.day = !(r.night && !food);                     // day map: anywhere that serves meals
    });
    { const seen = new Set(); DATA = DATA.filter((r) => { const k = r.name.toLowerCase() + '|' + (r.address || '').match(/^\d*/)[0]; if (seen.has(k)) return false; seen.add(k); return true; }); DATA.forEach((r, i) => (r.id = i)); FOOD = DATA.filter((r) => r.day); window._DATA = DATA; window._walkTo = (r) => walkTo(r); window._openSheet = (id) => openSheet(id); window._B = () => BUILDINGS; }
  } catch (e) { $('#hdr').textContent = 'Could not load restaurant data.'; return; }
  const openNow = DATA.filter((r) => isOpen(r)).length;
  $('#hdr').textContent = `${FOOD.length} places to eat · ${DATA.filter((r) => r.night).length} bars · ${openNow} open right now · ${DATA.filter((r) => r.tunnel).length} in the tunnels`;
  renderPick();
  const h = location.hash.slice(1); if (['ask', 'week', 'browse', 'map', 'night', 'coffee'].includes(h)) show(h);
  if (h.startsWith('vote=')) openVote(h.slice(5));
  if (h.startsWith('sync=')) { SYNC = h.slice(5); store.set('syncKey', SYNC); syncPull(); toast('🔄 This device is now synced'); show('week'); }
  if (h.startsWith('poll=')) { const opts = decodeURIComponent(h.slice(5)).split('|').map((n) => DATA.find((x) => x.name === n)).filter(Boolean); if (opts.length) { show('pick'); $('#pickOut').innerHTML = `<div class="card poll"><h3>🗳️ Where should we eat?</h3><div class="meta">Tap your vote — it opens your messages so you can send it back.</div>${opts.map((x) => `<button class="pollopt" data-vote="${x.id}">${tile(x)}<span><b>${esc(x.name)}</b><em>${$$(x.price)} · ${esc(x.type)} · ${esc(openLabel(x).label || '')}</em></span></button>`).join('')}</div>`; $('#pickOut').onclick = (e) => { const v = e.target.closest('[data-vote]'); if (v) { const x = DATA[+v.dataset.vote]; shareText('My vote', `I vote ${x.name} 👍`, appUrl() + '#p=' + encodeURIComponent(x.name)); } }; } }
  if (h === 'surprise') { show('pick'); setTimeout(() => $('#pickBtn').click(), 300); }
  if (h.startsWith('p=')) { const r = DATA.find((x) => x.name === decodeURIComponent(h.slice(2))); if (r) openSheet(r.id); }
  if (h.startsWith('plan=')) { const [slot, ...names] = decodeURIComponent(h.slice(5)).split('|'); week.slot = slot || week.slot; DAYS.forEach((d, i) => { const r = DATA.find((x) => x.name === names[i]); if (r) week.days[d] = { name: r.name, address: r.address, lock: true }; }); save(); show('week'); toast('Plan loaded — 🔒 days are from the link'); }
  loadWeather(); syncPull();
  setupAsk();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
  // build the street model quietly so Explore cards can show where each place is
  const bg = () => { if (!city) { initMap(); if (!$('#v-map').classList.contains('on')) { city.paused = true; city._bgBuilt = true; } SPOTOF = null; if ($('#v-browse').classList.contains('on')) renderBrowse(); } };
  GEO_P.then(() => (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(bg, { timeout: 2500 }));
})();

// keyboard: Esc closes a sheet, or steps the map back; +/- zoom the map
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'Escape') { if ($('#sheet').classList.contains('on')) closeSheet(); else if ($('#v-map').classList.contains('on')) city?.back(); }
  if ($('#v-map').classList.contains('on') && city) { if (e.key === '+' || e.key === '=') city.zoom(1.3); if (e.key === '-') city.zoom(1 / 1.3); if (e.key === 'q' || e.key === '[') city.rotateBy(-Math.PI / 12); if (e.key === 'e' || e.key === ']') city.rotateBy(Math.PI / 12); if (e.key === 'n') city.spin(0); }
});
