import { readFile, writeFile } from 'node:fs/promises';
import { loadCatalog } from '../../src/enrichreader.com/lib/web-guide/catalog.mjs';
import { guideSitemapPaths, guideSitemapXML } from '../../src/enrichreader.com/lib/web-guide/sitemap.mjs';
const file = process.argv[2] ?? 'public/enrichreader.com/sitemap.xml';
const site = JSON.parse(await readFile(new URL('../../src/enrichreader.com/data/web-guide/site-config.json', import.meta.url), 'utf8'));
site.whatsapp_number = process.env.WEB_GUIDE_WHATSAPP ?? site.whatsapp_number;
const paths = guideSitemapPaths(await loadCatalog(), site);
const sitemap = await readFile(file, 'utf8');
if (!sitemap.includes('</urlset>')) throw new Error('Expected Hugo URL sitemap');
// Repeated builds replace our entries while retaining Hugo's other site pages.
const base = sitemap.replace(/<url\b[^>]*>\s*<loc>https:\/\/enrichreader\.com\/(?:guia(?:\/[^<]*)?|autores\/?)[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
await writeFile(file, base.replace('</urlset>', `${guideSitemapXML(paths)}</urlset>`));
console.log(`Added ${paths.length} indexable web-guide URLs to the primary sitemap.`);
