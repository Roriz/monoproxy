import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileReportStore, ReportLimiter, reportRecord } from './reports.mjs';
import { createGuideServer } from './server.mjs';

const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
const payload = (extra = {}) => ({ id: randomUUID(), guide: 'frankenstein', scope: 'sheet', card: 'sheet', entity: 'the-traveller', page_path: '/guia/frankenstein', l: 1, c: '5', reason: 'spoiler', ...extra });

test('report snapshots come only from the selected cut, not client facts or final identities', () => {
  const record = reportRecord(guide, payload({ fields: [{ key: 'status', value: 'future-secret' }], ip: 'do not store', ts: 'untrusted' }));
  assert.equal(record.fields.find(field => field.key === 'display_name').value, 'The traveller');
  assert.ok(record.fields.every(field => Number(field.source.split(':')[1]) < 5));
  assert.ok(record.fields.find(field => field.key === 'definition').value.length <= 240);
  assert.doesNotMatch(JSON.stringify(record), /The Creature|future-secret|do not store|untrusted/);
  assert.throws(() => reportRecord(guide, payload({ c: '2' })), /Unavailable card/);
  assert.throws(() => reportRecord(guide, payload({ c: '999' })), /Invalid position/);
  assert.throws(() => reportRecord(guide, payload({ id: '../../private' })), /Invalid report/);
  assert.throws(() => reportRecord(guide, payload({ reason: 'other' })), /Invalid report/);
  assert.throws(() => reportRecord(guide, payload({ scope: 'card', card: 'ficha' })), /Unavailable card/);
  const clean = reportRecord(guide, payload({ scope: 'guia', entity: null, card: null, l: null, c: null }));
  assert.deepEqual(clean.fields, []);
  assert.equal(clean.page_type, 'gate');
});

test('file reports survive reopening, support bounded details and recover duplicate receipts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-reports-'));
  try {
    const store = new FileReportStore(directory);
    const record = reportRecord(guide, payload());
    const results = await Promise.all([store.create(record), store.create(record)]);
    assert.deepEqual(results, [true, false]);
    assert.equal((await readdir(directory)).length, 1);
    const reopened = new FileReportStore(directory);
    await reopened.detail(record.id, 'The description looks too early.');
    const saved = JSON.parse(await readFile(join(directory, `${record.id}.json`), 'utf8'));
    assert.equal(saved.detail, 'The description looks too early.');
    assert.equal((await stat(join(directory, `${record.id}.json`))).mode & 0o777, 0o600);
    await assert.rejects(store.create({ ...record, reason: 'wrong' }), /already used/);
    assert.throws(() => reopened.detail(record.id, 'x'.repeat(256)), /Invalid detail/);
    await assert.rejects(reopened.detail(randomUUID(), 'Unknown receipt'), /Unknown report/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('rate counters are temporary and isolated by IP and guide', () => {
  let time = 100;
  const limiter = new ReportLimiter({ limit: 1, windowMs: 10, now: () => time });
  assert.equal(limiter.allow('one', 'frankenstein'), true);
  assert.equal(limiter.allow('one', 'frankenstein'), false);
  assert.equal(limiter.allow('two', 'frankenstein'), true);
  assert.equal(limiter.allow('one', 'another'), true);
  time += 11;
  assert.equal(limiter.allow('one', 'frankenstein'), true);
});

test('report HTTP API persists context, rejects abuse, and never exposes report records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-reports-api-'));
  const server = createGuideServer({ reportStore: new FileReportStore(directory), limiter: new ReportLimiter({ limit: 20 }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const url = `${base}/guia/frankenstein/reports`;
    const request = (method, body, path = url, headers = {}) => fetch(path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const input = payload();
    const response = await request('POST', input);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: input.id });
    assert.equal((await request('POST', input)).status, 200);
    assert.equal((await request('PATCH', { detail: 'Here is the issue.' }, `${url}/${input.id}`)).status, 200);
    const saved = JSON.parse(await readFile(join(directory, `${input.id}.json`), 'utf8'));
    assert.equal(saved.detail, 'Here is the issue.');
    assert.equal(saved.scope, 'sheet');
    assert.equal(saved.fields.find(field => field.key === 'display_name').value, 'The traveller');
    assert.equal((await request('PATCH', { detail: 'x'.repeat(256) }, `${url}/${input.id}`)).status, 400);
    assert.equal((await request('POST', payload(), url, { Origin: 'https://other.example' })).status, 403);
    assert.equal((await request('POST', payload(), url, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await fetch(`${url}/${input.id}`)).status, 405);
    assert.equal((await fetch(`${base}/reports/${input.id}.json`)).status, 404);
    assert.equal((await request('POST', payload({ c: '2' }))).status, 400);
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
    const oversized = await request('POST', payload({ extra: 'x'.repeat(9000) }));
    assert.equal(oversized.status, 413);
    assert.equal((await readdir(directory)).filter(name => name.endsWith('.json')).length, 1);
  } finally { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});

test('HTTP reports return no success receipt when the rate limit or storage prevents saving', async () => {
  const server = createGuideServer({ reportStore: { create: async () => { throw new Error('Unavailable storage'); } }, limiter: new ReportLimiter({ limit: 1 }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/guia/frankenstein/reports`;
    const request = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
    assert.equal((await request()).status, 500);
    const limited = await request(); assert.equal(limited.status, 429);
    assert.equal((await limited.json()).id, undefined);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('report view state excludes secrets and reconstructs fallback prose rather than internal identifiers', () => {
  const value = payload({ scope: 'card', card: 'historia', entity: 'the-traveller', page_path: '/guia/frankenstein/pessoa/the-traveller', c: '9' });
  const record = reportRecord(guide, value);
  assert.ok(record.fields.some(field => field.key === 'chapter_summary'));
  assert.ok(record.fields.every(field => typeof field.value === 'string' && field.value.length > 20));
  for (const view_query of ['k=private-secret', 'q=private+text', 'n=100&n=200', 'arco=secret', 'x'.repeat(257)]) {
    assert.throws(() => reportRecord(guide, { ...value, view_query }), /Invalid view/);
  }
});
