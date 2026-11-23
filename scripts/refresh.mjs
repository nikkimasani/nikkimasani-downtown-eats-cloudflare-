// Refreshes official details (hours, phone, website, map coordinates, socials) from
// downtownhouston.org and merges them with the curated notes in public/curated.json.
// Writes public/places.json. Run: node scripts/refresh.mjs   (Node 20+, no dependencies)
import fs from 'fs';
const BASE = 'https://downtownhouston.org';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; downtown-eats personal dining app)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&bull;/g, '•')
  .replace(/&#0?39;|&rsquo;|&#8217;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&ndash;|&mdash;/g, '–').replace(/[ \t]+/g, ' ')
  .split('\n').map((x) => x.trim()).filter(Boolean).join('\n');
const norm = (s) => (s || '').toLowerCase().replace(/&/g, 'and').replace(/^the /, '').replace(/[^a-z0-9]/g, '');
const num = (a) => ((a || '').match(/\b(\d{1,5})\s/) || [])[1];

async function get(url) {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.text(); } catch (e) {}
    await sleep(1000 * (a + 1));
  }
  return null;
}

function parse(slug, h) {
  const g = (re) => { const m = h.match(re); return m ? m[1] : null; };
  const block = g(/<h2 class="on-detail">Address<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  const lines = block ? strip(block).split('\n') : [];
  const phone = (lines.join(' ').match(/\(?\d{3}\)?[ .-]?\d{3}-\d{4}/) || [null])[0];
  const street = lines.find((l) => /^\d/.test(l)) || '';
  const venue = lines[0] && !/^\d/.test(lines[0]) ? lines[0] : null;
  const hours = g(/<h2 class="on-detail">Hours<\/h2>([\s\S]*?)(?:<h2|<\/div>\s*<\/div>|<div class="col)/);
  const ok = (u) => u && !/downtownhouston|Downtown-Houston|115104521841645|#NAME|\s/i.test(u);
  const fb = g(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/), ig = g(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/);
  return {
    slug, name: strip(g(/<h1>([\s\S]*?)<\/h1>/) || ''), street, venue, phone,
    website: g(/<a href="([^"]+)" class="btn btn-brand-pill"[^>]*>Visit Website/),
    lat: +g(/destination-latitude=([-0-9.]+)/) || null, lng: +g(/destination-longitude=([-0-9.]+)/) || null,
    hours: hours ? strip(hours).replace(/\n/g, ' · ') : null,
    instagram: ok(ig) ? ig : null, facebook: ok(fb) ? fb : null,
    tags: [...(g(/<p class="header-groups">([\s\S]*?)<\/p>/) || '').matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1].replace(/&amp;/g, '&').trim()).filter((t) => t !== 'Dining'),
    url: `${BASE}/go/${slug}`,
  };
}

const list = await get(`${BASE}/experience/dining`);
if (!list) { console.error('Could not load dining list; keeping existing places.json'); process.exit(0); }
const slugsOf = (html) => [...new Set([...(html || '').matchAll(/href="\/go\/([^"]+)"/g)].map((m) => m[1]))];
const slugs = slugsOf(list);
// the bars + nightlife directory and the happy hour / late night lists
const [barsHtml, hhHtml, lateHtml] = await Promise.all(['bars-nightlife', 'dining/happy-hour', 'dining/late-night'].map((p) => get(`${BASE}/experience/${p}`)));
const BAR = new Set(slugsOf(barsHtml)), HH = new Set(slugsOf(hhHtml)), LATE = new Set(slugsOf(lateHtml));
for (const s of [...BAR, ...HH, ...LATE]) if (!slugs.includes(s)) slugs.push(s);
console.log('listings', slugs.length, '· bars', BAR.size, '· happy hour', HH.size, '· late night', LATE.size);
const details = [];
const queue = [...slugs];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) { const s = queue.shift(); const h = await get(`${BASE}/go/${s}`); if (h) details.push({ ...parse(s, h), cats: { bar: BAR.has(s), hh: HH.has(s), late: LATE.has(s) } }); await sleep(200); }
}));
console.log('details', details.length);

const curated = JSON.parse(fs.readFileSync('public/curated.json', 'utf8'));
const used = new Set();
let matched = 0;
const places = curated.map((c) => {
  const n = norm(c.name), k = num(c.address);
  let d = details.find((d) => !used.has(d.slug) && norm(d.name) === n && num(d.street) === k)
       || details.find((d) => !used.has(d.slug) && norm(d.name) === n && Boolean(c.tunnel) === /tunnel/i.test(d.tags.join(' ')))
       || details.find((d) => !used.has(d.slug) && norm(d.name) === n);
  if (d) { used.add(d.slug); matched++; }
  return { ...c, official: d || null };
});
// listings that are new on the site since the curated list was made
const dupe = (d) => places.some((p) => norm(p.name) === norm(d.name) && (!d.street || num(p.address) === num(d.street)));
// a stable id from the listing's slug, well clear of the hand-curated ids (curated.length + i collided with spots added by hand)
const slugId = (slug) => { let h = 2166136261; for (const ch of String(slug)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return 100000 + (h % 900000); };
const extra = details.filter((d) => !used.has(d.slug) && !dupe(d)).map((d, i) => ({
  id: slugId(d.slug), name: d.name, address: `${d.street}, Houston, TX`, tunnel: /tunnel/i.test(d.tags.join(' ')) ? 'Downtown Tunnel' : null, cuisines: d.cats.bar ? ['Bar'] : d.tags.slice(0, 1),
  meals: [...(d.cats.hh ? ['Happy Hour'] : []), ...(d.cats.late ? ['Late Night'] : [])], price: 2, vibes: d.cats.bar ? ['nightlife'] : [],
  type: d.cats.bar ? (d.tags.find((t) => /bar|lounge|pub|club|brew|wine|night/i.test(t)) || 'Bar') : d.tags[0] || 'Restaurant',
  note: d.cats.bar ? 'On the Downtown Houston bars + nightlife list.' : 'New on the Downtown Houston directory.', tryit: '', official: d, isNew: !d.cats.bar,
}));
const out = { refreshed: new Date().toISOString(), source: `${BASE}/experience/dining`, places: [...places, ...extra] };
fs.writeFileSync('public/places.json', JSON.stringify(out));
console.log('matched', matched, 'of', curated.length, '· new listings', extra.length);
