import test from 'node:test';
import assert from 'node:assert/strict';
import { guideSitemapXML } from './sitemap.mjs';

test('guide sitemaps omit invented modification dates and escape URLs', () => {
  const xml = guideSitemapXML(['/guia/frankenstein', '/example?a=1&b=2']);
  assert.match(xml, /<loc>https:\/\/enrichreader.com\/guia\/frankenstein<\/loc>/);
  assert.match(xml, /a=1&amp;b=2/);
  assert.doesNotMatch(xml, /lastmod/);
});
