import { guideSitemapPaths } from './sitemap.mjs';

const eligiblePath = /^\/(?:autores|guia(?:\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/(?:mundo|(?:pessoa|lugar|organizacao|objeto|outro)\/[a-z0-9]+(?:-[a-z0-9]+)*))?)?)$/;
export function indexNowURLs(guides, site, previous = []) {
  const current = guideSitemapPaths(guides, site);
  if (!Array.isArray(previous) || previous.some(path => typeof path !== 'string' || !eligiblePath.test(path))) throw new Error('Invalid previous public URL manifest');
  return { current, urls: [...new Set([...current, ...previous])].map(path => `https://enrichreader.com${path}`) };
}
export function indexNowKey(value) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(value ?? '')) throw new Error('INDEXNOW_KEY must contain 8–128 letters, digits or hyphens');
  return value;
}
export async function submitIndexNow(key, urls, transport = fetch) {
  indexNowKey(key);
  if (urls.some(value => { const url = new URL(value); return url.origin !== 'https://enrichreader.com' || url.search || url.hash || !eligiblePath.test(url.pathname); })) throw new Error('IndexNow accepts eligible clean public URLs only');
  for (let start = 0; start < urls.length; start += 10000) {
    const response = await transport('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: 'enrichreader.com', key, urlList: urls.slice(start, start + 10000) }), signal: AbortSignal.timeout(15000) });
    if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned ${response.status}; retain previous manifest for retry`);
  }
}
