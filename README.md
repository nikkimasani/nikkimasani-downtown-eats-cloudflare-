# Downtown Eats — Houston 🍽️

Pick where to eat in downtown Houston. Built on the [Downtown Houston dining directory](https://downtownhouston.org/experience/dining).

- **Pick** — choose a mood (quick, spicy, client lunch, drinks…), meal, budget and extras (open now, tunnels, patio…), then 🎲 *Pick for me*.
- **Map** — an isometric city in the style of AgVisualizer. Little Sims (💎 plumbobs) walk the real street grid to restaurants that are open. Switch between **🏙️ Street**, **⬍ Both** (x-ray) and **🚇 Tunnels** to tell above-ground spots from the underground tunnel food courts. Tap a building for details, tap a Sim to see what they're craving.
- **Ask** — describe what you want in plain words; Claude picks from the list (needs `ANTHROPIC_API_KEY`, see below).
- **Week** — plans a varied week (skips places closed that day); lock or swap any day.
- **Browse** — search everything, filter by open now, happy hour, tunnel, cuisine, favorites.

## Data
| File | What | Updated |
|---|---|---|
| `public/curated.json` | names, cuisines, meal tags, price level, vibes, notes | by hand |
| `public/places.json` | curated list + official hours, phone, website, map coordinates and socials from each listing page | daily by GitHub Actions (`scripts/refresh.mjs`) |
| `public/happyhour.json` | verified happy hours and specials with a source link per spot | by hand (`checked` date in file) |

Run the refresh yourself: `node scripts/refresh.mjs` (Node 20+, no dependencies), or **Actions → Refresh restaurant details → Run workflow**.

## Deploy
Static site, no build step — output directory is `public/`.
- **Cloudflare Pages** (this repo): project `downtown-eats-cloudflare`, build command *none*, output `public`. `functions/api/ask.js` powers the Ask tab when `ANTHROPIC_API_KEY` is set as a secret.

> Cloudflare copy of [nikkimasani-downtown-eats](https://github.com/nikkimasani/nikkimasani-downtown-eats) (Vercel). Keep both in sync.
