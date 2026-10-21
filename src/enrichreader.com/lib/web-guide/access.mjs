import { createHash, timingSafeEqual } from 'node:crypto';
import { isListed } from './states.mjs';
import { page, styles } from './page.mjs';
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const aiCrawler = userAgent => /GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-User|CCBot|Bytespider/i.test(userAgent ?? '');
const matches = (value, hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) && timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(hash, 'hex'));
export function guideAccess(guide, url, userAgent, access = {}) {
  if (guide.state === 'taken_down') return { status: 410 };
  if (!isListed(guide) && aiCrawler(userAgent)) return { status: 403 };
  if (guide.state !== 'private') {
    if (url.searchParams.has('k')) {
      const target = new URL(url); target.searchParams.delete('k'); target.searchParams.delete('resumos');
      if (![...target.searchParams.keys()].some(key => key.startsWith('utm_'))) {
        const author = guide.authors[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        target.searchParams.set('utm_source', author); target.searchParams.set('utm_medium', 'previa'); target.searchParams.set('utm_campaign', guide.series);
      }
      return { status: 301, location: target.pathname + target.search };
    }
    return { status: 200 };
  }
  const values = url.searchParams.getAll('k');
  if (values.length !== 1 || !/^[a-zA-Z0-9_-]{22,128}$/.test(values[0])) return { status: 404 };
  const hash = tokenHash(values[0]);
  if ((access.revoked_hashes ?? []).some(value => matches(hash, value))) return { status: 410 };
  if (!(access.live_hashes ?? []).some(value => matches(hash, value))) return { status: 404 };
  return { status: 200, token: values[0], token_hash: hash };
}

export function accessError(status, shelfCount = 1) {
  if (status === 403) return '';
  const title = status === 410 ? 'Link inativo' : 'Guia não encontrado';
  return page({ head: `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex, nofollow">${styles()}`,
    body: `<main><h1>${title}</h1><p>${status === 410 ? 'Este link não está mais ativo.' : 'Não encontramos este guia.'}</p>${shelfCount ? '<a class="door" href="/guia">Ver guias publicados</a>' : ''}</main>` });
}
