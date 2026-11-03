// Cloudflare Worker: proxy Groq buat Literature Chat.
// Key Groq disimpan sebagai secret GROQ_API_KEY di Cloudflare — tidak pernah ada di repo / browser.
//
// Variabel (Settings → Variables and Secrets):
//   GROQ_API_KEY     (Secret)  key dari console.groq.com/keys
//   ALLOWED_ORIGINS  (Text)    daftar origin yang boleh, dipisah koma
//                              mis. https://lordjunedganteng.github.io,http://localhost:5178

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'];
const MAX_TOKENS = 2000;
const MAX_BODY = 60000; // byte; cukup buat 8 abstrak + pertanyaan

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || 'https://lordjunedganteng.github.io')
      .split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Expose-Headers': 'retry-after',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: { message: 'Pakai POST' } }, 405, cors);
    // Catatan: cek Origin cuma nyaring pemakaian dari web lain di browser, bukan pengaman penuh.
    if (!okOrigin) return json({ error: { message: 'Origin tidak diizinkan' } }, 403, cors);
    if (!env.GROQ_API_KEY) return json({ error: { message: 'GROQ_API_KEY belum diset di Worker' } }, 500, cors);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: { message: 'Request kebesaran' } }, 413, cors);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: { message: 'JSON tidak valid' } }, 400, cors); }
    if (!Array.isArray(body.messages)) return json({ error: { message: 'messages wajib ada' } }, 400, cors);

    // hanya teruskan field yang dibutuhkan, dengan batas aman
    const payload = {
      model: MODELS.includes(body.model) ? body.model : MODELS[0],
      messages: body.messages,
      temperature: typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.3,
      max_tokens: Math.min(Number(body.max_tokens) || 900, MAX_TOKENS),
      stream: !!body.stream
    };
    if (body.response_format && body.response_format.type === 'json_object') payload.response_format = { type: 'json_object' };

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const headers = { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'application/json' };
    const retry = res.headers.get('retry-after');
    if (retry) headers['Retry-After'] = retry;
    // stream diteruskan apa adanya (SSE)
    return new Response(res.body, { status: res.status, headers });
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
