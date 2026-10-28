import { appearanceSegments, appearanceMarks } from './appearances.mjs';
import { storyItems, positionAfter, itemAt, itemLabel } from './position.mjs';
import { launchLine } from './launch.mjs';
import { escape, positionHref, completedOrdinal, cutEntities, source, previewRoles, guideHome } from './content.mjs';
import { castAt, cutStory, classNames, classPaths, entityPath, chapterPath, namesIn, threadPath, threadKinds, knownNames, presenceAt, connectionsAt, threadsFor } from './context.mjs';
import { searchRows, searchHit, normalize, highlightParts } from './search.mjs';

export const inlineLabel = (guide, ordinal) => `${guide.books.length > 1 ? `L${itemAt(guide, ordinal).l} · ` : ''}${itemLabel(itemAt(guide, ordinal), true)}`;
const article = (guide, ordinal) => itemAt(guide, ordinal).gender === 'f' ? 'a' : 'o';
const bySlug = entities => new Map(entities.map(entity => [entity.slug, entity]));
export const denseTag = (guide, ordinal) => `<span class="source"><span aria-hidden="true">${escape(inlineLabel(guide, ordinal))}</span><span class="sr-only">${escape(inlineLabel(guide, ordinal).replace('cap.', 'capítulo'))}</span></span>`;
export function reportTrigger(guide, card, label, entity = null) {
  if (guide.state === 'private') return '';
  return `<button class="report-trigger" data-report data-scope="card" data-card="${card}" ${entity ? `data-entity="${entity.slug}"` : ''} data-label="${escape(label)}">Algo errado?</button>`;
}
export const door = (path, position, text, block = '') => `<a class="door" href="${positionHref(path, position)}" ${block ? `data-panel-link="${block}"` : ''}>${escape(text)} →</a>`;
export function entityChip(guide, entity, position, text = entity.facts.display_name, prose = false) {
  return `<a class="entity-chip${prose ? ' prose-chip' : ''}" data-preview="preview-${entity.slug}" data-sheet-source="${prose ? 'prose' : 'list'}" href="${positionHref(entityPath(guide, entity), position)}"><span lang="en">${escape(text)}</span></a>`;
}
const chipList = (guide, entities, position, label = '') => `<div class="chip-list"${label ? ` aria-label="${label}"` : ''}>${entities.map(entity => entityChip(guide, entity, position)).join('')}</div>`;

/** Candidate names come from versions at the source item, never the final alias map. */
export function proseChips(guide, text, ordinal, entities, position, used = new Set(), candidates = null, self = null, sourceEntities = cutEntities(guide, positionAfter(guide, ordinal))) {
  const visible = bySlug(entities);
  const spans = [];
  for (const entity of sourceEntities) {
    if (!visible.has(entity.slug) || entity.slug === self || used.has(entity.slug) || (candidates && !candidates.includes(entity.slug))) continue;
    for (const name of knownNames(entity)) {
      const pattern = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu');
      for (const match of text.matchAll(regex)) spans.push({ start: match.index, end: match.index + match[0].length, text: match[0], slug: entity.slug });
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  let output = ''; let offset = 0;
  for (const span of spans) {
    if (span.start < offset || used.has(span.slug)) continue;
    output += escape(text.slice(offset, span.start)) + entityChip(guide, visible.get(span.slug), position, span.text, true);
    offset = span.end; used.add(span.slug);
  }
  return output + escape(text.slice(offset));
}
export function sceneRail(guide, scenes, entities, position, { self = null, newest = false, chapter = false } = {}) {
  const used = new Set(), shown = bySlug(entities), cuts = new Map();
  // Scenes of one item share a source cut; fold it once.
  const cutAt = ordinal => cuts.get(ordinal) ?? cuts.set(ordinal, cutEntities(guide, positionAfter(guide, ordinal))).get(ordinal);
  return `<ol class="scene-rail" aria-label="${newest ? 'Cenas mais recentes primeiro' : 'Cenas em ordem de leitura'}">${scenes.map(scene => {
    const atSource = cutAt(scene.ordinal);
    const place = chapter && atSource.find(entity => entity.classification === 'location' && (scene.setting === entity.slug || knownNames(entity).some(name => normalize(name) === normalize(scene.setting_name ?? ''))));
    const shownPlace = place && shown.get(place.slug);
    const pov = chapter && scene.pov !== guide.context?.story.main_pov ? shown.get(scene.pov) : null;
    const prose = proseChips(guide, scene.summary, scene.ordinal, entities, position, used, scene.cast, self, atSource);
    const cast = chapter ? scene.cast.filter(slug => !used.has(slug) && atSource.some(entity => entity.slug === slug)).map(slug => shown.get(slug)).filter(Boolean).slice(0, 3) : [];
    for (const entity of cast) used.add(entity.slug);
    return `<li><div class="scene-meta">${denseTag(guide, scene.ordinal)}${shownPlace ? ` · ${escape(shownPlace.facts.display_name)}` : ''}${pov || self && scene.pov === self ? ` · pelo olhar de ${escape((pov ?? shown.get(self)).facts.display_name)}` : ''}</div><p lang="en">${prose}</p>${cast.length ? chipList(guide, cast, position) : ''}</li>`;
  }).join('')}</ol>`;
}
export function nextStop(guide, position) {
  if (position.c === 'fim') return door(tabPath(guide, 'tempo'), position, `Relembrar o Livro ${position.l} inteiro`, 'recap');
  const item = itemAt(guide, completedOrdinal(guide, position) + 1);
  const next = storyItems(guide).find(value => value.l === position.l && value.ordinal > item.ordinal && !value.retired);
  if (!next && guide.books.find(book => book.l === position.l).status !== 'complete') return '';
  return `<button type="button" class="panel-next" aria-haspopup="dialog" data-picker-draft="${next?.bookOrdinal ?? 'fim'}" data-picker-book-draft="${position.l}">Já terminei ${item.gender === 'f' ? 'a' : 'o'} ${escape(item.label.replace('Cap.', 'cap.'))}</button>`;
}
export function castGroups(guide, cast, position) {
  const last = completedOrdinal(guide, position);
  const debuts = cast.filter(entity => entity.first === last);
  const known = cast.filter(entity => entity.first !== last);
  return `${debuts.length ? `<p class="group-label source-loud">✦ novo ${inThe(guide, last)}</p>${chipList(guide, debuts, position)}` : ''}${known.length ? `${debuts.length ? '<p class="group-label">Já conhecidos</p>' : ''}${chipList(guide, known, position)}` : ''}`;
}
export const threadRow = (guide, thread, position) => `<a class="thread-row" href="${positionHref(threadPath(guide, thread), position)}"><span lang="en">${escape(thread.question)}</span><small>${threadKinds[thread.kind]} · ${thread.closed ? `resolvid${thread.kind === 'threat' ? 'a' : 'o'} ${into(guide, thread.closed.ordinal)} ` : ''}${denseTag(guide, thread.closed?.ordinal ?? thread.raised)}</small></a>`;
export function panelView(guide, entities, position) {
  const last = completedOrdinal(guide, position);
  const heading = `<h1 class="sr-only">Painel · ${escape(guide.title)}</h1><h2 tabindex="-1" data-position-heading>Onde você parou</h2>`;
  if (!last) return `${heading}<div class="empty"><p>Você está no começo. Ainda não há nada para lembrar, e nada para estragar.</p><p>Quando terminar ${the(guide, 1)}, aqui aparece o que você já leu.</p>${nextStop(guide, position)}</div>`;
  const story = cutStory(guide, position);
  const book = itemAt(guide, last).l;
  const scenes = story.scenes.filter(scene => scene.summary && itemAt(guide, scene.ordinal).l === book).slice(-3).reverse();
  const cast = castAt(guide, entities, position);
  const chapter = scenes[0]?.ordinal ?? last;
  const lead = scenes.length ? sceneRail(guide, scenes, entities, position, { newest: true }) : cast.length ? `<p>${itemAt(guide, last).gender === 'f' ? 'Na' : 'No'} ${escape(inlineLabel(guide, last))} apareceram:</p>${castGroups(guide, cast, position)}` : '';
  const arc = scenes.length && story.arc ? `<p class="arc-line">${story.arc.complete ? 'Arco concluído' : 'Arco'}: <span lang="en">${escape(story.arc.title)}</span> · ${denseTag(guide, story.arc.start)}${story.arc.complete ? `–${denseTag(guide, story.arc.end)}` : ''}</p>` : '';
  const threads = story.threads.filter(thread => !thread.closed && thread.importance === 3 && itemAt(guide, thread.raised).l === book).sort((a, b) => b.raised - a.raised).slice(0, 3);
  const underLaunch = position.c === 'fim' && guide.books.find(book => book.status === 'announced')?.l === position.l + 1;
  const appAllowed = guide.presentation?.app_published === true && (guide.state === 'public' || guide.state === 'unlisted' && guide.ownership === 'own');
  const castDoor = door(tabPath(guide, 'mundo'), position, 'Ver todos os personagens', 'cast');
  const curve = story.arc ? story.curve.filter(point => point.ordinal >= story.arc.start) : [];
  return `<div class="panel-layout"><section class="panel-recap">${heading}${arc}${lead}<div class="end-row">${door(chapterPath(guide, chapter), position, `Ver ${article(guide, chapter)} ${inlineLabel(guide, chapter)}${scenes.length ? (article(guide, chapter) === 'a' ? ' inteira' : ' inteiro') : ''}`, 'recap')}${reportTrigger(guide, 'recap', 'Onde você parou')}${guide.summaryControl ?? ''}</div>${nextStop(guide, position)}${underLaunch ? launchLine(guide, 'painel', 'under_recap') : ''}</section><aside class="panel-aside" aria-label="Explorar o que você já leu">
    ${scenes.length && cast.length ? `<section data-panel-block="cast"><h2>Quem apareceu ${inThe(guide, last)}</h2>${castGroups(guide, cast, position)}<div class="end-row">${castDoor}${reportTrigger(guide, 'cast', 'Quem apareceu')}</div></section>` : `<div class="end-row">${castDoor}</div>`}
    ${(scenes.length || guide.hideSummaries || guide.presentation?.summaries === false) && threads.length ? `<section data-panel-block="threads"><h2>Mistérios em aberto</h2>${threads.map(thread => threadRow(guide, thread, position)).join('')}<div class="end-row">${door(tabPath(guide, 'misterios'), position, 'Ver todos os mistérios', 'threads')}${reportTrigger(guide, 'threads', 'Mistérios em aberto')}</div></section>` : ''}
    <section data-panel-block="timeline"><h2>Linha do tempo</h2>${plot(guide, curve)}<div class="end-row">${door(tabPath(guide, 'tempo'), position, 'Ver a linha do tempo', 'timeline')}${curve.length >= 3 ? reportTrigger(guide, 'curve', 'Linha do tempo') : ''}</div></section>
    ${!underLaunch ? launchLine(guide, 'painel') : ''}${appAllowed ? `<section class="app-bridge" data-app-bridge><h2>Leia com o guia ao lado do texto</h2><p>No app, o guia de ${escape(guide.title)} mostra contexto conforme seu progresso de leitura. Funciona com o arquivo do seu livro.</p><a class="outline" href="/app/?utm_source=guia&amp;utm_campaign=${guide.series}&amp;utm_content=painel">Conhecer o app</a></section>` : ''}</aside></div>`;
}
export function plot(guide, points) {
  if (points.length < 3) return '';
  const coords = points.map((point, index) => `${index * 320 / (points.length - 1)},${60 - (point.tension - 1) * 14}`).join(' ');
  return `<figure class="tension"><figcaption>Tensão por capítulo</figcaption><svg viewBox="0 0 320 64" role="img" aria-label="Tensão por capítulo, de ${escape(inlineLabel(guide, points[0].ordinal))} a ${escape(inlineLabel(guide, points.at(-1).ordinal))}"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2"/></svg><ol class="sr-only">${points.map(point => `<li>${escape(inlineLabel(guide, point.ordinal))}: tensão ${point.tension} de 5</li>`).join('')}</ol><div class="plot-labels">${denseTag(guide, points[0].ordinal)}${denseTag(guide, points.at(-1).ordinal)}</div></figure>`;
}

const sentence = text => [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text ?? '')][0]?.segment.trim() ?? '';
export function hubRows(guide, entities, position) {
  const last = completedOrdinal(guide, position);
  const counts = new Map();
  for (const row of guide.context?.mentions ?? []) if (row.ordinal <= last) for (const [slug, count] of Object.entries(row.counts)) counts.set(slug, (counts.get(slug) ?? 0) + count);
  return [...entities].sort((a, b) => Number(b.first === last) - Number(a.first === last) || Number(previewRoles.has(b.facts.narrative_role)) - Number(previewRoles.has(a.facts.narrative_role)) || (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0) || a.first - b.first || a.facts.display_name.localeCompare(b.facts.display_name))
    .map(entity => ({ entity, keys: { name: entity.facts.display_name, aliases: Array.isArray(entity.facts.aliases) ? entity.facts.aliases : [], description: sentence(entity.facts.definition).length <= 240 ? sentence(entity.facts.definition) : '' } }));
}
const highlighted = (value, query) => highlightParts(value, query).map(part => part.marked ? `<mark>${escape(part.text)}</mark>` : escape(part.text)).join('');
export function hubView(guide, entities, position, url) {
  const last = completedOrdinal(guide, position);
  const title = 'Personagens &amp; Mundo';
  if (!entities.length) return notYet(title, position.c === 'fim' ? 'este livro' : the(guide, last + 1));
  const rows = hubRows(guide, entities, position);
  const classes = Object.keys(classPaths).filter(type => entities.some(entity => entity.classification === type));
  const plurals = { person: 'Pessoas', location: 'Lugares', organization: 'Organizações', object: 'Objetos', other: 'Outros' };
  const selected = classes.find(type => classPaths[type] === url.searchParams.get('classe')) ?? 'todos';
  const query = (url.searchParams.get('q') ?? '').slice(0, 200);
  const filtered = query ? searchRows(rows, query) : rows.filter(row => selected === 'todos' || row.entity.classification === selected);
  const mode = entities.length > 250 ? 'server' : 'live';
  const n = pageSize(url, 100, filtered.length);
  const cut = the(guide, last);
  const included = mode === 'server' ? filtered.slice(0, n) : query ? [...filtered, ...rows.filter(row => !searchHit(row.keys, query))] : rows;
  const viewURL = changes => {
    const target = new URL(url); target.searchParams.delete('n');
    for (const key of [...target.searchParams.keys()]) if (key.startsWith('utm_')) target.searchParams.delete(key);
    for (const [key, value] of Object.entries(changes)) value ? target.searchParams.set(key, value) : target.searchParams.delete(key);
    return escape(target.pathname + target.search);
  };
  const renderRows = group => group.map((row, index) => {
      const entity = row.entity;
      const hit = query ? searchHit(row.keys, query) : null;
      const shown = query ? !!hit : selected === 'todos' || entity.classification === selected;
      const role = previewRoles.get(entity.facts.narrative_role);
      return `<li id="r${included.indexOf(row) + 1}" tabindex="-1" data-hub-row data-class="${entity.classification}" data-new="${entity.first === last}" data-rank="${rows.indexOf(row)}" data-n="${escape(row.keys.name)}" data-a="${escape(JSON.stringify(row.keys.aliases))}" data-d="${escape(row.keys.description)}" ${!shown ? 'hidden' : ''}>
        <a href="${positionHref(entityPath(guide, entity), position)}" data-hub-link><h2 lang="en" data-row-name>${highlighted(entity.facts.display_name, hit?.field === 'name' ? query : '')}</h2>${role ? `<p class="role">${role} · ${source(guide, entity, 'narrative_role', position, true)}</p>` : ''}<p data-row-alias ${hit?.field !== 'alias' ? 'hidden' : ''}>Outro nome: <span lang="en">${highlighted(hit?.alias ?? '', query)}</span>${entity.sources.aliases ? source(guide, entity, 'aliases', position) : ''}</p>${row.keys.description ? `<p data-row-description><span lang="en" data-description-text>${highlighted(row.keys.description, hit?.field === 'description' ? query : '')}</span> ${source(guide, entity, 'definition', position, true)}</p>` : ''}${entityMeta(guide, entity)}</a></li>`;
    }).join('');
  const newRows = included.filter(row => row.entity.first === last);
  const knownRows = included.filter(row => row.entity.first !== last);
  const grouped = !query && newRows.some(row => selected === 'todos' || row.entity.classification === selected);
  return `<h1 tabindex="-1">${title}</h1><div data-hub data-mode="${mode}" data-results="${filtered.length}" data-cut-label="${cut}">
    <form class="hub-search" role="search" method="get" data-hub-search><input type="hidden" name="l" value="${position.l}"><input type="hidden" name="c" value="${position.c}">${position.k ? `<input type="hidden" name="k" value="${escape(position.k)}">` : ''}${position.resumos === '0' ? '<input type="hidden" name="resumos" value="0">' : ''}${selected !== 'todos' ? `<input type="hidden" name="classe" value="${classPaths[selected]}">` : ''}<label class="sr-only" for="search">Buscar personagens, lugares e mais até ${cut}</label><input type="search" id="search" name="q" value="${escape(query)}" placeholder="Buscar um nome até ${cut}" autocomplete="off"><button type="submit" data-hub-submit>Buscar</button><button type="button" data-clear-search hidden aria-label="Limpar busca">×</button></form><div class="sr-only" role="status" data-hub-status></div>
    ${classes.length > 1 ? `<nav class="filter-chips" aria-label="Filtrar por tipo" data-hub-filters ${query ? 'hidden' : ''}>${['todos', ...classes].map(type => `<a href="${viewURL({ classe: classPaths[type] ?? null, q: null })}" data-filter="${type}" ${type === selected ? 'aria-current="true"' : ''}>${type === 'todos' ? 'Todos' : plurals[type]} ${type === 'todos' ? entities.length : entities.filter(entity => entity.classification === type).length}</a>`).join('')}</nav>` : ''}
    <h2 class="hub-group-label source-loud" id="hub-new" data-hub-new-label ${grouped ? '' : 'hidden'}>✦ novo ${inThe(guide, last)}</h2>
    <ul class="hub-list" data-hub-list ${grouped ? 'aria-labelledby="hub-new"' : 'aria-label="Personagens e mundo até sua posição"'}>${renderRows(grouped ? newRows : included)}</ul>
    <h2 class="hub-group-label muted" id="hub-known" data-hub-known-label ${grouped && knownRows.some(row => selected === 'todos' || row.entity.classification === selected) ? '' : 'hidden'}>Já conhecidos</h2>
    <ul class="hub-list" data-hub-known aria-labelledby="hub-known" ${grouped ? '' : 'hidden'}>${grouped ? renderRows(knownRows) : ''}</ul>
    <div data-hub-empty ${filtered.length ? 'hidden' : ''}><p>Nenhum resultado para “<span data-empty-query>${escape(query)}</span>” até ${cut}.</p><a class="door" data-clear-search href="${viewURL({ q: null })}">Limpar busca</a></div>
    ${mode === 'server' && filtered.length > n ? `<a class="door" href="${viewURL({ n: String(n + 100) })}#r${n + 1}" data-mundo-more="${n + 100}">Ver os próximos ${Math.min(100, filtered.length - n)}</a>` : ''}</div>`;
}

export function boardView(guide, position, url) {
  const last = completedOrdinal(guide, position);
  if (!last) return notYet('Mistérios', the(guide, 1));
  const threads = cutStory(guide, position).threads;
  const resolved = url.searchParams.get('estado') === 'resolvidos';
  const open = threads.filter(thread => !thread.closed).sort((a, b) => b.latest - a.latest || Number(!!b.answer) - Number(!!a.answer) || b.raised - a.raised);
  const closed = threads.filter(thread => thread.closed).sort((a, b) => b.closed.ordinal - a.closed.ordinal || b.raised - a.raised);
  const list = resolved ? closed : open;
  const n = pageSize(url, 10, list.length);
  const target = new URL(url); target.searchParams.delete('n'); target.searchParams.delete('estado');
  const base = target.pathname + target.search;
  target.searchParams.set('estado', 'resolvidos');
  const until = position.c === 'fim' ? `o fim do Livro ${position.l}` : the(guide, last);
  const more = new URL(url); more.searchParams.set('n', String(n + 10));
  return `<h1 tabindex="-1">Mistérios</h1>${guide.context?.story ? `<nav class="filter-chips" aria-label="Situação das perguntas"><a href="${escape(base)}" data-misterios-filter="aberto" ${!resolved ? 'aria-current="true"' : ''}>Em aberto ${open.length}</a><a href="${escape(target.pathname + target.search)}" data-misterios-filter="resolvidos" ${resolved ? 'aria-current="true"' : ''}>Resolvidos ${closed.length}</a></nav><p class="muted small">${resolved ? 'Como cada uma se resolveu' : 'O que se sabe de cada uma'} até ${until}. As ${resolved ? 'resolvidas' : 'que avançaram'} por último vêm primeiro.</p>
    <div role="list" class="thread-board" data-misterios-state="${resolved ? 'resolvidos' : 'aberto'}">${list.slice(0, n).map((thread, index) => {
      const answer = thread.closed ? { text: thread.closed.answer, ordinal: thread.closed.ordinal } : thread.answer;
      return `<div role="listitem" tabindex="-1" id="r${index + 1}"><a class="thread-card" href="${positionHref(threadPath(guide, thread), position)}" data-thread-card data-rank="${index + 1}" data-answered="${!!answer}"><h2 lang="en">${escape(thread.question)}</h2><p class="small">${threadKinds[thread.kind]} · ${denseTag(guide, thread.closed?.ordinal ?? thread.raised)}${thread.closed ? ' · resolvido' : ''}</p>${answer ? `<p lang="en">${escape(answer.text)} ${denseTag(guide, answer.ordinal)}</p>` : ''}</a></div>`;
    }).join('')}</div>${!list.length ? `<p>Nenhuma pergunta ${resolved ? 'resolvida' : 'em aberto'} até ${until}.</p>` : ''}${list.length > n ? `<a class="door" href="${escape(more.pathname + more.search)}#r${n + 1}" data-misterios-more="${n + 10}" data-estado="${resolved ? 'resolvidos' : 'aberto'}">Ver mais ${Math.min(10, list.length - n)}</a>` : ''}` : `<p>Os mistérios do Livro ${position.l} ainda não estão neste guia.</p>`}${position.c === 'fim' && !resolved && position.l === guide.books.filter(book => book.status !== 'announced').at(-1).l ? launchLine(guide, 'misterios') : ''}`;
}

export const absentView = (guide, position) => `<h1 tabindex="-1">Aparece mais à frente.</h1>${door(guideHome(guide), position, 'Ir para o Painel')}`;
export function quoteText(quote) {
  if (!quote) return '';
  let text = quote;
  if (text.length > 200) {
    const shortened = text.slice(0, 195);
    const boundary = Math.max(shortened.lastIndexOf('. '), shortened.lastIndexOf('? '), shortened.lastIndexOf('! '));
    text = (boundary > 0 ? shortened.slice(0, boundary + 1) : shortened.slice(0, shortened.lastIndexOf(' '))) + ' […]';
  }
  return text;
}
export function quoteView(guide, quote, ordinal) {
  if (!quote || guide.ownership === 'third_party') return '';
  const text = quoteText(quote);
  return `<figure class="source-quote"><blockquote lang="en">“${escape(text)}”</blockquote><figcaption>— ${escape(guide.authors.join(' e '))}, <cite>${escape(guide.title)}</cite>, ${denseTag(guide, ordinal)}</figcaption></figure>`;
}
export function previousThreadEntries(thread) {
  return thread.entries.filter(entry => thread.closed
    ? entry.ordinal < thread.closed.ordinal || entry.ordinal === thread.closed.ordinal && (entry.scene ?? 0) < (thread.closed.scene ?? 0)
    : entry !== thread.entries.at(-1)).reverse();
}
export function threadView(guide, thread, entities, position) {
  if (!thread) return absentView(guide, position);
  const atRaise = bySlug(cutEntities(guide, positionAfter(guide, thread.raised)));
  const named = entities.filter(entity => atRaise.has(entity.slug) && namesIn(thread.question, atRaise.get(entity.slug)));
  const answer = thread.closed ? { text: thread.closed.answer, ordinal: thread.closed.ordinal, quote: thread.closed.quote } : thread.answer;
  const entries = previousThreadEntries(thread);
  const entryHTML = entries.map(entry => `<li>${denseTag(guide, entry.ordinal)}<p lang="en">${escape(entry.text)}</p></li>`);
  return `<h1 tabindex="-1" lang="en">${escape(thread.question)}</h1><p class="muted small">${threadKinds[thread.kind]} · ${denseTag(guide, thread.raised)} · ${thread.closed ? `resolvid${thread.kind === 'threat' ? 'a' : 'o'} ${inThe(guide, thread.closed.ordinal)}` : 'em aberto'}</p>
    ${named.length ? chipList(guide, named, position, 'Nomes na pergunta') : ''}
    <section><h2>${thread.closed ? 'A resposta' : 'O que se sabe até aqui'}</h2>${answer ? `<p class="reading" lang="en">${escape(answer.text)} ${denseTag(guide, answer.ordinal)}</p>${quoteView(guide, answer.quote, answer.ordinal)}` : `<p>Ainda sem resposta até ${the(guide, completedOrdinal(guide, position))}.</p>`}</section>
    <section><h2>Como chegou aqui</h2><ol class="scene-rail" aria-label="Como a resposta mudou, da mais recente à mais antiga">${entryHTML.slice(0, 3).join('')}</ol>${entries.length > 3 ? `<details data-misterio-more><summary>Mostrar mais ${entries.length - 3} respostas anteriores</summary><ol class="scene-rail">${entryHTML.slice(3).join('')}</ol></details>` : ''}<div class="raise-node">${denseTag(guide, thread.raised)} · a pergunta surge${quoteView(guide, thread.raise_quote, thread.raised)}</div></section>
    <div class="end-row">${door(tabPath(guide, 'misterios'), position, 'Ver todos os mistérios')}${reportTrigger(guide, 'misterio', 'esta pergunta')}</div>`;
}

const mentionsAt = (guide, ordinal) => guide.context?.mentions.find(row => row.ordinal === ordinal);
function rankedDebuts(guide, entities, ordinal) {
  const row = mentionsAt(guide, ordinal);
  return entities.filter(entity => entity.first === ordinal).sort((a, b) => (row?.counts[b.slug] ?? 0) - (row?.counts[a.slug] ?? 0) || a.facts.display_name.localeCompare(b.facts.display_name));
}
function timelineRows(guide, items, entities, position, story) {
  const last = completedOrdinal(guide, position);
  const scenesAt = Map.groupBy(story.scenes.filter(scene => scene.summary), scene => scene.ordinal);
  const debutsAt = Map.groupBy(entities, entity => entity.first), shown = bySlug(entities);
  return `<ol class="scene-rail timeline-rail">${items.map(item => {
    const gist = [...scenesAt.get(item.ordinal) ?? []].sort((a, b) => b.tension - a.tension || a.index - b.index)[0];
    const pov = gist && gist.pov !== guide.context?.story.main_pov ? shown.get(gist.pov) : null;
    const debuts = rankedDebuts(guide, debutsAt.get(item.ordinal) ?? [], item.ordinal);
    const names = debuts.slice(0, 3).map(entity => entity.facts.display_name).join(', ');
    return `<li id="item-${item.ordinal}"><a class="timeline-row" href="${positionHref(chapterPath(guide, item.ordinal), position)}" data-tempo-row>${denseTag(guide, item.ordinal)}<span aria-hidden="true"> ›</span>${pov ? `<p class="muted small">· pelo olhar de ${escape(pov.facts.display_name)}</p>` : ''}${gist ? `<p class="reading" lang="en">${escape(gist.summary)}</p>` : ''}${debuts.length ? `<p class="small${item.ordinal === last ? ' source-loud' : ''}">${item.ordinal === last ? '✦ ' : ''}${debuts.length === 1 ? 'Estreou' : 'Estrearam'}: <span lang="en">${escape(names)}</span>${debuts.length > 3 ? ` e mais ${debuts.length - 3}` : ''}</p>` : ''}</a></li>`;
  }).join('')}</ol>`;
}
const bookArcs = (guide, arcs, book) => arcs.filter(arc => itemAt(guide, arc.start)?.l === book);
/** `?arco=2.3` is book 2's third arc, counted over every arc so keys never shift as arcs reveal. */
function arcKey(guide, arc) {
  const book = itemAt(guide, arc.start).l;
  return `${book}.${bookArcs(guide, guide.context.story.arcs, book).findIndex(value => value.id === arc.id) + 1}`;
}
export function timelineURL(guide, position, currentURL, story = cutStory(guide, position)) {
  const url = new URL(currentURL);
  const last = completedOrdinal(guide, position);
  const currentBook = itemAt(guide, last)?.l;
  const rawArc = url.searchParams.get('arco');
  const validArc = story.arcs.some(arc => arc.complete && rawArc === arcKey(guide, arc));
  if (!validArc) url.searchParams.delete('arco');
  const book = Number(url.searchParams.get('livro'));
  const validBook = book > 0 && book < currentBook && guide.books.some(value => value.l === book) && !bookArcs(guide, story.arcs, book).length;
  if (validArc || !validBook) url.searchParams.delete('livro');
  const selectedBook = validBook && !validArc ? book : currentBook;
  const items = storyItems(guide).filter(item => item.l === selectedBook && item.ordinal <= last && !item.retired);
  const n = Number(url.searchParams.get('n'));
  if (validArc || bookArcs(guide, story.arcs, selectedBook).length || !Number.isSafeInteger(n) || n < 100 || n % 100 || n > Math.ceil(items.length / 100) * 100) url.searchParams.delete('n');
  return url;
}
export function timelineView(guide, entities, position, url) {
  const last = completedOrdinal(guide, position);
  const heading = '<h1 tabindex="-1">Linha do tempo</h1>';
  if (!last) return notYet('Linha do tempo', the(guide, 1));
  const story = cutStory(guide, position);
  url = timelineURL(guide, position, url, story);
  const all = storyItems(guide).filter(item => item.ordinal <= last && !item.retired);
  const currentBook = itemAt(guide, last).l;
  const finished = position.c === 'fim';
  const atBookEnd = finished || currentBook < position.l;
  const marker = `<p class="timeline-marker">${finished ? `Fim do Livro ${position.l}` : `Você está ${inThe(guide, last + 1)}`}</p>`;
  const rawN = Number(url.searchParams.get('n') ?? 100);
  const n = Number.isSafeInteger(rawN) && rawN > 0 && rawN % 100 === 0 ? rawN : 100;
  const viewLink = (key, value, fragment, text, action, kind) => {
    const target = new URL(url); target.searchParams.delete('arco'); target.searchParams.delete('livro'); target.searchParams.delete('n');
    if (value) target.searchParams.set(key, value);
    return `<a class="door" href="${escape(target.pathname + target.search)}#${fragment}" data-tempo-arco="${action}" data-kind="${kind}">${text}</a>`;
  };
  const rows = (items, oldest, limit = n) => {
    const ordered = oldest ? items : [...items].reverse();
    const paging = new URL(url); paging.searchParams.set('n', String(limit + 100));
    return `${timelineRows(guide, ordered.slice(0, limit), entities, position, story)}${ordered.length > limit ? `<a class="door" href="${escape(paging.pathname + paging.search)}#item-${ordered[limit].ordinal}" data-tempo-more="${oldest ? 'newer' : 'older'}">Ver os ${Math.min(100, ordered.length - limit)} ${oldest ? 'próximos' : 'anteriores'}</a>` : ''}`;
  };
  const arcBlock = (arc, book, previous, hasOpen) => {
    const key = arcKey(guide, arc), id = `arco-${key.replace('.', '-')}`;
    const arcItems = all.filter(item => item.l === book && item.ordinal >= arc.start && (!arc.complete || item.ordinal <= arc.end));
    const selected = arc.complete && url.searchParams.get('arco') === key;
    const expanded = !arc.complete || selected || !previous && all.filter(item => item.l === book).length <= 60;
    const level = previous || hasOpen && arc.complete ? 'h3' : 'h2';
    return `<section id="${id}" tabindex="-1" data-arc-state="${arc.complete ? 'finished' : 'open'}"><p class="kicker">${arc.complete ? 'Arco concluído' : 'Arco'}</p><${level} lang="en">${escape(arc.title)}</${level}><p>${arc.complete ? `${denseTag(guide, arc.start)}–${denseTag(guide, arc.end)}` : `desde ${article(guide, arc.start)} ${denseTag(guide, arc.start)} · ${arcItems.length} ${arcItems.length === 1 ? 'capítulo' : 'capítulos'} até aqui`}</p>${arc.complete && arc.description && !guide.hideSummaries && guide.presentation?.summaries !== false ? `<p class="reading" lang="en">${escape(arc.description)}</p>` : ''}${expanded ? `${plot(guide, story.curve.filter(point => point.ordinal >= arc.start && (!arc.complete || point.ordinal <= arc.end)))}${!arc.complete ? marker : ''}${rows(arcItems, arc.complete, arcItems.length)}${selected ? viewLink('arco', null, id, 'Recolher este arco ↑', 'close', 'arco') : ''}` : viewLink('arco', key, id, `Ver os ${arcItems.length} capítulos deste arco →`, 'open', 'arco')}</section>`;
  };
  const renderBook = (book, previous) => {
    const items = all.filter(item => item.l === book);
    const arcs = bookArcs(guide, story.arcs, book);
    const open = arcs.filter(arc => !arc.complete), closed = arcs.filter(arc => arc.complete);
    if (arcs.length) return `${!previous && !open.length && !atBookEnd ? marker : ''}${open.map(arc => arcBlock(arc, book, previous, true)).join('')}${!previous && open.length && closed.length ? '<h2>Arcos concluídos</h2>' : ''}${closed.map(arc => arcBlock(arc, book, previous, !!open.length)).join('')}${!previous && atBookEnd ? marker : ''}`;
    if (previous) {
      const expanded = !url.searchParams.has('arco') && url.searchParams.get('livro') === String(book);
      return `<section id="livro-${book}" tabindex="-1">${expanded ? `${rows(items, true)}${viewLink('livro', null, `livro-${book}`, 'Recolher este livro ↑', 'close', 'livro')}` : viewLink('livro', String(book), `livro-${book}`, `Ver os ${items.length} capítulos do Livro ${book} →`, 'open', 'livro')}</section>`;
    }
    return `<p class="muted small">Os arcos do Livro ${book} ainda não estão neste guia.</p>${!atBookEnd ? marker : ''}${rows(items, atBookEnd)}${atBookEnd ? marker : ''}`;
  };
  const earlier = guide.books.filter(book => book.status !== 'announced' && book.l < currentBook).map(book => `<h2>Livro ${book.l}</h2>${renderBook(book.l, true)}`).join('');
  return `${heading}${finished ? '<p class="intro">O livro inteiro, do começo ao fim.</p>' : ''}${guide.books.length > 1 ? `<h2>Livro ${currentBook}</h2>` : ''}${renderBook(currentBook, false)}${finished ? launchLine(guide, 'tempo') : ''}${earlier}<div class="end-row">${reportTrigger(guide, 'tempo', 'Linha do tempo')}${guide.summaryControl ?? ''}</div>`;
}

export function chapterView(guide, ordinal, entities, position) {
  const last = completedOrdinal(guide, position);
  if (ordinal > last) return absentView(guide, position);
  const item = itemAt(guide, ordinal);
  const story = cutStory(guide, position);
  const scenes = story.scenes.filter(scene => scene.ordinal === ordinal && scene.summary);
  const debuts = rankedDebuts(guide, entities, ordinal);
  const row = mentionsAt(guide, ordinal);
  const cast = entities.filter(entity => row?.present.includes(entity.slug));
  const questions = story.threads.filter(thread => thread.raised === ordinal);
  const live = storyItems(guide).filter(value => !value.retired);
  const previous = live.findLast(value => value.ordinal < ordinal), next = live.find(value => value.ordinal > ordinal);
  const navLabel = value => `${value.l === item.l ? '' : `L${value.l} · `}${itemLabel(value)}`;
  const arc = story.arcs.find(value => ordinal >= value.start && (!value.complete || ordinal <= value.end));
  const arcLine = arc ? `<p class="arc-line">${arc.complete ? 'Arco concluído' : 'Arco'}: <span lang="en">${escape(arc.title)}</span> · ${denseTag(guide, arc.start)}${arc.complete ? `–${denseTag(guide, arc.end)}` : ''}</p>` : '';
  return `${guide.books.length > 1 ? `<p class="kicker">Livro ${item.l}</p>` : ''}<h1 tabindex="-1">${escape(itemLabel(item))}</h1>${arcLine}${!scenes.length ? guide.summaryControl ?? '' : ''}${scenes.length ? `<section data-chapter-block="cenas">${sceneRail(guide, scenes, entities, position, { chapter: true })}<div class="end-row">${reportTrigger(guide, 'cenas', 'Cenas')}${guide.summaryControl ?? ''}</div></section>` : cast.length ? `<section data-chapter-block="quem_apareceu"><h2>Quem apareceu ${inThe(guide, ordinal)}</h2>${chipList(guide, cast, position)}${reportTrigger(guide, 'quem_apareceu', 'Quem apareceu')}</section>` : ''}
    ${questions.length ? `<section data-chapter-block="perguntas"><h2>Perguntas que surgiram ${inThe(guide, ordinal)}</h2>${questions.map(thread => threadRow(guide, thread, position)).join('')}<div class="end-row">${door(tabPath(guide, 'misterios'), position, 'Ver todos os mistérios')}${reportTrigger(guide, 'perguntas', 'Perguntas')}</div></section>` : ''}
    ${scenes.length && debuts.length ? `<section data-chapter-block="estreias"><h2>Quem estreou ${inThe(guide, ordinal)}</h2>${chipList(guide, debuts, position)}${reportTrigger(guide, 'estreias', 'Quem estreou')}</section>` : ''}
    <nav class="chapter-nav" aria-label="Capítulos">${previous ? door(chapterPath(guide, previous.ordinal), position, `‹ ${navLabel(previous)}`) : '<span></span>'}${next && next.ordinal <= last ? door(chapterPath(guide, next.ordinal), position, navLabel(next)) : `<span>${position.c === 'fim' || position.l > item.l ? `Fim do Livro ${item.l}` : `${escape(itemAt(guide, last + 1).label)} · você está aqui`}</span>`}</nav>${ordinal === last && position.c !== 'fim' && position.l === item.l ? nextStop(guide, position) : ''}`;
}

const fichaFields = {
  person: ['status', 'location', 'occupation', 'aliases', 'age'], location: ['parent_location', 'status', 'aliases'],
  organization: ['leader', 'location', 'status', 'aliases'], object: ['location', 'status', 'aliases'], other: ['aliases', 'status'],
};
const fichaLabels = { status: 'Situação', location: 'Onde está', occupation: 'Ocupação', aliases: 'Outros nomes', age: 'Idade', parent_location: 'Fica em', leader: 'Liderança' };
export function fichaRows(guide, entity) {
  const enums = { alive: 'Vivo', dead: 'Morto', missing: 'Desaparecido', ...guide.presentation?.enums };
  return (fichaFields[entity.classification] ?? fichaFields.other).flatMap(key => {
    const value = entity.facts[key];
    if (value == null || Array.isArray(value) && !value.length) return [];
    const rendered = key === 'status' && /^[a-z_]+$/.test(value) ? enums[value] : Array.isArray(value) ? value.join(' · ') : String(value);
    return rendered ? [{ key, label: fichaLabels[key], value: rendered, source: entity.sources[key] }] : [];
  });
}
export function profileView(guide, entity, entities, position) {
  if (!entity) return absentView(guide, position);
  const role = previewRoles.get(entity.facts.narrative_role);
  const report = (card, label) => reportTrigger(guide, card, `${label} de ${entity.facts.display_name}`, entity);
  const rows = fichaRows(guide, entity);
  const present = presenceAt(guide, entity, position);
  const last = completedOrdinal(guide, position);
  const segments = appearanceSegments(guide, present, last);
  const points = appearanceMarks(segments);
  const story = cutStory(guide, position);
  const scenes = story.scenes.filter(scene => scene.summary && (scene.cast.includes(entity.slug) || entity.classification === 'location' && scene.setting === entity.slug)).slice(-3).reverse();
  const threads = threadsFor(guide, entity, position);
  const shownThreads = [...threads.filter(thread => !thread.closed).sort((a, b) => b.latest - a.latest).slice(0, 3), ...threads.filter(thread => thread.closed).sort((a, b) => b.closed.ordinal - a.closed.ordinal).slice(0, 2)];
  const connections = connectionsAt(guide, entity, position);
  return `${door(tabPath(guide, 'mundo'), position, '← Personagens & Mundo')}<h1 tabindex="-1" lang="en">${escape(entity.facts.display_name)}</h1>${entity.first === last || entity.sources.display_name === last && entity.changes.display_name ? source(guide, entity, 'display_name', position) : ''}${entityMeta(guide, entity)}${role ? `<p class="role">${role} · ${source(guide, entity, 'narrative_role', position, true)}</p>` : ''}
    ${entity.facts.definition ? `<p class="reading"><span lang="en">${escape(entity.facts.definition)}</span> ${source(guide, entity, 'definition', position, true)}</p>` : ''}
    ${rows.length ? `<dl class="ficha" aria-label="Ficha de ${escape(entity.facts.display_name)}">${rows.map(row => `<div${row.value.length > 48 ? ' class="stacked"' : ''}><dt>${row.label}</dt><dd><span data-ficha-value>${proseChips(guide, row.value, row.source, entities, position, new Set(), null, entity.slug)}</span><br>${source(guide, entity, row.key, position)}</dd></div>`).join('')}</dl>` : ''}${report('ficha', 'Ficha')}
    ${present.length ? `<section><h2>Aparições</h2><p class="muted small">Em ${present.length} ${present.length === 1 ? 'capítulo' : 'capítulos'} até aqui</p><svg class="appearances" viewBox="0 0 320 24" role="img" aria-label="Em ${present.length} capítulos até ${escape(inlineLabel(guide, last))}. Primeira vez ${escape(inlineLabel(guide, present[0]))}, mais recente ${escape(inlineLabel(guide, present.at(-1)))}.">${points}</svg>${segments.length > 1 ? `<div class="plot-labels">${segments.filter(segment => segment.width >= 24).map(segment => `<span>Livro ${segment.l}</span>`).join('')}</div>` : ''}${door(chapterPath(guide, present[0]), position, `Primeira vez · ${inlineLabel(guide, present[0])}`)}${present.length > 1 ? door(chapterPath(guide, present.at(-1)), position, `Mais recente · ${inlineLabel(guide, present.at(-1))}`) : ''}${report('aparicoes', 'Aparições')}</section>` : ''}
    ${scenes.length || shownThreads.length ? `<section><h2>Na história</h2>${guide.summaryControl ?? ''}${scenes.length ? `<h3>Cenas</h3>${sceneRail(guide, scenes, entities, position, { self: entity.slug, newest: true })}${door(chapterPath(guide, scenes[0].ordinal), position, `Ver ${article(guide, scenes[0].ordinal)} ${inlineLabel(guide, scenes[0].ordinal)} inteiro`)}` : ''}${shownThreads.length ? `<h3>Mistérios</h3>${shownThreads.map(thread => threadRow(guide, thread, position)).join('')}${door(tabPath(guide, 'misterios'), position, 'Ver todos os mistérios')}` : ''}${report('historia', 'Na história')}</section>` : !guide.context?.story && entity.facts.chapter_summary && guide.presentation?.summaries !== false && !guide.hideSummaries ? `<section><h2>Na história</h2><p class="reading"><span lang="en">${escape(entity.facts.chapter_summary)}</span> ${source(guide, entity, 'chapter_summary', position, true)}</p>${report('historia', 'Na história')}</section>` : ''}
    ${!scenes.length && !shownThreads.length && guide.state === 'private' && guide.context?.story ? `<section><h2>Na história</h2>${guide.summaryControl ?? ''}</section>` : ''}
    ${connections.length ? `<section><h2>Conexões</h2><p class="muted small">Quem mais aparece nas mesmas cenas até ${the(guide, last)}. Estar junto não diz qual é a relação.</p>${chipList(guide, connections, position)}${report('conexoes', 'Conexões')}</section>` : ''}`;
}

/** Shared panel/hub/board fragments. Labels arrive escaped. */
export const the = (guide, ordinal) => `${article(guide, ordinal)} ${escape(inlineLabel(guide, ordinal))}`;
const into = (guide, ordinal) => article(guide, ordinal) === 'a' ? 'na' : 'no';
const inThe = (guide, ordinal) => `${into(guide, ordinal)} ${escape(inlineLabel(guide, ordinal))}`;
const tabPath = (guide, tab) => `${guideHome(guide)}/${tab}`;
const notYet = (title, until) => `<h1 tabindex="-1">${title}</h1><p>Nada por aqui ainda: volte quando terminar ${until}.</p>`;
const entityMeta = (guide, entity) => `<p class="muted small">${classNames[entity.classification]}${classNames[entity.classification] ? ' · ' : ''}desde ${the(guide, entity.first)}</p>`;
/** Accepts only multiples of step, clamped to one page past the list. */
function pageSize(url, step, total) {
  const raw = url.searchParams.get('n') ?? '';
  return /^\d+$/.test(raw) && Number(raw) % step === 0 ? Math.max(step, Math.min(Number(raw), total + step)) : step;
}
