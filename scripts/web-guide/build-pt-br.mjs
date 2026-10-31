// After Hugo: write the Brazilian Portuguese copy (/pt-br/<path>/index.html) of every built page that
// declares an hreflang="pt-BR" alternate (site.Params.ptBRPages). See src/enrichreader.com/lib/pt-br-pages.mjs.
// Usage: node scripts/web-guide/build-pt-br.mjs [public directory, default public/enrichreader.com]
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createTranslator, localizePage, pageDictionaries, portugueseAlternate, prefix } from '../../src/enrichreader.com/lib/pt-br-pages.mjs';

const root = resolve(process.argv[2] ?? 'public/enrichreader.com');
const runtime = await readFile(new URL('../../src/enrichreader.com/static/i18n.js', import.meta.url), 'utf8');
const output = join(root, prefix.slice(1));

async function* pages(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && path !== output) yield* pages(path);
    else if (entry.isFile() && entry.name === 'index.html') yield path;
  }
}

const found = [];
for await (const file of pages(root)) {
  const html = await readFile(file, 'utf8');
  const portugueseURL = portugueseAlternate(html);
  if (!portugueseURL) continue;
  const path = `/${relative(root, dirname(file)).split(sep).filter(Boolean).map(part => `${part}/`).join('')}`;
  const englishURL = new URL(path, portugueseURL).href;
  if (new URL(portugueseURL).pathname !== `${prefix}${path}`) throw new Error(`${file}: expected the Portuguese alternate at ${prefix}${path}, found ${portugueseURL}`);
  found.push({ file, html, path, englishURL, portugueseURL });
}
found.sort((a, b) => a.path.localeCompare(b.path));
if (!found.length) throw new Error(`No page in ${root} declares a pt-BR alternate`);

// Stale copies of pages that lost their alternate must not stay published.
await rm(output, { recursive: true, force: true });
const localized = new Map(found.map(page => [page.path, `${prefix}${page.path}`]));
for (const { html, path, englishURL, portugueseURL } of found) {
  const translate = createTranslator(runtime, pageDictionaries(html));
  const target = join(output, ...path.split('/').filter(Boolean), 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, localizePage(html, { englishURL, portugueseURL, localized, translate }));
}
console.log(`Wrote ${found.length} Brazilian Portuguese pages under ${prefix}/: ${[...localized.values()].join(' ')}`);
