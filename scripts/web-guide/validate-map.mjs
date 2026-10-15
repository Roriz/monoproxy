import { loadCatalog } from '../../src/enrichreader.com/lib/web-guide/catalog.mjs';
const guides = await loadCatalog();
console.log(`Validated permanent chapter and mystery boundaries for ${guides.length} configured guides.`);
