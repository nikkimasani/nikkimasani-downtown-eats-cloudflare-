// Cloudflare Pages function: hands the browser the Google Maps Platform key for the realistic 3D street view.
// Add GOOGLE_MAPS_KEY to the Pages project's environment variables (a key restricted to the Map Tiles API and
// to this site's address). GET -> { ready:false } until then, and the app keeps its own drawn city.
export async function onRequestGet({ env }) {
  const g = env.GOOGLE_MAPS_KEY, c = env.CESIUM_ION_TOKEN;   // either works: a Google key, or a free Cesium ion token (no billing)
  return Response.json(g ? { ready: true, provider: 'google', key: g } : c ? { ready: true, provider: 'cesium', key: c } : { ready: false }, { headers: { 'Cache-Control': 'no-store' } });
}
