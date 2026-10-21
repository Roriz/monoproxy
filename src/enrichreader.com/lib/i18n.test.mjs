import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteRoot = resolve(import.meta.dirname, '..');
const playwrightPath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
const chromium = playwrightPath ? (await import(playwrightPath)).chromium : null;

async function withBrowser(run) {
  const runtime = await readFile(resolve(siteRoot, 'static/i18n.js'), 'utf8');
  const shared = JSON.parse(await readFile(resolve(siteRoot, 'data/translations/shared.json'), 'utf8'));
  const inlineJson = JSON.stringify({ shared, page: {
    '{count} chapters': '{count} capítulos',
    'The report covers {count} chapters': 'O relatório cobre {count} capítulos',
    'Letter {number}': 'Carta {number}',
    'Chapter {number}': 'Cap. {number}',
    'Everything that appeared before {position}.': 'Tudo o que apareceu antes de {position}.',
    'Standard Ebooks · 1831 text': 'Standard Ebooks · texto de 1831',
    'The guide follows {edition}.': 'O guia segue {edition}.',
    '.': ' .'
  } }).replaceAll('<', '\\u003c');
  const html = `<!doctype html><html lang="en"><head>
    <meta name="description" content="A reading companion">
    <title>Story reports</title>
    <script>window.i18nCharacterMutations=0;new MutationObserver(records=>{window.i18nCharacterMutations+=records.length}).observe(document.documentElement,{subtree:true,characterData:true});</script>
    <script>window.EnrichReaderTranslations=${inlineJson};</script>
    <script>${runtime.replaceAll('</script>', '<\\/script>')}</script>
  </head><body>
    <main>
      <span id="scope">ALL VOLUMES (2,731 chapters)</span>
      <span id="punctuation"> .</span>
      <span id="specific">The report covers 2,731 chapters</span>
      <span id="nested-position">Everything that appeared before Letter 4.</span>
      <span id="nested-edition">The guide follows Standard Ebooks · 1831 text.</span>
      <span id="prose">The book has many chapters</span>
      <span id="tick">ch. 120</span>
      <span id="gap-size">600 ch.</span>
      <span id="volume-chapter">Vol. 16, Ch. 1180</span>
      <h2 id="summary">Narrative Disappearance Gaps Summary (Chapter 2731)</h2>
      <button id="toggle">Show all 68 race selections</button>
      <div id="absence" title="Azik Eggers (person): absent for 600 chapters (from ch. 210 to ch. 810)"></div>
      <span id="category" title="Category: person | Mentions: 13440"></span>
      <span id="ignored" data-i18n-ignore title="ch. 120">ch. 120</span>
      <pre><span id="code">ch. 120</span></pre>
      <div id="late"></div>
      <div role="group" aria-label="Language">
        <button data-language-choice="en" aria-pressed="true">EN</button>
        <button data-language-choice="pt-BR" aria-pressed="false">PT</button>
      </div>
    </main>
    <script>document.addEventListener('languagechange', event => { window.lastLanguageChange = event.detail.language; });</script>
  </body></html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const browser = await chromium.launch({ headless: true });
  try {
    await run(browser, `http://127.0.0.1:${server.address().port}/`);
  } finally {
    await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
}

test('runtime translates anchored parameter templates and round-trips generated text and attributes', {
  skip: !chromium && 'Set WEB_GUIDE_PLAYWRIGHT_MODULE to an installed Playwright module'
}, () => withBrowser(async (browser, base) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto(`${base}?lang=pt-BR`);

  assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
  assert.equal(await page.locator('#scope').textContent(), 'TODOS OS VOLUMES (2,731 capítulos)');
  assert.equal(await page.locator('#punctuation').textContent(), ' .', 'dictionary edge whitespace does not accumulate');
  assert.equal(await page.locator('#specific').textContent(), 'O relatório cobre 2,731 capítulos');
  assert.equal(await page.locator('#nested-position').textContent(), 'Tudo o que apareceu antes de Carta 4.');
  assert.equal(await page.locator('#nested-edition').textContent(), 'O guia segue Standard Ebooks · texto de 1831.');
  assert.equal(await page.locator('#prose').textContent(), 'The book has many chapters', 'numeric patterns do not capture prose');
  assert.equal(await page.locator('#tick').textContent(), 'cap. 120');
  assert.equal(await page.locator('#gap-size').textContent(), '600 cap.');
  assert.equal(await page.locator('#volume-chapter').textContent(), 'Vol. 16, Cap. 1180');
  assert.equal(await page.locator('#summary').textContent(), 'Resumo das lacunas de desaparecimento narrativo (Capítulo 2731)');
  assert.equal(await page.locator('#toggle').textContent(), 'Mostrar todas as 68 seleções de raça');
  assert.equal(await page.locator('#absence').getAttribute('title'), 'Azik Eggers (pessoa): ausente por 600 capítulos (do cap. 210 ao cap. 810)');
  assert.equal(await page.locator('#category').getAttribute('title'), 'Categoria: pessoa | Menções: 13440');
  await page.waitForTimeout(75);
  assert.ok(await page.evaluate(() => window.i18nCharacterMutations) < 50, 'runtime observer settles without repeating text mutations');
  assert.equal(await page.locator('#ignored').textContent(), 'ch. 120');
  assert.equal(await page.locator('#ignored').getAttribute('title'), 'ch. 120');
  assert.equal(await page.locator('#code').textContent(), 'ch. 120');
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), 'A reading companion');
  assert.equal(await page.evaluate(() => document.title), 'Story reports');
  assert.equal(await page.evaluate(() => localStorage.getItem('enrichreader-language')), 'pt-BR');

  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.language), 'pt-BR');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('Show all {count} race selections', { count: 68 })), 'Mostrar todas as 68 seleções de raça');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('{sections} {part} · {chapters} chapters · {characters} characters · {places} places', {
    sections: 4, part: 'letters', chapters: 24, characters: 23, places: 46
  })), '4 cartas · 24 capítulos · 23 personagens · 46 lugares');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('Cover of {title}', { title: 'Frankenstein' })), 'Capa de Frankenstein');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('Everything that appeared before {position}.', { position: 'Chapter 5' })), 'Tudo o que apareceu antes de Cap. 5.');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('Everything that appeared before {position}.', { position: 'The Wandering Inn' })), 'Tudo o que apareceu antes de The Wandering Inn.', 'unknown names remain unchanged');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('The guide follows {edition}.', { edition: 'Custom Reader’s Edition' })), 'O guia segue Custom Reader’s Edition.', 'unknown edition names remain unchanged');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.t('{name} ({type}): absent for {count} chapters (from ch. {from} to ch. {to})', {
    name: 'Mara', type: 'person', count: 9, from: 4, to: 13
  })), 'Mara (pessoa): ausente por 9 capítulos (do cap. 4 ao cap. 13)');

  await page.goto(`${base}?next=1`);
  assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR', 'explicit URL choice persists on the next page');

  await page.evaluate(() => {
    const reverse = document.createElement('span');
    reverse.id = 'reverse';
    reverse.textContent = 'Mara (pessoa): ausente por 9 capítulos (do cap. 4 ao cap. 13)';
    document.querySelector('#late').append(reverse);
    const dynamic = document.createElement('span');
    dynamic.id = 'dynamic';
    dynamic.textContent = 'ch. 999';
    document.querySelector('#late').append(dynamic);
    const dynamicAttribute = document.createElement('span');
    dynamicAttribute.id = 'dynamic-attribute';
    dynamicAttribute.title = 'Category: location | Mentions: 4';
    document.querySelector('#late').append(dynamicAttribute);
  });
  await page.waitForFunction(() => document.querySelector('#dynamic')?.textContent === 'cap. 999');
  assert.equal(await page.locator('#reverse').textContent(), 'Mara (pessoa): ausente por 9 capítulos (do cap. 4 ao cap. 13)');
  assert.equal(await page.locator('#dynamic-attribute').getAttribute('title'), 'Categoria: local | Menções: 4');

  await page.locator('[data-language-choice="en"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.evaluate(() => window.lastLanguageChange), 'en');
  assert.equal(await page.locator('#scope').textContent(), 'ALL VOLUMES (2,731 chapters)');
  assert.equal(await page.locator('#punctuation').textContent(), ' .');
  assert.equal(await page.locator('#specific').textContent(), 'The report covers 2,731 chapters');
  assert.equal(await page.locator('#nested-position').textContent(), 'Everything that appeared before Letter 4.');
  assert.equal(await page.locator('#nested-edition').textContent(), 'The guide follows Standard Ebooks · 1831 text.');
  assert.equal(await page.locator('#absence').getAttribute('title'), 'Azik Eggers (person): absent for 600 chapters (from ch. 210 to ch. 810)');
  assert.equal(await page.locator('#reverse').textContent(), 'Mara (person): absent for 9 chapters (from ch. 4 to ch. 13)');
  await page.locator('[data-language-choice="pt-BR"]').click();
  assert.equal(await page.locator('#nested-position').textContent(), 'Tudo o que apareceu antes de Carta 4.', 'nested position labels round-trip');
  await page.locator('[data-language-choice="en"]').click();
  assert.equal(await page.locator('#dynamic').textContent(), 'ch. 999');
  assert.equal(new URL(page.url()).searchParams.has('lang'), false);
  await context.close();
}));
