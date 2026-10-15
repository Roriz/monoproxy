import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap } from './map-validation.mjs';
const base = { series: 'example', books: [{ l: 1, status: 'ongoing', items: [{ ordinal: 1, label: 'Prólogo', gender: 'm', cut_before: 'zero' }, { ordinal: 2, label: 'Cap. 1', gender: 'm', cut_before: 'one' }] }] };
test('map permanence allows relabels, retirement and append but rejects reused or moved cuts', () => {
  const relabel = structuredClone(base); relabel.books[0].items[1].label = 'Seção 1';
  assert.doesNotThrow(() => validateMap(relabel, base));
  relabel.books[0].items[1].retired = true;
  assert.doesNotThrow(() => validateMap(relabel, base));
  const append = structuredClone(base); append.books[0].items.push({ ordinal: 3, label: 'Cap. 2', gender: 'm', cut_before: 'two' });
  assert.doesNotThrow(() => validateMap(append, base));
  for (const mutate of [map => map.books[0].items.pop(), map => map.books[0].items.reverse(), map => { map.books[0].items[1].cut_before = 'later'; }]) {
    const bad = structuredClone(base); mutate(bad); assert.throws(() => validateMap(bad, base));
  }
  assert.throws(() => validateMap(base, relabel), /retired/);
  const complete = structuredClone(base); complete.books[0].status = 'complete'; complete.books[0].end_cut = 'fixed';
  const grown = structuredClone(complete); grown.books[0].end_cut = 'more';
  assert.throws(() => validateMap(grown, complete), /completed/);
});
