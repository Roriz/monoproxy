import { analyticsDisabled, sanitizeAnalyticsPayload } from './analytics-privacy.mjs';
const website = 'f4411453-fd4a-472f-9b5a-c4adab84f443';
const pending = [];
let loading = false;
const pickerSessions = new WeakMap();
let heroObserver;
let reachObserver;
let pagePaint = performance.now();
let sheets = 0;
const schemas = {
  picker_open: ['surface', 'source', 'prefill'], picker_engage: ['surface', 'input', 'ms_open'],
  position_set: ['source', 'input', 'ms_open', 'from_memory', 'opened_from'], position_moved: ['from', 'to', 'direction', 'delta', 'source', 'opened_from'], position_alert: ['variant', 'outcome'],
  share_open: ['source'], share: ['mode', 'method', 'outcome'], launch_link_click: ['source', 'slot'],
  sheet_open: ['entity', 'entity_class', 'source', 'is_new', 'block'], sheet_page: ['entity'],
  entity_view: ['entity', 'entity_class', 'state', 'intro', 'landing'],
  report_open: ['scope', 'card'], report_sent: ['reason', 'scope', 'card', 'entity'], report_detail: ['reason'],
  footer_view: ['app_link'], app_link_click: ['surface', 'sheets'], app_cta_view: ['surface'], author_link_click: ['kind', 'surface'], authors_line_click: ['surface'], demo_about_open: ['surface'],
  painel_link: ['block', 'target'], painel_block_view: ['block'],
  mundo_search: ['results', 'top', 'chars', 'mode'], mundo_filter: ['classe'], mundo_row: ['entity', 'entity_class', 'from', 'group', 'rank', 'view'], mundo_more: ['n'],
  misterios_filter: ['estado'], misterios_more: ['estado', 'n'], misterios_card: ['estado', 'rank', 'answered'], misterios_depth: ['reached', 'estado'],
  misterio_view: ['state', 'from', 'landing'], misterio_rail_more: [],
  tempo_row: ['arc', 'rank', 'fim'], tempo_arco: ['action', 'kind'], tempo_more: ['dir'], tempo_reach: ['q', 'fim'], chapter_reach: ['block'], chapter_nav: ['dir'], chapter_link: ['target'],
  previa_action: ['action', 'ms'], talk_click: ['surface', 'guia', 'exemplo'], ver_tudo: ['from', 'page_type'], resumos_toggle: ['to', 'block'],
  approval_open: [], approval_sent: ['divulgar', 'resumos', 'outcome'],
  shelf_card: ['serie', 'index', 'guide_count'], autores_example: ['serie', 'surface'],
  showcase_cta: [], showcase_open: ['target', 'serie'], showcase_video: ['action'],
};
function disabled() {
  let locallyDisabled = false;
  try { locallyDisabled = localStorage.getItem('umami.disabled') === '1'; } catch { /* Storage is optional. */ }
  return analyticsDisabled({ gpc: navigator.globalPrivacyControl, dnt: navigator.doNotTrack ?? window.doNotTrack,
    operator: document.body.dataset.operator === '1', locallyDisabled });
}
function options() { return { origin: location.origin, publisher: document.body.dataset.publisher, approvedGuide: document.body.dataset.approvedGuide, disabled: disabled() }; }
function common() {
  const page = document.body.dataset.pageType;
  if (page === 'showcase') return { page_type: page, publisher: document.body.dataset.publisher };
  const map = document.querySelector('#guide-map');
  if (!map) return { page_type: page };
  const guide = JSON.parse(map.textContent), l = Number(document.body.dataset.positionL), c = document.body.dataset.positionC;
  const book = guide.books.find(book => book.l === l);
  const total = book?.last_ordinal ?? book?.items?.at(-1)?.ordinal;
  const state = document.body.dataset.guideState;
  return { guide: guide.series, pos: c ? `${l}:${c}` : 'none', pos_pct: total ? Math.round((c === 'fim' ? total : Number(c) - 1) / total * 100) : 0,
    page_type: ['mundo', 'misterios', 'tempo'].includes(page) ? 'section' : page,
    guide_state: state === 'unlisted' ? document.body.dataset.ownership === 'third_party' ? 'unlisted_third_party' : 'unlisted_own' : state };
}
function deliver(payload) {
  if (disabled()) return;
  if (window.umami?.track) { try { void Promise.resolve(window.umami.track(payload)).catch(() => {}); } catch { /* Measurement never interrupts reading. */ } return; }
  if (location.hostname !== 'enrichreader.com') return;
  pending.push(payload);
  if (loading) return;
  loading = true;
  window.erGuideBeforeSend = (_type, value) => sanitizeAnalyticsPayload(value, options());
  const script = document.createElement('script');
  script.src = 'https://stats.enrichreader.com/script.js';
  script.dataset.websiteId = website; script.dataset.autoTrack = 'false';
  script.dataset.doNotTrack = 'true'; script.dataset.beforeSend = 'erGuideBeforeSend';
  script.addEventListener('load', () => { for (const value of pending.splice(0)) deliver(value); });
  script.addEventListener('error', () => { pending.length = 0; });
  document.head.append(script);
}
function emit(name, data) {
  const payload = sanitizeAnalyticsPayload({ website, hostname: location.hostname, language: navigator.language, title: document.title,
    url: location.href, referrer: document.referrer, ...(name ? { name } : {}), data }, options());
  if (payload) deliver(payload);
}
export function track(name, values = {}) {
  const fields = schemas[name];
  if (!fields) return;
  if (name === 'sheet_open') sheets++;
  const data = Object.fromEntries(fields.filter(field => values[field] !== undefined).map(field => [field, values[field]]));
  emit(name, { ...common(), ...data });
}
export function initializeAnalytics() { pagePaint = performance.now(); sheets = 0; emit(null, common()); }

export function initializeReaderMetrics(committed = false) {
  reachObserver?.disconnect();
  const observed = new Map(), seen = new Set();
  reachObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const value = observed.get(entry.target), key = JSON.stringify(value);
      if (value && !seen.has(key)) { seen.add(key); track(value.name, value.data); }
      reachObserver.unobserve(entry.target);
    }
  });
  const observe = (node, name, data, bottom = false) => {
    if (!node) return;
    if (bottom) { const sentinel = document.createElement('span'); sentinel.className = 'metric-sentinel'; sentinel.setAttribute('aria-hidden', 'true'); node.append(sentinel); node = sentinel; }
    observed.set(node, { name, data }); reachObserver.observe(node);
  };
  const page = document.body.dataset.pageType;
  const footer = document.querySelector('footer');
  if (footer && document.querySelector('#guide-map')) {
    const top = document.createElement('span'); top.className = 'metric-sentinel'; top.setAttribute('aria-hidden', 'true'); footer.prepend(top);
    observe(top, 'footer_view', { app_link: [...footer.querySelectorAll('a')].some(link => /\/(?:download|app)\?/.test(link.href)) });
  }
  if (page === 'painel') for (const section of document.querySelectorAll('[data-panel-block]')) observe(section.querySelector('h2'), 'painel_block_view', { block: section.dataset.panelBlock });
  if (page === 'painel') observe(document.querySelector('[data-app-bridge]'), 'app_cta_view', { surface: 'painel' });
  const board = document.querySelector('[data-misterios-state]');
  if (board) for (const reached of [3, 10]) observe(board.querySelector(`[data-thread-card][data-rank="${reached}"]`), 'misterios_depth', { reached, estado: board.dataset.misteriosState }, true);
  if (page === 'tempo') {
    const rows = [...document.querySelectorAll('[data-tempo-row]')];
    for (const q of [25, 50, 75, 100]) observe(rows[Math.ceil(rows.length * q / 100) - 1], 'tempo_reach', { q, fim: document.body.dataset.positionC === 'fim' }, true);
  }
  if (page === 'chapter') {
    observe(document.querySelector('[data-chapter-block="cenas"]'), 'chapter_reach', { block: 'cenas_end' }, true);
    for (const block of ['perguntas', 'estreias']) observe(document.querySelector(`[data-chapter-block="${block}"] h2`), 'chapter_reach', { block });
    observe(document.querySelector('.chapter-nav'), 'chapter_reach', { block: 'nav' });
  }
  if (page === 'misterio') {
    let from = 'direct', landing = !document.referrer;
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer); landing = ref.origin !== location.origin;
        from = landing ? 'external' : /\/tempo\/livro-/.test(ref.pathname) ? 'chapter' : /\/(pessoa|lugar|organizacao|objeto|outro)\//.test(ref.pathname) ? 'entity' : /\/misterios\/?$/.test(ref.pathname) ? 'board' : 'painel';
      }
    } catch { from = 'external'; landing = true; }
    track('misterio_view', { state: document.body.dataset.misterioState, from: committed ? 'commit' : from, landing: !committed && landing });
    document.querySelector('[data-misterio-more]')?.addEventListener('toggle', event => {
      if (event.target.open && !seen.has('rail')) { seen.add('rail'); track('misterio_rail_more'); }
    });
  }
  const video = document.querySelector('video');
  for (const action of ['play', 'ended']) video?.addEventListener(action, () => { if (!seen.has(action)) { seen.add(action); track('showcase_video', { action }); } });
}

export function beginPicker(form, metadata) {
  pickerSessions.set(form, { ...metadata, started: performance.now(), input: 'prefill', engaged: false });
  track('picker_open', { surface: metadata.surface, source: metadata.source, prefill: metadata.prefill });
}
export function observeHeroPicker(form, metadata) {
  heroObserver?.disconnect();
  if (!form) return;
  heroObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    if (!pickerSessions.has(form)) beginPicker(form, metadata);
    heroObserver.disconnect();
  });
  heroObserver.observe(form);
}
export function touchPicker(form, input) {
  if (!pickerSessions.has(form)) beginPicker(form, { surface: form.closest('dialog') ? 'sheet' : 'hero', source: form.closest('dialog') ? 'pill' : 'gate', prefill: 'default', from_memory: false });
  const state = pickerSessions.get(form);
  // Book switches initialize chapter controls rather than adjusting a chapter.
  state.input = input === 'book' ? 'prefill' : input;
  if (!state.engaged) {
    state.engaged = true;
    track('picker_engage', { surface: state.surface, input, ms_open: Math.round(performance.now() - state.started) });
  }
}
export function pickerCommit(form) {
  const state = pickerSessions.get(form);
  return state ? { source: state.surface, input: state.input, ms_open: Math.round(performance.now() - state.started), from_memory: state.from_memory, opened_from: state.surface === 'hero' ? 'hero' : state.source } : { source: form.closest('dialog') ? 'sheet' : 'hero', input: 'prefill', ms_open: 0, from_memory: false, opened_from: 'hero' };
}

document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  const data = link.dataset, page = document.body.dataset.pageType;
  if ('authorsLine' in data) track('authors_line_click', { surface: page === 'shelf' ? 'estante' : 'guia' });
  if (data.shelfCard) track('shelf_card', { serie: data.shelfCard, index: Number(data.index), guide_count: Number(data.guideCount) });
  if (data.authorsTalk) track('talk_click', { surface: data.authorsTalk, guia: document.body.dataset.guideVariant, exemplo: document.body.dataset.exampleKind });
  if (data.authorsExample) track('autores_example', { serie: data.series, surface: data.authorsExample });
  if (data.showcaseOpen) track('showcase_open', { target: data.showcaseOpen, serie: data.series });
  if ('showcaseCta' in data) track('showcase_cta');
  if (data.authorKind) track('author_link_click', { kind: data.authorKind, surface: link.closest('dialog') ? 'sheet' : 'footer' });
  if (data.launchSource) track('launch_link_click', { source: data.launchSource, slot: data.launchSlot });
  if (data.talk && !link.closest('[data-review-card]')?.querySelector('[data-picker-source="previa"]')) track('talk_click', { surface: data.talk });
  if ('viewAll' in data) track('ver_tudo', { from: common().pos, page_type: common().page_type });
  if (data.summaries) track('resumos_toggle', { to: data.summaries, block: page === 'chapter' ? 'chapter' : page === 'entity' ? 'cenas' : 'recap' });
  if (data.panelLink) {
    const path = new URL(link.href).pathname;
    track('painel_link', { block: data.panelLink, target: /\/tempo\/livro-/.test(path) ? 'chapter' : /\/misterios\/\d/.test(path) ? 'misterio' : path.split('/').at(-1) });
  }
  if (!data.panelLink && page === 'painel' && link.matches('.thread-row')) track('painel_link', { block: 'threads', target: 'misterio' });
  if (data.mundoMore) track('mundo_more', { n: Number(data.mundoMore) });
  if (data.misteriosFilter) track('misterios_filter', { estado: data.misteriosFilter });
  if (data.misteriosMore) track('misterios_more', { estado: data.estado, n: Number(data.misteriosMore) });
  if ('threadCard' in data) track('misterios_card', { estado: link.closest('[data-misterios-state]').dataset.misteriosState, rank: Number(data.rank), answered: data.answered === 'true' });
  if ('tempoRow' in data) {
    const rows = [...link.closest('ol').querySelectorAll('[data-tempo-row]')], rank = rows.indexOf(link) + 1;
    track('tempo_row', { arc: link.closest('[data-arc-state]')?.dataset.arcState ?? 'nolayer', rank: rank === 1 ? '1' : rank <= 3 ? '2-3' : '4+', fim: document.body.dataset.positionC === 'fim' });
  }
  if (data.tempoMore) track('tempo_more', { dir: data.tempoMore });
  if (data.tempoArco) track('tempo_arco', { action: data.tempoArco, kind: data.kind });
  if (page === 'chapter' && link.closest('.chapter-nav')) track('chapter_nav', { dir: [...link.closest('.chapter-nav').children].indexOf(link) === 0 ? 'prev' : 'next' });
  if (page === 'chapter' && /\/misterios(?:\/|$)/.test(new URL(link.href).pathname)) track('chapter_link', { target: /\/misterios\/\d/.test(new URL(link.href).pathname) ? 'misterio' : 'misterios' });
  if (data.pickerSource === 'previa') track('previa_action', { action: 'start', ms: Math.round(performance.now() - pagePaint) });
  if (data.talk && link.closest('[data-review-card]') && link.closest('[data-review-card]').querySelector('[data-picker-source="previa"]')) track('previa_action', { action: 'talk', ms: Math.round(performance.now() - pagePaint) });
  if (link.href.includes('/download?') || link.href.includes('/app?')) track('app_link_click', { surface: link.closest('[data-app-bridge]') ? 'painel' : 'footer', ...(link.closest('[data-app-bridge]') ? { sheets: sheets === 0 ? '0' : sheets === 1 ? '1' : '2+' } : {}) });
}, true);
document.addEventListener('click', event => {
  if (event.target.closest('[data-dismiss-review]')) track('previa_action', { action: 'dismiss', ms: Math.round(performance.now() - pagePaint) });
}, true);
