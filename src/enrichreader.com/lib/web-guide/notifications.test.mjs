import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApprovalNotifications, resendTransport } from './notifications.mjs';
import { recordID } from './approval.mjs';
const guide = { series: 'example', title: 'A private book', authors: ['An author'] };
const approval = { id: recordID('approval:example'), ts: '2026-10-13T15:00:00.000Z', divulgar: 'semana', resumos: 'on', blurb_approved_at_approval: false, k: 'secret-token', detail: 'private correction text' };
const id = recordID(`alert:approval:${approval.id}`);

test('approval alerts survive delivery failure, retry identical payloads and stay sent across restarts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-alerts-'));
  let now = Date.parse(approval.ts), attempts = 0;
  const deliveries = [];
  const options = { directory, to: 'lead@enrichreader.com', from: 'no-reply@enrichreader.com', now: () => now,
    send: async (payload, key) => { deliveries.push({ payload, key }); if (++attempts === 1) throw new Error('Offline'); return 'provider-receipt'; } };
  try {
    const queue = new ApprovalNotifications(options);
    await queue.enqueue(guide, approval);
    await queue.flush();
    assert.equal((await queue.store.get(id)).status, 'pending');
    now += 30001;
    const restarted = new ApprovalNotifications(options);
    await restarted.enqueue({ ...guide, title: 'Changed later' }, approval);
    await Promise.all([restarted.flush(), restarted.flush()]);
    assert.equal(deliveries.length, 2);
    assert.deepEqual(deliveries[0], deliveries[1]);
    assert.doesNotMatch(JSON.stringify(deliveries), /secret-token|private correction text/);
    assert.equal((await restarted.store.get(id)).status, 'sent');
    await new ApprovalNotifications(options).flush();
    assert.equal(deliveries.length, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('old ambiguous deliveries require operator review and unconfigured transport keeps durable pending alerts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-alerts-review-'));
  let now = Date.parse(approval.ts), calls = 0;
  const options = { directory, to: 'lead@enrichreader.com', from: 'no-reply@enrichreader.com', now: () => now };
  try {
    const unconfigured = new ApprovalNotifications(options);
    await unconfigured.enqueue(guide, approval); await unconfigured.flush();
    assert.equal((await unconfigured.store.get(id)).attempts, 0);
    const queue = new ApprovalNotifications({ ...options, send: async () => { calls++; throw new Error('Ambiguous timeout'); } });
    await queue.flush(); now += 24 * 60 * 60 * 1000;
    await queue.flush();
    assert.equal(calls, 1);
    assert.equal((await queue.store.get(id)).status, 'needs_review');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Resend transport uses a stable idempotency key, requires a receipt and keeps credentials out of payloads', async () => {
  assert.equal(resendTransport(), null);
  const payload = { from: 'no-reply@enrichreader.com', to: ['lead@enrichreader.com'], subject: 'Approval', text: 'Saved approval' };
  const send = resendTransport({ apiKey: 'fixture-key', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers['Idempotency-Key'], `guide-approval/${id}`);
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    assert.deepEqual(JSON.parse(options.body), payload);
    return { ok: true, json: async () => ({ id: 'receipt' }) };
  } });
  assert.equal(await send(payload, id), 'receipt');
  const invalid = resendTransport({ apiKey: 'fixture-key', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await assert.rejects(invalid(payload, id), /receipt/);
});
