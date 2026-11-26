// Fills in restaurants and bars the map is missing, from the Texas Comptroller's Mixed Beverage Gross Receipts list
// (data.texas.gov, dataset naix-2893): every business with a TABC mixed-beverage permit files it monthly, with its
// trade name and street address. Takes permits in Houston that reported sales recently, geocodes them in one batch
// with the US Census geocoder, keeps the ones inside the map, skips anything already on the map, drops hotels,
// private clubs, venues and adult clubs, and adds the rest to curated.json + overrides.json so they survive refreshes.
// DRY=1 writes only data/permits-report.json (what it would add) and changes nothing else.
import fs from 'fs';
const DRY = process.env.DRY === '1';
const C = JSON.parse(fs.readFileSync('public/curated.json', 'utf8'));
const OF = JSON.parse(fs.readFileSync('public/overrides.json', 'utf8')); const O = OF.spots;
const P = JSON.parse(fs.readFileSync('public/places.json', 'utf8'));
const BOX = { s: 29.645, w: -95.495, n: 29.815, e: -95.262 };
const inBox = (la, lo) => la > BOX.s && la < BOX.n && lo > BOX.w && lo < BOX.e;
const ZIPS = new Set('77002 77003 77004 77005 77006 77007 77008 77009 77010 77011 77012 77019 77020 77021 77023 77025 77026 77027 77030 77046 77054 77056 77057 77081 77087 77096 77098 77401'.split(' '));
const report = { at: new Date().toISOString(), dry: DRY };

// ---------- 1. the permit list ----------
const since = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10) + 'T00:00:00';
const url = 'https://data.texas.gov/resource/naix-2893.json?' + new URLSearchParams({ $where: `upper(location_city)='HOUSTON' AND obligation_end_date_yyyymmdd >= '${since}'`, $limit: '60000', $order: 'obligation_end_date_yyyymmdd DESC' });
let rows = [];
try { const r = await fetch(url, { signal: AbortSignal.timeout(120000) }); report.httpStatus = r.status; rows = await r.json(); } catch (e) { report.fetchError = String(e); }
if (!Array.isArray(rows)) { report.badResponse = JSON.stringify(rows).slice(0, 500); rows = []; }
report.fields = rows[0] ? Object.keys(rows[0]) : [];
report.rows = rows.length;
const latest = new Map();   // one row per permit: its most recent month
for (const r of rows) {
  const k = r.tabc_permit_number || `${r.location_name}|${r.location_address}`;
  if (!latest.has(k)) latest.set(k, r);
}
const money = (x) => +(x || 0);
const BAD = /\b(country club|golf|church|school|universit|college|hospital|medical|theat(er|re)|arena|stadium|convention|catering|caterer|events?\b|ballroom|venue|wedding|airport|airline|cinema|museum|zoo|bingo|ice rink|club corp|private|cabaret|gentlemen|men'?s club|showgirl|treasures|rick'?s|centerfold|bucks? wild|splash|hotel|\binn\b|suites|marriott|hilton|hyatt|westin|sheraton|doubletree|holiday inn|embassy|courtyard|four seasons|omni|kimpton|aloft|hampton|residence|rice university|toyota center|minute maid|daikin|nrg|shell energy|george r brown|grb|hobby|bush|aramark|levy|sodexo|delaware north|compass group|centerplate|lodge|association|society|legion|vfw|elks|moose)\b/i;
// companies, private clubs, venues and adult clubs that hold permits but aren't places to pick for dinner
const JUNK = /\b(beverages?|bevco|hospitality|investments?|services|corporation|corp|rest(aurant)? group|management|holdings|kipcorp|catholic|parish|senior|housing|junior league|life ?time|amc|regal|theaters?|nordstrom|dog park|square|petroleum club|briar club|coronado club|faculty club|centerfolds|onyx|spire|privilege|dreams|remy|nite club|night ?club|card house|wedge|food services|music hall|artechouse|suites|crowne plaza|meridien|regency|spa|schools?|pride houston|foundation|future fortunes|addicts|football|home care|activity center|solarium|pickleball|pickle courts|klh|dmht|the tradition|spectrum|magnolia spirits|art of the spirits|mw houston|bld pwr|athlete club|natachee'?s|kei htx|moca|beat the bomb|velocity|sim racing|enterprises|partners|ventures|concessions|properties|apartments|residences|tower)\b/i;
const tc = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Llc|Inc|Ltd|Lp|Llp|Corp|Co)\b\.?/g, '').replace(/\bAnd\b/g, '&').replace(/\s*#\s*\d+\b/g, '').replace(/\bOf Texas\b/g, '').replace(/\bInc(orporated)?\b/g, '').replace(/'S\b/g, "'s").replace(/\bBbq\b/g, 'BBQ').replace(/\bHtx\b/g, 'HTX').replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase()).replace(/\s{2,}/g, ' ').replace(/[\s,.-]+$/, '').trim();
const cand = [];
for (const r of latest.values()) {
  const zip = String(r.location_zip || '').slice(0, 5);
  if (!ZIPS.has(zip)) continue;
  if (money(r.total_receipts) < 3000) continue;   // barely trading, or a closed permit still filing zeros
  const name = tc(r.location_name || r.taxpayer_name);
  if (/\//.test(name)) continue;   // "Hotel/Restaurant/Bar" combo filings
  if (!name || BAD.test(name) || JUNK.test(name) || /^\d[\d\s-]*$/.test(name) || /^\d+\s+(n\.?\s|s\.?\s|w\.?\s|e\.?\s)?\w+\s+(st|street|rd|road|ave|avenue|dr|drive|blvd|ln)\b/i.test(name)) continue;
  const street = tc(String(r.location_address || '').replace(/\s*\b(STE|SUITE|UNIT|BLDG|SPC|FL|FLOOR|RM|ROOM|APT|#)\b.*$/i, '').replace(/\s*#.*$/, ''));
  if (!/^\d+\s/.test(street)) continue;
  cand.push({ name, street, zip, liquor: money(r.liquor_receipts), total: money(r.total_receipts), permit: r.tabc_permit_number || '' });
}
report.candidatesInLoopZips = cand.length;

// ---------- 2. already on the map? ----------
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/&/g, 'and').replace(/\b(the|houston|htx|bar|lounge|restaurant|kitchen|and|grill|cafe|co|company|tx|texas)\b/g, '').replace(/[^a-z0-9]/g, '');
const fixOf = (p) => O[p.name + '|' + ((p.address || '').match(/^\d+/) || [''])[0]] || O[p.name] || {};
const existing = P.places.map((p) => { const f = fixOf(p), o = p.official || {}; return { n: norm(p.name), raw: p.name, lat: f.lat ?? o.lat, lng: f.lng ?? o.lng, num: ((f.street || p.address || '').match(/^\d+/) || [''])[0] }; });
const stKey = (a) => { const m = String(a || '').toLowerCase().match(/^(\d+)\s+(?:[nsew]\.?\s+)?([a-z0-9]+)/); return m ? m[1] + ' ' + m[2] : ''; };
for (const [e, p] of existing.map((e, i) => [e, P.places[i]])) { const f = fixOf(p); e.st = stKey(f.street || p.address); }
const addrHit = (c) => { const k = stKey(c.street), n = norm(c.name); return !!k && existing.some((e) => e.st === k && e.n && (e.n.slice(0, 3) === n.slice(0, 3) || e.n.includes(n.slice(0, 4)) || n.includes(e.n.slice(0, 4)))); };
const nameHit = (n) => n.length >= 4 && existing.some((e) => e.n && (e.n === n || (e.n.length >= 5 && (e.n.includes(n) || n.includes(e.n)))));
const sameName = (c) => { const n = norm(c.name), k = stKey(c.street); return existing.filter((e) => e.n && n.length >= 4 && (e.n === n || (e.n.length >= 5 && (e.n.includes(n) || n.includes(e.n))))).some((e) => !e.st || e.st === k || !e.lat); };
const fresh = cand.filter((c) => !sameName(c) && !addrHit(c));
report.alreadyOnMapByName = cand.length - fresh.length;
// one per name+street
const seen = new Set(); const todo = fresh.filter((c) => { const k = norm(c.name) + '|' + c.street.match(/^\d+/)[0]; if (seen.has(k)) return false; seen.add(k); return true; });

// ---------- 3. geocode in one Census batch ----------
const csvq = (s) => '"' + String(s).replace(/"/g, '') + '"';
const body = todo.map((c, i) => [i, csvq(c.street), 'Houston', 'TX', c.zip].join(',')).join('\n');
const geo = new Map();
if (todo.length) {
  try {
    const fd = new FormData();
    fd.append('addressFile', new Blob([body], { type: 'text/csv' }), 'addresses.csv');
    fd.append('benchmark', 'Public_AR_Current');
    const t = await (await fetch('https://geocoding.geo.census.gov/geocoder/locations/addressbatch', { method: 'POST', body: fd, signal: AbortSignal.timeout(600000) })).text();
    for (const line of t.split(/\r?\n/)) {
      const f = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
      if (f.length >= 6 && f[2] === 'Match') { const [lng, lat] = f[5].split(',').map(Number); if (lat && lng) geo.set(+f[0], { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }); }
    }
  } catch (e) { report.geocodeError = String(e); }
}
report.geocoded = geo.size;

// ---------- 4. keep the ones inside the map that aren't a pin we already have ----------
const near = (a, b) => Math.hypot((a.lat - b.lat) * 110850, (a.lng - b.lng) * 96680);
const FOOD = /grill|kitchen|cafe|café|bistro|taco|pizza|bbq|barbecue|sushi|steak|restaurant|cantina|cocina|burger|seafood|oyster|crawfish|pho|ramen|thai|indian|wing|diner|eatery|trattoria|brasserie|taqueria|grille|ristorante|osteria|tapas|mariscos|chicken|noodle|dumpling|bakery|deli|smokehouse|cuisine|asian|mexican|italian|chinese|korean|japanese|vietnamese|mediterranean|greek|lebanese|persian|cajun|creole|soul|brunch|breakfast/i;
const BARNAME = /\b(bar|pub|lounge|tavern|saloon|ice ?house|icehouse|social|den|patio|hookah|cigar|billiards?|pool hall|karaoke|putt|sports|club|cantina|brewery|brewing|wine|cocktail|speakeasy|dive)\b/i;
const add = [], skipped = { outside: 0, sameSpotSameName: 0, noGeo: 0 };
todo.forEach((c, i) => {
  const g = geo.get(i);
  if (!g) { skipped.noGeo++; return; }
  if (!inBox(g.lat, g.lng)) { skipped.outside++; return; }
  const n = norm(c.name), first = n.slice(0, 5);
  const nameLike = (e) => e.n && n.length >= 4 && (e.n === n || (e.n.length >= 5 && (e.n.includes(n) || n.includes(e.n))));
  if (existing.some((e) => e.lat && nameLike(e) && near(e, g) < 400)) { skipped.sameSpotSameName++; return; }   // same place, different address format
  if (existing.some((e) => e.lat && near(e, g) < 45 && e.n && (e.n.startsWith(first) || n.startsWith(e.n.slice(0, 5))))) { skipped.sameSpotSameName++; return; }
  const bar = !FOOD.test(c.name) && (BARNAME.test(c.name) || c.liquor / Math.max(1, c.total) > 0.8);
  add.push({ ...c, ...g, bar });
  existing.push({ n, raw: c.name, lat: g.lat, lng: g.lng });
});
report.skipped = skipped; report.toAdd = add.length;
report.sample = add.slice(0, 400).map((a) => `${a.bar ? '🍸' : '🍽'} ${a.name} — ${a.street} (${a.zip})`);

if (!DRY && add.length) {
  let id = Math.max(...C.map((c) => c.id));
  const today = new Date().toISOString().slice(0, 10);
  for (const a of add) {
    const rec = { id: ++id, name: a.name, address: `${a.street}, Houston, TX`, tunnel: null, cuisines: [a.bar ? 'Bar' : 'Restaurant'], meals: a.bar ? ['Happy Hour', 'Late Night'] : ['Lunch', 'Dinner'], price: 2,
      vibes: a.bar ? ['drinks', 'nightlife'] : ['casual'], type: a.bar ? 'Bar' : 'Restaurant', note: a.bar ? 'Bar with a Texas mixed-beverage permit.' : 'Restaurant with a full bar (Texas mixed-beverage permit).', tryit: '' };
    C.push(rec); P.places.push({ ...rec, official: null });
    O[`${a.name}|${(a.street.match(/^\d+/) || [''])[0]}`] = { street: a.street, lat: a.lat, lng: a.lng, source: 'Texas Comptroller mixed-beverage permits + US Census geocoder', checked: today, notInDirectory: true };
  }
  fs.writeFileSync('public/curated.json', JSON.stringify(C, null, 1) + '\n');
  fs.writeFileSync('public/overrides.json', JSON.stringify(OF, null, 2) + '\n');
  fs.writeFileSync('public/places.json', JSON.stringify(P));
}
fs.writeFileSync('data/permits-report.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ ...report, sample: report.sample.length }, null, 1));
