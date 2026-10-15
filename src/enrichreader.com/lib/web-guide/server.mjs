import { renderShelf, renderAuthors, authorsAvailable } from './marketing.mjs';
import { validateShowcases, showcaseAccess, renderShowcase } from './publisher.mjs';
import { loadCatalog, publicGuides } from './catalog.mjs';
import { escape } from './content.mjs';
import { validateGuideConfig } from './config-validation.mjs';
import { guideAccess, accessError } from './access.mjs';
import { ApprovalStore, OperatorInbox, approvalRecord } from './approval.mjs';
import { ApprovalNotifications, resendTransport } from './notifications.mjs';
import http from 'node:http';
import { guideRoute } from './routes.mjs';
import { entityPath } from './context.mjs';
import { guideSitemapPaths, guideSitemapXML } from './sitemap.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import { renderGuide } from './guide.mjs';
import { FileReportStore, ReportLimiter, ReportError, reportRecord, reportJSON } from './reports.mjs';

const site = fileURLToPath(new URL('../../', import.meta.url));
const defaultCatalog = await loadCatalog();
const defaultGuide = defaultCatalog[0];
const siteAssets = JSON.parse(await readFile(resolve(site, 'data/web-guide/site-assets.json'), 'utf8'));
const siteSettings = JSON.parse(await readFile(resolve(site, 'data/web-guide/site-config.json'), 'utf8'));
const runtimeSite = { ...siteSettings, whatsapp_number: process.env.WEB_GUIDE_WHATSAPP ?? siteSettings.whatsapp_number,
  author_app_ready: process.env.WEB_GUIDE_AUTHOR_APP_READY == null ? siteSettings.author_app_ready : process.env.WEB_GUIDE_AUTHOR_APP_READY === '1' };
let defaultShowcases = [];
if (process.env.WEB_GUIDE_SHOWCASE_CONFIG) {
  try { defaultShowcases = JSON.parse(await readFile(process.env.WEB_GUIDE_SHOWCASE_CONFIG, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const assets = new Map([
  ['/web-guide/guide.css', ['static/web-guide/guide.css', 'text/css']],
  ['/web-guide/guide.js', ['static/web-guide/guide.js', 'text/javascript']],
  ['/web-guide/picker.js', ['static/web-guide/picker.js', 'text/javascript']],
  ['/web-guide/marketing.js', ['static/web-guide/marketing.js', 'text/javascript']],
  ['/web-guide/analytics.js', ['static/web-guide/analytics.js', 'text/javascript']],
  ['/web-guide/analytics-privacy.mjs', ['lib/web-guide/analytics-privacy.mjs', 'text/javascript']],
  ['/web-guide/approval.js', ['static/web-guide/approval.js', 'text/javascript']],
  ['/web-guide/reports.js', ['static/web-guide/reports.js', 'text/javascript']],
  ['/web-guide/search.mjs', ['lib/web-guide/search.mjs', 'text/javascript']],
  ['/web-guide/hub.js', ['static/web-guide/hub.js', 'text/javascript']],
  ['/web-guide/position.mjs', ['lib/web-guide/position.mjs', 'text/javascript']],
]);


let runtimeAccess = {};
if (process.env.WEB_GUIDE_ACCESS_CONFIG) {
  try { runtimeAccess = JSON.parse(await readFile(process.env.WEB_GUIDE_ACCESS_CONFIG, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

function clientIP(req, trustProxy) {
  const address = req.socket.remoteAddress;
  const forwarded = req.headers['x-web-guide-client-ip'];
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
  return (loopback || trustProxy) && typeof forwarded === 'string' && isIP(forwarded) ? forwarded : address;
}

function sameOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  if (!req.headers.origin) return true;
  try { const origin = new URL(req.headers.origin); return ['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host; }
  catch { return false; }
}
const operatorHTML = (html, req) => /(?:^|;\s*)er_ops=1(?:;|$)/.test(req.headers.cookie ?? '') ? html.replace('<body', '<body data-operator="1"') : html;

export function createGuideServer({ guide = defaultGuide, guides = [guide], showcases = defaultShowcases, access = runtimeAccess[defaultGuide.series] ?? {}, siteConfig = runtimeSite, approvalNotifications = null, trustProxy = false, approvalStore = new ApprovalStore(resolve(process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports'), 'approvals')), inbox = new OperatorInbox(resolve(process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports'), 'inbox')), reportStore = new FileReportStore(process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports')), limiter = new ReportLimiter() } = {}) {
  for (const value of guides) validateGuideConfig(value);
  const catalog = new Map(guides.map(value => [value.series, value]));
  validateShowcases(showcases, catalog);
  const listed = publicGuides(guides);
  const publicCount = listed.length;
  const sourceGuide = guide;
  const guideAssets = new Map(assets);
  for (const asset of Object.values(siteAssets)) guideAssets.set(asset.path, [`static${asset.path}`, asset.type]);
  for (const entry of showcases) for (const asset of [entry.qr, entry.phone_still].filter(Boolean)) guideAssets.set(asset.path, [`static${asset.path}`, asset.type ?? 'image/webp']);
  for (const entry of showcases) if (entry.video_url) guideAssets.set(entry.video_url.captions, [`static${entry.video_url.captions}`, 'text/vtt']);
  for (const value of guides) for (const asset of Object.values(value.presentation.assets ?? {})) guideAssets.set(asset.path, [`static${asset.path}`, asset.type]);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/web-guide/health' && ['GET', 'HEAD'].includes(req.method)) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : '{"ok":true}'); return; }
      if (url.pathname === '/autores' || url.pathname === '/autores/') {
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
        if (!authorsAvailable(siteConfig)) { res.writeHead(503, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Type': 'text/html; charset=utf-8' }); res.end(req.method === 'HEAD' ? undefined : '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Página indisponível</title></head><body><main><h1>Esta página ainda não está disponível.</h1><a href="/guia">Ver guias publicados</a></main></body></html>'); return; }
        const html = operatorHTML(renderAuthors(guides, siteConfig, siteAssets, url), req);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'strict-origin-when-cross-origin' }); res.end(req.method === 'HEAD' ? undefined : html); return;
      }
      if (url.pathname === '/guia/v' || url.pathname.startsWith('/guia/v/')) {
        const token = url.pathname.match(/^\/guia\/v\/([a-zA-Z0-9_-]+)\/?$/)?.[1];
        const allowed = showcaseAccess(showcases, token, req.headers['user-agent']);
        const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'strict-origin' };
        if (allowed.status !== 200) { res.writeHead(allowed.status, headers); res.end(req.method === 'HEAD' ? undefined : accessError(allowed.status, publicCount)); return; }
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, headers); res.end(); return; }
        const html = operatorHTML(renderShowcase(allowed.showcase, catalog, url, siteAssets), req);
        if (req.method === 'GET') await inbox.opened({ series: `showcase-${allowed.showcase.publisher.slug}`, publisher: allowed.showcase.publisher.slug, title: allowed.showcase.publisher.name }, allowed.token_hash, req, new Date(), true).catch(() => console.error('Operator inbox unavailable'));
        res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : html); return;
      }
      const requestedSeries = url.pathname.match(/^\/guia\/([a-z0-9-]+)(?:\/|$)/)?.[1];
      const guide = catalog.get(requestedSeries) ?? sourceGuide;
      const guidePath = `/guia/${guide.series}`;
      const homePath = guidePath;
      if (requestedSeries && !catalog.has(requestedSeries) && !['sitemap'].includes(requestedSeries) && url.pathname !== '/guia/sitemap.xml') { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(accessError(404, publicCount)); return; }
      let authorization;
      let renderedGuide = { ...guide, site: siteConfig };
      if (url.pathname === homePath || url.pathname.startsWith(`${homePath}/`)) {
        authorization = guideAccess(guide, url, req.headers['user-agent'], guide === sourceGuide ? access : runtimeAccess[guide.series] ?? {});
        if (authorization.status !== 200) {
          const headers = { 'Cache-Control': authorization.status === 301 ? 'max-age=86400' : 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Type': 'text/html; charset=utf-8' };
          if (authorization.location) headers.Location = authorization.location;
          res.writeHead(authorization.status, headers); res.end(req.method === 'HEAD' ? undefined : accessError(authorization.status, publicCount)); return;
        }
        if (guide.state === 'private') renderedGuide = { ...renderedGuide, approval: await approvalStore.get(guide.series), hideSummaries: url.searchParams.get('resumos') === '0' };
      }
      if (url.pathname === `${homePath}/aprovacao`) {
        const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(JSON.stringify(data)); };
        if (req.method !== 'POST') { json(405, { error: 'Method not allowed' }); return; }
        if (guide.state !== 'private' || !authorization?.token) { json(404, { error: 'Not found' }); return; }
        if (!sameOrigin(req)) { json(403, { error: 'Origin not allowed' }); return; }
        if (!limiter.allow(clientIP(req, trustProxy), guide.series)) { json(429, { error: 'Too many requests' }); return; }
        try {
          const input = await reportJSON(req);
          const record = approvalRecord(renderedGuide, input);
          const saved = await approvalStore.create(record);
          await inbox.approval(renderedGuide, saved);
          await approvalNotifications?.enqueue(renderedGuide, saved);
          json(200, { approved: true, divulgar: saved.divulgar, resumos: saved.resumos, outcome: saved.blurb_approved_at_approval ? 'public' : 'unlisted' });
        } catch (error) { json(error.status ?? 503, { error: error instanceof ReportError ? error.message : 'Approval storage unavailable' }); }
        return;
      }
      if (url.pathname === '/_ops/nao-contar') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Set-Cookie': 'er_ops=1; Path=/; SameSite=Lax; Max-Age=31536000; HttpOnly' });
        res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Dispositivo do operador</title></head><body><h1>Este navegador não conta nas visitas.</h1><script>localStorage.setItem("umami.disabled", "1")</script><a href="/guia">Abrir guias</a></body></html>'); return;
      }

      const reportRoute = url.pathname.match(new RegExp(`^/guia/${guide.series}/reports(?:/([0-9a-f-]+))?$`, 'i'));
      if (reportRoute) {
        const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(JSON.stringify(value)); };
        const allowed = reportRoute[1] ? 'PATCH' : 'POST';
        if (req.method !== allowed) { json(405, { error: 'Method not allowed' }); return; }
        if (!sameOrigin(req)) { json(403, { error: 'Origin not allowed' }); return; }
        if (!limiter.allow(clientIP(req, trustProxy), guide.series)) { json(429, { error: 'Too many reports' }); return; }
        try {
          const input = await reportJSON(req);
          if (reportRoute[1]) {
            await reportStore.detail(reportRoute[1], input?.detail);
            json(200, { id: reportRoute[1] });
          } else {
            const record = reportRecord(renderedGuide, input);
            const created = await reportStore.create(record);
            json(created ? 201 : 200, { id: record.id });
          }
        } catch (error) {
          if (!(error instanceof ReportError)) console.error('Report storage failed:', error.message);
          json(error.status || 500, { error: error instanceof ReportError ? error.message : 'Report storage failed' });
        }
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
      }
      const asset = guideAssets.get(url.pathname);
      let html;
      let type = 'text/html; charset=utf-8';
      if (asset) {
        html = await readFile(resolve(site, asset[0])); type = asset[1].startsWith('image/') ? asset[1] : `${asset[1]}; charset=utf-8`;
      } else if (url.pathname === '/guia/sitemap.xml') {
        type = 'application/xml; charset=utf-8';
        html = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${guideSitemapXML(guideSitemapPaths(guides, siteConfig))}</urlset>`;
      } else if (url.pathname === '/guia' || url.pathname === '/guia/') {
        html = renderShelf(guides, siteConfig, siteAssets);
      } else if (url.pathname === guidePath || url.pathname.startsWith(`${guidePath}/`)) {
        const route = guideRoute(guide, url.pathname);
        if (route.redirect) {
          res.writeHead(301, { Location: route.redirect + url.search, 'Cache-Control': 'max-age=86400' }); res.end(); return;
        }
        if (route.legacy) {
          res.writeHead(301, { Location: entityPath(guide, route.entity) + url.search, 'Cache-Control': 'max-age=86400' }); res.end(); return;
        }
        html = renderGuide(renderedGuide, url);
        if (guide.state === 'private' && req.method === 'GET' && route.type === 'home' && !url.searchParams.has('l') && !url.searchParams.has('c')) await inbox.opened(renderedGuide, authorization.token_hash, req).catch(error => console.error('Operator inbox unavailable'));
        if (route.type === 'not_found') res.statusCode = 404;
      } else {
        res.writeHead(404); res.end('Página não encontrada.'); return;
      }
      if (type.startsWith('text/html') && typeof html === 'string') html = operatorHTML(html, req);
      const headers = { 'Content-Type': type, 'Cache-Control': asset?.[1].startsWith('image/') && guide.state !== 'private' ? 'public, max-age=31536000, immutable' : 'no-store', 'X-Content-Type-Options': 'nosniff' };
      if (typeof html === 'string' && html.includes('noindex')) headers['X-Robots-Tag'] = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? 'noindex, nofollow';
      res.writeHead(res.statusCode, headers); res.end(req.method === 'HEAD' ? undefined : html);
    } catch (error) {
      console.error('Guide response failed:', error.message);
      res.writeHead(500, { 'Cache-Control': 'no-store' }); res.end('Não deu para carregar o guia.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.WEB_GUIDE_PORT || 3003);
  const host = process.env.WEB_GUIDE_HOST || '127.0.0.1';
  const directory = process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports');
  const approvalNotifications = new ApprovalNotifications({ directory: resolve(directory, 'notifications'), to: runtimeSite.approval_email,
    from: runtimeSite.approval_email_from, send: resendTransport({ apiKey: process.env.RESEND_API_KEY }) });
  // Repair an interrupted enqueue from the durable approval before starting delivery.
  const approvalStore = new ApprovalStore(resolve(directory, 'approvals'));
  for (const guide of defaultCatalog) {
    if (guide.state !== 'private') continue;
    const approval = await approvalStore.get(guide.series);
    if (approval) await approvalNotifications.enqueue(guide, approval);
  }
  const stopNotifications = approvalNotifications.start();
  const server = createGuideServer({ guides: defaultCatalog, approvalStore, approvalNotifications, trustProxy: process.env.WEB_GUIDE_TRUST_PROXY === '1' });
  server.on('close', stopNotifications);
  server.listen(port, host, () => console.log(`Web guide: http://${host}:${port}/guia/frankenstein`));
}
