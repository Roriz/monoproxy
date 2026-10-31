import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createTranslator, faqItems, localizePage, pageDictionaries, portugueseAlternate } from './pt-br-pages.mjs';

const siteRoot = resolve(import.meta.dirname, '..');
const runtime = await readFile(resolve(siteRoot, 'static/i18n.js'), 'utf8');
const playwrightPath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
const chromium = playwrightPath ? (await import(playwrightPath)).chromium : null;

const dictionaries = {
  shared: { 'Open EnrichReader': 'Abrir o EnrichReader', 'How it works': 'Como funciona', English: 'Inglês' },
  page: {
    'Story companion | EnrichReader': 'Companheiro de leitura | EnrichReader',
    'A companion that stops at your chapter.': 'Um companheiro que para no seu capítulo.',
    'Story companion': 'Companheiro de leitura',
    'Remember the cast & stay in the story.': 'Lembre do elenco e fique na história.',
    'Cover of {title}': 'Capa de {title}',
    '{count} chapters': '{count} capítulos',
    'Is it free?': 'É gratuito?',
    'Yes, currently. See the': 'Sim, atualmente. Veja os',
    'reader terms': 'termos do leitor',
    'Do I need a book?': 'Preciso de um livro?',
    'Yes. You import an EPUB you already have.': 'Sim. Você importa um EPUB que já tem.',
    'ch. 120': 'cap. 120',
  },
};
const englishURL = 'https://enrichreader.com/story-companion/';
const portugueseURL = 'https://enrichreader.com/pt-br/story-companion/';
const localized = new Map([['/', '/pt-br/'], ['/story-companion/', '/pt-br/story-companion/'], ['/app/', '/pt-br/app/']]);
const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': 'https://enrichreader.com/#organization', name: 'EnrichReader', url: 'https://enrichreader.com/' },
    {
      '@type': 'FAQPage', '@id': `${englishURL}#webpage`, url: englishURL, name: 'Story companion | EnrichReader',
      description: 'A companion that stops at your chapter.', inLanguage: 'en',
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'EnrichReader', item: 'https://enrichreader.com/' },
        { '@type': 'ListItem', position: 2, name: 'Story companion', item: englishURL },
      ] },
      mainEntity: [
        { '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, currently. See the reader terms.' } },
        { '@type': 'Question', name: 'Do I need a book?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You import an EPUB you already have.' } },
      ],
    },
  ],
};
const englishPage = (alternates = true) => `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Story companion | EnrichReader</title>
  <meta name="description" content="A companion that stops at your chapter.">
  <link rel="canonical" href="${englishURL}">
  ${alternates ? `<link rel="alternate" hreflang="en" href="${englishURL}">
  <link rel="alternate" hreflang="pt-BR" href="${portugueseURL}">
  <link rel="alternate" hreflang="x-default" href="${englishURL}">` : ''}
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="pt_BR">
  <meta property="og:url" content="${englishURL}">
  <meta property="og:title" content='Story companion | EnrichReader'>
  <meta name="keywords" content="Story companion">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <script>window.EnrichReaderTranslations = { shared: ${JSON.stringify(dictionaries.shared)}, page: ${JSON.stringify(dictionaries.page)} };</script>
  <script>${runtime}</script>
</head>
<body>
  <nav>
    <a href="/" aria-label="EnrichReader">Home</a>
    <a href="/app/?utm_source=x#install">Open EnrichReader</a>
    <a href="https://enrichreader.com/story-companion/#faq">How it works</a>
    <a href="/enterprise/">How it works</a>
    <a href="//cdn.example/app/">How it works</a>
    <div class="language-switch">
      <a href="/story-companion/" hreflang="en" data-language-choice="en" title="English" aria-current="true">EN</a>
      <a href="/pt-br/story-companion/" hreflang="pt-BR" data-language-choice="pt-BR" title="Português">PT</a>
    </div>
  </nav>
  <main>
    <h1 id="hook">Remember the cast &amp; stay in the story.</h1>
    <img id="cover" src="/c.png" alt='Cover of Frankenstein'>
    <p id="count"> 2,731 chapters </p>
    <p id="prose">The book has many chapters</p>
    <div id="ignored" data-i18n-ignore title="ch. 120"><div>ch. 120</div><span>ch. 120</span></div>
    <p id="after">ch. 120</p>
    <pre><code>ch. 120</code></pre>
    <svg viewBox="0 0 1 1"><title>ch. 120</title><path d="M0 0"/></svg>
    <script>window.sample = "ch. 120 <b>";</script>
    <!-- ch. 120 -->
    <section id="faq">
      <div><h3>Is it free?</h3>
        <p>Yes, currently. See the <a href="/terms-of-service/">reader terms</a>.</p></div>
      <div><h3>Do I need a book?</h3>
        <p>Yes. You import an EPUB you already have.</p></div>
    </section>
  </main>
</body>
</html>`;

const translate = createTranslator(runtime, dictionaries);
const localize = (html = englishPage(), options = {}) => localizePage(html, { englishURL, portugueseURL, localized, translate, ...options });

test('the translator is the browser runtime: anchored keys, templates and kept edges', () => {
  assert.equal(translate('  Story companion\n'), '  Companheiro de leitura\n');
  assert.equal(translate('Cover of Frankenstein'), 'Capa de Frankenstein');
  assert.equal(translate('2,731 chapters'), '2,731 capítulos');
  assert.equal(translate('The book has many chapters'), null, 'numeric placeholders do not capture prose');
  assert.equal(translate('Story companion and more'), null, 'no partial matches');
  assert.equal(translate('Companheiro de leitura'), 'Companheiro de leitura', 'Portuguese stays Portuguese');
  assert.deepEqual(JSON.parse(JSON.stringify(pageDictionaries(englishPage()))), dictionaries);
});

test('a Portuguese copy translates text, attributes and metadata and points to itself', () => {
  const html = localize();
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<title>Companheiro de leitura \| EnrichReader<\/title>/);
  assert.match(html, /<meta name="description" content="Um companheiro que para no seu capítulo.">/);
  assert.match(html, /<meta property="og:title" content="Companheiro de leitura \| EnrichReader">/);
  assert.match(html, /<meta name="keywords" content="Story companion">/, 'only the metadata the runtime translates');
  assert.match(html, /<link rel="canonical" href="https:\/\/enrichreader.com\/pt-br\/story-companion\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/enrichreader.com\/pt-br\/story-companion\/">/);
  assert.match(html, /<meta property="og:locale" content="pt_BR">/);
  assert.match(html, /<meta property="og:locale:alternate" content="en_US">/);
  assert.equal(portugueseAlternate(html), portugueseURL, 'both versions keep the same alternates');
  assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/enrichreader.com\/story-companion\/">/);
  assert.match(html, /<h1 id="hook">Lembre do elenco e fique na história.<\/h1>/, 'entities are decoded before matching');
  assert.match(html, /<img id="cover" src="\/c.png" alt="Capa de Frankenstein">/);
  assert.match(html, /<p id="count"> 2,731 capítulos <\/p>/);
  assert.match(html, /<p id="prose">The book has many chapters<\/p>/);
});

test('ignored, code, svg and script content stay as written, including nested same-name elements', () => {
  const html = localize();
  assert.match(html, /<div id="ignored" data-i18n-ignore title="ch. 120"><div>ch. 120<\/div><span>ch. 120<\/span><\/div>/);
  assert.match(html, /<p id="after">cap. 120<\/p>/, 'translation resumes after the ignored element closes');
  assert.match(html, /<pre><code>ch. 120<\/code><\/pre>/);
  assert.match(html, /<svg viewBox="0 0 1 1"><title>ch. 120<\/title>/);
  assert.match(html, /window.sample = "ch. 120 <b>";/);
  assert.match(html, /<!-- ch. 120 -->/);
  assert.throws(() => localize('<html lang="en"><head></head><body><pre>open</body></html>'), /Unclosed <pre>/);
});

test('internal links lead to Portuguese versions where one exists; the language switch keeps its targets', () => {
  const html = localize();
  assert.match(html, /<a href="\/pt-br\/" aria-label="EnrichReader">Home<\/a>/);
  assert.match(html, /<a href="\/pt-br\/app\/\?utm_source=x#install">Abrir o EnrichReader<\/a>/);
  assert.match(html, /<a href="https:\/\/enrichreader.com\/pt-br\/story-companion\/#faq">Como funciona<\/a>/);
  assert.match(html, /<a href="\/enterprise\/">Como funciona<\/a>/);
  assert.match(html, /<a href="\/\/cdn.example\/app\/">/);
  assert.match(html, /<a href="\/terms-of-service\/">termos do leitor<\/a>/);
  assert.match(html, /<a href="\/story-companion\/" hreflang="en" data-language-choice="en" title="Inglês">EN<\/a>/);
  assert.match(html, /<a href="\/pt-br\/story-companion\/" hreflang="pt-BR" data-language-choice="pt-BR" title="Português" aria-current="true">PT<\/a>/);
});

test('structured data describes the Portuguese page with the FAQ it shows', () => {
  const html = localize();
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const [organization, page] = data['@graph'];
  assert.deepEqual(organization, schema['@graph'][0], 'site-wide entities are shared, not copied');
  assert.equal(page['@id'], `${portugueseURL}#webpage`);
  assert.equal(page.url, portugueseURL);
  assert.equal(page.inLanguage, 'pt-BR');
  assert.equal(page.name, 'Companheiro de leitura | EnrichReader');
  assert.equal(page.description, 'Um companheiro que para no seu capítulo.');
  assert.deepEqual(page.breadcrumb.itemListElement.map(item => [item.name, item.item]), [
    ['EnrichReader', 'https://enrichreader.com/pt-br/'], ['Companheiro de leitura', portugueseURL]]);
  assert.deepEqual(page.mainEntity.map(question => [question.name, question.acceptedAnswer.text]), [
    ['É gratuito?', 'Sim, atualmente. Veja os termos do leitor.'],
    ['Preciso de um livro?', 'Sim. Você importa um EPUB que já tem.']]);
  assert.deepEqual(faqItems(html).map(item => item.question), ['É gratuito?', 'Preciso de um livro?']);
  const missing = englishPage().replace(/<div><h3>Do I need a book\?[\s\S]*?<\/div>/, '');
  assert.throws(() => localize(missing), /FAQ has 1 questions, the English FAQPage 2/);
});

test('untranslated text and attribute values are reported', () => {
  const left = [];
  localize(englishPage(), { untranslated: value => left.push(value.trim()) });
  assert.ok(left.includes('The book has many chapters'));
  assert.ok(left.includes('Home'));
  assert.ok(!left.includes('ch. 120'), 'protected content is not reported');
});

test('the build step writes every page with a pt-BR alternate and removes stale copies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pt-br-pages-'));
  try {
    await mkdir(join(root, 'story-companion'), { recursive: true });
    await mkdir(join(root, 'enterprise'), { recursive: true });
    await mkdir(join(root, 'pt-br', 'removed'), { recursive: true });
    await writeFile(join(root, 'story-companion', 'index.html'), englishPage());
    await writeFile(join(root, 'enterprise', 'index.html'), englishPage(false));
    await writeFile(join(root, 'pt-br', 'removed', 'index.html'), 'stale');
    const { stdout } = await promisify(execFile)(process.execPath, [resolve(siteRoot, '../../scripts/web-guide/build-pt-br.mjs'), root]);
    assert.match(stdout, /Wrote 1 Brazilian Portuguese pages/);
    assert.equal(await readFile(join(root, 'pt-br', 'story-companion', 'index.html'), 'utf8'), localizePage(englishPage(), {
      englishURL, portugueseURL, localized: new Map([['/story-companion/', '/pt-br/story-companion/']]), translate,
    }));
    await assert.rejects(readFile(join(root, 'pt-br', 'removed', 'index.html')));
    await assert.rejects(readFile(join(root, 'pt-br', 'enterprise', 'index.html')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function serve(pages, run) {
  const server = createServer((request, response) => {
    const body = pages[new URL(request.url, 'http://x').pathname];
    response.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body ?? 'not found');
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const browser = await chromium.launch({ headless: true });
  try {
    await run(browser, `http://127.0.0.1:${server.address().port}`);
  } finally {
    await browser.close();
    await new Promise(done => server.close(done));
  }
}
const skip = !chromium && 'Set WEB_GUIDE_PLAYWRIGHT_MODULE to an installed Playwright module';
const visibleValues = () => {
  const values = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (!node.parentElement.closest('script,style') && node.nodeValue.trim()) values.push(node.nodeValue.trim());
  document.querySelectorAll('[title],[alt],[aria-label],meta[content]').forEach(element => ['title', 'alt', 'aria-label', 'content'].forEach(name => element.hasAttribute(name) && values.push(`${name}=${element.getAttribute(name)}`)));
  return values;
};

test('the static copy shows what the in-browser switch shows, and the runtime leaves it as it is', { skip }, () => serve({
  '/same-url/': englishPage(false),
  '/pt-br/story-companion/': localize(),
}, async (browser, base) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const live = await context.newPage();
  await live.goto(`${base}/same-url/?lang=pt-BR`);
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.textChanges = [];
    // The parser may still grow whitespace nodes; any other text change would be a re-translation.
    new MutationObserver(records => records.forEach(record => {
      if (record.oldValue.trim() !== record.target.nodeValue.trim()) window.textChanges.push(`${record.oldValue} → ${record.target.nodeValue}`);
    })).observe(document, { subtree: true, characterData: true, characterDataOldValue: true });
  });
  await page.goto(`${base}/pt-br/story-companion/`);
  assert.equal(page.url(), `${base}/pt-br/story-companion/`, 'English browser settings do not move the Portuguese page');
  assert.equal(await page.evaluate(() => window.EnrichReaderI18n.language), 'pt-BR');
  const liveValues = await live.evaluate(visibleValues);
  const staticValues = await page.evaluate(visibleValues);
  // Only the page's own URL and locale tags differ: the in-browser switch keeps the English URL.
  const expected = new Set([`content=${englishURL}`, `content=${portugueseURL}`, 'content=pt_BR', 'content=en_US']);
  assert.equal(staticValues.length, liveValues.length);
  liveValues.forEach((value, index) => {
    if (value !== staticValues[index]) assert.ok(expected.has(value) && expected.has(staticValues[index]), `${value} ≠ ${staticValues[index]}`);
  });
  assert.deepEqual(await page.evaluate(() => window.textChanges), [], 'no static text is re-translated');
  await context.close();
}));

test('pages with a Portuguese copy switch language by URL', { skip }, () => serve({
  '/story-companion/': englishPage(),
  '/pt-br/story-companion/': localize(),
}, async (browser, base) => {
  const portuguese = await browser.newContext({ locale: 'pt-BR' });
  const page = await portuguese.newPage();
  await page.goto(`${base}/story-companion/?utm_source=x#faq`);
  await page.waitForURL(`${base}/pt-br/story-companion/?utm_source=x#faq`);
  await page.click('[data-language-choice="en"]');
  await page.waitForURL(`${base}/story-companion/?utm_source=x#faq`);
  assert.equal(await page.evaluate(() => localStorage.getItem('enrichreader-language')), 'en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'the saved choice outranks browser settings');
  await page.click('[data-language-choice="pt-BR"]');
  await page.waitForURL(`${base}/pt-br/story-companion/?utm_source=x#faq`);
  await page.goto(`${base}/pt-br/story-companion/?lang=en`);
  await page.waitForURL(`${base}/story-companion/`);
  await portuguese.close();

  const blocked = await browser.newContext({ locale: 'pt-BR' });
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  const noStorage = await blocked.newPage();
  await noStorage.goto(`${base}/story-companion/`);
  await noStorage.waitForURL(`${base}/pt-br/story-companion/`);
  await noStorage.click('[data-language-choice="en"]');
  await noStorage.waitForURL(`${base}/story-companion/?lang=en`);
  await noStorage.waitForTimeout(100);
  assert.equal(noStorage.url(), `${base}/story-companion/?lang=en`, 'an unsaved English choice does not bounce back');
  await blocked.close();
}));
