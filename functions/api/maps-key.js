// Cloudflare Pages function: hands the browser the Google Maps Platform key for the realistic 3D street view.
// Add GOOGLE_MAPS_KEY to the Pages project's environment variables (a key restricted to the Map Tiles API and
// to this site's address). GET -> { ready:false } until then, and the app keeps its own drawn city.
export async function onRequestGet({ env }) {
  const key = env.GOOGLE_MAPS_KEY;
  return Response.json(key ? { ready: true, key } : { ready: false }, { headers: { 'Cache-Control': 'no-store' } });
}
