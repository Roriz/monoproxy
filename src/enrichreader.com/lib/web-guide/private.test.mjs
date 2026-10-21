import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokenHash, guideAccess } from './access.mjs';
import { ApprovalStore, OperatorInbox, approvalRecord } from './approval.mjs';
import { FileReportStore } from './reports.mjs';
import { createGuideServer } from './server.mjs';
import { validateGuideConfig } from './config-validation.mjs';
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
guide.presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));
const privateGuide = () => ({ ...structuredClone(guide), state: 'private', presentation: { ...structuredClone(guide.presentation), approval_open: true, tour: { entity: 'r-walton', start: { l: 1, c: '3' }, forward: { l: 1, c: '5' } } } });
const live = 'a'.repeat(32); const revoked = 'b'.repeat(32);
const access = { live_hashes: [tokenHash(live)], revoked_hashes: [tokenHash(revoked)] };
test('private authorization and retired links preserve cuts, strip credentials and avoid guide disclosure', () => {
  const at = query => new URL(`https://enrichreader.com/guia/frankenstein${query}`);
  const private_ = privateGuide();
  assert.equal(guideAccess(private_, at(''), '', access).status, 404);
  assert.equal(guideAccess(private_, at(`?k=${revoked}`), '', access).status, 410);
  assert.equal(guideAccess(private_, at(`?k=${live}`), 'ClaudeBot', access).status, 403);
  assert.equal(guideAccess(private_, at(`?k=${live}&k=${live}`), '', access).status, 404);
  assert.equal(guideAccess(private_, at(`?k=${live}`), 'facebookexternalhit', access).status, 200);
  const moved = guideAccess(guide, at(`?k=${revoked}&resumos=0&l=1&c=5`), '', access);
  assert.equal(moved.status, 301);
  const target = new URL(moved.location, 'https://enrichreader.com');
  assert.equal(target.searchParams.get('c'), '5'); assert.equal(target.searchParams.get('utm_source'), 'mary-shelley');
  assert.equal(target.searchParams.has('k'), false); assert.equal(target.searchParams.has('resumos'), false);
});
test('approval validation ignores client timestamps and rejects impossible dates or unsupported launch', () => {
  const private_ = privateGuide();
  const value = approvalRecord(private_, { divulgar: 'semana', resumos: 'off', ts: 'forged', blurb_approved_at_approval: true }, new Date('2026-10-13T15:00:00Z'));
  assert.equal(value.ts, '2026-10-13T15:00:00.000Z'); assert.equal(value.blurb_approved_at_approval, false);
  for (const data of ['2026-10-12', '2026-02-31', 'garbage']) assert.throws(() => approvalRecord(private_, { divulgar: 'data', data, resumos: 'on' }, new Date('2026-10-13T15:00:00Z')));
  assert.throws(() => approvalRecord(private_, { divulgar: 'lancamento', resumos: 'on' }));
  assert.throws(() => validateGuideConfig({ ...private_, presentation: { ...private_.presentation, tour: { ...private_.presentation.tour, entity: 'henry-clerval' } } }), /safe/);
});
test('private HTTP navigation, summary switch and idempotent durable approval never publish', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-private-'));
  const approvalStore = new ApprovalStore(join(directory, 'approvals'));
  const server = createGuideServer({ guide: privateGuide(), access, siteConfig: { whatsapp_number: '5511999999999' }, approvalStore, inbox: new OperatorInbox(join(directory, 'inbox')), reportStore: new FileReportStore(join(directory, 'reports')) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/guia/frankenstein', '/guia/frankenstein/pessoa/r-walton', '/guia/frankenstein/reports']) {
      const response = await fetch(base + path); assert.equal(response.status, 404); assert.doesNotMatch(await response.text(), /Frankenstein|Mary|Walton/);
    }
    for (const path of ['/GUIA/frankenstein/reports', '/guia/FRANKENSTEIN/reports', '/Guia/frankenstein/REPORTS']) {
      const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{}' });
      assert.ok([404, 405].includes(response.status), `${path} answered ${response.status}`);
    }
    const url = `${base}/guia/frankenstein?k=${live}`;
    const gate = await fetch(url); const html = await gate.text();
    assert.equal(gate.status, 200); assert.match(html, /Preview for Mary Shelley/); assert.match(html, /data-language-choice="pt-BR"/);
    assert.doesNotMatch(html, /data-share|data-scope="sheet"|data-scope="card"/);
    for (const link of html.matchAll(/href="(\/guia\/frankenstein[^"#]*)"/g)) {
      assert.ok(link[1].includes(`k=${live}`), link[1]);
    }
    const bot = await fetch(url, { headers: { 'User-Agent': 'GPTBot' } }); assert.equal(bot.status, 403); assert.equal(await bot.text(), '');
    const withSummaries = await (await fetch(`${url}&l=1&c=5`)).text();
    const without = await (await fetch(`${url}&l=1&c=5&resumos=0`)).text();
    assert.match(withSummaries, /class="scene-meta"/); assert.doesNotMatch(without, /class="scene-meta"/); assert.match(without, /Show scene summaries/);
    const endpoint = `${base}/guia/frankenstein/aprovacao?k=${live}`;
    const send = input => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal((await send({ divulgar: 'semana', resumos: 'off' })).status, 200);
    assert.equal((await send({ divulgar: 'nao_sei', resumos: 'on' })).status, 200);
    const saved = await approvalStore.get(guide.series); assert.equal(saved.divulgar, 'semana'); assert.equal(saved.resumos, 'off');
    const pending = await (await fetch(url)).text(); assert.match(pending, /Aprovado em/); assert.doesNotMatch(pending, /data-open-approval|data-approval-dialog/);
    assert.equal((await fetch(`${base}/guia/frankenstein`)).status, 404);
    const inbox = await Promise.all((await readdir(join(directory, 'inbox'))).filter(name => name.endsWith('.json')).map(name => readFile(join(directory, 'inbox', name), 'utf8')));
    assert.equal(inbox.filter(value => value.includes('open_notice')).length, 1);
    assert.equal(inbox.filter(value => value.includes('approval_notice')).length, 1);
    assert.doesNotMatch(inbox.join(''), new RegExp(`${live}|${tokenHash(live)}`));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});
