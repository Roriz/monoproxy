import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightParts, searchHit, searchRows } from './search.mjs';

test('matching and highlighting preserve accented original text and word boundaries', () => {
  const name = 'Verô\u0301nica Torres';
  const parts = highlightParts(name, 'vero tor');
  assert.equal(parts.map(part => part.text).join(''), name);
  assert.deepEqual(parts.filter(part => part.marked).map(part => part.text), ['Verô\u0301', 'Tor']);
  assert.deepEqual(highlightParts('Victor', 'ict'), [{ text: 'Victor', marked: false }]);
  const keys = { name: 'Verônica Torres', aliases: ['A escrivã'], description: 'Uma escrivã cansada.' };
  assert.equal(searchHit(keys, 'ver tor').field, 'name');
  assert.equal(searchHit(keys, 'escr').field, 'alias');
  assert.equal(searchHit(keys, 'can').field, 'description');
});

test('search fields never mix words and exact matches outrank partial matches', () => {
  const keys = { name: 'Victor Frankenstein', aliases: ['The student'], description: 'A curious scholar.' };
  assert.equal(searchHit(keys, 'vic stu'), null);
  assert.equal(searchHit(keys, 'cur').field, 'description');
  assert.equal(searchHit(keys, 'cu'), null);
  const rows = [{ keys: { ...keys, name: 'Victor Frankenstein' } }, { keys: { ...keys, name: 'Victor' } }];
  assert.equal(searchRows(rows, 'victor')[0].keys.name, 'Victor');
  const aliases = [{ keys: { ...keys, name: 'Robert', aliases: ['Victor Frankenstein', 'Victor'] } }, { keys: { ...keys, name: 'Victor Frankenstein', aliases: ['Victor'] } }, { keys: { ...keys, name: 'Victor Frankenstein', aliases: [] } }];
  const ranked = searchRows(aliases, 'victor');
  assert.deepEqual(ranked.map(row => row.hit.priority), [1, 1, 2]);
  assert.equal(ranked[0].hit.alias, 'Victor Frankenstein');
  assert.equal(highlightParts('<script>Victor</script>', 'vic').map(part => part.text).join(''), '<script>Victor</script>');
});
