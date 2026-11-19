// Compares each place's listed hours with the hours its own website publishes (schema.org openingHours),
// and writes public/hours-check.json with the places that disagree, so the app can warn and we can fix them.
import fs from 'fs';
import { parseHours } from '../public/hours.js';

const places = JSON.parse(fs.readFileSync('public/places.json', 'utf8')).places;
const over = JSON.parse(fs.readFileSync('public/overrides.json', 'utf8')).spots || {};
const DAY = { mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6, su: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
const t2m = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };

function siteRules(ld) {
  // collect hours per schema.org node; only trust a page that describes exactly one place's hours
  const nodes = [];
  const dayList = (spec) => { const out = []; for (const part of String(spec).toLowerCase().replace(/\s/g, '').split(',')) { const [a, b] = part.split('-'); const i = DAY[a], j = DAY[b ?? a]; if (i == null || j == null) return []; for (let k = i; ; k = (k + 1) % 7) { out.push(k); if (k === j) break; } } return out; };
  const walk = (x) => {
    if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk);
    const rules = [], add = (days, o, c) => { let st = t2m(o), e = t2m(c); if (!Number.isFinite(st) || !Number.isFinite(e) || st === e || !days.length) return; if (e <= st) e += 1440; rules.push({ days, start: st, end: e }); };
    if (x.openingHours) for (const str of [].concat(x.openingHours)) for (const m of String(str).matchAll(/([A-Za-z]{2}(?:\s*[-,]\s*[A-Za-z]{2})*)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)) add(dayList(m[1]), m[2], m[3]);
    if (x.openingHoursSpecification) for (const sp of [].concat(x.openingHoursSpecification)) { const ds = [].concat(sp.dayOfWeek || []).map((d) => DAY[String(d).split('/').pop().toLowerCase()]).filter((d) => d != null); if (sp.opens && sp.closes) add(ds, sp.opens, sp.closes); }
    if (rules.length) nodes.push(rules);
    for (const v of Object.values(x)) if (typeof v === 'object' && v !== x.openingHoursSpecification) walk(v);
  };
  walk(ld);
  if (nodes.length !== 1) return [];   // several venues on one page (hotels, chains): can't tell which is ours
  const rules = nodes[0];
  for (let d = 0; d < 7; d++) { const rs = rules.filter((r) => r.days.includes(d)); if (rs.length > 2) return []; if (rs.length === 2 && rs[0].start < rs[1].end && rs[1].start < rs[0].end) return []; }   // overlapping or 3+ ranges a day: messy data
  if (new Set(rules.flatMap((r) => r.days)).size < 3) return [];   // too partial to compare
  return rules;
}
const openAt = (rules, d, m) => rules.some((r) => (r.days.includes(d) && m >= r.start && m < r.end) || (r.days.includes((d + 6) % 7) && r.end > 1440 && m < r.end - 1440));
const fmt = (m) => { m %= 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`; };
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const describe = (rules) => NAMES.map((n, d) => { const rs = rules.filter((r) => r.days.includes(d)); return rs.length ? `${n} ${rs.map((r) => fmt(r.start) + '–' + fmt(r.end)).join(', ')}` : `${n} closed`; }).join(' · ');

const flags = {}; let checked = 0;
const todo = places.map((p) => ({ name: p.name, hours: over[p.name]?.hours || p.official?.hours, url: over[p.name]?.website || p.official?.website })).filter((p) => p.hours && /^https?:/.test(p.url || ''));
const host = (u) => { try { const x = new URL(u); return x.host + x.pathname.replace(/\/$/, ''); } catch { return u; } }, uses = {}; for (const p of todo) uses[host(p.url)] = (uses[host(p.url)] || 0) + 1;
const todo1 = todo.filter((p) => uses[host(p.url)] === 1);   // a site shared by several venues can't speak for one of them
async function one(p) {
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
    const html = await (await fetch(p.url, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (DowntownEats hours check)' } })).text(); clearTimeout(to);
    const lds = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
    const site = siteRules(lds); if (!site.length) return; checked++;
    const ours = parseHours(p.hours); if (!ours || ours.always) return;
    let diff = 0; for (let d = 0; d < 7; d++) for (let m = 0; m < 1440; m += 30) if (openAt(site, d, m) !== openAt(ours.rules.filter((r) => !r.closed), d, m)) diff++;
    if (diff >= 6) flags[p.name] = { site: describe(site), url: p.url, slots: diff };
  } catch { /* site down or blocked: skip */ }
}
for (let i = 0; i < todo1.length; i += 8) await Promise.all(todo1.slice(i, i + 8).map(one));
fs.writeFileSync('public/hours-check.json', JSON.stringify({ checked: new Date().toISOString().slice(0, 10), sitesWithHours: checked, flags }, null, 1));
console.log(`hours check: ${todo.length} sites, ${checked} publish hours, ${Object.keys(flags).length} disagree`);
