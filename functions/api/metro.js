// Cloudflare Pages Function: live METRO buses and trains near downtown, from METRO's GTFS-Realtime feed.
// Turn it on by adding METRO_API_KEY (a subscription key from https://api-portal.ridemetro.org) under
// Pages project → Settings → Variables and Secrets. GET -> { ready:false } until then.
// ---- Minimal GTFS-Realtime (protobuf) reader: only the fields this app needs, no dependencies ----
function pb(buf) {
  const out = [], n = buf.length; let i = 0;
  const varint = () => { let r = 0, m = 1, b; do { b = buf[i++]; r += (b & 127) * m; m *= 128; } while (b & 128 && i < n); return r; };
  while (i < n) {
    const tag = varint(), f = Math.floor(tag / 8), w = tag % 8;
    if (w === 0) out.push([f, varint()]);
    else if (w === 1) { out.push([f, buf.subarray(i, i + 8)]); i += 8; }
    else if (w === 2) { const L = varint(); out.push([f, buf.subarray(i, i + L)]); i += L; }
    else if (w === 5) { out.push([f, buf.subarray(i, i + 4)]); i += 4; }
    else break;
  }
  return out;
}
const TD = new TextDecoder();
const str = (b) => TD.decode(b), f32 = (b) => new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true);
function tripDesc(b) { const t = {}; for (const [f, v] of pb(b)) { if (f === 1) t.trip = str(v); else if (f === 5) t.route = str(v); else if (f === 6) t.dir = v; } return t; }
function vehDesc(b) { let id = '', label = ''; for (const [f, v] of pb(b)) { if (f === 1) id = str(v); else if (f === 2) label = str(v); } return id || label; }
function eventTime(b) { for (const [f, v] of pb(b)) if (f === 2) return v; return 0; }
function decodeFeed(buf) {
  const feed = { time: 0, vehicles: [], trips: [] };
  for (const [f, v] of pb(buf)) {
    if (f === 1) { for (const [g, x] of pb(v)) if (g === 3) feed.time = x; continue; }
    if (f !== 2) continue;
    for (const [g, x] of pb(v)) {
      if (g === 4) {   // VehiclePosition
        const o = {};
        for (const [h, y] of pb(x)) {
          if (h === 1) Object.assign(o, tripDesc(y));
          else if (h === 2) for (const [k, z] of pb(y)) { if (k === 1) o.lat = f32(z); else if (k === 2) o.lng = f32(z); else if (k === 3) o.bearing = f32(z); }
          else if (h === 5) o.ts = y; else if (h === 8) o.id = vehDesc(y);
        }
        if (o.lat && o.lng) feed.vehicles.push(o);
      } else if (g === 3) {   // TripUpdate
        const o = { s: [] };
        for (const [h, y] of pb(x)) {
          if (h === 1) Object.assign(o, tripDesc(y));
          else if (h === 3) o.vid = vehDesc(y);
          else if (h === 2) { let sid = null, arr = 0, dep = 0; for (const [k, z] of pb(y)) { if (k === 4) sid = str(z); else if (k === 2) arr = eventTime(z); else if (k === 3) dep = eventTime(z); } if (sid && (arr || dep)) o.s.push([sid, arr || dep]); }
        }
        if (o.s.length) feed.trips.push(o);
      }
    }
  }
  return feed;
}

// Fetch METRO's feeds, keep only what's around downtown, and return compact JSON for the map.
const FEEDS = { positions: 'https://api.ridemetro.org/GtfsRealtime/VehiclePositions', tripUpdates: 'https://api.ridemetro.org/GtfsRealtime/TripUpdates' };
const BOX = { s: 29.725, n: 29.79, w: -95.4, e: -95.33 };
async function metroLive(key, origin, extra = {}) {
  const get = async (u) => {
    try {
      const r = await fetch(u + '?subscription-key=' + encodeURIComponent(key), { headers: { 'Ocp-Apim-Subscription-Key': key, 'Cache-Control': 'no-cache' }, ...extra });
      if (!r.ok) return { status: r.status };
      return { status: 200, feed: decodeFeed(new Uint8Array(await r.arrayBuffer())) };
    } catch (e) { return { status: 0, error: String(e).slice(0, 140) }; }
  };
  const [vp, tu, st] = await Promise.all([get(FEEDS.positions), get(FEEDS.tripUpdates), fetch(new URL('/metro-static.json', origin)).then((r) => (r.ok ? r.json() : null)).catch(() => null)]);
  const stops = (st && st.stops) || {}, now = Date.now() / 1000;
  const inBox = (lat, lng) => lat > BOX.s && lat < BOX.n && lng > BOX.w && lng < BOX.e;
  const allV = [...((vp.feed && vp.feed.vehicles) || []), ...((tu.feed && tu.feed.vehicles) || [])];
  const allT = [...((tu.feed && tu.feed.trips) || []), ...((vp.feed && vp.feed.trips) || [])];
  const vehicles = allV.filter((v) => inBox(v.lat, v.lng)).map((v) => ({ id: v.id, trip: v.trip, route: v.route, lat: +v.lat.toFixed(6), lng: +v.lng.toFixed(6), b: v.bearing != null ? Math.round(v.bearing) : null, ts: v.ts }));
  const trips = allT.map((t) => ({ id: t.trip, route: t.route, dir: t.dir, vid: t.vid, s: t.s.filter(([sid, tm]) => stops[sid] && tm > now - 1800 && tm < now + 1800) })).filter((t) => t.s.length);
  return {
    ready: true, at: Math.round(now), feedTime: (tu.feed && tu.feed.time) || (vp.feed && vp.feed.time) || 0, vehicles, trips,
    stats: { positions: vp.status, tripUpdates: tu.status, feedVehicles: allV.length, feedTrips: allT.length, staticStops: Object.keys(stops).length, error: vp.error || tu.error || null },
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.METRO_API_KEY) return Response.json({ ready: false });
  const out = await metroLive(env.METRO_API_KEY, new URL(request.url).origin, { cf: { cacheTtl: 15, cacheEverything: true } });
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=10' } });
}
