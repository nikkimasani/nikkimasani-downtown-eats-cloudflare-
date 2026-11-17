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
const slugs = [...new Set([...list.matchAll(/href="\/go\/([^"]+)"/g)].map((m) => m[1]))];
console.log('listings', slugs.length);
const details = [];
const queue = [...slugs];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) { const s = queue.shift(); const h = await get(`${BASE}/go/${s}`); if (h) details.push(parse(s, h)); await sleep(200); }
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
const extra = details.filter((d) => !used.has(d.slug) && !dupe(d)).map((d, i) => ({
  id: curated.length + i, name: d.name, address: `${d.street}, Houston, TX`, tunnel: null, cuisines: d.tags.slice(0, 1),
  meals: [], price: 2, vibes: [], type: d.tags[0] || 'Restaurant', note: 'New on the Downtown Houston directory.', tryit: '', official: d, isNew: true,
}));
const out = { refreshed: new Date().toISOString(), source: `${BASE}/experience/dining`, places: [...places, ...extra] };
fs.writeFileSync('public/places.json', JSON.stringify(out));
console.log('matched', matched, 'of', curated.length, '· new listings', extra.length);
