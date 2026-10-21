import { once } from 'node:events';
import { access, readFile } from 'node:fs/promises';
import { createGuideServer } from '../../src/enrichreader.com/lib/web-guide/server.mjs';
import { loadCatalog } from '../../src/enrichreader.com/lib/web-guide/catalog.mjs';

// Exercise the packaged server, rather than only validating its catalog data.
const guides = await loadCatalog();
const siteAssets = JSON.parse(await readFile(new URL('../../src/enrichreader.com/data/web-guide/site-assets.json', import.meta.url)));
for (const asset of [...Object.values(siteAssets), ...guides.flatMap(guide => Object.values(guide.presentation.assets ?? {}))]) {
  await access(new URL(`../../src/enrichreader.com/static${asset.path}`, import.meta.url));
}
const server = createGuideServer({ guides });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/web-guide/health`);
  if (!response.ok) throw new Error(`Packaged runtime health returned ${response.status}`);
  console.log('Packaged web-guide runtime passed its health check.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
