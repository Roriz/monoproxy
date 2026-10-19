import test from 'node:test';
import assert from 'node:assert/strict';
import { indexNowURLs, submitIndexNow, landingPaths } from './indexnow.mjs';
test('IndexNow includes prior public removals, excludes positioned/private URLs and retains failures', async () => {
  const guide = { series: 'public-book', title: 'Book', state: 'public', ownership: 'public-domain', presentation: {} };
  const plan = indexNowURLs([guide, { ...guide, series: 'private-book', state: 'private' }], {}, ['/guia/removed-book', '/guia']);
  assert.deepEqual(plan.current, [...landingPaths, '/guia/public-book']);
  assert.deepEqual(plan.urls, [...landingPaths.map(path => `https://enrichreader.com${path}`), 'https://enrichreader.com/guia/public-book', 'https://enrichreader.com/guia/removed-book', 'https://enrichreader.com/guia']);
  assert.throws(() => indexNowURLs([], {}, ['/guia/private-book?k=secret']));
  let payload;
  await submitIndexNow('test-key-123', plan.urls, async (url, options) => { payload = JSON.parse(options.body); return { status: 202 }; });
  assert.deepEqual(payload.urlList, plan.urls);
  await assert.rejects(submitIndexNow('test-key-123', plan.urls, async () => ({ status: 429 })), /retain/);
  await assert.rejects(submitIndexNow('test-key-123', ['https://enrichreader.com/guia/public-book?l=1&c=2'], async () => assert.fail('must not send')));
});

test('IndexNow accepts public landing pages and rejects unknown or parameterized routes', async () => {
  const sent = [];
  const transport = async (url, options) => { sent.push(JSON.parse(options.body)); return { status: 200 }; };
  await submitIndexNow('test-key-123', landingPaths.map(path => `https://enrichreader.com${path}`), transport);
  assert.equal(sent[0].urlList.length, landingPaths.length);
  for (const path of ['/admin/', '/story-companion/?k=secret', '/app/#private', '/guia/frankenstein?c=2']) {
    await assert.rejects(submitIndexNow('test-key-123', [`https://enrichreader.com${path}`], async () => assert.fail('must not send')));
  }
});
