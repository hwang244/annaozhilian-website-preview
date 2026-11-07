import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from './support/sqlite-d1.mjs';
import {randomUUID} from 'node:crypto';
import {onRequest} from '../functions/api/demo.js';

const fixture = (changes = {}) => ({requestId: randomUUID(), name: '集成测试', phone: '+1 202-555-0100',
  email: 'test@example.com', organization: '测试机构', type: 'demo', message: '测试预约，请忽略。', consent: true, lang: 'zh', ...changes});
function request(body, origin = 'https://annobrain.com') {
  return new Request('https://annobrain.com/api/demo', {method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '203.0.113.7'}, body: JSON.stringify(body)});
}
function setup() {
  const db = localDatabase();
  return {db, call: (body, origin) => onRequest({request: request(body, origin),
    env: {DEMO_DB: db}, waitUntil: promise => promise})};
}
test('a successful response corresponds to a persisted, complete appointment', async () => {
  const {db, call} = setup(); const input = fixture(); const response = await call(input);
  assert.equal(response.status, 201); assert.deepEqual(await response.json(), {ok: true, requestId: input.requestId});
  const saved = db.sqlite.prepare('SELECT * FROM demo_requests').get();
  assert.equal(saved.name, input.name); assert.equal(saved.phone, input.phone); assert.equal(saved.interest, 'demo');
  assert.equal(saved.consent_at, saved.created_at); assert.equal(saved.status, 'new'); db.sqlite.close();
});
test('family inquiries persist their category and label the notification', async t => {
  const db = localDatabase(); t.after(() => db.sqlite.close());
  const pending = []; const messages = [];
  const mailer = {fetch: async (url, options) => {
    messages.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ok: true, messageId: 'family-test'}));
  }};
  const input = fixture({type: 'family'});
  const response = await onRequest({request: request(input),
    env: {DEMO_DB: db, DEMO_NOTIFY_EMAIL: 'notify@example.com', DEMO_MAILER: mailer},
    waitUntil: promise => pending.push(promise)});
  assert.equal(response.status, 201); await Promise.all(pending);
  assert.equal(db.sqlite.prepare('SELECT interest FROM demo_requests').get().interest, 'family');
  assert.equal(messages.length, 1);
  assert.match(messages[0].subject, /家属端咨询/);
  assert.match(messages[0].text, /家属端咨询/);
});
test('a newly bound empty database is initialized without a manual SQL step', async () => {
  const {db, call} = setup(); db.sqlite.exec('DROP TABLE demo_requests; DROP TABLE demo_rate_limits;');
  assert.equal((await call(fixture())).status, 201);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM demo_requests').get().count, 1);
  db.sqlite.close();
});
test('retrying after a lost response returns the same receipt without a duplicate', async () => {
  const {db, call} = setup(); const input = fixture(); await call(input);
  assert.equal((await call(input)).status, 200);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM demo_requests').get().count, 1);
  assert.equal((await call({...input, message: 'Different request with same ID'})).status, 409); db.sqlite.close();
});
test('invalid fields, missing consent and the honeypot never create an appointment', async () => {
  const {db, call} = setup();
  for (const changes of [{name: ' '}, {phone: 'bad'}, {email: 'bad'}, {message: 'x'.repeat(1501)}, {consent: false}, {requestId: 'bad'}]) {
    assert.equal((await call(fixture(changes))).status, 422);
  }
  assert.equal((await call(fixture({website: 'spam.example'}))).status, 400);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM demo_requests').get().count, 0); db.sqlite.close();
});
test('unavailable storage never reports success', async () => {
  const response = await onRequest({request: request(fixture()), env: {}});
  assert.equal(response.status, 503); assert.equal((await response.json()).ok, false);
  const broken = {prepare() { throw new Error('storage unavailable'); }};
  const failed = await onRequest({request: request(fixture()), env: {DEMO_DB: broken, DEMO_RATE_SALT: 'test'}});
  assert.equal(failed.status, 503);
});
test('cross-origin abuse, oversized input and unsupported content types are rejected', async () => {
  const {db, call} = setup(); assert.equal((await call(fixture(), 'https://untrusted.example')).status, 403);
  assert.equal((await call(fixture(), 'http://127.0.0.1:8770')).status, 201);
  assert.equal((await call(fixture({message: 'x'.repeat(17000)}))).status, 413);
  const response = await onRequest({request: new Request('https://annobrain.com/api/demo', {method: 'POST',
    headers: {Origin: 'https://annobrain.com', 'Content-Type': 'text/plain'}, body: 'bad'}), env: {}});
  assert.equal(response.status, 415); db.sqlite.close();
});
test('rate limiting is atomic and a valid duplicate can still be retried at the limit', async () => {
  const {db, call} = setup(); const first = fixture(); await call(first);
  for (let i = 1; i < 20; i++) assert.equal((await call(fixture())).status, 201);
  assert.equal((await call(fixture())).status, 429);
  assert.equal((await call(first)).status, 200);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM demo_requests').get().count, 20); db.sqlite.close();
});
test('email delivery failure does not lose an accepted appointment', async t => {
  const db = localDatabase(); const pending = [];
  const mailer = {fetch: async () => new Response(JSON.stringify({ok: false}), {status: 502})};
  const input = fixture(); const response = await onRequest({request: request(input),
    env: {DEMO_DB: db, DEMO_NOTIFY_EMAIL: 'notify@example.com', DEMO_MAILER: mailer}, waitUntil: promise => pending.push(promise)});
  assert.equal(response.status, 201); await Promise.all(pending);
  const row = db.sqlite.prepare('SELECT * FROM demo_requests WHERE id = ?').get(input.requestId);
  assert.equal(row.status, 'new'); assert.equal(row.notification_state, 'pending');
  assert.equal(row.notification_error, 'relay_unavailable'); assert.ok(row.notification_retry_at > Date.now() / 1000);
  db.sqlite.close();
});
test('a sent notification is not sent again when a client retries', async t => {
  const db = localDatabase(); const pending = []; let calls = 0;
  const mailer = {fetch: async (url, options) => {
    calls++; assert.equal(url, 'https://demo-mailer.internal/notify');
    const message = JSON.parse(options.body);
    assert.equal(message.to, 'notify@example.com'); assert.equal(message.replyTo, 'test@example.com');
    assert.match(message.text, /预约编号/); assert.match(message.text, /测试预约/);
    return new Response(JSON.stringify({ok: true, messageId: 'test-message'}));
  }};
  const input = fixture(); const call = () => onRequest({request: request(input),
    env: {DEMO_DB: db, DEMO_NOTIFY_EMAIL: 'notify@example.com', DEMO_MAILER: mailer}, waitUntil: promise => pending.push(promise)});
  assert.equal((await call()).status, 201); await Promise.all(pending);
  assert.equal((await call()).status, 200); await Promise.all(pending);
  assert.equal(calls, 1); assert.equal(db.sqlite.prepare('SELECT notification_state FROM demo_requests').get().notification_state, 'sent');
  db.sqlite.close();
});
