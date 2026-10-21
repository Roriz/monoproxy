import { escape, guideURL } from './content.mjs';
import { tokenHash, aiCrawler } from './access.mjs';
import { resolvePosition } from './position.mjs';
import { guideLook } from './look.mjs';
import { approvalLine, isPublished } from './states.mjs';
import { page, styles } from './page.mjs';
export const credibilityLine = 'Testado com leitores de webnovels em inglês: mais de 200 mil visualizações em 15 posts no Reddit, 4 deles entre os mais votados do dia.';
const emailOK = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function showcaseURL(showcase, guide, surface) {
  const url = new URL(guideURL(guide));
  url.searchParams.set('utm_source', showcase.publisher.slug); url.searchParams.set('utm_medium', 'vitrine');
  url.searchParams.set('utm_content', surface); url.searchParams.set('utm_campaign', guide.series); return url;
}
export function validateShowcases(showcases, catalog) {
  const hashes = new Set();
  const publishers = new Set();
  for (const entry of showcases) {
    if (!/^[a-f0-9]{64}$/.test(entry.token_hash ?? '') || hashes.has(entry.token_hash)) throw new Error('Invalid or reused showcase token hash');
    hashes.add(entry.token_hash);
    if (!entry.publisher?.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.publisher?.slug ?? '') || !emailOK(entry.email) || !['servicos', 'catalogo'].includes(entry.modelo)) throw new Error('Invalid showcase identity or model');
    if (publishers.has(entry.publisher.slug)) throw new Error('Only one live showcase per publisher');
    publishers.add(entry.publisher.slug);
    if ((entry.revoked_hashes ?? []).some(hash => !/^[a-f0-9]{64}$/.test(hash) || hash === entry.token_hash)) throw new Error('Invalid showcase revocation map');
    if (!(entry.guides?.length || entry.demos?.length)) throw new Error('Empty showcase');
    for (const row of entry.guides ?? []) {
      const guide = catalog.get(row.serie);
      const consent = row.consent;
      if (!guide || guide.ownership !== 'own' || !isPublished(guide) || guide.presentation.publisher?.slug !== entry.publisher.slug || guide.presentation.vitrine !== true || !(guide.presentation.vitrine_editoras ?? []).includes(entry.publisher.slug)) throw new Error('Guide lacks publisher-specific showcase permission');
      if (!consent || !['autor', 'publisher_approval'].includes(consent.type) || !/^\d{4}-\d{2}-\d{2}$/.test(consent.date ?? '') || !Number.isFinite(Date.parse(consent.date)) || new Date(consent.date).toISOString().slice(0, 10) !== consent.date) throw new Error('Missing valid recorded publisher consent');
      if (consent.type === 'publisher_approval' && guide.presentation.approved_by !== 'editora') throw new Error('Publisher did not approve guide');
    }
    for (const row of entry.demos ?? []) {
      const guide = catalog.get(row.serie);
      if (!guide || guide.ownership !== 'third_party' || guide.state !== 'unlisted') throw new Error('Invalid showcase demo');
      if (resolvePosition(guide, new URLSearchParams({ l: 1, c: String(row.demo_start) })).state !== 'positioned') throw new Error('Invalid demo start');
    }
    const first = entry.guides?.length ? catalog.get(entry.guides[0].serie) : catalog.get(entry.demos[0].serie);
    if (entry.guides?.length && !first.presentation.tour) throw new Error('Featured guide needs retained tour');
    if (!entry.qr || entry.qr.target !== showcaseURL(entry, first, 'qr').href || entry.qr.correction !== 'M' || entry.qr.quiet_zone !== 4 || !/^\/web-guide\/assets\/qr-[a-f0-9]{8}\.svg$/.test(entry.qr.path)) throw new Error('Missing verified clean-gate QR');
    const usableVideo = !entry.guides?.length && entry.video_url?.serie === entry.demos?.[0]?.serie;
    if (!entry.guides?.length && !usableVideo && !entry.phone_still) throw new Error('Demo showcase requires a clean-gate still or video');
    if (entry.phone_still) {
      const capture = new URL(entry.phone_still.capture_url);
      const capturedDemo = (entry.demos ?? []).some(row => capture.pathname === `/guia/${row.serie}`);
      if (!/^\/web-guide\/assets\/still-[a-f0-9]{8}\.webp$/.test(entry.phone_still.path ?? '') || entry.phone_still.width !== 540 || entry.phone_still.height !== 960 || entry.phone_still.banner_visible !== true || capture.origin !== 'https://enrichreader.com' || capture.search || capture.hash || !capturedDemo) throw new Error('Invalid clean-gate phone still');
    }
    if (entry.video_url && (!['https:', 'http:'].includes(new URL(entry.video_url.url).protocol) || !/^\/web-guide\/assets\/captions-[a-f0-9]{8}\.vtt$/.test(entry.video_url.captions ?? ''))) throw new Error('Video needs local captions and a valid URL');
  }
  if (showcases.some(entry => (entry.revoked_hashes ?? []).some(hash => hashes.has(hash)))) throw new Error('Revoked showcase token cannot remain live');
}
export function showcaseAccess(showcases, token, userAgent) {
  if (aiCrawler(userAgent)) return { status: 403 };
  if (!/^[a-zA-Z0-9_-]{22,128}$/.test(token ?? '')) return { status: 404 };
  const hash = tokenHash(token);
  if (showcases.some(entry => (entry.revoked_hashes ?? []).includes(hash))) return { status: 410 };
  const showcase = showcases.find(entry => entry.token_hash === hash);
  return showcase ? { status: 200, showcase, token_hash: hash } : { status: 404 };
}
export function fictionalExample(asset) {
  return `<figure class="fictional-example"><img src="${asset.path}" width="${asset.width}" height="${asset.height}" alt="Exemplo de guia aprovado. As Marés de Ondina e Autora Exemplo são fictícios."><figcaption>Exemplo · livro e autora fictícios</figcaption></figure>`;
}
const externalLink = (url, text, attrs = '') => `<a href="${escape(url)}" target="_blank" rel="noopener" ${attrs}>${escape(text)}</a>`;
export function renderShowcase(showcase, catalog, url, assets) {
  const look = guideLook({ scheme: 'noite', hue: 265, title_font: 'playfair' });
  const publisher = escape(showcase.publisher.name);
  const guides = (showcase.guides ?? []).map(row => catalog.get(row.serie));
  const demos = (showcase.demos ?? []).map(row => catalog.get(row.serie));
  const first = guides[0] ?? demos[0];
  const firstIsGuide = !!guides.length;
  const card = guide => `<article class="showcase-card">${guide.presentation.assets?.cover ? `<img src="${guide.presentation.assets.cover.path}" width="96" height="144" alt="Capa de ${escape(guide.title)}">` : ''}<h2>${escape(guide.title)}</h2><p>de ${escape(guide.authors.join(' e '))}</p><p class="small">${escape(approvalLine(guide))}</p>${externalLink(showcaseURL(showcase, guide, 'card').href, 'Abrir o guia ↗', `class="outline" data-showcase-open="guide" data-series="${guide.series}"`)}</article>`;
  const mail = new URL(`mailto:${showcase.email}`); mail.searchParams.set('subject', `15 min sobre o guia sem spoiler · ${showcase.publisher.name}`);
  const cta = `<a class="primary" href="${escape(mail.href)}" data-showcase-cta>Conversar 15 min</a><p class="small">ou responda o e-mail · <a href="${escape(mail.href)}">${escape(showcase.email)}</a></p>`;
  const demo = demos[0];
  const video = showcase.video_url && !firstIsGuide && showcase.video_url.serie === demo.series;
  const heroMedia = firstIsGuide ? `${card(first)}<p class="small consent">Mostrado com a autorização de ${escape(first.authors.join(' e '))}.</p>`
    : video ? `<figure><video controls preload="none" playsinline ${showcase.phone_still ? `poster="${showcase.phone_still.path}"` : ''}><source src="${escape(showcase.video_url.url)}"><track kind="captions" srclang="pt" label="Português" src="${escape(showcase.video_url.captions)}" default></video><figcaption>Vídeo de 1 min com ${escape(demo.title)}, da ${escape(demo.presentation.publisher.name)}. Demonstração não oficial.</figcaption></figure>`
      : `<figure>${externalLink(showcaseURL(showcase, demo, 'still').href, '', 'class="still-link"').replace('</a>', `<img src="${showcase.phone_still.path}" width="270" height="480" alt="Primeira tela da demonstração de ${escape(demo.title)}"></a>`)}<figcaption>${escape(demo.title)}, da ${escape(demo.presentation.publisher.name)} · demonstração não oficial · abrir ↗</figcaption></figure>`;
  const tour = first.presentation.tour;
  const start = firstIsGuide ? Number(tour.start.c) : showcase.demos[0].demo_start;
  const label = first.books[0].items.find(item => item.ordinal === start).label.replace('Cap.', 'cap.');
  const name = firstIsGuide ? first.entities.find(entity => entity.slug === tour.entity)?.versions[0].set.display_name : null;
  const target = firstIsGuide ? 'guide' : 'demo';
  const headTitle = `Como ficaria no catálogo da ${publisher} · Guia sem spoiler`;
  const description = `Um guia sem spoiler para cada série da ${publisher}: o leitor marca o capítulo e só vê o que já leu.`;
  return page({ look, head: `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="strict-origin"><title>${headTitle}</title><meta name="description" content="${description}"><link rel="canonical" href="https://enrichreader.com${escape(url.pathname)}"><meta property="og:title" content="${headTitle}"><meta property="og:description" content="${description}"><meta property="og:url" content="https://enrichreader.com${escape(url.pathname)}"><meta property="og:image" content="https://enrichreader.com${assets.showcase.path}"><meta name="twitter:card" content="summary_large_image">${styles(look.fontQuery)}<script type="module" src="/web-guide/marketing.js"></script>`, attrs: ` class="marketing-page" data-page-type="showcase" data-publisher="${showcase.publisher.slug}"`, body: `<a class="skip" href="#content">Pular para o conteúdo</a><header class="marketing-header"><span>EnrichReader</span><span>Preparado para a ${publisher}</span></header><main id="content"><section class="showcase-hero"><div><p class="kicker">Guia sem spoiler</p><h1>Como ficaria no catálogo da ${publisher}</h1><p class="intro">Um guia para cada série: o leitor marca o capítulo em que está e só vê os personagens, lugares e fatos que já apareceram até ali.</p><p>${showcase.modelo === 'servicos' ? `Algo que a ${publisher} pode oferecer aos autores, para o leitor do livro 1 chegar ao livro 2.` : 'Para quem leu o livro 1 lembrar quem é quem e voltar à série quando sai o próximo.'}</p>${cta}<p class="small credibility">${credibilityLine}</p></div><div>${heroMedia}</div></section>
    ${guides.length > 1 ? `<section><h2>Mais do catálogo da ${publisher}</h2><div class="showcase-grid">${guides.slice(1).map(card).join('')}</div><p class="small">Mostrados com a autorização de cada autor.</p></section>` : ''}
    <section class="try-guide"><div><h2>Experimente como um leitor</h2><p class="desktop-copy">Aponte a câmera do celular para o QR ao lado. É assim que o leitor chega pelo livro impresso: numa primeira tela que não revela nada da história.</p><p class="mobile-copy">Toque para abrir o guia como o leitor abre ao apontar a câmera para o QR do livro.</p><p>O endereço de cada guia é permanente: o QR pode ir para a gráfica.</p><ol><li>Escolha ${escape(label)} e toque ${name ? `em ${escape(name)}` : 'num nome'}.</li><li>Avance alguns capítulos: veja o que aparece.</li><li>Volte: o que você ainda não leu some.</li></ol>${externalLink(showcaseURL(showcase, first, 'botao').href, firstIsGuide ? 'Abrir o guia ↗' : 'Abrir a demonstração ↗', `class="outline" data-showcase-open="${target}" data-series="${first.series}"`)}</div><figure class="printed-mock"><div aria-hidden="true"><h3>Guia sem spoiler deste livro</h3><p>Diga em que capítulo está: o guia só mostra o que você já leu.</p></div><a href="${escape(showcase.qr.target)}" target="_blank" rel="noopener" data-showcase-open="${target}" data-series="${first.series}"><img src="${showcase.qr.path}" width="160" height="160" alt="Abrir a primeira tela do guia de ${escape(first.title)}"></a><figcaption>Página de exemplo. Este QR abre ${firstIsGuide ? 'o guia' : 'a demonstração não oficial'} de ${escape(first.title)}, de ${escape(first.authors.join(' e '))}.</figcaption></figure></section>
    ${!firstIsGuide ? `<section><h2>Como fica um guia aprovado</h2><p>Quando o autor aprova, o guia ganha o selo e vai ao ar com a sinopse e os links dele.</p><ul><li>O autor vê o guia antes de todo mundo e aprova antes de ir ao ar.</li><li>A sinopse, a pré-venda e os links de compra são dele.</li><li>Ele decide se os resumos das cenas aparecem.</li></ul><p>Guias de autores da ${publisher} só aparecem aqui com a autorização de cada um.</p>${fictionalExample(assets.fiction)}</section>` : ''}
    <section><h2>${showcase.modelo === 'servicos' ? `Para os autores da ${publisher}` : `Para a ${publisher} e os seus leitores`}</h2><h3>Vocês escolhem a série</h3><p>Montamos o guia a partir do livro, e ele só vai ao ar depois de aprovado. Cada fato aponta o capítulo de onde saiu: nada é inventado.</p><h3>Entre um volume e o próximo</h3><p>Quem leu o livro 1 há meses relembra quem é quem antes do livro 2, sem levar spoiler.</p><h3>O livro continua onde vocês vendem</h3><p>O guia mostra fichas e fatos curtos, nunca o texto, e leva o leitor de volta à loja.</p></section>
    ${demos.length > (firstIsGuide ? 0 : 1) ? `<section><h2>Outras demonstrações</h2>${demos.slice(firstIsGuide ? 0 : 1).map(guide => `<p>${escape(guide.title)}, de ${escape(guide.authors.join(' e '))} · demonstração não oficial</p>${externalLink(showcaseURL(showcase, guide, 'botao').href, 'Abrir a demonstração ↗', `class="door" data-showcase-open="demo" data-series="${guide.series}"`)}`).join('')}</section>` : ''}
    <section><h2>15 minutos para ver se faz sentido para a ${publisher}</h2>${cta}</section></main><footer><p>Feito por Radamés, do EnrichReader.</p><p>Cada guia só vai ao ar com a aprovação de quem tem os direitos do livro.</p></footer>` });
}
