// Tolerant parser for the free-text hours on downtownhouston.org,
// e.g. "Tue - Thur 1130AM - 9PM, Fri/Sat 1130AM - 10PM, Sun 11AM - 3PM" or "Mon-Fri: 7am-3pm".
// openState(text, date) -> { known, open, closesAt, opensAt, label }

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const dayIdx = (t) => {
  t = t.toLowerCase().replace(/[^a-z]/g, '');
  if (!t) return -1;
  if (t.startsWith('th')) return 4;
  if (t.startsWith('tu')) return 2;
  if (t.startsWith('su')) return 0;
  if (t.startsWith('sa')) return 6;
  if (t.startsWith('mo') || t === 'm') return 1;
  if (t.startsWith('we') || t === 'w') return 3;
  if (t.startsWith('fr') || t === 'f') return 5;
  return -1;
};

function parseTime(s, fallbackPm) {
  s = s.toLowerCase().trim();
  if (/noon/.test(s)) return 12 * 60;
  if (/midnight/.test(s)) return 24 * 60;
  const m = s.match(/(\d{1,4})(?::(\d{2}))?\s*(a|p)?/);
  if (!m) return null;
  let h = +m[1], min = +(m[2] || 0);
  if (m[1].length >= 3 && !m[2]) { min = h % 100; h = Math.floor(h / 100); }   // "1130", "430"
  const ap = m[3] || fallbackPm;
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h * 60 + min;
}

function parseDays(spec) {
  spec = spec.toLowerCase();
  if (/daily|every ?day|7 days|seven days/.test(spec)) return [0, 1, 2, 3, 4, 5, 6];
  if (/weekdays?/.test(spec)) return [1, 2, 3, 4, 5];
  if (/weekends?/.test(spec)) return [0, 6];
  const out = new Set();
  for (const part of spec.split(/[,&/]|\band\b/)) {
    const r = part.split(/\s*(?:-|–|—|\bto\b|thru|through)\s*/).map(dayIdx).filter((x) => x >= 0);
    if (r.length === 1) out.add(r[0]);
    else if (r.length >= 2) { let i = r[0]; for (let k = 0; k < 7; k++) { out.add(i); if (i === r[1]) break; i = (i + 1) % 7; } }
  }
  return [...out];
}

export function parseHours(text) {
  if (!text) return null;
  const t = text.replace(/ /g, ' ').replace(/·/g, ',').replace(/;/g, ',').replace(/\n/g, ',');
  if (/24 ?hours|open 24/i.test(t)) return { always: true, rules: [] };
  const rules = [];
  let lastDays = null;
  // split into segments that each contain a time range
  const segs = t.split(/,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segs) {
    const tm = seg.match(/(\d{1,4}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm|a|p)?|noon|midnight)\s*(?:-|–|—|to)\s*(\d{1,4}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm|a|p)?|noon|midnight|close)/i);
    const dayPart = tm ? seg.slice(0, tm.index) : seg;
    let days = parseDays(dayPart.replace(/:/g, ' '));
    if (!days.length) days = lastDays || [0, 1, 2, 3, 4, 5, 6];
    if (/closed/i.test(seg) && !tm) { lastDays = days; rules.push({ days, closed: true }); continue; }
    if (!tm) continue;
    const b = tm[2].toLowerCase().replace(/\./g, '');
    const endAp = (b.match(/(a|p)m?$/) || [])[1];
    let end = b === 'close' ? 23 * 60 : parseTime(b, 'p');
    const aRaw = tm[1].toLowerCase().replace(/\./g, '');
    let start = parseTime(aRaw, (aRaw.match(/(a|p)m?$/) || [])[1] || (endAp === 'p' && parseInt(aRaw) >= 10 && parseInt(aRaw) < 12 ? 'a' : endAp === 'p' && parseInt(aRaw) < 6 ? 'p' : 'a'));
    if (start == null || end == null) continue;
    if (end <= start) end += 24 * 60;           // past midnight
    rules.push({ days, start, end });
    lastDays = days;
  }
  return rules.length ? { always: false, rules } : null;
}

const fmt = (m) => { m = ((m % 1440) + 1440) % 1440; let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ap; };

export function openState(text, date = new Date()) {
  const p = parseHours(text);
  if (!p) return { known: false, open: null, label: text ? 'See hours' : 'Hours not listed' };
  if (p.always) return { known: true, open: true, label: 'Open 24 hours' };
  const d = date.getDay(), now = date.getHours() * 60 + date.getMinutes();
  for (const r of p.rules) {
    if (r.closed) continue;
    if (r.days.includes(d) && now >= r.start && now < r.end) return { known: true, open: true, closesAt: r.end, label: 'Open · closes ' + fmt(r.end) };
    const y = (d + 6) % 7;                         // yesterday's late-night window
    if (r.days.includes(y) && r.end > 1440 && now < r.end - 1440) return { known: true, open: true, closesAt: r.end - 1440, label: 'Open · closes ' + fmt(r.end) };
  }
  for (let k = 0; k < 7; k++) {
    const dd = (d + k) % 7;
    const opts = p.rules.filter((r) => !r.closed && r.days.includes(dd) && (k > 0 || r.start > now)).sort((a, b) => a.start - b.start);
    if (opts.length) return { known: true, open: false, opensAt: opts[0].start, label: 'Closed · opens ' + (k === 0 ? '' : k === 1 ? 'tomorrow ' : DAYS[dd][0].toUpperCase() + DAYS[dd].slice(1) + ' ') + fmt(opts[0].start) };
  }
  return { known: true, open: false, label: 'Closed' };
}
