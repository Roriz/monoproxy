import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cutEntities, renderGuide, previewDescription } from './guide.mjs';
import { resolvePosition } from './position.mjs';
import { createGuideServer } from './server.mjs';

const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
const presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));
const pos = c => ({ l: 1, c: String(c) });
const page = (c, path = '') => renderGuide(guide, new URL(`https://enrichreader.com/guia/frankenstein${path}${c == null ? '' : `?l=1&c=${c}`}`));

test('ongoing and retired stops preserve URL cuts without offering unsafe picker destinations', () => {
  const ongoing = structuredClone(guide);
  ongoing.books[0].status = 'ongoing';
  const html = renderGuide(ongoing, new URL('https://enrichreader.com/guia/frankenstein?l=1&c=28'));
  assert.doesNotMatch(html, /<option value="fim">/);
  assert.match(html, /data-finish hidden/);
  assert.equal(resolvePosition(ongoing, '?l=1&c=fim').state, 'invalid');
  const retired = structuredClone(guide);
  retired.books[0].items[1].retired = true;
  const oldURL = renderGuide(retired, new URL('https://enrichreader.com/guia/frankenstein?l=1&c=2'));
  assert.match(oldURL, /data-position-l="1" data-position-c="2"/);
  assert.doesNotMatch(oldURL, /<option value="2">/);
  assert.deepEqual(cutEntities(retired, pos(2)), cutEntities(guide, pos(2)));
});

test('clean and first-stop pages contain no story facts or cast names', () => {
  for (const c of [null, 1]) {
    const html = page(c);
    assert.doesNotMatch(html, /Margaret|Walton|Victor|The Creature|dead|chapter_summary|source_file|cut_before|skin_version/);
    assert.match(html, /Carta 1/);
  }
  assert.equal(cutEntities(guide, pos(1)).length, 0);
});

test('letters and numbered chapters use ordinals without counting the Introduction', () => {
  assert.deepEqual(guide.books[0].items.slice(0, 5).map(item => item.label), ['Carta 1', 'Carta 2', 'Carta 3', 'Carta 4', 'Cap. 1']);
  assert.equal(cutEntities(guide, pos(2)).find(entity => entity.slug === 'r-walton').sources.definition, 1);
  assert.equal(guide.books[0].items.at(-1).label, 'Cap. 24');
});

test('names and first-appearance slugs do not reveal later identities', () => {
  const traveller = cutEntities(guide, pos(5)).find(entity => entity.slug === 'the-traveller');
  assert.equal(traveller.facts.display_name, 'The traveller');
  assert.doesNotMatch(page(5), /The Creature|the-creature|Created being/);
  assert.equal(cutEntities(guide, pos(10)).find(entity => entity.slug === 'the-traveller').facts.display_name, 'The Creature');
  assert.equal(cutEntities(guide, pos(7)).find(entity => entity.slug === 'victor-s-father').facts.display_name, "Victor's father");
  assert.equal(cutEntities(guide, pos(12)).find(entity => entity.slug === 'victor-s-father').facts.display_name, 'Alphonse Frankenstein');
});

test('truth review keeps Clerval alive until chapter XXI is completed', () => {
  const before = cutEntities(guide, pos(25)).find(entity => entity.slug === 'henry-clerval');
  const after = cutEntities(guide, pos(26)).find(entity => entity.slug === 'henry-clerval');
  assert.equal(before.facts.status, 'alive');
  assert.equal(after.facts.status, 'dead');
  assert.equal(after.changes.status, 'changed', 'reviewed delta still counts when marker metadata is stale');
  assert.match(page(26, '/pessoa/henry-clerval'), /mudou no cap\. 21/);
  assert.doesNotMatch(page(25, '/pessoa/henry-clerval'), /dead|murdered|Deceased/);
});

test('every visible fact across every cut has an included source', () => {
  for (const c of [...guide.books[0].items.map(item => item.ordinal), 'fim']) {
    const last = c === 'fim' ? 28 : c - 1;
    for (const entity of cutEntities(guide, pos(c))) {
      for (const field of Object.keys(entity.facts)) {
        assert.ok(entity.sources[field] >= 1 && entity.sources[field] <= last, `${c}: ${entity.slug}.${field}`);
      }
    }
  }
});

test('removed fields disappear and final-state facts are never used', () => {
  const fixture = { ...guide, entities: [{ slug: 'example', facts: { status: 'future-secret' }, versions: [
    { ordinal: 1, set: { display_name: 'Example', status: 'alive' }, remove: [] },
    { ordinal: 2, set: {}, remove: ['status'] },
  ] }] };
  assert.equal(cutEntities(fixture, pos(2))[0].facts.status, 'alive');
  assert.equal(cutEntities(fixture, pos(3))[0].facts.status, undefined);
});

test('source markers distinguish the latest state changes from regenerated prose', () => {
  const fixture = { ...guide, entities: [{ slug: 'example', versions: [
    { ordinal: 1, set: { display_name: 'Example', status: 'alive', definition: 'First description.' }, remove: [], changed: [] },
    { ordinal: 2, set: { status: 'dead', location: 'Geneva', definition: 'Rewritten description.' }, remove: [], changed: ['status', 'definition'] },
  ] }] };
  const rendered = c => renderGuide(fixture, new URL(`https://enrichreader.com/guia/frankenstein/pessoa/example?l=1&c=${c}`));
  assert.equal((rendered(2).match(/class="source source-loud"/g) ?? []).length, 1, 'new entity gets one marker on its name');
  const changed = rendered(3);
  assert.equal((changed.match(/class="source source-loud"/g) ?? []).length, 2);
  assert.match(changed, /mudou na Carta 2/);
  assert.match(changed, /novo na Carta 2/);
  assert.match(changed, /Rewritten description\. <span class="source">/);
  assert.doesNotMatch(rendered(4), /source-loud/);
  assert.doesNotMatch(rendered(2), /dead|Geneva|Rewritten/);
});

test('preview metadata is the same on clean, positioned and invalid URLs except robots', () => {
  const head = html => html.match(/<head>(.*?)<\/head>/s)[1].replace(/<meta name="robots"[^>]+>/, '');
  assert.equal(head(page(null)), head(page('fim')));
  assert.equal(head(page(null)), head(page('bogus')));
  assert.match(page('bogus'), /Este link tem uma posição/);
  assert.doesNotMatch(page('bogus'), /Walton|Victor|The Creature/);
  assert.equal(head(page('fim', '/pessoa/henry-clerval')), head(page(null, '/pessoa/henry-clerval')));
  assert.doesNotMatch(head(page('fim', '/pessoa/henry-clerval')), /dead|murder/);
});

test('social image metadata is safe and constant across positions and subjects', () => {
  const rendered = (c, path = '') => renderGuide({ ...guide, presentation }, new URL(`https://enrichreader.com/guia/frankenstein${path}${c ? `?l=1&c=${c}` : ''}`));
  const image = html => html.match(/<meta property="og:image" content="([^"]+)"/)[1];
  const expected = image(rendered(null));
  assert.equal(expected, `https://enrichreader.com${presentation.assets.og.path}`);
  assert.equal(image(rendered('fim')), expected);
  assert.equal(image(rendered('bogus')), expected);
  assert.equal(image(rendered('2', '/pessoa/henry-clerval')), expected);
  assert.match(rendered(null), /summary_large_image/);
  assert.doesNotMatch(rendered(null), /Guia oficial|aprovou este guia/);
  const asset = presentation.assets;
  assert.equal(asset.og.width, 1200); assert.equal(asset.og.height, 630);
  assert.ok(asset.og.bytes <= 300 * 1024);
});

test('footer keeps author links first and app promotion depends on catalog publication', () => {
  const render = app_published => renderGuide({ ...guide, presentation: { ...presentation, app_published } }, new URL('https://enrichreader.com/guia/frankenstein'));
  const unpublished = render(false).match(/<footer>(.*?)<\/footer>/s)[1];
  assert.match(unpublished, /De Mary Shelley/);
  assert.ok(unpublished.indexOf('Standard Ebooks') < unpublished.indexOf('Cada fato'));
  assert.match(unpublished, /Mandar este guia para alguém/);
  assert.match(unpublished, /feito com <a href="https:\/\/enrichreader.com\/">EnrichReader<\/a>/);
  assert.doesNotMatch(unpublished, /Também no app/);
  assert.match(render(true), /Também no app: o guia ao lado do texto/);
});

test('future subjects show only a generic unavailable state', () => {
  const html = page(2, '/pessoa/henry-clerval');
  assert.match(html, /Aparece mais à frente/);
  assert.doesNotMatch(html.match(/<main[^>]*>(.*?)<\/main>/s)[1], /Henry Clerval|dead|definition/);
});

test('preview templates use the current cut, local roles and sentence-bounded descriptions', () => {
  const early = page(2);
  assert.match(early, /template id="preview-r-walton"/);
  assert.match(early, /Protagonista/);
  assert.doesNotMatch(early, /preview-henry-clerval|preview-the-traveller|Antagonista/);
  assert.doesNotMatch(page(null), /<template/);
  const short = 'A short first sentence. ';
  assert.equal(previewDescription(short + 'X'.repeat(250) + '.'), short.trim());
  assert.equal(previewDescription('x'.repeat(250) + '.'), '');
});

test('HTTP server serves cuts, marks positioned responses noindex and denies raw data', async () => {
  const server = createGuideServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const clean = await fetch(`${base}/guia/frankenstein`);
    assert.equal(clean.status, 200);
    assert.equal(clean.headers.get('x-robots-tag'), null);
    const cut = await fetch(`${base}/guia/frankenstein?l=1&c=2`);
    assert.equal(cut.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(await cut.text(), /Walton/);
    const invalid = await fetch(`${base}/guia/frankenstein?c=2&c=28`);
    assert.doesNotMatch(await invalid.text(), /Walton|Victor/);
    for (const path of ['/data/web-guide/frankenstein.json', '/skin.json', '/guia/frankenstein/unknown', '/guia/frankenstein/pessoa/unknown']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(`${base}/web-guide/position.mjs`)).status, 200);
    assert.equal((await fetch(`${base}/guia/frankenstein`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/guia`)).status, 200);
    assert.equal(resolvePosition(guide, '?l=1&c=29').state, 'invalid');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
