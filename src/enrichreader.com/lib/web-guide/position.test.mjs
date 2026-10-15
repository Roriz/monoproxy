import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePosition, resolveCut, pickerMap, commitURL, internalURL, shareURL, authorURL, storyItems, completedIndex, positionAfter } from './position.mjs';

// Synthetic data only: this fixture is not a confirmed map for a real book.
const item = (ordinal, cut_before, extras = {}) => ({
  ordinal, cut_before, label: `Cap. ${ordinal}`, kind: 'chapter',
  number: ordinal, part: null, gender: 'm', spine: [`private-${ordinal}`],
  title: 'Do not publish', ...extras,
});
const map = {
  series: 'test-series',
  books: [
    { l: 1, status: 'complete', end_cut: 'end-book-1', items: [
      item(1, 'zero', { kind: 'prologue', number: null, label: 'Prólogo' }),
      item(2, 'after-prologue', { number: 1, label: 'Cap. 1' }),
      item(3, 'after-chapter-1', { retired: true }),
      item(4, 'after-chapter-1'),
    ] },
    { l: 2, status: 'ongoing', items: [item(1, 'end-book-1'), item(2, 'after-book-2-chapter-1')] },
    { l: 3, status: 'announced', release: '2027-03', items: [item(1, 'private')] },
  ],
};

test('clean links stay clean, independent of campaign parameters', () => {
  assert.deepEqual(resolvePosition(map, '?utm_source=share'), { state: 'clean' });
});

test('positions use ordinals and exclude the item currently being read', () => {
  assert.deepEqual(resolvePosition(map, '?l=1&c=2'), {
    state: 'positioned', position: { l: 1, c: '2' },
  });
  assert.equal(resolveCut(map, { l: 1, c: '1' }), 'zero');
  assert.equal(resolveCut(map, { l: 1, c: '2' }), 'after-prologue');
});

test('finished book and next book first stop resolve to the same cut', () => {
  assert.equal(resolveCut(map, { l: 1, c: 'fim' }), resolveCut(map, { l: 2, c: '1' }));
});

test('retired ordinals preserve their recorded boundary', () => {
  assert.equal(resolvePosition(map, '?l=1&c=3').state, 'positioned');
  assert.equal(resolveCut(map, { l: 1, c: '3' }), 'after-chapter-1');
});

test('invalid inputs never clamp, including ambiguous or duplicate parameters', () => {
  for (const query of [
    '?l=1', '?c=1', '?l=0&c=1', '?l=4&c=1', '?l=1&c=0', '?l=1&c=5',
    '?l=1&c=-1', '?l=1&c=1.5', '?l=1&c=01', '?l=1&c=NaN', '?l=2&c=fim',
    '?l=1&l=2&c=1', '?l=1&c=1&c=2', '?l=&c=1', '?l=1&c=',
  ]) assert.equal(resolvePosition(map, query).state, 'invalid', query);
  assert.deepEqual(resolvePosition(map, '?l=3&c=1'), { state: 'notbuilt', l: 3 });
});

test('omitted book is allowed only with one built book', () => {
  const single = { ...map, books: [map.books[0], map.books[2]] };
  assert.deepEqual(resolvePosition(single, '?c=2').position, { l: 1, c: '2' });
});

test('missing cut data fails closed instead of choosing another boundary', () => {
  const broken = { books: [{ l: 1, status: 'complete', items: [item(1, undefined)] }] };
  assert.throws(() => resolveCut(broken, { l: 1, c: '1' }), /Missing confirmed/);
  assert.throws(() => resolveCut(broken, { l: 1, c: 'fim' }), /Missing confirmed/);
  assert.throws(() => resolveCut(map, { l: 2, c: 'fim' }), /Invalid/);
});

test('picker projection strips build-only data and retired stops', () => {
  const projected = pickerMap(map);
  assert.deepEqual(projected.books[0].items.map(item => item.ordinal), [1, 2, 4]);
  assert.deepEqual(projected.books[2], { l: 3, status: 'announced', release: '2027-03' });
  for (const stop of projected.books[0].items) {
    assert.deepEqual(Object.keys(stop), ['ordinal', 'label', 'kind', 'number', 'part', 'gender']);
  }
  assert.doesNotMatch(JSON.stringify(projected), /private|Do not publish|cut_before|end_cut/);
});

test('commits preserve campaigns; navigation and shares strip incoming parameters', () => {
  const path = '/guia/test-series/mundo?utm_campaign=dm&l=1&c=4&other=value#old';
  const position = { l: 2, c: '1' };
  const committed = commitURL(`https://enrichreader.com${path}`, position);
  assert.equal(committed.searchParams.get('utm_campaign'), 'dm');
  assert.equal(committed.searchParams.get('other'), 'value');
  assert.equal(committed.searchParams.get('l'), '2');
  assert.equal(internalURL(path, position).href, 'https://enrichreader.com/guia/test-series/mundo?l=2&c=1');
  assert.equal(shareURL(path).href, 'https://enrichreader.com/guia/test-series/mundo?utm_source=share');
  assert.equal(shareURL(path, position).href, 'https://enrichreader.com/guia/test-series/mundo?l=2&c=1&utm_source=share');
  assert.throws(() => shareURL('https://example.com/guia/test'), /Expected a guide path/);
});

test('author links add guide attribution while preserving existing queries and fragments', () => {
  const tagged = authorURL({ kind: 'site', url: 'https://example.com/book?edition=1831#read' }, 'frankenstein');
  assert.equal(tagged.searchParams.get('edition'), '1831');
  assert.equal(tagged.searchParams.get('utm_campaign'), 'frankenstein');
  assert.equal(tagged.searchParams.get('utm_medium'), 'guia');
  assert.equal(tagged.hash, '#read');
  for (const link of [
    { kind: 'social', url: 'https://example.com/profile' },
    { kind: 'store', url: 'https://example.com/book?utm_source=author' },
    { kind: 'launch', url: 'https://example.com/book', utm: false },
  ]) assert.equal(authorURL(link, 'frankenstein').href, link.url);
  assert.throws(() => authorURL({ kind: 'site', url: 'javascript:alert(1)' }, 'frankenstein'), /Expected an HTTP/);
});

test('multi-book serial sources keep URL ordinals and equivalent end boundaries distinct', () => {
  const map = { books: [
    { l: 1, status: 'complete', items: [{ ordinal: 1 }, { ordinal: 2, retired: true }], end_cut: 'end-one' },
    { l: 2, status: 'ongoing', items: [{ ordinal: 1 }, { ordinal: 2 }] },
    { l: 3, status: 'announced' },
  ] };
  assert.deepEqual(storyItems(map).map(({ l, ordinal, bookOrdinal }) => [l, ordinal, bookOrdinal]), [[1, 1, 1], [1, 2, 2], [2, 3, 1], [2, 4, 2]]);
  assert.equal(completedIndex(map, { l: 1, c: 'fim' }), completedIndex(map, { l: 2, c: '1' }));
  assert.equal(completedIndex(map, { l: 2, c: '2' }), 3);
  assert.deepEqual(positionAfter(map, 3), { l: 2, c: '2' });
  assert.deepEqual(positionAfter(map, 2), { l: 1, c: 'fim' });
  assert.throws(() => positionAfter(map, 4), /Ongoing/);
});
