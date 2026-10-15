import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGuide, cutEntities, reportFields } from './guide.mjs';
import { createGuideServer } from './server.mjs';
import { guideRoute } from './routes.mjs';
import { validateGuideConfig } from './config-validation.mjs';
const stop = (ordinal, cut) => ({ ordinal, label: `Cap. ${ordinal}`, kind: 'chapter', number: ordinal, gender: 'm', cut_before: cut });
// Entirely synthetic: never imported into the public catalog.
const fixture = () => ({ series: 'multi-example', title: 'Synthetic series', authors: ['Fixture author'], edition: 'Test edition', text_language: 'en', state: 'public', ownership: 'public-domain', look: {}, presentation: {},
  books: [{ l: 1, status: 'complete', items: [stop(1, 'zero'), stop(2, 'one')], end_cut: 'two' },
    { l: 2, status: 'ongoing', items: [stop(1, 'two'), stop(2, 'three')] }, { l: 3, status: 'announced', release: '2027-03' }],
  entities: [{ slug: 'early', classification: 'person', versions: [{ ordinal: 1, set: { display_name: 'Early person', definition: 'Known in book one.' }, remove: [] }, { ordinal: 3, set: { occupation: 'Book two occupation' }, remove: [] }] },
    { slug: 'later', classification: 'person', versions: [{ ordinal: 3, set: { display_name: 'Later person' }, remove: [] }, { ordinal: 4, set: { display_name: 'Future identity' }, remove: [] }] }],
  context: { world: [], mentions: [{ ordinal: 1, counts: { early: 1 }, present: ['early'] }, { ordinal: 2, counts: { early: 1 }, present: ['early'] }, { ordinal: 3, counts: { later: 1 }, present: ['later'] }],
    story: { main_pov: 'early', arcs: [], curve: [], threads: [], scenes: [1, 2, 3].map(ordinal => ({ id: `scene-${ordinal}`, ordinal, index: 1, summary: ordinal === 3 ? 'Later person arrives.' : 'Early person walks.', cast: [ordinal === 3 ? 'later' : 'early'], tension: 2 })) } },
});
const at = path => new URL(`https://enrichreader.com/guia/multi-example${path}`);

test('multi-book cuts preserve prior-book facts and reveal only completed second-book items', () => {
  const guide = fixture(); validateGuideConfig(guide);
  assert.deepEqual(cutEntities(guide, { l: 1, c: 'fim' }), cutEntities(guide, { l: 2, c: '1' }));
  const first = renderGuide(guide, at('?l=2&c=1'));
  assert.doesNotMatch(first, /Later person|Book two occupation|Future identity/);
  const second = renderGuide(guide, at('?l=2&c=2'));
  assert.match(second, /Later person/); assert.doesNotMatch(second, /Future identity/);
  const early = cutEntities(guide, { l: 2, c: '2' }).find(entity => entity.slug === 'early');
  assert.equal(reportFields(guide, early, { l: 2, c: '2' }, 'sheet')[0].source, '1:1');
  const route = guideRoute(guide, '/guia/multi-example/tempo/livro-2/cap-1');
  assert.equal(route.item.ordinal, 3);
  assert.match(renderGuide(guide, at('/tempo/livro-2/cap-1?l=2&c=1')), /Aparece mais à frente/);
  assert.match(renderGuide(guide, at('/tempo/livro-2/cap-1?l=2&c=2')), /arrives/);
});

test('announced-book draft is content-free and never commits a reading position', () => {
  const html = renderGuide(fixture(), at('?book=3'));
  assert.match(html, /O guia do Livro 3 ainda não está pronto/);
  assert.match(html, /data-commit disabled hidden/);
  assert.doesNotMatch(html, /Later person|Future identity/);
});

const playwrightPath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
test('multi-book browser picker drafts, cancels, commits and disables announced/ongoing ends', { skip: !playwrightPath }, async () => {
  const { chromium } = await import(playwrightPath);
  const server = createGuideServer({ guide: fixture() });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  const home = `http://127.0.0.1:${server.address().port}/guia/multi-example`;
  try {
    await page.goto(`${home}?l=1&c=fim`);
    await page.locator('[data-open-picker]').click();
    const sheet = page.locator('[data-picker-dialog]');
    await sheet.locator('[data-picker-book="3"]').click();
    assert.equal(await sheet.locator('[data-commit]').isVisible(), true);
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '1');
    assert.equal(await sheet.locator('select[name="c"]').inputValue(), 'fim');
    assert.match(await sheet.locator('[data-book-notice]').innerText(), /Livro 3/);
    assert.equal(await sheet.locator('[data-picker-book="1"]').getAttribute('aria-current'), 'true');
    await sheet.locator('[data-picker-book="1"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '2');
    await page.keyboard.press('ArrowRight');
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '1');
    await page.keyboard.press('End');
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '2');
    await page.keyboard.press('Home');
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '1');
    assert.equal(await page.locator('main').innerText().then(text => text.includes('Later person')), false);
    await sheet.locator('[data-picker-book="2"]').click();
    assert.equal(await sheet.locator('[data-finish]').isVisible(), false);
    assert.equal(new URL(page.url()).searchParams.get('l'), '1');
    assert.equal(await page.evaluate(() => localStorage.getItem('er.pos.multi-example')), null);
    await sheet.locator('[data-close]').click();
    await sheet.waitFor({ state: 'hidden' });
    await page.locator('[data-open-picker]').click();
    assert.equal(await sheet.locator('input[name="l"]').inputValue(), '1');
    await sheet.locator('[data-picker-book="2"]').click();
    await sheet.locator('[data-commit]').click();
    await page.locator('[data-position-heading]').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('l'), '2');
    assert.equal(new URL(page.url()).searchParams.get('c'), '1');
    assert.equal(await page.evaluate(() => localStorage.getItem('er.pos.multi-example')), '{"l":2,"c":"1"}');
    assert.doesNotMatch(await page.locator('main').innerText(), /Later person/);
    await page.locator('[data-picker-draft]').click();
    await sheet.locator('[data-commit]').click();
    await page.waitForURL(/c=2/);
    await page.locator('main').getByText('Later person arrives.', { exact: false }).waitFor();
    assert.doesNotMatch(await page.locator('main').innerText(), /Future identity/);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
