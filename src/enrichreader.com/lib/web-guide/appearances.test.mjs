import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceSegments, appearanceMarks } from './appearances.mjs';
test('dense multi-book appearances compress included runs and omit all future positions', () => {
  const guide = { books: [1, 2].map(l => ({ l, status: 'complete', items: Array.from({ length: 1000 }, (_, index) => ({ ordinal: index + 1 })) })) };
  const present = Array.from({ length: 2000 }, (_, index) => index + 1);
  const segments = appearanceSegments(guide, present, 1200);
  assert.deepEqual(segments.map(segment => segment.runs), [[[1, 1000]], [[1001, 1200]]]);
  assert.equal(segments[1].end, 1200);
  assert.equal((appearanceMarks(segments).match(/<rect/g) ?? []).length, 2);
  assert.doesNotMatch(appearanceMarks(segments), /<circle/);
  const early = appearanceSegments(guide, [1, 1200], 2);
  assert.equal(early.length, 1); assert.deepEqual(early[0].runs, [[1, 1]]);
});
