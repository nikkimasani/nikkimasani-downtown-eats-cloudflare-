import { openState } from './hours.js';
import { CityMap, styleFor } from './map.js';

const $ = (s) => document.querySelector(s);
const store = { get(k, d) { try { const v = localStorage.getItem('dte_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('dte_' + k, JSON.stringify(v)); } catch (e) {} } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $$ = (n) => '$'.repeat(n);
const q = encodeURIComponent;
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._); t._ = setTimeout(() => t.classList.remove('on'), 2200); };

let DATA = [], HH = { spots: {} }, META = {};
const MOODS = [
  { k: 'quick', e: '⚡', l: 'Quick bite' }, { k: 'healthy', e: '🥗', l: 'Light & healthy' }, { k: 'comfort', e: '🍔', l: 'Comfort food' },
  { k: 'spicy', e: '🌶️', l: 'Spicy' }, { k: 'adventurous', e: '🧭', l: 'Adventurous' }, { k: 'date', e: '🕯️', l: 'Date night' },
  { k: 'client', e: '💼', l: 'Client / work' }, { k: 'upscale', e: '🥩', l: 'Treat myself' }, { k: 'drinks', e: '🍸', l: 'Drinks too' },
  { k: 'group', e: '👯', l: 'Group outing' }, { k: 'sweet', e: '🍰', l: 'Something sweet' }, { k: 'caffeine', e: '☕', l: 'Coffee fix' },
  { k: 'sports', e: '⚾', l: 'Game day' }, { k: 'veg', e: '🌱', l: 'Veg-friendly' }];
const MEALS = ['Any', 'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Happy Hour', 'Late Night'];
const BUDGET = [{ k: 0, l: 'Any' }, { k: 1, l: '$' }, { k: 2, l: '$$ or less' }, { k: 3, l: '$$$ or less' }];
const EXTRAS = [{ k: 'open', l: '🟢 Open now' }, { k: 'tunnel', l: '🚇 In the tunnels' }, { k: 'street', l: '🏙️ Street level' }, { k: 'Patio', l: '☀️ Patio' }, { k: 'Pet Friendly', l: '🐶 Pet friendly' }, { k: 'Food Hall', l: '🏛️ Food hall' }, { k: 'Full Service', l: '🍽️ Sit-down' }, { k: 'notfav', l: '🆕 Somewhere new' }];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const st = { moods: new Set(store.get('moods', [])), meal: store.get('meal', 'Any'), budget: store.get('budget', 0), extras: new Set(store.get('extras', [])) };
let favs = new Set(store.get('favs', [])), visits = store.get('visits', {});
let week = store.get('week', { slot: 'Lunch', days: {} });
const save = () => { store.set('moods', [...st.moods]); store.set('meal', st.meal); store.set('budget', st.budget); store.set('extras', [...st.extras]); store.set('favs', [...favs]); store.set('visits', visits); store.set('week', week); };

const hhFor = (r) => HH.spots[r.name] || null;
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
function matches(r, opt = {}) {
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
function score(r) {
  let s = 0; for (const m of st.moods) if (r.vibes.includes(m)) s += 3;
  if (st.moods.has('upscale') && r.price >= 3) s += 1; if (st.moods.has('quick') && r.price <= 1) s += 1;
  if (favs.has(r.name)) s += 1; if (isOpen(r)) s += 0.5; return s;
}
function ranked(opt) {
  const list = DATA.filter((r) => matches(r, opt));
  if (!st.moods.size) return list.map((r) => [r, 1 + (isOpen(r) ? 0.5 : 0)]);
  return list.map((r) => [r, score(r)]).filter((x) => x[1] >= 1).sort((a, b) => b[1] - a[1]);
}
function weightedPick(list, avoid = new Set()) {
  const pool = list.filter(([r]) => !avoid.has(r.name)); const L = pool.length ? pool : list; if (!L.length) return null;
  const tot = L.reduce((a, [, s]) => a + s * s, 0); let x = Math.random() * tot;
  for (const [r, s] of L) { x -= s * s; if (x <= 0) return r; } return L[0][0];
}

// ---------- cards ----------
function statusTags(r) {
  const o = openLabel(r), hh = hhFor(r);
  return `${o.known ? `<span class="tag ${o.open ? 'open' : 'closed'}">${esc(o.label)}</span>` : ''}${hh ? '<span class="tag hh">🍹 Happy hour</span>' : ''}${r.tunnel ? `<span class="tag t">🚇 ${esc(r.tunnel)}</span>` : ''}`;
}
function card(r, hero) {
  return `<div class="card ${hero ? 'hero spin' : ''}">
  <button class="fav" data-fav="${r.id}" title="Favorite">${favs.has(r.name) ? '♥' : '♡'}</button>
  <h3>${esc(r.name)}</h3>
  <div class="meta"><span class="price">${$$(r.price)}</span> · ${esc(r.type)} · ${esc(r.address.replace(', Houston, TX', ''))}</div>
  ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
  ${r.tryit ? `<p class="try">Try: ${esc(r.tryit)}</p>` : ''}
  <div class="tags">${statusTags(r)}${r.meals.filter((m) => m !== 'Happy Hour').slice(0, 4).map((m) => `<span class="tag">${esc(m)}</span>`).join('')}</div>
  <button class="open-btn" data-open="${r.id}">Details, hours & specials →</button></div>`;
}
function chipRow(el, items, isOn, onClick, after = renderPick) {
  el.innerHTML = items.map((it, i) => `<button class="chip ${isOn(it) ? 'on' : ''}" data-i="${i}">${esc(it.l ?? it)}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; onClick(items[b.dataset.i]); save(); after(); };
}

// ---------- Pick ----------
function renderPick() {
  $('#moods').innerHTML = MOODS.map((m) => `<button data-m="${m.k}" class="${st.moods.has(m.k) ? 'on' : ''}"><b>${m.e}</b>${m.l}</button>`).join('');
  chipRow($('#meal'), MEALS, (x) => x === st.meal, (x) => (st.meal = x));
  chipRow($('#budget'), BUDGET, (x) => x.k === st.budget, (x) => (st.budget = x.k));
  chipRow($('#extras'), EXTRAS, (x) => st.extras.has(x.k), (x) => (st.extras.has(x.k) ? st.extras.delete(x.k) : st.extras.add(x.k)));
  const list = ranked();
  $('#matchCount').textContent = list.length ? `${list.length} spots match — best fits first` : '';
  $('#matches').innerHTML = list.length ? list.slice(0, 24).map(([r]) => card(r)).join('') : '<div class="empty">Nothing matches all of that. Try removing a filter or a mood.</div>';
  if (city) city.setHighlight(mapMatch ? new Set(list.map(([r]) => r.id)) : null);
}
$('#moods').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const k = b.dataset.m; st.moods.has(k) ? st.moods.delete(k) : st.moods.add(k); save(); renderPick(); };
let lastPick = null;
$('#pickBtn').onclick = () => {
  const r = weightedPick(ranked(), new Set(lastPick ? [lastPick] : []));
  if (!r) { $('#pickOut').innerHTML = '<div class="empty">No matches — loosen a filter.</div>'; return; }
  lastPick = r.name;
  $('#pickOut').innerHTML = card(r, true) + `<div class="row" style="margin-top:8px"><button class="btn ghost" id="again">🎲 Spin again</button><button class="btn ghost" id="seeMap">🗺️ Walk me there</button><button class="btn ghost" id="going">✅ I'm going</button></div>`;
  $('#again').onclick = () => $('#pickBtn').click();
  $('#seeMap').onclick = () => { show('map'); city?.setPick(r.id); };
  $('#going').onclick = () => { visits[r.name] = (visits[r.name] || 0) + 1; save(); toast('Logged — enjoy ' + r.name + '!'); };
  city?.setPick(r.id);
};

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
  const cuis = [...new Set(DATA.flatMap((r) => r.cuisines))].sort();
  $('#fCuisine').innerHTML = cuis.map((c) => `<button class="chip ${fc.has(c) ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  const t = bq.trim();
  const sc = new Map();
  let list = DATA.filter((r) => { if (!((!fav1 || favs.has(r.name)) && (!tun1 || r.tunnel) && (!open1 || isOpen(r)) && (!hh1 || hhFor(r)) && (!fc.size || r.cuisines.some((c) => fc.has(c))))) return false; if (!t) return true; const v = searchScore(r, t); sc.set(r, v); return v > 0; });
  list.sort(sortBy === 'name' ? (a, b) => (t ? sc.get(b) - sc.get(a) : 0) || a.name.localeCompare(b.name) : sortBy === 'price' ? (a, b) => a.price - b.price : (a, b) => b.price - a.price);
  $('#bCount').textContent = `${list.length} of ${DATA.length} spots`;
  if (!list.length && t) {
    const sug = didYouMean(t);
    $('#browse').innerHTML = `<div class="empty">No exact matches for “${esc(t)}”.${sug.length ? `<div style="margin-top:10px">Did you mean ${sug.map((n) => `<button class="chip" data-sug="${esc(n)}">${esc(n)}</button>`).join(' ')}</div>` : ''}${fav1 || tun1 || open1 || hh1 || fc.size ? '<div class="meta" style="margin-top:8px">Some filters are on — try turning them off.</div>' : ''}</div>`;
  } else $('#browse').innerHTML = list.map((r) => card(r)).join('') || '<div class="empty">No results.</div>';
  for (const [id, on] of [['#favOnly', fav1], ['#tunOnly', tun1], ['#openOnly', open1], ['#hhOnly', hh1]]) $(id).classList.toggle('on', on);
}
$('#q').oninput = (e) => { bq = e.target.value; renderBrowse(); };
$('#browse').addEventListener('click', (e) => { const b = e.target.closest('[data-sug]'); if (b) { $('#q').value = bq = b.dataset.sug; renderBrowse(); } });
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
  $('#week').innerHTML = DAYS.map((d, i) => {
    const e = week.days[d] || {}; const r = DATA.find((x) => x.name === e.name && x.address === e.address);
    const o = r ? openState(r.hours, dayDate(i, week.slot)) : null;
    return `<div class="day" style="${today === i + 1 ? 'outline:2px solid var(--accent)' : ''}"><div class="d">${d}<small>${today === i + 1 ? 'Today' : ''}</small></div>
    <div>${r ? `<div class="nm" data-open="${r.id}">${esc(r.name)}</div><div class="meta"><span class="price">${$$(r.price)}</span> · ${esc(r.type)}${r.tunnel ? ' · 🚇' : ''}${o?.known && !o.open ? ' · ⚠️ may be closed' : ''}</div>` : '<div class="meta">Not planned</div>'}</div>
    <div class="acts"><button class="icon ${e.lock ? 'on' : ''}" data-lock="${d}" title="Lock">🔒</button><button class="icon" data-swap="${d}" title="Swap">🔄</button></div></div>`;
  }).join('');
}
function planDay(d, used) {
  const date = dayDate(DAYS.indexOf(d), week.slot);
  let list = ranked({ meal: week.slot, date });
  if (!list.filter(([r]) => !used.has(r.name)).length) list = DATA.filter((r) => matches(r, { meal: week.slot, date })).map((r) => [r, score(r) + 1]);
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
$('#copyWeek').onclick = async () => {
  const txt = 'Downtown eats — ' + week.slot + '\n' + DAYS.map((d) => { const e = week.days[d]; return d + ': ' + (e ? e.name + ' (' + e.address.replace(', Houston, TX', '') + ')' : '—'); }).join('\n');
  try { await navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Copy blocked — long-press to select'); }
};

// ---------- detail sheet ----------
let sheetFrom = null;
function openSheet(id, from = null) {
  sheetFrom = from;
  const r = DATA[id]; if (!r) return; const L = links(r), o = openLabel(r), hh = hhFor(r);
  $('#panel').innerHTML = `<div class="sheet-top"><button class="backbtn" id="sBack">‹ ${from ? 'Back to list' : 'Back'}</button><button class="close" id="cls">×</button></div>
  <h2>${esc(r.name)}</h2>
  <div class="meta"><span class="price">${$$(r.price)}</span> · ${esc(r.type)}${r.venue ? ' · ' + esc(r.venue) : ''}</div>
  ${r.aliases?.length ? `<div class="meta">Also called ${r.aliases.map(esc).join(' · ')}</div>` : ''}
  <div class="tags">${statusTags(r)}</div>
  <p style="margin:10px 0 4px">📍 ${esc(r.address)}${r.tunnel ? `<br>🚇 Underground — ${esc(r.tunnel)} (tunnel shops are mostly weekday daytime)` : '<br>🏙️ Street level'}</p>
  ${r.phone ? `<p style="margin:4px 0">📞 <a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${esc(r.phone)}</a></p>` : ''}
  <div class="info"><b>Hours ${r.corrected ? '(from the restaurant)' : '(official listing)'}</b>${esc(r.hours || 'Not listed')}${o.known ? `<div class="meta" style="margin-top:4px">${esc(o.label)} right now</div>` : ''}</div>
  ${hh ? `<div class="info hh"><b>🍹 Happy hour & specials</b><div><strong>${esc(hh.when)}</strong></div><div style="margin-top:4px">${esc(hh.deals)}</div><div class="meta" style="margin-top:6px">Source: <a href="${esc(hh.source)}" target="_blank" rel="noopener">${esc(new URL(hh.source).hostname.replace('www.', ''))}</a> · ${esc(hh.confidence)} · checked ${esc(HH.checked)}</div></div>`
    : r.meals.includes('Happy Hour') ? `<div class="info hh"><b>🍹 Happy hour</b>Listed as offering happy hour — times and prices not verified yet. <a href="${L.specials}" target="_blank" rel="noopener">Look up today's deals →</a></div>` : ''}
  ${r.note ? `<p style="margin:8px 0">${esc(r.note)}</p>` : ''}
  ${r.tryit ? `<p class="meta">Try: ${esc(r.tryit)}</p>` : ''}
  <div class="tags">${r.cuisines.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}${r.meals.map((m) => `<span class="tag">${esc(m)}</span>`).join('')}</div>
  <div class="links">
    ${r.website ? `<a class="p" href="${esc(r.website)}" target="_blank" rel="noopener">🌐 Website</a>` : `<a class="p" href="${L.maps}" target="_blank" rel="noopener">🗺️ Directions</a>`}
    <a class="p" href="${esc(L.menu)}" target="_blank" rel="noopener">📋 Menu</a>
    ${r.website ? `<a href="${L.maps}" target="_blank" rel="noopener">🗺️ Directions</a>` : ''}
    <a href="${L.specials}" target="_blank" rel="noopener">🏷️ Today's specials</a>
    <a href="${esc(L.ig)}" target="_blank" rel="noopener">📸 Instagram</a>
    ${r.facebook ? `<a href="${esc(r.facebook)}" target="_blank" rel="noopener">👍 Facebook</a>` : `<a href="${L.reviews}" target="_blank" rel="noopener">⭐ Reviews</a>`}
    ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">🏙️ Downtown listing</a>` : ''}
    <a href="#" id="sMap">🎮 Show on map</a>
  </div>
  <div class="row"><button class="btn ghost" id="sFav">${favs.has(r.name) ? '♥ Favorited' : '♡ Favorite'}</button>
  <button class="btn ghost" id="sGo">✅ I'm going${visits[r.name] ? ` (${visits[r.name]}×)` : ''}</button>
  <button class="btn ghost" id="sDay">🗓️ Add to today</button></div>
  <button class="btn" id="sAsk" style="margin-top:10px;width:100%;display:none">✨ What should I order here?</button>
  <div class="ai h" id="sAi"></div>
  <p class="disclaim">${r.extraSource ? `Not in the Downtown Houston directory — added from <a href="${esc(r.extraSource)}" target="_blank" rel="noopener">${esc(new URL(r.extraSource).hostname)}</a>. ` : ''}Hours, phone and website come from the Downtown Houston directory (refreshed daily${META.refreshed ? ', last ' + new Date(META.refreshed).toLocaleDateString() : ''}). Descriptions are Claude's notes. Menus and specials change — use the links for the latest.</p>`;
  $('#sheet').classList.add('on');
  $('#cls').onclick = closeSheet;
  $('#sBack').onclick = () => (from ? listSheet(from.places, from.title) : closeSheet());
  $('#sheet').scrollTop = 0; $('#panel').scrollTop = 0;
  $('#sFav').onclick = () => { toggleFav(r); openSheet(id); };
  $('#sGo').onclick = () => { visits[r.name] = (visits[r.name] || 0) + 1; save(); toast('Logged'); openSheet(id); };
  $('#sDay').onclick = () => { const d = DAYS[new Date().getDay() - 1] || 'Mon'; week.days[d] = { name: r.name, address: r.address, lock: true }; save(); renderWeek(); toast('Added to ' + d); };
  $('#sMap').onclick = (e) => { e.preventDefault(); closeSheet(); show('map'); city?.setPick(r.id); };
  if (ASK) { const b = $('#sAsk'); b.style.display = 'block'; b.onclick = () => aboutPlace(r); }
}
let listCtx = null;
function listSheet(places, title) {
  listCtx = { places, title };
  $('#panel').innerHTML = `<div class="sheet-top"><button class="backbtn" id="lBack">‹ Back to map</button><button class="close" id="cls">×</button></div><h2>${esc(title)}</h2><p class="meta">${places.length} spots here${places[0].tunnel ? ' · underground' : ''}</p>
  ${places.map((r) => { const o = openLabel(r); return `<div class="list-item" data-open="${r.id}"><div><b>${styleFor(r).emoji} ${esc(r.name)}</b><div class="meta">${$$(r.price)} · ${esc(r.type)}</div></div><span class="tag ${o.known ? (o.open ? 'open' : 'closed') : ''}">${esc(o.known ? (o.open ? 'Open' : 'Closed') : '—')}</span></div>`; }).join('')}`;
  $('#sheet').classList.add('on'); $('#cls').onclick = closeSheet; $('#lBack').onclick = closeSheet; $('#panel').scrollTop = 0;
}
function closeSheet() { $('#sheet').classList.remove('on'); }
$('#sheet').onclick = (e) => { if (e.target.id === 'sheet') closeSheet(); const li = e.target.closest('.list-item'); if (li) openSheet(+li.dataset.open, listCtx); };
function toggleFav(r) { favs.has(r.name) ? favs.delete(r.name) : favs.add(r.name); save(); }
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-fav]'); if (f) { const r = DATA[+f.dataset.fav]; toggleFav(r); f.textContent = favs.has(r.name) ? '♥' : '♡'; return; }
  const o = e.target.closest('.card [data-open]'); if (o) openSheet(+o.dataset.open);
});

// ---------- map ----------
let city = null, mapMatch = false, mapOpen = false;
function initMap() {
  if (city) return;
  city = new CityMap($('#city'), DATA, {
    isOpen: (p) => isOpen(p) !== false,
    onSelect: (places, spot) => places.length === 1 ? openSheet(places[0].id) : listSheet(places, spot.label),
    onNpc: (n) => { const p = n.thoughtFor; toast(p ? `${n.thought} Craving ${p.type.toLowerCase()} — heading to ${p.name}` : '💭 Just browsing downtown'); },
    onHistory: (n) => $('#mapBack').classList.toggle('show', n > 0),
    onLandmark: (l) => toast(`🏙️ ${l.n}`),
    onMode: (m) => { $('#mapMsg').classList.remove('fade'); clearTimeout(window._mm); window._mm = setTimeout(() => $('#mapMsg').classList.add('fade'), 3500); document.querySelectorAll('#layerSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); $('#mapMsg').textContent = m === 'tunnel' ? 'Underground: the downtown tunnel food courts' : m === 'both' ? 'Street level on top · tunnels below' : 'Pinch or tap a number to zoom in'; },
  });
  const tunnels = DATA.filter((r) => r.tunnel).length;
  setTimeout(() => $('#mapMsg').classList.add('fade'), 4500);
  $('#legend').innerHTML = `<span><i class="dot" style="background:#e8590c"></i>Street (${DATA.length - tunnels})</span><span><i class="dot" style="background:#12b886"></i>Tunnels (${tunnels})</span><span><i class="dot" style="background:#868e96"></i>Closed</span><br><span style="color:#868e96">Numbers = spots on that block · tap to zoom</span>`;
  renderPick();
}
document.querySelectorAll('#layerSeg button').forEach((b) => (b.onclick = () => city.setMode(b.dataset.m)));
$('#mapBack').onclick = () => { closeSheet(); city?.back(); };
$('#zin').onclick = () => city.zoom(1.4); $('#zout').onclick = () => city.zoom(1 / 1.4); $('#zfit').onclick = () => { city.anim = null; city.fitAll = !city.fitAll; city.fit(); };
$('#mapMatch').onclick = (e) => { mapMatch = !mapMatch; e.currentTarget.classList.toggle('on', mapMatch); renderPick(); toast(mapMatch ? 'Highlighting spots that match your Pick filters' : 'Showing everything'); };
$('#mapOpen').onclick = (e) => {
  mapOpen = !mapOpen; e.currentTarget.classList.toggle('on', mapOpen);
  city.setHighlight(mapOpen ? new Set(DATA.filter((r) => isOpen(r)).map((r) => r.id)) : (mapMatch ? new Set(ranked().map(([r]) => r.id)) : null));
};

// ---------- tabs ----------
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => show(b.dataset.v)));
function show(v) {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x.dataset.v === v));
  document.querySelectorAll('.view').forEach((x) => x.classList.toggle('on', x.id === 'v-' + v));
  $('#top').style.display = v === 'map' ? 'none' : '';
  if (v === 'browse') renderBrowse(); if (v === 'week') renderWeek(); if (v === 'map') { initMap(); city.resize(); }
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
    const [pj, hj, oj] = await Promise.all([fetch('places.json').then((r) => r.json()), fetch('happyhour.json').then((r) => r.json()).catch(() => ({ spots: {} })), fetch('overrides.json').then((r) => r.json()).catch(() => ({ spots: {} }))]);
    META = { refreshed: pj.refreshed }; HH = hj;
    DATA = pj.places.map((p, i) => {
      const o = { ...(p.official || {}) };
      if (o.facebook && /Downtown-Houston|115104521841645|\s/.test(o.facebook)) o.facebook = null;   // directory's own page, not the restaurant's
      const fix = (oj.spots || {})[p.name + '|' + ((p.address || '').match(/^\d+/) || [''])[0]] || (oj.spots || {})[p.name];
      if (fix) { Object.assign(o, fix); if (fix.hours) o.corrected = fix.source; o.aliases = fix.aliases || []; o.extraSource = fix.notInDirectory ? fix.source : null; }
      return { ...p, id: i, cuisines: p.cuisines || [], meals: p.meals || [], vibes: p.vibes || [], lat: o.lat, lng: o.lng, hours: o.hours, phone: o.phone, website: o.website, instagram: o.instagram, facebook: o.facebook, url: o.url, venue: o.venue, corrected: o.corrected, aliases: o.aliases || [], extraSource: o.extraSource };
    });
  } catch (e) { $('#hdr').textContent = 'Could not load restaurant data.'; return; }
  const openNow = DATA.filter((r) => isOpen(r)).length;
  $('#hdr').textContent = `${DATA.length} downtown Houston spots · ${openNow} open right now · ${DATA.filter((r) => r.tunnel).length} in the tunnels`;
  renderPick();
  const h = location.hash.slice(1); if (['ask', 'week', 'browse', 'map'].includes(h)) show(h);
  setupAsk();
})();

// keyboard: Esc closes a sheet, or steps the map back; +/- zoom the map
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'Escape') { if ($('#sheet').classList.contains('on')) closeSheet(); else if ($('#v-map').classList.contains('on')) city?.back(); }
  if ($('#v-map').classList.contains('on') && city) { if (e.key === '+' || e.key === '=') city.zoom(1.3); if (e.key === '-') city.zoom(1 / 1.3); }
});
