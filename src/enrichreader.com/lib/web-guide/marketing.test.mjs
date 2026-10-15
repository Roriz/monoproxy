import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderShelf, renderAuthors, authorsContext } from './marketing.mjs';
import { createGuideServer } from './server.mjs';
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
guide.presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));
const assets = JSON.parse(await readFile(new URL('../../data/web-guide/site-assets.json', import.meta.url)));
const site = { whatsapp_number: '5511999999999' };
const at = value => new URL(`https://enrichreader.com/autores${value}`);
test('the approved public contact activates authors and guide referrals by default', async () => {
  const server = createGuideServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/autores`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /wa\.me\/5511953664050/);
    assert.match(await (await fetch(`${base}/guia/frankenstein`)).text(), /data-authors-line/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('shelf includes only public guides and changes indexing at three without disclosing private titles', () => {
  const private_ = { ...guide, state: 'private', title: 'Private secret', series: 'private-secret' };
  assert.doesNotMatch(renderShelf([guide, private_], site, assets), /Private secret|private-secret/);
  assert.match(renderShelf([guide], site, assets), /noindex, follow/);
  assert.doesNotMatch(renderShelf([guide], site, assets), /ld\+json|Cada guia é aprovado/);
  const more = [{ ...guide, series: 'alpha', title: 'A first book' }, { ...guide, series: 'zeta', title: 'Z last book' }];
  const html = renderShelf([guide, ...more], site, assets);
  assert.match(html, /index, follow/); assert.match(html, /CollectionPage/);
  assert.ok(html.indexOf('data-shelf-card="alpha"') < html.indexOf('data-shelf-card="frankenstein"'));
  assert.ok(html.indexOf('data-shelf-card="frankenstein"') < html.indexOf('data-shelf-card="zeta"'));
  assert.doesNotMatch(renderShelf([], site, assets), /shelf-grid|ld\+json/);
});
test('author referrals resolve only public exact slugs and do not infer example consent', () => {
  const noConsent = { ...guide, presentation: { ...guide.presentation, public_domain_example: false } };
  assert.equal(authorsContext([noConsent], at('?guia=frankenstein')).variant, 'valid');
  assert.equal(authorsContext([noConsent], at('?guia=frankenstein')).exampleKind, 'ficticio');
  const secret = { ...guide, state: 'unlisted', title: 'Secret book', series: 'secret-book' };
  assert.equal(authorsContext([secret], at('?guia=secret-book')).variant, 'invalid');
  assert.doesNotMatch(renderAuthors([secret], site, assets, at('?guia=secret-book')), /Secret book|secret-book/);
  assert.doesNotMatch(renderAuthors([guide], site, assets, at('?guia=%3Cscript%3E')), /<script>/);
  assert.equal(authorsContext([guide], at('?guia=frankenstein')).variant, 'valid_vitrine');
  const head = html => html.match(/<head>(.*?)<\/head>/s)[1];
  assert.equal(head(renderAuthors([guide], site, assets, at(''))), head(renderAuthors([guide], site, assets, at('?guia=frankenstein'))));
});
test('author CTAs are platform-correct and honest about app availability and public-domain approval', () => {
  const html = renderAuthors([guide], site, assets, at('?guia=frankenstein'));
  assert.equal((html.match(/data-authors-talk=/g) ?? []).length, 2);
  assert.match(html, /https:\/\/wa.me\//); assert.match(html, /Obra em domínio público/);
  assert.doesNotMatch(html, /aprovou este guia|aprovado por Mary|O mesmo guia também no app|FAQPage/);
  const beforeFAQ = html.slice(0, html.indexOf('class="authors-faq"'));
  assert.doesNotMatch(beforeFAQ, /Usa IA/);
  assert.throws(() => renderAuthors([guide], {}, assets, at('')), /unavailable/);
});
test('author route and footer activate together only with configured WhatsApp contact', async () => {
  for (const siteConfig of [{}, site]) {
    const server = createGuideServer({ siteConfig }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const page = await fetch(`${base}/autores?guia=frankenstein`); assert.equal(page.status, siteConfig.whatsapp_number ? 200 : 503);
      const home = await (await fetch(`${base}/guia/frankenstein`)).text();
      assert.equal(home.includes('data-authors-line'), !!siteConfig.whatsapp_number);
      const map = await (await fetch(`${base}/guia/sitemap.xml`)).text(); assert.equal(map.includes('/autores'), !!siteConfig.whatsapp_number);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});
