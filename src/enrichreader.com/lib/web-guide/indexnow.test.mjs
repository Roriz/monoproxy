import test from 'node:test';
import assert from 'node:assert/strict';
import { indexNowURLs, submitIndexNow } from './indexnow.mjs';
test('IndexNow includes prior public removals, excludes positioned/private URLs and retains failures', async () => {
  const guide = { series: 'public-book', title: 'Book', state: 'public', ownership: 'public-domain', presentation: {} };
  const plan = indexNowURLs([guide, { ...guide, series: 'private-book', state: 'private' }], {}, ['/guia/removed-book', '/guia']);
  assert.deepEqual(plan.current, ['/guia/public-book']);
  assert.deepEqual(plan.urls, ['https://enrichreader.com/guia/public-book', 'https://enrichreader.com/guia/removed-book', 'https://enrichreader.com/guia']);
  assert.throws(() => indexNowURLs([], {}, ['/guia/private-book?k=secret']));
  let payload;
  await submitIndexNow('test-key-123', plan.urls, async (url, options) => { payload = JSON.parse(options.body); return { status: 202 }; });
  assert.deepEqual(payload.urlList, plan.urls);
  await assert.rejects(submitIndexNow('test-key-123', plan.urls, async () => ({ status: 429 })), /retain/);
  await assert.rejects(submitIndexNow('test-key-123', ['https://enrichreader.com/guia/public-book?l=1&c=2'], async () => assert.fail('must not send')));
});
