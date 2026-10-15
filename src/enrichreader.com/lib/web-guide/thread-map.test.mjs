import test from 'node:test';
import assert from 'node:assert/strict';
import { validateThreadMap } from './thread-map.mjs';

test('mystery URLs can retire or append but cannot transfer to another question', () => {
  const previous = { first: 1, retired: 2 };
  assert.doesNotThrow(() => validateThreadMap([{ id: 'first', slug: '1' }, { id: 'new', slug: '3' }], { ...previous, new: 3 }, previous));
  for (const mapping of [{ first: 2, retired: 1 }, { first: 1 }, { first: 1, replacement: 2 }]) assert.throws(() => validateThreadMap([], mapping, previous));
  assert.throws(() => validateThreadMap([{ id: 'first', slug: '2' }], previous));
  assert.throws(() => validateThreadMap([], { first: 1, other: 1 }));
});
