import {DEMO_SCHEMA} from '../../server/demo-schema.mjs';
import {queueDemoNotification} from '../../server/demo-notifications.mjs';

let schemaDatabase, schemaReady;
function ensureSchema(db) {
  if (schemaDatabase !== db) {
    schemaDatabase = db;
    schemaReady = (async () => {
      await db.batch(DEMO_SCHEMA.map(sql => db.prepare(sql)));
      await db.prepare("INSERT INTO demo_settings (key, value) VALUES ('rate_salt', ?1) ON CONFLICT(key) DO NOTHING")
        .bind(crypto.randomUUID()).run();
      const row = await db.prepare("SELECT value FROM demo_settings WHERE key = 'rate_salt'").bind().first();
      if (!row?.value) throw new Error('missing rate salt');
      return row.value;
    })().catch(error => {
      schemaDatabase = null; throw error;
    });
  }
  return schemaReady;
}
const ORIGINS = new Set(['https://annobrain.com', 'https://www.annobrain.com',
  'https://hwang244.github.io', 'http://127.0.0.1:8770', 'http://localhost:8770']);
const TYPES = new Set(['demo', 'patient', 'expert', 'organization', 'partnership', 'media', 'careers']);
const MAX_BYTES = 16 * 1024;

function headers(origin) {
  return {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    ...(origin ? {'Access-Control-Allow-Origin': origin} : {})};
}
function reply(origin, status, data, extra = {}) {
  return new Response(JSON.stringify(data), {status, headers: {...headers(origin), ...extra}});
}
async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_request');
  const chunks = []; let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_BYTES) { await reader.cancel(); throw new Error('payload_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function onRequest(context) {
  const {request, env} = context;
  const origin = request.headers.get('Origin') || '';
  const local = env.DEMO_LOCAL_DEV === 'true' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (!ORIGINS.has(origin) && !local) return reply('', 403, {ok: false, code: 'origin_denied'});
  if (request.method === 'OPTIONS') return new Response(null, {status: 204,
    headers: {...headers(origin), 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}});
  if (request.method !== 'POST') return reply(origin, 405, {ok: false, code: 'method_not_allowed'}, {Allow: 'POST, OPTIONS'});
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return reply(origin, 415, {ok: false, code: 'invalid_request'});
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) {
    return reply(origin, 413, {ok: false, code: 'payload_too_large'});
  }
  let input;
  try { input = await readJson(request); }
  catch (error) { return reply(origin, error.message === 'payload_too_large' ? 413 : 400,
    {ok: false, code: error.message === 'payload_too_large' ? error.message : 'invalid_request'}); }
  if (!input || Array.isArray(input) || typeof input !== 'object' || input.website) {
    return reply(origin, 400, {ok: false, code: 'invalid_request'});
  }
  const limits = {name: 60, phone: 25, email: 100, organization: 120, message: 1500};
  const data = {}; const invalid = [];
  for (const [key, limit] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== 'string') invalid.push(key);
    data[key] = typeof input[key] === 'string' ? input[key].trim() : '';
    if (data[key].length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(data[key])) invalid.push(key);
  }
  if (!data.name) invalid.push('name');
  if (!/^[+0-9()\s-]{6,25}$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 6) invalid.push('phone');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) invalid.push('email');
  if (!TYPES.has(input.type)) invalid.push('type');
  if (input.consent !== true) invalid.push('consent');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId || '')) invalid.push('requestId');
  if (invalid.length) return reply(origin, 422, {ok: false, code: 'invalid_fields', fields: [...new Set(invalid)]});
  data.type = input.type; data.lang = input.lang === 'en' ? 'en' : 'zh';
  if (!env.DEMO_DB) return reply(origin, 503, {ok: false, code: 'unavailable'});
  try {
    const rateSalt = await ensureSchema(env.DEMO_DB);
    const id = input.requestId.toLowerCase();
    const fingerprint = await hash(JSON.stringify(data));
    const previous = await env.DEMO_DB.prepare('SELECT payload_hash FROM demo_requests WHERE id = ?1').bind(id).first();
    if (previous) {
      if (previous.payload_hash === fingerprint) queueDemoNotification(context, id);
      return reply(origin, previous.payload_hash === fingerprint ? 200 : 409,
        previous.payload_hash === fingerprint ? {ok: true, requestId: id} : {ok: false, code: 'request_conflict'});
    }
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / 600);
    const client = await hash(`${rateSalt}|${request.headers.get('CF-Connecting-IP') || 'unknown'}|${window}`);
    const allowance = await env.DEMO_DB.prepare(`INSERT INTO demo_rate_limits (client_key, expires_at, hits)
      VALUES (?1, ?2, 1) ON CONFLICT(client_key) DO UPDATE SET hits = hits + 1
      WHERE hits < 20 RETURNING hits`).bind(client, now + 1200).first();
    if (!allowance) return reply(origin, 429, {ok: false, code: 'rate_limited'}, {'Retry-After': '600'});
    await env.DEMO_DB.prepare(`INSERT INTO demo_requests
      (id, created_at, name, phone, email, organization, interest, message, language, consent_at, payload_hash)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?2, ?10) ON CONFLICT(id) DO NOTHING`)
      .bind(id, new Date(now * 1000).toISOString(), data.name, data.phone, data.email,
        data.organization, data.type, data.message, data.lang, fingerprint).run();
    const saved = await env.DEMO_DB.prepare('SELECT payload_hash FROM demo_requests WHERE id = ?1').bind(id).first();
    if (saved?.payload_hash !== fingerprint) return reply(origin, 409, {ok: false, code: 'request_conflict'});
    queueDemoNotification(context, id);
    // Expire anonymous abuse counters in small batches; never log contact details.
    if (parseInt(id.slice(0, 2), 16) % 32 === 0 && context.waitUntil) {
      context.waitUntil(env.DEMO_DB.prepare(`DELETE FROM demo_rate_limits WHERE client_key IN
        (SELECT client_key FROM demo_rate_limits WHERE expires_at < ?1 LIMIT 100)`).bind(now).run().catch(() => {}));
    }
    return reply(origin, 201, {ok: true, requestId: id});
  } catch {
    return reply(origin, 503, {ok: false, code: 'unavailable'});
  }
}
