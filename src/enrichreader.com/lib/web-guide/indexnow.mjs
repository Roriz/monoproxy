import { guideSitemapPaths } from './sitemap.mjs';

// Explicit public marketing routes; private app and positioned guide URLs stay excluded.
export const landingPaths = [
  '/', '/app/', '/how-it-works/', '/reading-guides/', '/story-companion/', '/litrpg-companion/', '/spoiler-free-wiki-alternative/',
];
const eligiblePath = /^\/(?:autores|guia(?:\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/(?:mundo|(?:pessoa|lugar|organizacao|objeto|outro)\/[a-z0-9]+(?:-[a-z0-9]+)*))?)?)$/;
// Previously indexed reports remain eligible only for removal notifications.
const retiredPaths = ['/reports/',
  '/lotm/', '/coi/', '/dcc/', '/orv/', '/the_wandering_inn/', '/ri/', '/tbate/',
  '/mother_of_learning/', '/he_who_fights_with_monsters/', '/defiance_of_the_fall/', '/trash_of_the_count_family/',
];
const isEligiblePath = path => landingPaths.includes(path) || retiredPaths.includes(path) || eligiblePath.test(path);
export function indexNowURLs(guides, site, previous = []) {
  const current = [...landingPaths, ...guideSitemapPaths(guides, site)];
  if (!Array.isArray(previous) || previous.some(path => typeof path !== 'string' || !isEligiblePath(path))) throw new Error('Invalid previous public URL manifest');
  return { current, urls: [...new Set([...current, ...previous])].map(path => `https://enrichreader.com${path}`) };
}
export function indexNowKey(value) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(value ?? '')) throw new Error('INDEXNOW_KEY must contain 8–128 letters, digits or hyphens');
  return value;
}
export async function submitIndexNow(key, urls, transport = fetch) {
  indexNowKey(key);
  if (urls.some(value => { const url = new URL(value); return url.origin !== 'https://enrichreader.com' || url.search || url.hash || !isEligiblePath(url.pathname); })) throw new Error('IndexNow accepts eligible clean public URLs only');
  for (let start = 0; start < urls.length; start += 10000) {
    const response = await transport('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: 'enrichreader.com', key, urlList: urls.slice(start, start + 10000) }), signal: AbortSignal.timeout(15000) });
    if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned ${response.status}; retain previous manifest for retry`);
  }
}
