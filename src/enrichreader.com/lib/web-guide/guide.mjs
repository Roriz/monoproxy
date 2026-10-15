import { authorsAvailable } from './marketing.mjs';
import { launchLine } from './launch.mjs';
import { officialGuide, approvalLine, thirdPartyBanner, demoDialog, thirdPartyFooter } from './states.mjs';
import { reviewSlot, allLink, summarySwitch, privateFooter, approvalDialog } from './review.mjs';
import { guideRoute } from './routes.mjs';
import { classNames, entityPath, cutStory } from './context.mjs';
import { panelView, profileView, hubView, boardView, timelineView, timelineURL, chapterView, threadView, fichaRows } from './views.mjs';
import { pickerMap, resolvePosition, internalURL, authorURL, storyItems, announcedNotice, itemLabel } from './position.mjs';
import { guideLook } from './look.mjs';

import { guidePath, escape, previewRoles, completedOrdinal, positionHref, cutEntities, positionLabel, source, sourceItem, currentItem } from './content.mjs';
export { guidePath, cutEntities, positionLabel } from './content.mjs';
const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

function picker(guide, path = guidePath, id = 'chapter') {
  const book = guide.books.find(book => book.l === guide.pickerBook) ?? guide.books.find(book => book.status !== 'announced');
  const fallback = guide.books.find(book => book.status !== 'announced');
  const items = (book.items ?? fallback.items).filter(item => !item.retired);
  const announced = book.status === 'announced';
  const bookLink = l => { const target = new URL(guide.pickerURL ?? `https://enrichreader.com${path}`); target.searchParams.set('book', String(l)); return escape(target.pathname + target.search); };
  return `<form class="picker" action="${escape(path)}" method="get" data-picker>
    ${[...new URL(guide.pickerURL ?? `https://enrichreader.com${path}`).searchParams].filter(([key]) => key.startsWith('utm_')).map(([key, value]) => `<input type="hidden" name="${escape(key)}" value="${escape(value)}">`).join('')}<input type="hidden" name="l" value="${book.l}">${guide.linkContext?.k ? `<input type="hidden" name="k" value="${escape(guide.linkContext.k)}">` : ''}${guide.linkContext?.resumos === '0' ? '<input type="hidden" name="resumos" value="0">' : ''}
    ${guide.books.length > 1 ? `<nav class="filter-chips" aria-label="Escolher livro">${guide.books.map(value => `<a href="${bookLink(value.l)}" data-picker-book="${value.l}" ${value.l === book.l ? 'aria-current="true"' : ''}>Livro ${value.l}${value.status === 'announced' ? ' · em breve' : ''}</a>`).join('')}</nav>` : ''}
    <p data-book-notice ${announced ? '' : 'hidden'}>${escape(announcedNotice(book))}</p>
    ${guide.books.filter(value => value.status === 'announced').map(value => `<template data-book-launch-template="${value.l}">${launchLine(guide, 'picker', 'normal', value.l)}</template>`).join('')}<div data-book-launch ${announced ? '' : 'hidden'}>${launchLine(guide, 'picker', 'normal', book.l)}</div>
    <div class="picker-controls" ${announced ? 'hidden' : ''}><label class="sr-only" for="${id}" data-picker-title>Onde você está?</label>
    <div class="stepper"><button type="button" data-step="-1" aria-label="Posição anterior">−</button><div class="readout-control"><select id="${id}" name="c">${items.map(item => `<option value="${item.ordinal}">${escape(itemLabel(item))}</option>`).join('')}${book.status === 'complete' ? '<option value="fim">Terminei este livro</option>' : ''}</select><button type="button" id="${id}-readout" data-readout hidden aria-label="Digitar o número da carta ou capítulo">${escape(items[0].label)}</button><input id="${id}-number" data-number hidden inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Nº" aria-label="Número da carta ou capítulo" aria-describedby="${id}-feedback"></div><button type="button" data-step="1" aria-label="Próxima posição">+</button></div>
    <div id="${id}-feedback" class="number-feedback" data-number-feedback aria-live="polite" hidden></div>
    <div class="number-choices" data-number-choices hidden></div>
    <div data-slider-group><input type="range" min="0" max="${items.length - 1 + Number(book.status === 'complete')}" value="0" step="1" aria-label="Sua posição no livro" data-slider><div class="slider-labels"><span>${escape(items[0].label)}</span><span>${escape(items.at(-1).label)}</span></div></div>
    <button type="button" class="finish-chip" data-finish ${book.status === 'complete' ? '' : 'hidden'} aria-pressed="false">Terminei este livro</button>
    <p class="consequence" data-consequence>Nada aparece ainda: escolha sua posição.</p>
    <span class="sr-only" data-picker-live aria-live="polite"></span></div>
    <button type="submit" class="primary" data-commit ${announced ? 'disabled hidden' : ''}>Estou ${items[0].gender === 'f' ? 'na' : 'no'} ${escape(items[0].label.replace('Cap.', 'cap.'))}</button>
  </form>`;
}

function cards(guide, entities, position) {
  if (!entities.length) return '<div class="empty"><h2>O começo fica com você.</h2><p>Nada por aqui ainda: volte quando terminar a Carta 1.</p></div>';
  return `<label class="search-label" for="search">Encontrar um personagem</label><input type="search" id="search" placeholder="Buscar entre os nomes que já apareceram" autocomplete="off">
    <p class="muted small" data-result-count aria-live="polite">${entities.length} personagens até sua posição.</p>
    <div class="entity-grid">${entities.map(entity => `<a class="entity-card" data-entity-card data-preview="preview-${entity.slug}" href="${positionHref(entityPath(guide, entity), position)}">
      <h3 lang="en">${escape(entity.facts.display_name)}</h3>${source(guide, entity, 'display_name', position, true)}
      ${entity.facts.definition ? `<p lang="en">${escape(entity.facts.definition)}</p>${source(guide, entity, 'definition', position)}` : ''}
      <span class="card-action">Ver personagem <span aria-hidden="true">→</span></span></a>`).join('')}</div>
    <p hidden data-search-empty>Nenhum personagem encontrado nesta posição.</p>`;
}

export function previewDescription(text = '') {
  if (text.length <= 240) return text;
  let result = '';
  for (const { segment } of sentenceSegmenter.segment(text)) {
    if ((result + segment).trim().length > 240) break;
    result += segment;
  }
  return result.trim();
}

function previewSubline(guide, entity) {
  const first = sourceItem(guide, entity.first);
  const classification = classNames[entity.classification] ?? 'Pessoa';
  return `${classification ? `${classification} · desde` : 'Desde'} ${first.gender === 'f' ? 'a' : 'o'} ${guide.books.length > 1 ? `L${first.l} · ` : ''}${first.label.replace('Cap.', 'cap.')}`;
}

function previewTemplate(guide, entity, position) {
  const description = previewDescription(entity.facts.definition);
  const role = previewRoles.get(entity.facts.narrative_role);
  const last = completedOrdinal(guide, position);
  return `<template id="preview-${entity.slug}"><div class="preview-content"><h2 id="preview-name" tabindex="-1" lang="en">${escape(entity.facts.display_name)}</h2>
    ${entity.first === last ? source(guide, entity, 'display_name', position) : ''}
    <p class="preview-subline">${escape(previewSubline(guide, entity))}</p>
    ${role ? `<p class="preview-role">${role} · ${source(guide, entity, 'narrative_role', position, true)}</p>` : ''}
    ${description ? `<p class="preview-description"><span lang="en">${escape(description)}</span> · ${source(guide, entity, 'definition', position)}</p>` : ''}
    </div><a class="preview-page" data-preview-page href="${positionHref(entityPath(guide, entity), position)}">Abrir página</a>${guide.state !== 'private' ? `<button class="report-trigger" data-report data-scope="sheet" data-card="sheet" data-entity="${entity.slug}" data-label="${escape(entity.facts.display_name)}">Algo errado?</button>` : ''}</template>`;
}

export function reportFields(guide, entity, position, scope) {
  const field = (key, value) => { const item = sourceItem(guide, entity.sources[key]); return { key, value, source: `${item.l}:${item.bookOrdinal}` }; };
  const fields = [field('display_name', entity.facts.display_name)];
  if (scope === 'sheet') {
    const first = sourceItem(guide, entity.first);
    fields.push({ key: 'first_appearance', value: previewSubline(guide, entity), source: `${first.l}:${first.bookOrdinal}` });
    const definition = previewDescription(entity.facts.definition);
    if (definition) fields.push(field('definition', definition));
    const role = previewRoles.get(entity.facts.narrative_role);
    if (role) fields.push(field('narrative_role', role));
    return fields;
  }
  if (entity.facts.definition) fields.push(field('definition', entity.facts.definition));
  const role = previewRoles.get(entity.facts.narrative_role);
  if (role) fields.push(field('narrative_role', role));
  for (const row of fichaRows(guide, entity)) fields.push(field(row.key, row.value));
  return fields;
}

function footer(guide, bridge = false) {
  if (guide.ownership === 'third_party') return thirdPartyFooter(guide);
  if (guide.state === 'private') return `<footer>${privateFooter(guide, guide.site ?? {}, guide.approval)}<section class="footer-author"><h2>De ${escape(guide.authors.join(' e '))}</h2>${(guide.presentation.links ?? []).length ? guide.presentation.links.map(link => `<a class="footer-row" href="${escape(authorURL(link, guide.series).href)}" data-author-kind="${link.kind}" target="_blank" rel="noopener">${escape(link.label)} ↗</a>`).join('') : '<div class="invitation"><p>Aqui entram os seus links: onde comprar, Instagram, pré-venda.</p><p class="small">Se quiser, pego da sua bio.</p></div>'}</section><p class="maker">feito com EnrichReader</p></footer>`;
  const presentation = guide.presentation ?? {};
  const appAllowed = presentation.app_published === true && (guide.state === 'public' || (guide.state === 'unlisted' && guide.ownership === 'own'));
  const order = { launch: 0, store: 1, social: 2, site: 3 };
  const links = [...(presentation.links ?? [])].sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 4);
  return `<footer><section class="footer-author"><h2>De ${escape(guide.authors.join(' e '))}</h2>
    ${guide.ownership === 'public-domain' ? '<p class="small">Guia público de uma obra em domínio público.</p>' : approvalLine(guide) ? `<p class="small">${escape(approvalLine(guide))}</p>` : ''}<p class="small">${escape(guide.edition)}</p>
    ${links.map(link => `<a class="footer-row" href="${escape(authorURL(link, guide.series).href)}" data-author-kind="${link.kind}" target="_blank" rel="noopener">${escape(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}</section>
    <section class="footer-trust"><p>Cada fato mostra o capítulo de onde saiu.</p><p class="small">Perfis em inglês · interface em português.</p><button class="report-trigger" data-report data-scope="guia" data-label="este guia">Algo errado? Avise a gente</button></section>
    <section class="footer-share"><button class="footer-row" data-share aria-haspopup="dialog"><span aria-hidden="true">↗</span> Mandar este guia para alguém</button>
    ${appAllowed && !bridge ? `<a class="footer-row" href="https://enrichreader.com/download?utm_source=guia&amp;utm_campaign=${encodeURIComponent(guide.series)}&amp;utm_content=footer">Também no app: o guia ao lado do texto ↗</a>` : ''}
    <p class="maker">feito com ${appAllowed ? '<a href="https://enrichreader.com">EnrichReader</a>' : 'EnrichReader'}${guide.state === 'public' && authorsAvailable(guide.site ?? {}) ? ` · <a class="authors-line" href="/autores?guia=${guide.series}" data-authors-line>Escreve livros? Quer um guia assim?</a>` : ''}</p></section></footer>`;
}

function panel(guide, entities, position) {
  const heading = `<h1 class="sr-only">Painel · ${escape(guide.title)}</h1><h2 tabindex="-1" data-position-heading>Onde você parou</h2>`;
  if (completedOrdinal(guide, position) === 0) return `${heading}<div class="empty"><p>Você está no começo. Ainda não há nada para lembrar, e nada para estragar.</p><p>Quando terminar a Carta 1, aqui aparece o que você já leu.</p><button class="panel-next" type="button" aria-haspopup="dialog" data-picker-draft="2">Já terminei a Carta 1</button></div>`;
  const current = currentItem(guide, position);
  const next = current && storyItems(guide).find(item => item.ordinal === current.ordinal + 1);
  const advance = current && (next?.l === position.l || guide.books.find(book => book.l === position.l).status === 'complete') ? `<button type="button" class="panel-next" aria-haspopup="dialog" data-picker-draft="${next?.l === position.l ? next.bookOrdinal : 'fim'}" data-picker-book-draft="${position.l}">Já terminei ${current.gender === 'f' ? 'a' : 'o'} ${escape(current.label.replace('Cap.', 'cap.'))}</button>` : '';
  return `${heading}<p class="intro">${position.c === 'fim' ? 'O livro inteiro, agora à sua disposição.' : `Tudo o que apareceu antes de ${escape(positionLabel(guide, position))}.`}</p>${advance}<section><h2>Personagens até sua posição</h2>${cards(guide, entities, position)}</section>`;
}

export function renderGuide(guide, url) {
  const guidePath = `/guia/${guide.series}`;
  const bookTitle = escape(guide.title);
  const authorName = escape(guide.authors.join(' e '));
  const context = guide.state === 'private' ? { k: url.searchParams.get('k'), ...(url.searchParams.get('resumos') === '0' ? { resumos: '0' } : {}) } : {};
  guide = { ...guide, linkContext: context, hideSummaries: guide.state === 'private' && url.searchParams.get('resumos') === '0' };

  guide.summaryControl = summarySwitch(guide, url);
  const look = guideLook(guide.look);
  const originalAssets = guide.presentation?.assets;
  const assets = originalAssets && Object.fromEntries(Object.entries(originalAssets).map(([key, asset]) => [key, { ...asset, path: `${asset.path}${context.k ? `?k=${encodeURIComponent(context.k)}` : ''}` }]));
  const resolved = resolvePosition(guide, url.search);
  const position = resolved.state === 'positioned' ? { ...resolved.position, ...context } : null;
  guide.pickerBook = guide.books.some(book => String(book.l) === url.searchParams.get('book')) ? Number(url.searchParams.get('book')) : position?.l ?? (resolved.state === 'notbuilt' ? resolved.l : null) ?? guide.books.find(book => book.status !== 'announced').l;
  guide.pickerURL = url.href;
  const route = guideRoute(guide, url.pathname);
  const thread = position && route.thread && cutStory(guide, position).threads.find(thread => thread.id === route.thread.id);
  const match = route.type === 'entity';
  const entities = position ? cutEntities(guide, position) : [];
  const subject = match && entities.find(entity => entity.slug === route.entity.slug);
  const cleanPath = url.pathname.replace(/\/$/, '');
  const firstName = route.entity?.versions[0].set.display_name;
  const sectionTitles = { mundo: 'Personagens', misterios: 'Mistérios', tempo: 'Linha do tempo' };
  const intro = route.entity && guide.presentation?.entity_intros?.[route.entity.slug];
  const approvedIntro = intro?.approved === true && guide.ownership === 'own' && guide.state !== 'private';
  const introEntries = Object.entries(guide.presentation?.entity_intros ?? {}).filter(([slug, value]) => value.approved === true && !(guide.presentation.hidden_entities ?? []).includes(slug));
  const ordinaryTitle = match ? `${(route.entity.classification ?? 'person') === 'person' ? 'Quem é' : 'O que é'} ${escape(firstName)} em ${bookTitle}? · Guia sem spoiler`
    : route.type === 'misterio' ? `Uma pergunta de ${bookTitle} · Guia sem spoiler`
      : route.type === 'chapter' ? `${escape(route.item.label)} · ${bookTitle} · Guia sem spoiler`
        : sectionTitles[route.type] ? `${sectionTitles[route.type]} de ${bookTitle} · Guia sem spoiler`
          : route.type === 'not_found' ? `Página não encontrada · ${bookTitle}` : `Guia sem spoiler de ${bookTitle}, de ${authorName}`;
  const title = guide.state === 'private' ? `Prévia do guia sem spoiler de ${escape(guide.title)} · para ${escape(guide.authors.join(' e '))}` : ordinaryTitle;
  const description = approvedIntro ? `${officialGuide(guide) ? 'Guia oficial. ' : ''}${escape(intro.text)}` : guide.state === 'private' ? 'Prévia feita a partir do texto do livro, só para você.' : `${guide.ownership === 'third_party' ? `Demonstração não oficial · obra de ${authorName}, ${escape(guide.presentation.publisher.name)}. ` : officialGuide(guide) ? 'Guia oficial. ' : ''}Você diz em que carta ou capítulo está e consulta apenas o que já leu. Guia de ${bookTitle}, de ${authorName}.`;
  const positionedQuery = url.searchParams.has('l') || url.searchParams.has('c');
  const robots = positionedQuery || guide.state !== 'public' || route.type === 'not_found' ? 'noindex, nofollow' : route.type === 'home' || approvedIntro || route.type === 'mundo' && introEntries.length >= 3 ? 'index, follow' : 'noindex, follow';
  const masthead = `<div class="masthead${assets?.cover ? ' masthead-with-cover' : ''}">${assets?.cover ? `<img class="masthead-cover" src="${assets.cover.path}" width="96" height="144" alt="Capa de ${bookTitle}">` : ''}<div><h1 tabindex="-1"><span class="kicker">${officialGuide(guide) ? 'Guia oficial sem spoiler' : 'Guia sem spoiler'}</span><span class="sr-only">: </span><span class="title">${bookTitle}</span></h1><p class="author">de ${authorName}${officialGuide(guide) ? ` · ${escape(approvalLine(guide))}` : ''}</p><p class="edition">${escape(guide.edition)}</p></div></div>`;
  const invalid = resolved.state === 'invalid' || resolved.state === 'notbuilt';
  const cleanTitles = { mundo: 'Personagens &amp; Mundo', misterios: 'Mistérios', misterio: 'Mistério', tempo: 'Linha do tempo', chapter: escape(route.item?.label ?? '') };
  const cleanIntro = match ? `${route.entity.classification === 'location' ? 'O que é' : 'Quem é'} ${escape(firstName)}?`
    : cleanTitles[route.type];
  const cleanHeader = route.type === 'home' ? masthead : `<p class="kicker">${bookTitle}</p><h1 tabindex="-1">${cleanIntro}</h1><p class="intro">${route.type === 'chapter' ? 'Diga onde você está para ver este capítulo, se você já leu:' : route.type === 'misterio' ? 'Diga onde você está para ver esta pergunta, se ela já apareceu:' : 'O guia responde só até sua posição. Diga onde você está:'}</p>`;
  const how = '<section class="how"><h2>Como funciona</h2><ol><li>Você diz em que carta ou capítulo está.</li><li>O guia mostra só os personagens, lugares e fatos que já apareceram até ali.</li><li>Cada fato mostra o capítulo de onde saiu.</li></ol></section>';
  const about = (guide.presentation?.blurb_approved === true || guide.state === 'private') && guide.presentation.blurb ? `<section class="about"><h2>Sobre o livro</h2>${assets?.about ? `<img src="${assets.about.path}" width="72" height="108" alt="Capa de ${bookTitle}">` : ''}${guide.presentation.blurb.split(/\n\n+/).map(text => `<p class="reading">${escape(text)}</p>`).join('')}<p class="small">por ${escape(guide.authors.join(' e '))}</p></section>` : '';
  const introBlock = !position && approvedIntro ? `<section><h2>Apresentação</h2><p class="reading">${escape(intro.text)}</p><p class="small">Apresentação aprovada por ${authorName}</p>${introEntries.length > 1 ? `<p>Também no guia: ${introEntries.filter(([slug]) => slug !== route.entity.slug).map(([slug]) => {
    const entity = [...guide.entities, ...(guide.context?.world ?? [])].find(entity => entity.slug === slug);
    return `<a href="${positionHref(entityPath(guide, entity))}">${escape(entity.versions[0].set.display_name)}</a>`;
  }).join(' · ')}</p>` : ''}</section>` : !position && route.type === 'mundo' && guide.ownership === 'own' && guide.state !== 'private' && introEntries.length ? `<section><h2>Quem você vai conhecer</h2>${introEntries.map(([slug, value]) => {
    const entity = [...guide.entities, ...(guide.context?.world ?? [])].find(entity => entity.slug === slug);
    return `<h3><a href="${positionHref(entityPath(guide, entity))}">${escape(entity.versions[0].set.display_name)}</a></h3><p>${escape(value.text)}</p>`;
  }).join('')}<p class="small">Apresentações aprovadas por ${authorName}</p></section>` : '';
  const body = route.type === 'not_found' ? `<h1 tabindex="-1">Página não encontrada.</h1><a class="door" href="${positionHref(guidePath, position)}">Ir para o Painel</a>`
    : !position ? `${invalid ? `<p class="alert" role="note" data-nosnippet>${resolved.state === 'notbuilt' ? escape(announcedNotice(guide.books.find(book => book.l === resolved.l))) : 'Este link tem uma posição que não existe neste guia. Escolha sua posição abaixo.'}</p>` : ''}<div class="gate-layout"><section class="gate-primary">${cleanHeader}<div class="picker-heading"><h2>Onde você está?</h2><span class="muted small" data-memory-hint hidden></span></div>${picker(guide, cleanPath)}${launchLine(guide, 'gate')}</section><section class="gate-secondary">${introBlock}${how}${about}${guide.state === 'private' && !guide.presentation.blurb ? '<section class="invitation"><h2>Sobre o livro</h2><p>aqui entra a sua sinopse</p><p class="small">Se quiser, uso o texto da contracapa.</p></section>' : ''}</section></div>`
      : match ? profileView(guide, subject, entities, position)
        : route.type === 'mundo' ? hubView(guide, entities, position, url)
          : route.type === 'misterios' ? boardView(guide, position, url)
            : route.type === 'tempo' ? timelineView(guide, entities, position, url)
              : route.type === 'chapter' ? chapterView(guide, route.item.ordinal, entities, position)
                : route.type === 'misterio' ? threadView(guide, cutStory(guide, position).threads.find(thread => thread.id === route.thread.id), entities, position)
                  : guide.context ? panelView(guide, entities, position) : panel(guide, entities, position);
  const slot = thirdPartyBanner(guide) || reviewSlot(guide, position, guide.site ?? {}, guide.approval, route);
  const cleanContextPosition = Object.keys(context).length ? { ...context } : null;
  const previews = new Set([...body.matchAll(/data-preview="preview-([a-z0-9-]+)"/g)].map(match => match[1]));
  const templates = entities.filter(entity => previews.has(entity.slug)).map(entity => previewTemplate(guide, entity, position)).join('');
  const tabs = [['painel', '', 'Painel', '⌂'], ['mundo', '/mundo', 'Personagens', '♙'], ...(guide.context?.story ? [['misterios', '/misterios', 'Mistérios', '?']] : []), ['tempo', '/tempo', 'Linha do tempo', '⋯']];
  const nav = `<nav class="bottom-tabs" aria-label="Seções do guia">${tabs.map(([tab, path, label, icon]) => `<a href="${positionHref(guidePath + path, position ?? cleanContextPosition)}" ${tab === route.tab ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('')}</nav>`;
  const publicMap = JSON.stringify(pickerMap(guide)).replace(/</g, '\\u003c');
  const canonical = `https://enrichreader.com${cleanPath}${context.k ? `?k=${encodeURIComponent(context.k)}` : ''}`;
  const imageHead = assets?.og ? `<meta property="og:image" content="https://enrichreader.com${assets.og.path}"><meta property="og:image:type" content="${assets.og.type}"><meta property="og:image:width" content="${assets.og.width}"><meta property="og:image:height" content="${assets.og.height}"><meta property="og:image:alt" content="Guia sem spoiler de ${bookTitle}, de ${authorName}"><meta name="twitter:image" content="https://enrichreader.com${assets.og.path}"><meta name="twitter:image:alt" content="Guia sem spoiler de ${bookTitle}, de ${authorName}">` : '';
  const bookId = l => `https://enrichreader.com/guia/${guide.series}#${l === 1 ? 'book' : `book-${l}`}`;
  const builtBooks = guide.books.filter(book => book.status !== 'announced');
  const schemaAuthors = guide.authors.map(name => ({ '@type': 'Person', name }));
  const publisher = guide.presentation?.publisher?.name ? { publisher: { '@type': 'Organization', name: guide.presentation.publisher.name } } : {};
  const schemaBooks = builtBooks.map(book => ({ '@type': 'Book', '@id': bookId(book.l), name: book.l === 1 ? guide.title : `Livro ${book.l}`, inLanguage: guide.text_language, author: schemaAuthors, ...publisher }));
  const seriesId = `https://enrichreader.com/guia/${guide.series}#series`;
  const graph = guide.state === 'public' && ['home', 'mundo', 'entity'].includes(route.type) ? { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': canonical, url: canonical, name: ordinaryTitle, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'Guia sem spoiler', url: 'https://enrichreader.com/guia' }, about: { '@id': builtBooks.length > 1 ? seriesId : bookId(1) } },
    ...(builtBooks.length > 1 ? [{ '@type': 'CreativeWorkSeries', '@id': seriesId, name: guide.title, author: schemaAuthors, hasPart: schemaBooks.map(book => ({ '@id': book['@id'] })) }] : []),
    ...schemaBooks,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: `Guia de ${guide.title}`, item: `https://enrichreader.com/guia/${guide.series}` }, ...(route.type !== 'home' ? [{ '@type': 'ListItem', position: 2, name: 'Personagens', ...(route.type === 'entity' ? { item: `https://enrichreader.com/guia/${guide.series}/mundo` } : {}) }] : []), ...(route.type === 'entity' ? [{ '@type': 'ListItem', position: 3, name: firstName }] : [])] },
  ] } : null;
  const structured = graph ? `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html><html lang="pt-BR" data-scheme="${look.scheme}" style="${escape(look.style)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,interactive-widget=resizes-content"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Guia sem spoiler"><meta property="og:url" content="${escape(canonical)}"><meta name="twitter:card" content="${assets?.og ? 'summary_large_image' : 'summary'}">${imageHead}<meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/web-guide/guide.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${escape(look.fontQuery)}&amp;display=swap"><script type="module" src="/web-guide/guide.js"></script>${structured}</head>
    <body class="reader-page" ${route.type === 'tempo' && position ? `data-view-search="${escape(timelineURL(guide, position, url).search)}"` : ''} ${route.type === 'misterio' ? `data-misterio-state="${!position ? 'clean' : !thread ? 'absent' : thread.closed ? 'resolved' : 'open'}"` : ''} data-ownership="${guide.ownership}" ${route.entity ? `data-entity-slug="${route.entity.slug}" data-entity-class="${route.entity.classification ?? 'person'}" data-entity-state="${!position ? 'clean' : subject ? 'positioned' : 'absent'}" data-intro="${approvedIntro}"` : ''} ${position ? `data-position-l="${position.l}" data-position-c="${position.c}" data-position-label="${escape(positionLabel(guide, position))}"` : ''} data-page-type="${route.type === 'home' ? position ? 'painel' : 'gate' : route.type}" data-guide-state="${guide.state}"><a class="skip" href="#content">Ir para o conteúdo</a><header class="topbar"><a class="brand" href="${positionHref(guidePath, position ?? cleanContextPosition)}">${assets?.thumb ? `<img class="cover-thumb" src="${assets.thumb.path}" width="24" height="36" alt="">` : `<span class="monogram" aria-hidden="true">${escape(guide.title[0])}</span>`}<span>${bookTitle}<small>de ${authorName}</small></span></a>${nav}<button class="position-pill" data-open-picker aria-haspopup="dialog">${position ? escape(positionLabel(guide, position)) : 'Onde você está?'} <span aria-hidden="true">⌄</span></button>${guide.ownership === 'third_party' ? '' : guide.state === 'private' ? allLink(guide, url, position) : '<button class="share" data-share aria-label="Compartilhar guia" aria-haspopup="dialog">↗</button>'}</header>
    <main id="content">${slot}<div class="alert" role="note" data-nosnippet data-position-alert hidden></div>${body}${position && completedOrdinal(guide, position) === 0 && route.type === 'home' ? about : ''}${templates}</main>
    ${footer(guide, body.includes('data-app-bridge'))}
    <dialog data-picker-dialog aria-labelledby="picker-title"><div class="sheet-grabber" data-grabber aria-hidden="true"></div><div class="dialog-header"><h2 id="picker-title">Onde você está?</h2><button data-close aria-label="Fechar">×</button></div>${picker(guide, cleanPath, 'sheet-chapter')}</dialog>
    ${guide.state !== 'private' && guide.ownership !== 'third_party' ? `<dialog data-share-dialog aria-labelledby="share-title"><div class="dialog-header"><h2 id="share-title">Compartilhar o guia</h2><button data-close aria-label="Fechar">×</button></div><div data-share-options><p class="muted">Quem abrir escolhe a própria posição. Nada da história aparece antes disso.</p><button class="primary" data-share-clean>Compartilhar link sem spoiler</button>${position ? `<button class="share-position" data-share-position>Enviar com minha posição (${escape(positionLabel(guide, position))})</button><p class="muted small">${position.c === 'fim' ? 'Quem ainda não terminou este livro' : `Quem ainda não chegou ${currentItem(guide, position).gender === 'f' ? 'na' : 'no'} ${escape(positionLabel(guide, position).replace('Cap.', 'cap.'))}`} pode ver spoilers.</p>` : ''}</div><div data-manual hidden><label>Copie o link:<input readonly data-manual-url></label><button data-close>Pronto</button></div></dialog>` : ''}
    <dialog data-preview-dialog aria-labelledby="preview-name"><div class="sheet-grabber" data-grabber aria-hidden="true"></div><div class="preview-close"><button data-close aria-label="Fechar">×</button></div><div data-preview-body></div></dialog>
    <dialog data-report-dialog aria-labelledby="report-title"><div class="sheet-grabber" data-grabber aria-hidden="true"></div><div class="preview-close"><button data-close aria-label="Fechar">×</button></div><div data-report-body></div></dialog>
    ${demoDialog(guide)}${approvalDialog(guide, url, guide.approval)}<div class="toast" role="status" hidden></div><script type="application/json" id="guide-map">${publicMap}</script></body></html>`;
}
