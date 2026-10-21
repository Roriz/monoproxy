import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localizeWebGuideHTML, webGuideTranslations } from './i18n.mjs';
import { renderGuide } from './guide.mjs';
import { createGuideServer } from './server.mjs';

test('standalone pages start in English, keep story data intact, and embed the language selector and runtime', () => {
  const html = '<!doctype html><html lang="pt-BR"><head><title>Guias sem spoiler</title><meta property="og:locale" content="pt_BR"><meta name="description" content="Você diz em que capítulo está e o guia mostra só o que já apareceu até ali."></head><body><h1>Guias sem spoiler</h1><p lang="en">Mary Shelley wrote Frankenstein.</p><button aria-label="Fechar">Aprovar e publicar</button><script type="application/ld+json">{"inLanguage":"pt-BR","name":"Frankenstein"}</script></body></html>';
  const result = localizeWebGuideHTML(html);
  assert.match(result, /<html lang="en">/);
  assert.match(result, /<title>Spoiler-free guides<\/title>/);
  assert.match(result, /content="en_US"/);
  assert.match(result, /content="You tell us which chapter you’re on, and the guide shows only what has appeared up to that point\."/);
  assert.match(result, /<p lang="en" data-i18n-ignore>Mary Shelley wrote Frankenstein\.<\/p>/);
  assert.match(result, /aria-label="Close"/);
  assert.match(result, /<script type="application\/ld\+json">\{"inLanguage":"pt-BR","name":"Frankenstein"\}<\/script>/);
  assert.match(result, /data-language-choice="en"/);
  assert.match(result, /data-language-choice="pt-BR"/);
  assert.match(result, /window\.EnrichReaderTranslations=/);
  assert.match(result, /window\.EnrichReaderI18n/);
  assert.match(result, /document\.addEventListener\('languagechange'/);
  assert.ok(Object.keys(webGuideTranslations).length > 300);
});

test('parameterized guide labels preserve names, counts, and whitespace around inline markup', () => {
  const html = '<html lang="pt-BR"><head></head><body><p>O seletor contém 4 seções de abertura e 24 capítulos.</p><p><span lang="en">Mary</span> apareceu em 3 capítulos até aqui.</p><p>desde a Carta 12</p><p>de Mary Shelley</p><p>Ver a Carta 4 inteira →</p><p>Quem apareceu na Carta 4</p><p>Buscar personagens, lugares e mais até a Carta 4</p><p>Lugar · desde o cap. 4</p><p>· pelo olhar de R. Walton</p><p>O guia segue Standard Ebooks · texto de 1831. O seletor contém 4 seções de abertura e 24 capítulos. Se a numeração da sua edição for diferente, confira a seção correspondente.</p><p>  Algo errado?  </p></body></html>';
  const result = localizeWebGuideHTML(html, { runtime: false });
  assert.match(result, /The selector has 4 opening sections and 24 chapters\./);
  assert.match(result, /<span lang="en" data-i18n-ignore>Mary<\/span> appeared in 3 chapters so far\./);
  assert.match(result, /since Letter 12/);
  assert.match(result, /by Mary Shelley/);
  assert.match(result, /Read the whole Letter 4 →/);
  assert.match(result, /Who appeared in Letter 4/);
  assert.match(result, /Search characters, places, and more up to Letter 4/);
  assert.match(result, /Place · since Chapter 4/);
  assert.match(result, /· From R\. Walton’s point of view/);
  assert.match(result, /The guide follows Standard Ebooks · 1831 text\. The selector has 4 opening sections and 24 chapters\. If your edition uses different numbering, check the corresponding section\./);
  assert.match(result, />  Something wrong\?  </);
});

const readData = name => JSON.parse(readFileSync(new URL(`../../data/web-guide/${name}.json`, import.meta.url), 'utf8'));
const frankenstein = readData('frankenstein');
// Synthetic first-item variants: a chapter, a multi-book label, and a numbered part.
const firstItemVariant = (change, books = []) => {
  const guide = structuredClone(frankenstein);
  Object.assign(guide.books[0].items[0], change);
  guide.books.push(...books);
  return guide;
};
const firstItemVariants = {
  chapter: [firstItemVariant({ kind: 'chapter', label: 'Cap. 1', gender: 'm' }), 'Chapter 1', 'o cap. 1'],
  books: [firstItemVariant({}, [{ l: 2, status: 'announced', release: '2027-03' }]), 'Book 1 · Letter 1', 'a L1 · Carta 1'],
  part: [firstItemVariant({ part: 1 }), 'Part 1 · Letter 1', 'a Parte 1 · Carta 1'],
};
const firstItemSentences = (guide, path) => localizeWebGuideHTML(renderGuide(guide, new URL(`https://enrichreader.com/guia/frankenstein${path}?l=1&c=1`)), { runtime: false });

test('first-item sentences translate for any first-item label, in English', () => {
  for (const [name, [guide, label]] of Object.entries({ frankenstein: [frankenstein, 'Letter 1'], ...firstItemVariants })) {
    const panel = firstItemSentences(guide, '');
    assert.ok(panel.includes(`When you finish ${label}, what you’ve read will appear here.`), name);
    assert.ok(panel.includes(`I’ve finished ${label}<`), name);
    for (const path of ['/mundo', '/tempo']) assert.ok(firstItemSentences(guide, path).includes(`come back when you finish ${label}.`), `${name} ${path}`);
    for (const path of ['', '/mundo', '/tempo']) assert.doesNotMatch(firstItemSentences(guide, path), /Quando terminar|Já terminei|volte quando|terminar (?:a|o) /, `${name} ${path}`);
  }
});

const playwrightPath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
test('first-item sentences switch language live for chapter, multi-book, and part labels', { skip: !playwrightPath }, async () => {
  const { chromium } = await import(playwrightPath);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, [guide, english, portuguese]] of Object.entries(firstItemVariants)) {
      const server = createGuideServer({ guide: { ...guide, presentation: readData('frankenstein-presentation') } });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const page = await browser.newPage({ locale: 'en-US' });
      const pages = {
        '': [`When you finish ${english}, what you’ve read will appear here\\.[\\s\\S]*I’ve finished ${english}`, `Quando terminar ${portuguese}, aqui aparece o que você já leu\\.[\\s\\S]*Já terminei ${portuguese}`],
        '/mundo': [`come back when you finish ${english}\\.`, `volte quando terminar ${portuguese}\\.`],
      };
      try {
        for (const [path, [en, pt]] of Object.entries(pages)) {
          const empty = page.locator('main#content');
          await page.goto(`http://127.0.0.1:${server.address().port}/guia/frankenstein${path}?l=1&c=1`);
          assert.match(await empty.innerText(), new RegExp(en), `${name} ${path}`);
          await page.locator('[data-language-choice="pt-BR"]').click();
          assert.match(await empty.innerText(), new RegExp(pt), `${name} ${path}`);
          await page.locator('[data-language-choice="en"]').click();
          assert.match(await empty.innerText(), new RegExp(en), `${name} ${path}`);
        }
      } finally {
        await page.close();
        await new Promise(resolve => server.close(resolve));
      }
    }
  } finally {
    await browser.close();
  }
});
