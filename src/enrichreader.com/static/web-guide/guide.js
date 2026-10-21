import { initializeAnalytics, initializeReaderMetrics, track, beginPicker, observeHeroPicker, touchPicker, pickerCommit } from './analytics.js';
import { initializeApproval, disposeApproval } from './approval.js';
import { initializeHub, disposeHub } from './hub.js';
import { resolvePosition, commitURL, shareURL, completedIndex } from './position.mjs';
import { initializePickerBook, showAnnouncedBook, focusPicker } from './picker.js';
import { openReport, disposeReport } from './reports.js';

let activeDialog = null;
let dialogOpener = null;
let request = null;
let toastTimer;
const guideMap = JSON.parse(document.querySelector('#guide-map').textContent);
const t = (key, params = {}) => window.EnrichReaderI18n?.t(key, params) ?? key.replace(/\{([\w]+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
const bookTitle = document.querySelector('.brand > span')?.childNodes[0]?.textContent ?? 'este livro';
const authorName = document.querySelector('.brand small')?.textContent.replace(/^de /, '') ?? '';
const currentPosition = () => {
  const resolved = resolvePosition(guideMap, location.search).position;
  if (resolved) return resolved;
  // A shipped retired stop remains valid, but is absent from picker choices.
  const { positionL: l, positionC: c } = document.body.dataset;
  const params = new URLSearchParams(location.search);
  return l && c && (params.get('l') ?? (guideMap.books.filter(book => book.status !== 'announced').length === 1 ? String(guideMap.books.find(book => book.status !== 'announced').l) : null)) === l && params.get('c') === c ? { l: Number(l), c } : null;
};
const remembered = () => {
  try {
    const value = JSON.parse(localStorage.getItem(`er.pos.${guideMap.series}`));
    if (!value || typeof value.l !== 'number' || typeof value.c !== 'string') return null;
    return resolvePosition(guideMap, new URLSearchParams(value)).position ?? null;
  } catch { return null; }
};
const positionBook = position => guideMap.books.find(book => book.l === position.l);
const label = position => {
  if (position.c === 'fim') return t('The end of Book {book}', { book: position.l });
  const item = positionBook(position).items.find(item => item.ordinal === Number(position.c));
  if (!item && Number(document.body.dataset.positionL) === position.l && document.body.dataset.positionC === position.c) return document.body.dataset.positionLabel;
  const number = item?.number ?? item?.label.match(/\d+/)?.[0] ?? position.c;
  return `${guideMap.books.length > 1 ? `${t('Book {number}', { number: position.l })} · ` : ''}${item ? t(item.kind === 'section' ? 'Letter {number}' : 'Chapter {number}', { number }) : t('position {number}', { number: position.c })}`;
};
const inPosition = position => {
  if (position.c === 'fim') return window.EnrichReaderI18n?.language === 'en' ? t('the end of Book {book}', { book: position.l }) : t('at the end of Book {book}', { book: position.l });
  const item = positionBook(position).items.find(item => item.ordinal === Number(position.c));
  if (window.EnrichReaderI18n?.language === 'en') return label(position);
  return t(!item || item.gender === 'f' ? 'at {position}' : 'in {position}', { position: label(position) });
};
const equal = (a, b) => a && b && a.l === b.l && a.c === b.c;

function initialize(committed = false) {
  initializeAnalytics();
  initializeReaderMetrics(committed);
  const position = currentPosition();
  const memory = remembered();
  const draftBook = guideMap.books.find(book => String(book.l) === new URL(location.href).searchParams.get('book'));
  document.querySelectorAll('[data-picker]').forEach(form => {
    const book = draftBook ?? positionBook(position ?? memory ?? { l: guideMap.books[0].l });
    initializePickerBook(form, book, book.l === (position ?? memory)?.l ? (position ?? memory).c : null);
  });
  const hint = document.querySelector('[data-memory-hint]');
  if (hint && memory) { hint.hidden = false; hint.textContent = t('Last time: {position}', { position: label(memory) }); }
  const pill = document.querySelector('[data-open-picker]');
  pill.setAttribute('aria-label', position ? t('Your position: {position}. Change', { position: label(position) }) : t('Choose your position in the book'));
  observeHeroPicker(document.querySelector('main [data-picker]'), { surface: 'hero', source: document.body.dataset.pageType === 'entity' ? 'entity' : document.body.dataset.pageType === 'gate' ? 'gate' : 'section', prefill: position ? 'url' : memory ? 'memory' : 'default', from_memory: !position && !!memory });
  initializeHub();
  initializeApproval();
  if (document.body.dataset.pageType === 'entity') track('entity_view', { entity: document.body.dataset.entitySlug, entity_class: document.body.dataset.entityClass, state: document.body.dataset.entityState, intro: document.body.dataset.intro === 'true', landing: !committed && externalLanding() });
}

function openDialog(dialog, draft, source = 'pill') {
  if (dialog?.matches('[data-approval-dialog]')) initializeApproval();
  if (activeDialog) return;
  dialogOpener = document.activeElement;
  activeDialog = dialog;
  if (dialog.matches('[data-share-dialog]')) {
    track('share_open', { source });
    dialog.querySelector('[data-manual]').hidden = true;
    dialog.querySelector('[data-share-options]').hidden = false;
    dialog.querySelector('[data-manual-url]').value = '';
  }
  history.pushState({ ...history.state, erGuideSheet: true }, '', location.href);
  dialog.showModal();
  const picker = dialog.querySelector('[data-picker]');
  if (picker) {
    const position = currentPosition() ?? remembered();
    const book = guideMap.books.find(book => book.l === (draft?.l ?? position?.l ?? guideMap.books[0].l));
    initializePickerBook(picker, book, draft?.c ?? (position?.l === book.l ? position.c : null));
    beginPicker(picker, { surface: 'sheet', source, prefill: source === 'tour' || source === 'previa' ? 'tour' : currentPosition() ? 'url' : remembered() ? 'memory' : 'default', from_memory: !currentPosition() && !!remembered() });
    focusPicker(picker);
  }
  if (dialog.dataset.reporting) dialog.querySelector('[data-report-title]').focus();
  else if (dialog.matches('[data-demo-dialog]')) dialog.querySelector('#demo-title').focus();
  else if (dialog.matches('[data-approval-dialog]')) dialog.querySelector('#approval-title').focus();
  else if (dialog.matches('[data-preview-dialog]')) dialog.querySelector('#preview-name').focus();
}

function closeDialog() {
  if (!activeDialog) return Promise.resolve();
  return new Promise(resolve => {
    addEventListener('popstate', resolve, { once: true });
    history.back();
  });
}

addEventListener('popstate', () => {
  if (!activeDialog) return;
  disposeReport(activeDialog);
  disposeApproval(activeDialog);
  activeDialog.close(); activeDialog = null;
  dialogOpener?.focus(); dialogOpener = null;
});
document.addEventListener('cancel', event => {
  if (event.target === activeDialog) { event.preventDefault(); void closeDialog(); }
}, true);

function toast(message, duration = 3000) {
  const node = document.querySelector('.toast');
  clearTimeout(toastTimer); node.textContent = message; node.hidden = false;
  toastTimer = setTimeout(() => { node.hidden = true; }, duration);
}

async function movePosition(position, saveMemory = true, force = false, transition = null) {
  transition ??= { before: currentPosition(), metrics: null };
  if (saveMemory) {
    try { localStorage.setItem(`er.pos.${guideMap.series}`, JSON.stringify(position)); } catch { /* Optional memory. */ }
  }
  disposeHub();
  const enteredPanel = !currentPosition() && document.body.dataset.pageType === 'gate';
  const same = equal(position, currentPosition());
  await closeDialog();
  if (same && !force) return;
  history.replaceState(history.state, '', commitURL(location.href, position, { preserveTimeline: document.body.dataset.pageType === 'tempo' }));
  // Remove old content before fetching, including when moving backwards.
  const privateStrip = document.querySelector('.review-strip');
  privateStrip?.querySelector('[data-tour-row]')?.remove();
  document.querySelector('#content').replaceChildren(...(privateStrip ? [privateStrip] : []));
  const skeleton = document.createElement('div'); skeleton.className = 'skeleton'; skeleton.setAttribute('role', 'status'); skeleton.textContent = t('Loading your position…');
  document.querySelector('#content').append(skeleton);
  document.querySelector('[data-preview-body]').replaceChildren();
  document.querySelector('[data-open-picker]').textContent = `${label(position)} ⌄`;
  scrollTo({ top: 0, behavior: 'instant' });
  request?.abort();
  const controller = new AbortController(); request = controller;
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(location.href, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Guide response failed');
    const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (request !== controller) return;
    if (!parsed.querySelector('#guide-map') || !parsed.querySelector('#content')) throw new Error('Invalid guide response');
    if (parsed.body.dataset.pageType === 'tempo' && parsed.body.hasAttribute('data-view-search')) {
      const normalized = new URL(location.href); normalized.search = parsed.body.dataset.viewSearch;
      history.replaceState(history.state, '', normalized);
    }
    document.querySelector('meta[name="robots"]').content = parsed.querySelector('meta[name="robots"]').content;
    for (const attribute of [...document.body.attributes]) document.body.removeAttribute(attribute.name);
    for (const attribute of parsed.body.attributes) document.body.setAttribute(attribute.name, attribute.value);
    document.body.replaceChildren(...parsed.body.childNodes);
    initialize(true);
    if (!transition.before) {
      if (transition.metrics) track('position_set', transition.metrics);
    } else {
      const delta = completedIndex(guideMap, position) - completedIndex(guideMap, transition.before);
      if (delta) track('position_moved', { from: `${transition.before.l}:${transition.before.c}`, to: `${position.l}:${position.c}`, direction: delta > 0 ? 'forward' : 'back', delta: Math.abs(delta), source: transition.metrics?.source ?? 'alert', opened_from: transition.metrics?.opened_from ?? 'alert' });
    }
    (document.querySelector('[data-position-heading]') ?? document.querySelector('h1'))?.focus();
    const teachTap = enteredPanel && document.querySelector('[data-preview]');
    toast(teachTap ? t('You’re now at {position}. Click a name to see who they are.', { position: inPosition(position) }) : t('You’re now at {position}.', { position: inPosition(position) }), teachTap ? 4000 : 3000);
  } catch {
    if (request !== controller) return;
    const main = document.querySelector('#content');
    main.replaceChildren(...(privateStrip ? [privateStrip] : []));
    const message = document.createElement('p'); message.textContent = t('Couldn’t load {position}.', { position: label(position) });
    const retry = document.createElement('button'); retry.textContent = t('Try again');
    retry.addEventListener('click', () => { void movePosition(position, false, true, transition); });
    main.append(message, retry);
  } finally { clearTimeout(timer); }
}

async function share(position = null) {
  const url = shareURL(location.pathname, position).href;
  if (navigator.share) {
    try {
      const text = !position ? t('Spoiler-free guide to {book}, by {author}: tell us which chapter you’re on and see only what you’ve read.', { book: bookTitle, author: authorName })
        : position.c === 'fim' ? t('I finished Book 1 of {book}, by {author}. This link opens the guide through the end.', { book: bookTitle, author: authorName })
          : t('I’m at {position} in {book}, by {author}. This link shows the guide through what I’ve read.', { position: inPosition(position), book: bookTitle, author: authorName });
      await navigator.share({ title: document.title, text, url });
      track('share', { mode: position ? 'position' : 'clean', method: 'native', outcome: 'sent' });
      await closeDialog(); return;
    } catch (error) { if (error.name === 'AbortError') { track('share', { mode: position ? 'position' : 'clean', method: 'native', outcome: 'cancelled' }); await closeDialog(); return; } }
  }
  try {
    await navigator.clipboard.writeText(url);
    track('share', { mode: position ? 'position' : 'clean', method: 'clipboard', outcome: 'copied' }); await closeDialog(); toast(t('Link copied'));
  } catch {
    document.querySelector('[data-share-options]').hidden = true;
    track('share', { mode: position ? 'position' : 'clean', method: 'manual', outcome: 'manual' });
    const panel = document.querySelector('[data-manual]'); panel.hidden = false;
    const input = panel.querySelector('input'); input.value = url; input.focus(); input.select();
  }
}

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-picker]');
  if (!form) return;
  event.preventDefault();
  if (!form.querySelector('[data-commit]').disabled) void movePosition({ l: Number(form.elements.l.value), c: form.elements.c.value }, true, false, { before: currentPosition(), metrics: pickerCommit(form) });
});
document.addEventListener('input', event => {
  if (event.target.id === 'search' && !event.target.closest('[data-hub]')) {
    const query = event.target.value.trim().toLocaleLowerCase('en');
    const cards = [...document.querySelectorAll('[data-entity-card]')];
    let count = 0;
    cards.forEach(card => {
      card.hidden = !card.querySelector('h3').textContent.toLocaleLowerCase('en').includes(query);
      if (!card.hidden) count++;
    });
    document.querySelector('[data-result-count]').textContent = t('Found {count} characters at this position.', { count });
    document.querySelector('[data-search-empty]').hidden = count !== 0;
  }
});
document.addEventListener('keydown', event => {
  const current = event.target.closest('[data-picker-book]');
  if (!current || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const links = [...current.closest('[data-picker]').querySelectorAll('[data-picker-book]')]
    .filter(link => guideMap.books.find(book => book.l === Number(link.dataset.pickerBook)).status !== 'announced');
  const index = links.indexOf(current);
  const next = event.key === 'Home' ? links[0] : event.key === 'End' ? links.at(-1)
    : links[(index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length];
  next?.click(); next?.focus();
});
document.addEventListener('click', event => {
  const plainClick = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
  const bookLink = event.target.closest('[data-picker-book]');
  if (bookLink && plainClick) {
    event.preventDefault();
    const form = bookLink.closest('[data-picker]');
    const book = guideMap.books.find(book => book.l === Number(bookLink.dataset.pickerBook));
    if (book.status === 'announced') showAnnouncedBook(form, book);
    else { touchPicker(form, 'book'); initializePickerBook(form, book); }
    bookLink.focus(); return;
  }
  const tab = event.target.closest('.bottom-tabs a[aria-current]');
  if (tab && plainClick && new URL(tab.href).pathname === location.pathname.replace(/\/$/, '')) { event.preventDefault(); scrollTo({ top: 0, behavior: 'instant' }); return; }
  const preview = event.target.closest('a[data-preview]');
  if (preview && plainClick) {
    const template = document.getElementById(preview.dataset.preview);
    if (template && !activeDialog) {
      event.preventDefault();
      const dialog = document.querySelector('[data-preview-dialog]');
      dialog.setAttribute('aria-labelledby', 'preview-name');
      dialog.querySelector('[data-preview-body]').replaceChildren(template.content.cloneNode(true));
      openDialog(dialog);
      const slug = preview.dataset.preview.replace('preview-', '');
      track('sheet_open', { entity: slug, entity_class: new URL(preview.href).pathname.split('/').at(-2) === 'lugar' ? 'location' : ({ pessoa: 'person', organizacao: 'organization', objeto: 'object', outro: 'other' })[new URL(preview.href).pathname.split('/').at(-2)], source: preview.dataset.sheetSource ?? 'list', is_new: !!dialog.querySelector('.source-loud'), block: document.body.dataset.pageType === 'chapter' ? preview.closest('[data-chapter-block]')?.dataset.chapterBlock ?? null : null });
    }
    return;
  }
  const pageLink = event.target.closest('a[data-preview-page]');
  if (pageLink && plainClick) {
    track('sheet_page', { entity: new URL(pageLink.href).pathname.split('/').at(-1) });
    event.preventDefault(); location.replace(pageLink.href); return;
  }
  const draftLink = event.target.closest('a[data-picker-draft]');
  if (draftLink && plainClick) { event.preventDefault(); openDialog(document.querySelector('[data-picker-dialog]'), { l: Number(draftLink.dataset.pickerBookDraft ?? currentPosition()?.l ?? 1), c: draftLink.dataset.pickerDraft }, draftLink.dataset.pickerSource ?? 'next_cta'); return; }
  const target = event.target.closest('button, dialog');
  if (!target) return;
  if (target.matches('[data-report]')) {
    const scope = target.dataset.scope;
    const position = currentPosition();
    const resolution = resolvePosition(guideMap, location.search);
    const alert = document.querySelector('[data-position-alert]');
    const context = {
      guide: guideMap.series, page_path: location.pathname,
      view_query: new URLSearchParams([...new URLSearchParams(location.search)].filter(([key]) => ['n', 'arco', 'livro', 'estado', 'resumos'].includes(key))).toString(),
      scope, card: target.dataset.card ?? null, entity: target.dataset.entity ?? null,
      l: position?.l ?? null, c: position?.c ?? null, label: target.dataset.label,
      alert_variant: !alert.hidden ? alert.dataset.variant : ['invalid', 'notbuilt'].includes(resolution.state) ? resolution.state : null,
    };
    if (scope === 'sheet' && activeDialog?.matches('[data-preview-dialog]')) openReport(activeDialog, context);
    else if (!activeDialog) {
      const dialog = document.querySelector('[data-report-dialog]'); openReport(dialog, context); openDialog(dialog);
    }
    return;
  }
  if (target.matches('[data-dismiss-review]')) { document.querySelector('[data-review-card]').remove(); document.querySelector('.masthead h1')?.focus(); }
  if (target.matches('[data-open-demo]')) { track('demo_about_open', { surface: target.closest('footer') ? 'footer' : 'banner' }); openDialog(document.querySelector('[data-demo-dialog]')); }
  if (target.matches('[data-open-approval]')) { track('approval_open'); openDialog(document.querySelector('[data-approval-dialog]')); }
  if (target.matches('[data-open-picker], [data-picker-draft]')) openDialog(document.querySelector('[data-picker-dialog]'), target.dataset.pickerDraft ? { l: Number(target.dataset.pickerBookDraft ?? currentPosition()?.l ?? 1), c: target.dataset.pickerDraft } : null, target.dataset.pickerSource ?? (target.matches('[data-open-picker]') ? 'pill' : currentPosition() && completedIndex(guideMap, currentPosition()) === 0 ? 'zero_cta' : 'next_cta'));
  if (target.matches('[data-share]')) openDialog(document.querySelector('[data-share-dialog]'), null, target.closest('footer') ? 'footer' : 'bar');
  if (target.matches('[data-close]')) void closeDialog();
  if (target.matches('dialog') && activeDialog === target) {
    const bounds = target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) void closeDialog();
  }
  if (target.matches('[data-share-clean]')) void share();
  if (target.matches('[data-share-position]')) void share(currentPosition());
});

let grabberStart = null;
document.addEventListener('pointerdown', event => {
  if (!event.target.matches('[data-grabber]')) return;
  grabberStart = { y: event.clientY, pointer: event.pointerId };
  event.target.setPointerCapture(event.pointerId);
});
document.addEventListener('pointerup', event => {
  if (!grabberStart || grabberStart.pointer !== event.pointerId) return;
  if (activeDialog && event.clientY - grabberStart.y > activeDialog.offsetHeight * .25) void closeDialog();
  grabberStart = null;
});
document.addEventListener('pointercancel', () => { grabberStart = null; });

initialize();
const position = currentPosition();
function externalLanding() {
  if (!document.referrer) return true;
  try { return new URL(document.referrer).origin !== location.origin; } catch { return true; }
}
const landing = externalLanding();
if (landing && position && !equal(position, remembered())) {
  const alert = document.querySelector('[data-position-alert]');
  const memory = remembered();
  alert.hidden = false;
  const memoryCut = memory ? completedIndex(guideMap, memory) : null;
  const urlCut = completedIndex(guideMap, position);
  alert.dataset.variant = memory ? urlCut > memoryCut || urlCut === memoryCut && position.l > memory.l ? 'ahead' : 'behind' : 'nomemory';
  track('position_alert', { variant: alert.dataset.variant, outcome: 'shown' });
  alert.append(document.createTextNode(`${memory ? t('This link opens through {position}', { position: label(position) }) : t('This guide is open through {position}', { position: label(position) })}.${memory ? '' : ` ${t('Haven’t reached it yet?')}`} `));
  const action = document.createElement('button');
  action.textContent = memory ? t('Back to {position}', { position: label(memory) }) : t('Choose my position');
  action.addEventListener('click', () => { track('position_alert', { variant: alert.dataset.variant, outcome: memory ? 'back' : 'choose' }); memory ? void movePosition(memory, false) : openDialog(document.querySelector('[data-picker-dialog]'), null, 'alert'); });
  const dismiss = document.createElement('button'); dismiss.textContent = '×'; dismiss.setAttribute('aria-label', t('Dismiss notice'));
  dismiss.addEventListener('click', () => { track('position_alert', { variant: alert.dataset.variant, outcome: 'dismiss' }); alert.hidden = true; }); alert.append(action, dismiss);
}
