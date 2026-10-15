import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './catalog.mjs';
import { createGuideServer } from './server.mjs';
import { validateGuideConfig } from './config-validation.mjs';

test('retired chapter pages redirect to the attributed live item while old reading cuts stay valid', async () => {
  const guide = structuredClone((await loadCatalog())[0]);
  const retired = guide.books[0].items[1];
  retired.retired = true;
  assert.throws(() => validateGuideConfig(guide), /replacement/);
  retired.replacement_ordinal = 1;
  assert.doesNotThrow(() => validateGuideConfig(guide));
  const server = createGuideServer({ guide });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/guia/frankenstein/tempo/livro-1/cap-2?l=1&c=2&utm_campaign=test`, { redirect: 'manual' });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/guia/frankenstein/tempo/livro-1/cap-1?l=1&c=2&utm_campaign=test');
    const reading = await fetch(`${base}/guia/frankenstein?l=1&c=2`);
    assert.equal(reading.status, 200);
    assert.match(await reading.text(), /data-position-c="2"/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
