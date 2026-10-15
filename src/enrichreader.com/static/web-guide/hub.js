import { track } from './analytics.js';
import { searchHit, highlightParts, normalize } from './search.mjs';
let urlTimer, statusTimer, flushSearch = null;
addEventListener('pagehide', () => flushSearch?.());
function highlight(node, value, query) {
  node.replaceChildren(...highlightParts(value, query).map(part => {
    if (!part.marked) return document.createTextNode(part.text);
    const mark = document.createElement('mark'); mark.textContent = part.text; return mark;
  }));
}
export function initializeHub() {
  clearTimeout(urlTimer); clearTimeout(statusTimer);
  const hub = document.querySelector('[data-hub]');
  if (!hub) return;
  const input = hub.querySelector('#search');
  const live = hub.dataset.mode === 'live';
  hub.querySelector('[data-hub-submit]').hidden = live;
  const rows = [...hub.querySelectorAll('[data-hub-row]')];
  const list = hub.querySelector('[data-hub-list]');
  const knownList = hub.querySelector('[data-hub-known]');
  const newLabel = hub.querySelector('[data-hub-new-label]');
  const knownLabel = hub.querySelector('[data-hub-known-label]');
  const status = hub.querySelector('[data-hub-status]');
  const filter = hub.querySelector('[data-hub-filters]');
  const clear = hub.querySelector('button[data-clear-search]');
  let selected = filter?.querySelector('[aria-current]')?.dataset.filter ?? 'todos';
  const aliases = new Map(rows.map(row => [row, JSON.parse(row.dataset.a)]));
  let sentQuery = null;
  const sendSearch = () => {
    const query = input.value;
    if (!normalize(query) || query === sentQuery) return;
    sentQuery = query;
    const visible = [...hub.querySelectorAll('[data-hub-row]')].filter(row => !row.hidden);
    const count = live ? visible.length : Number(hub.dataset.results);
    const first = visible[0];
    const top = first ? searchHit({ name: first.dataset.n, aliases: aliases.get(first), description: first.dataset.d }, query)?.field ?? 'none' : 'none';
    const chars = normalize(query).length;
    track('mundo_search', { results: count === 0 ? '0' : count === 1 ? '1' : count <= 5 ? '2-5' : '6+', top, chars: chars <= 2 ? String(chars) : chars <= 5 ? '3-5' : '6+', mode: hub.dataset.mode });
  };
  flushSearch = sendSearch;
  input.addEventListener('blur', sendSearch);
  hub.addEventListener('click', event => {
    const row = event.target.closest('[data-hub-row]');
    if (!row) return;
    sendSearch();
    const searching = !!normalize(input.value);
    const visible = [...hub.querySelectorAll('[data-hub-row]')].filter(row => !row.hidden);
    const index = visible.indexOf(row) + 1;
    track('mundo_row', { entity: new URL(row.querySelector('[data-hub-link]').href).pathname.split('/').at(-1), entity_class: row.dataset.class,
      from: searching ? 'search' : 'list', group: searching || newLabel.hidden ? 'none' : row.dataset.new === 'true' ? 'novo' : 'conhecidos',
      rank: index <= 5 ? '1-5' : index <= 20 ? '6-20' : index <= 100 ? '21-100' : '101+', view: searching ? 'todos' : selected });
  });
  if (!live) {
    sendSearch();
    filter?.querySelectorAll('[data-filter]').forEach(control => control.addEventListener('click', () => track('mundo_filter', { classe: control.dataset.filter })));
    return;
  }
  function apply(writeURL = false) {
    const query = input.value;
    const searching = !!query.trim();
    let count = 0;
    const ranked = rows.map(row => {
      const hit = searching ? searchHit({ name: row.dataset.n, aliases: aliases.get(row), description: row.dataset.d }, query) : null;
      row.hidden = searching ? !hit : selected !== 'todos' && row.dataset.class !== selected;
      if (!row.hidden) count++;
      const aliasLine = row.querySelector('[data-row-alias]');
      aliasLine.hidden = hit?.field !== 'alias';
      highlight(aliasLine.querySelector('span'), hit?.alias ?? '', query);
      highlight(row.querySelector('[data-row-name]'), row.dataset.n, hit?.field === 'name' ? query : '');
      const description = row.querySelector('[data-description-text]');
      if (description) highlight(description, row.dataset.d, hit?.field === 'description' ? query : '');
      return { row, priority: hit?.priority ?? 9 };
    });
    ranked.sort((a, b) => searching ? a.priority - b.priority || Number(a.row.dataset.rank) - Number(b.row.dataset.rank) : Number(a.row.dataset.rank) - Number(b.row.dataset.rank));
    const grouped = !searching && ranked.some(item => !item.row.hidden && item.row.dataset.new === 'true');
    newLabel.hidden = !grouped;
    knownLabel.hidden = !grouped || !ranked.some(item => !item.row.hidden && item.row.dataset.new !== 'true');
    knownList.hidden = !grouped;
    list.append(...ranked.filter(item => !grouped || item.row.dataset.new === 'true').map(item => item.row));
    knownList.append(...ranked.filter(item => grouped && item.row.dataset.new !== 'true').map(item => item.row));
    grouped ? list.setAttribute('aria-labelledby', 'hub-new') : list.removeAttribute('aria-labelledby');
    list.setAttribute('aria-label', searching ? 'Resultados' : 'Personagens e mundo até sua posição');
    if (filter) filter.hidden = searching;
    clear.hidden = !searching;
    hub.querySelector('[data-hub-empty]').hidden = count !== 0;
    hub.querySelector('[data-empty-query]').textContent = query;
    if (writeURL) {
      const url = new URL(location.href);
      query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
      url.searchParams.delete('n'); history.replaceState(history.state, '', url);
    }
    return count;
  }
  input.addEventListener('input', () => {
    apply(); if (!normalize(input.value)) sentQuery = null; clearTimeout(urlTimer); clearTimeout(statusTimer);
    urlTimer = setTimeout(() => apply(true), 300);
    statusTimer = setTimeout(() => { const count = apply(); status.textContent = count === 1 ? '1 resultado' : `${count} resultados`; sendSearch(); }, 1000);
  });
  hub.querySelector('[data-hub-search]').addEventListener('submit', event => { event.preventDefault(); clearTimeout(urlTimer); clearTimeout(statusTimer); apply(true); sendSearch(); input.blur(); });
  hub.querySelectorAll('[data-clear-search]').forEach(control => control.addEventListener('click', event => { event.preventDefault(); input.value = ''; clearTimeout(urlTimer); clearTimeout(statusTimer); apply(true); status.textContent = ''; sentQuery = null; input.focus(); }));
  filter?.querySelectorAll('[data-filter]').forEach(control => control.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); selected = control.dataset.filter;
    track('mundo_filter', { classe: selected });
    filter.querySelectorAll('[data-filter]').forEach(link => link === control ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current'));
    const target = new URL(control.href); const url = new URL(location.href);
    target.searchParams.has('classe') ? url.searchParams.set('classe', target.searchParams.get('classe')) : url.searchParams.delete('classe');
    url.searchParams.delete('n'); history.replaceState(history.state, '', url);
    status.textContent = `${control.textContent.trim()}: ${apply()}`;
    control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }));
  input.addEventListener('focus', () => requestAnimationFrame(() => input.scrollIntoView({ block: 'start', behavior: 'instant' })));
  apply(); sendSearch();
}
export function disposeHub() { flushSearch?.(); flushSearch = null; clearTimeout(urlTimer); clearTimeout(statusTimer); }
