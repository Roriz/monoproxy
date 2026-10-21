import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeWebGuideHTML, webGuideTranslations } from './i18n.mjs';

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
