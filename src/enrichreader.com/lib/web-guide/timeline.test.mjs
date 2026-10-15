import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineView, timelineURL, chapterView } from './views.mjs';
const fixture = (count = 65) => ({ series: 'timeline-fixture', books: [{ l: 1, status: 'complete', end_cut: 'end', items: Array.from({ length: count }, (_, index) => ({ ordinal: index + 1, label: `Cap. ${index + 1}`, gender: 'm' })) }], presentation: {}, entities: [],
  context: { mentions: [], world: [], story: { scenes: Array.from({ length: count }, (_, index) => ({ id: `scene-${index + 1}`, ordinal: index + 1, index: 1, summary: `Source scene ${index + 1}.`, tension: 2, cast: [] })), threads: [], curve: [],
    arcs: [{ id: 'arc.fixture.01', start: 1, end: 40, wn: 'Early working title', name: 'Completed first arc', desc: 'Reviewed first arc summary.', reveal: { wn: [1, 0], name: [40, 0] } },
      { id: 'arc.fixture.02', start: 41, end: 65, wn: 'Second working title', name: 'Hidden final title', desc: 'Hidden ending summary.', reveal: { wn: [41, 0], name: [65, 0] } }] } } });
const view = (guide, c, query = '') => timelineView(guide, [], { l: 1, c: String(c) }, new URL(`https://enrichreader.com/guia/timeline-fixture/tempo?l=1&c=${c}${query}`));

test('open arcs expose only working names and past rows; long-book finished arcs expand explicitly', () => {
  const guide = fixture();
  const early = view(guide, 10);
  assert.match(early, /Early working title/);
  assert.doesNotMatch(early, /Completed first arc|Reviewed first arc summary|Second working title|Hidden final title|Source scene 10/);
  const collapsed = view(guide, 64);
  assert.match(collapsed, /Second working title/); assert.match(collapsed, /Ver os 40 capítulos deste arco/);
  assert.doesNotMatch(collapsed, /Source scene 1\.|Hidden final title|Hidden ending summary|Source scene 64/);
  const expanded = view(guide, 64, '&arco=1.1');
  assert.match(expanded, /Source scene 1\./); assert.match(expanded, /id="arco-1-1"/); assert.match(expanded, /Recolher este arco/);
  assert.doesNotMatch(view(guide, 64, '&arco=1.2'), /Source scene 1\./);
});

test('the finished cut reveals reviewed true arc names and honours summaries off', () => {
  const guide = fixture();
  const finished = view(guide, 'fim', '&arco=1.2');
  assert.match(finished, /Hidden final title/); assert.match(finished, /Hidden ending summary/);
  guide.hideSummaries = true;
  assert.doesNotMatch(view(guide, 'fim', '&arco=1.2'), /Hidden ending summary/);
});

test('long no-layer timelines page only included rows and link to an actual row anchor', () => {
  const guide = fixture(120); guide.context.story.arcs = [];
  const first = view(guide, 'fim');
  assert.match(first, /#item-101/); assert.doesNotMatch(first, /Source scene 101\./);
  const more = view(guide, 'fim', '&n=200');
  assert.match(more, /id="item-101"/); assert.match(more, /Source scene 120\./);
  assert.doesNotMatch(view(guide, 10, '&n=200'), /Source scene 10\.|Source scene 120\./);
});

test('backward commits discard unrevealed view selectors and chapters keep cut-safe arc names', () => {
  const guide = fixture();
  const incoming = new URL('https://enrichreader.com/guia/timeline-fixture/tempo?l=1&c=10&arco=1.1&livro=1&n=200&utm_campaign=launch');
  const normalized = timelineURL(guide, { l: 1, c: '10' }, incoming);
  assert.equal(normalized.searchParams.get('utm_campaign'), 'launch');
  for (const key of ['arco', 'livro', 'n']) assert.equal(normalized.searchParams.has(key), false);
  const chapter = chapterView(guide, 5, [], { l: 1, c: '10' });
  assert.match(chapter, /Early working title/);
  assert.doesNotMatch(chapter, /Completed first arc|Hidden final title/);
  const last = guide.books[0].items.at(-1);
  guide.books.push({ l: 2, status: 'ongoing', items: [{ ordinal: 1, label: 'Cap. 1', gender: 'm' }] });
  const boundary = chapterView(guide, last.ordinal, [], { l: 2, c: '1' });
  assert.match(boundary, /Fim do Livro 1/);
  assert.doesNotMatch(boundary, /data-picker-draft/);
});

test('timeline report snapshots contain only rendered rows, including explicit expansion and paging', async () => {
  const { cardSnapshot } = await import('./snapshots.mjs');
  const guide = fixture();
  const snapshot = query => cardSnapshot(guide, { type: 'tempo' }, [], { l: 1, c: '64' }, 'tempo', null, new URL(`https://enrichreader.com/guia/timeline-fixture/tempo?${query}`));
  assert.doesNotMatch(JSON.stringify(snapshot('')), /Source scene 1\./);
  assert.match(JSON.stringify(snapshot('arco=1.1')), /Source scene 1\./);
  const long = fixture(120); long.context.story.arcs = [];
  const paged = query => cardSnapshot(long, { type: 'tempo' }, [], { l: 1, c: 'fim' }, 'tempo', null, new URL(`https://enrichreader.com/guia/timeline-fixture/tempo?${query}`));
  assert.doesNotMatch(JSON.stringify(paged('')), /Source scene 101\./);
  assert.match(JSON.stringify(paged('n=200')), /Source scene 101\./);
});
