import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { loadCatalog } from '../../src/enrichreader.com/lib/web-guide/catalog.mjs';
import { indexNowKey, indexNowURLs, submitIndexNow } from '../../src/enrichreader.com/lib/web-guide/indexnow.mjs';

const mode = process.argv[2] ?? 'plan';
if (!['plan', 'key', 'submit'].includes(mode)) throw new Error('Usage: indexnow.mjs [plan|key|submit]');
if (mode === 'key') {
  if (!process.env.INDEXNOW_KEY) { console.log('IndexNow key unconfigured; no key file generated.'); }
  else {
    const key = indexNowKey(process.env.INDEXNOW_KEY);
    await writeFile(new URL(`../../src/enrichreader.com/static/${key}.txt`, import.meta.url), key + '\n');
    console.log('Prepared the root ownership key file for the site build.');
  }
} else {
  const file = process.env.WEB_GUIDE_INDEXNOW_STATE ?? join(homedir(), '.local/state/enrichreader/indexnow.json');
  let previous = [];
  try { previous = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const site = JSON.parse(await readFile(new URL('../../src/enrichreader.com/data/web-guide/site-config.json', import.meta.url), 'utf8'));
  site.whatsapp_number = process.env.WEB_GUIDE_WHATSAPP ?? site.whatsapp_number;
  const plan = indexNowURLs(await loadCatalog(), site, previous);
  if (mode === 'plan') console.log(JSON.stringify(plan, null, 2));
  else {
    const key = indexNowKey(process.env.INDEXNOW_KEY);
    const proof = await fetch(`https://enrichreader.com/${key}.txt`, { signal: AbortSignal.timeout(10000) });
    if (!proof.ok || (await proof.text()).trim() !== key) throw new Error('Published ownership key file does not match; no URLs submitted');
    await submitIndexNow(key, plan.urls);
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(plan.current) + '\n', { mode: 0o600 });
    await rename(temporary, file);
    console.log(`IndexNow accepted ${plan.urls.length} public URL notifications. This does not guarantee indexing.`);
  }
}
