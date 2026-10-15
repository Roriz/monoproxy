import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokenHash } from './access.mjs';
import { validateShowcases, renderShowcase, showcaseAccess } from './publisher.mjs';
import { renderGuide } from './guide.mjs';
import { createGuideServer } from './server.mjs';
import { OperatorInbox } from './approval.mjs';
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
guide.presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));
const assets = JSON.parse(await readFile(new URL('../../data/web-guide/site-assets.json', import.meta.url)));
const actor = () => ({ ...structuredClone(guide), ownership: 'own', presentation: { ...structuredClone(guide.presentation), approved_by: 'autores', publisher: { name: 'Editora Exemplo', slug: 'exemplo', store_url: 'https://example.com/book' }, vitrine: true, vitrine_editoras: ['exemplo'], blurb: 'Uma sinopse de teste.', blurb_approved: true, tour: { entity: 'r-walton', start: { l: 1, c: '3' }, forward: { l: 1, c: '5' } } } });
const token = 'd'.repeat(32);
const showcase = { token_hash: tokenHash(token), revoked_hashes: [tokenHash('e'.repeat(32))], publisher: { name: 'Editora Exemplo', slug: 'exemplo' }, email: 'hello@enrichreader.com', modelo: 'servicos', guides: [{ serie: 'frankenstein', consent: { type: 'autor', date: '2026-10-13' } }], demos: [], qr: { path: '/web-guide/assets/qr-07eab57d.svg', type: 'image/svg+xml', target: 'https://enrichreader.com/guia/frankenstein?utm_source=exemplo&utm_medium=vitrine&utm_content=qr&utm_campaign=frankenstein', correction: 'M', quiet_zone: 4 } };
test('publisher showcases refuse missing consent, wrong ownership and positioned QR targets', () => {
  const catalog = new Map([['frankenstein', actor()]]);
  assert.doesNotThrow(() => validateShowcases([showcase], catalog));
  assert.throws(() => validateShowcases([{ ...showcase, guides: [{ serie: 'frankenstein' }] }], catalog), /consent/);
  assert.throws(() => validateShowcases([showcase], new Map([['frankenstein', guide]])), /permission/);
  assert.throws(() => validateShowcases([{ ...showcase, qr: { ...showcase.qr, target: showcase.qr.target + '&c=5' } }], catalog), /QR/);
  const denied = actor(); denied.presentation.vitrine_editoras = [];
  assert.throws(() => validateShowcases([showcase], new Map([['frankenstein', denied]])), /permission/);
  assert.equal(showcaseAccess([showcase], token, 'ClaudeBot').status, 403);
  assert.equal(showcaseAccess([showcase], 'e'.repeat(32), '').status, 410);
});
test('third-party disclaimer persists on all guide pages with no share, app, seal or quotes', () => {
  const demo = actor(); demo.ownership = 'third_party'; demo.state = 'unlisted'; demo.presentation.app_published = true;
  for (const path of ['', '/mundo', '/pessoa/r-walton', '/misterios/2', '/tempo', '/tempo/livro-1/cap-2', '/unknown']) {
    const html = renderGuide(demo, new URL(`https://enrichreader.com/guia/frankenstein${path}?l=1&c=5`));
    assert.match(html, /Demonstração não oficial · não pública/);
    assert.match(html, /Obra de Mary Shelley/);
    assert.doesNotMatch(html, /data-share|data-app-bridge|Também no app|Guia oficial · aprovado|class="source-quote"/);
  }
});
test('showcase links and QR are clean, own-guide approvals are attributed, and URL tokens stay out of markup attributes', () => {
  const html = renderShowcase(showcase, new Map([['frankenstein', actor()]]), new URL(`https://enrichreader.com/guia/v/${token}`), assets);
  assert.match(html, /Mais.*|Como ficaria no catálogo/);
  assert.match(html, /strict-origin/);
  assert.match(html, /autorização de Mary Shelley/);
  assert.equal((html.match(/data-showcase-cta/g) ?? []).length, 2);
  for (const link of html.matchAll(/href="(https:\/\/enrichreader.com\/guia\/frankenstein[^"#]*)"/g)) {
    const url = new URL(link[1].replaceAll('&amp;', '&'));
    assert.equal(url.searchParams.has('l'), false); assert.equal(url.searchParams.has('c'), false); assert.equal(url.searchParams.get('utm_source'), 'exemplo');
  }
  assert.doesNotMatch(html, /female companion|Victor's father|class="scene-meta"/);
});
test('showcase HTTP access, AI blocking and generic unknown responses precede rendering', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'guide-showcase-'));
  const owned = actor();
  const server = createGuideServer({ guide: owned, showcases: [showcase], inbox: new OperatorInbox(directory) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const good = await fetch(`${base}/guia/v/${token}`, { headers: { 'User-Agent': 'facebookexternalhit' } });
    assert.equal(good.status, 200); assert.equal(good.headers.get('referrer-policy'), 'strict-origin');
    assert.equal(good.headers.get('x-robots-tag'), 'noindex, nofollow');
    const unknown = await fetch(`${base}/guia/v/${'f'.repeat(32)}`); assert.equal(unknown.status, 404); assert.doesNotMatch(await unknown.text(), /Editora Exemplo|Mary/);
    const denied = await fetch(`${base}/guia/v/${token}`, { headers: { 'User-Agent': 'GPTBot' } }); assert.equal(denied.status, 403); assert.equal(await denied.text(), '');
    assert.doesNotMatch(await (await fetch(`${base}/guia/sitemap.xml`)).text(), /\/guia\/v\//);
    assert.equal((await fetch(`${base}${showcase.qr.path}`)).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});
