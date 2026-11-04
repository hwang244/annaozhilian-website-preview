// Internal service binding only. Disable both workers.dev and preview URLs.
// DEMO_NOTIFY_EMAIL is a private runtime value, never checked into this repository.
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reply = (body, status = 200) => Response.json(body, {status});

export default {
  async fetch(request, env) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/notify') {
      return reply({ok: false}, 404);
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ok: false}, 415);
    let data;
    try {
      // Body is produced by our Pages Function, never by a public caller.
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 16384) return reply({ok: false}, 413);
      data = JSON.parse(body);
    } catch { return reply({ok: false}, 400); }
    if (!data || !ADDRESS.test(data.to || '') || data.to !== env.DEMO_NOTIFY_EMAIL || typeof data.subject !== 'string' ||
        !data.subject.startsWith('安脑智联官网 · ') || data.subject.length > 150 || /[\r\n]/.test(data.subject) ||
        typeof data.text !== 'string' || !data.text || data.text.length > 8000 ||
        (data.replyTo !== undefined && !ADDRESS.test(data.replyTo))) return reply({ok: false}, 400);
    try {
      const result = await env.EMAIL.send({
        from: {email: 'notifications@annobrain.com', name: '安脑智联官网'},
        to: data.to, subject: data.subject, text: data.text,
        ...(data.replyTo ? {replyTo: data.replyTo} : {}),
      });
      return reply({ok: true, messageId: result?.messageId || null});
    } catch (error) {
      // Never log the email body, customer details, or the provider's full error.
      const code = /^E_[A-Z_]+$/.test(error.code || '') ? error.code : 'EMAIL_SEND_FAILED';
      console.error(code);
      return reply({ok: false, code}, 502);
    }
  },
};
