// Cloudflare Pages Function: powers the Ask tab when ANTHROPIC_API_KEY is set
// (Pages project → Settings → Variables and Secrets). GET -> { ready }.
export async function onRequestGet({ env }) {
  return Response.json({ ready: Boolean(env.ANTHROPIC_API_KEY) });
}
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 501 });
  let body; try { body = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const prompt = body && body.prompt;
  if (typeof prompt !== 'string' || !prompt || prompt.length > 60000) return Response.json({ error: 'bad prompt' }, { status: 400 });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 900, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) return Response.json({ error: 'upstream ' + r.status }, { status: 502 });
  const j = await r.json();
  return Response.json({ text: (j.content || []).map((c) => c.text || '').join('') });
}
