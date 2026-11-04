import {test} from 'node:test';
import assert from 'node:assert/strict';
import mailer from '../workers/demo-mailer/index.mjs';

const message = {to: 'notify@example.com', subject: '安脑智联官网 · 预约产品演示',
  text: '预约编号：test\n\n需求说明：<script>test</script>', replyTo: 'visitor@example.com'};
const request = data => new Request('https://demo-mailer.internal/notify', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
test('internal mailer uses a fixed sender and plain text, with the visitor only as Reply-To', async () => {
  let sent;
  const response = await mailer.fetch(request({...message, from: 'attacker@example.com'}), {
    DEMO_NOTIFY_EMAIL: message.to, EMAIL: {send: async data => {sent = data; return {messageId: 'accepted-id'};}}});
  assert.deepEqual(await response.json(), {ok: true, messageId: 'accepted-id'});
  assert.equal(sent.from.email, 'notifications@annobrain.com');
  assert.equal(sent.to, message.to); assert.equal(sent.replyTo, message.replyTo);
  assert.equal(sent.text, message.text); assert.equal(sent.html, undefined);
});
test('other recipients, header injection, invalid addresses and large payloads cannot send', async () => {
  let calls = 0;
  const env = {DEMO_NOTIFY_EMAIL: message.to, EMAIL: {send: async () => {calls++;}}};
  for (const data of [{...message, to: 'other@example.com'}, {...message, replyTo: 'bad\r\nBcc:other@example.com'},
    {...message, subject: '安脑智联官网 · test\r\nBcc: other@example.com'}, {...message, text: 'x'.repeat(17000)}]) {
    assert.ok((await mailer.fetch(request(data), env)).status >= 400);
  }
  assert.equal((await mailer.fetch(new Request('https://demo-mailer.internal/'), env)).status, 404);
  assert.equal(calls, 0);
});
test('provider errors report failure without returning customer details or provider error text', async t => {
  t.mock.method(console, 'error', () => {});
  const response = await mailer.fetch(request(message), {DEMO_NOTIFY_EMAIL: message.to,
    EMAIL: {send: async () => {throw Object.assign(new Error('private customer information'), {code: 'E_DELIVERY_FAILED'});}}});
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {ok: false, code: 'E_DELIVERY_FAILED'});
});
