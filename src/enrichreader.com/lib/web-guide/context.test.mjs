import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cutEntities } from './content.mjs';
import { castAt, cutStory, presenceAt, threadsFor } from './context.mjs';
import { searchHit } from './search.mjs';
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
const pos = c => ({ l: 1, c: String(c) });
test('every story projection excludes future scenes, thread answers, closures and curve points', () => {
  for (const c of [...Array.from({ length: 28 }, (_, index) => index + 1), 'fim']) {
    const last = c === 'fim' ? 28 : c - 1;
    const view = cutStory(guide, pos(c));
    assert.ok(view.scenes.every(scene => scene.ordinal <= last));
    assert.ok(view.threads.every(thread => thread.raised <= last && (!thread.closed || thread.closed.ordinal <= last) && (!thread.answer || thread.answer.ordinal <= last)));
    assert.ok(view.curve.every(point => point.ordinal <= last));
    assert.doesNotMatch(JSON.stringify(view), /"twist"|"entities"|"revivals"|"total_mentions"/);
  }
  assert.equal(cutStory(guide, pos(10)).threads.find(thread => thread.slug === '15').closed, null);
  assert.match(cutStory(guide, pos(11)).threads.find(thread => thread.slug === '15').closed.answer, /family/);
});
test('cast and presence use only current chapter attribution; hidden entities and fields leave no traces', () => {
  const at = pos(2); const entities = cutEntities(guide, at);
  const cast = castAt(guide, entities, at);
  assert.ok(cast.some(entity => entity.slug === 'r-walton'));
  assert.ok(cast.every(entity => entity.classification === 'person'));
  assert.deepEqual(presenceAt(guide, cast.find(entity => entity.slug === 'r-walton'), at), [1]);
  const hidden = { ...guide, presentation: { hidden_entities: ['r-walton'], hidden_fields: { margaret: ['aliases'] } } };
  assert.ok(!cutEntities(hidden, pos('fim')).some(entity => entity.slug === 'r-walton'));
  const walton = cutEntities(guide, pos(5)).find(entity => entity.slug === 'r-walton');
  assert.ok(threadsFor(guide, walton, pos(5)).some(thread => thread.slug === '2'));
});
test('search normalizes accents and matches all words within one visible field', () => {
  const keys = { name: 'Verônica Torres', aliases: ['Vera'], description: 'A police officer in São Paulo.' };
  assert.equal(searchHit(keys, 'veronica tor').field, 'name');
  assert.equal(searchHit(keys, 'vera').field, 'alias');
  assert.equal(searchHit(keys, 'pol off').field, 'description');
  assert.equal(searchHit(keys, 'po'), null);
  assert.equal(searchHit(keys, 'vera police'), null);
  assert.equal(searchHit(keys, 'orres'), null);
});

test('revived threads fold past closure events into the rail without exposing future closure or revival metadata', () => {
  const value = structuredClone(guide);
  value.context.story.threads = [{ id: 'fixture', slug: '99', kind: 'mystery', question: 'A fixture question?', raised: 1,
    importance: [{ ordinal: 1, value: 3 }], answers: [{ ordinal: 2, scene: 1, text: 'Early possibility.' }, { ordinal: 6, scene: 1, text: 'Reopened possibility.' }],
    closures: [{ ordinal: 3, scene: 1, answer: 'First closing answer.' }], closed: { ordinal: 8, scene: 1, answer: 'Future final answer.', twist: true },
    revivals: [{ ordinal: 5, scene: 1 }], status: 'closed' }];
  assert.equal(cutStory(value, pos(4)).threads[0].closed.answer, 'First closing answer.');
  const reopened = cutStory(value, pos(6)).threads[0];
  assert.equal(reopened.closed, null); assert.equal(reopened.latest, 5);
  assert.ok(reopened.entries.some(entry => entry.text === 'First closing answer.'));
  assert.doesNotMatch(JSON.stringify(reopened), /Future final answer|revivals|status|twist/);
  assert.equal(cutStory(value, pos(7)).threads[0].answer.text, 'Reopened possibility.');
  assert.equal(cutStory(value, pos(9)).threads[0].closed.answer, 'Future final answer.');
});
