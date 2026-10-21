import { touchPicker } from './analytics.js';
import { t } from './client.js';
// Picker controls change only the draft. The page changes on form submission.
const states = new WeakMap();
let held = null;
const heldClicks = new WeakSet();
const numberOf = item => item.number ?? item.label.match(/\d+/)?.[0] ?? item.label;
const label = item => item ? t(item.kind === 'section' ? 'Letter {number}' : 'Chapter {number}', { number: numberOf(item) }) : '';
const finishedLabel = book => t('You finished Book {book}', { book });

function render(form, announce = false) {
  const state = states.get(form);
  const select = form.elements.c;
  const stop = state.items.find(item => String(item.ordinal) === select.value);
  const previous = state.items.filter(item => item.ordinal < Number(select.value)).at(-1) ?? (select.value === 'fim' ? state.items.at(-1) : null);
  const finished = select.value === 'fim';
  const readout = form.querySelector('[data-readout]');
  readout.textContent = finished ? t('Finished') : label(stop);
  [...select.options].forEach(option => {
    if (option.value === 'fim') option.textContent = t('I finished this book');
    else { const item = state.items.find(value => String(value.ordinal) === option.value); if (item) option.textContent = label(item); }
  });
  readout.hidden = state.numeric;
  form.querySelector('[data-picker-title]').htmlFor = state.numeric ? form.querySelector('[data-number]').id : readout.id;
  form.querySelector('[data-number]').hidden = !state.numeric;
  form.querySelector('[data-slider-group]').hidden = state.numeric;
  form.querySelector('[data-consequence]').textContent = !state.valid ? '' : finished
    ? t('Show everything through the end of Book {book}.', { book: state.l })
    : previous ? t('Show everything through the end of {article} {position}.', { article: window.EnrichReaderI18n?.language === 'en' ? 'the' : previous.gender === 'f' ? 'da' : 'do', position: label(previous) })
      : state.l > 1 ? t('Show everything through the end of Book {book}.', { book: state.l - 1 }) : t('Nothing appears yet: choose your position.');
  const commit = form.querySelector('[data-commit]');
  commit.textContent = finished ? finishedLabel(state.l) : t(stop.kind === 'section' ? 'I’m at Letter {number}' : 'I’m at Chapter {number}', { number: numberOf(stop) });
  commit.disabled = !state.valid;
  const range = form.querySelector('[data-slider]');
  range.value = select.selectedIndex;
  range.setAttribute('aria-valuetext', finished ? finishedLabel(state.l) : label(stop));
  form.querySelector('[data-step="-1"]').disabled = select.selectedIndex === 0;
  form.querySelector('[data-step="1"]').disabled = select.selectedIndex === select.options.length - 1;
  const chip = form.querySelector('[data-finish]');
  chip.setAttribute('aria-pressed', String(finished));
  chip.textContent = `${finished ? '✓ ' : ''}${t('I finished this book')}`;
  if (announce) form.querySelector('[data-picker-live]').textContent = range.getAttribute('aria-valuetext');
}

function choose(form, c, announce = true) {
  const state = states.get(form);
  form.elements.c.value = String(c);
  state.valid = true;
  if (c === 'fim') state.numeric = false;
  const stop = state.items.find(item => String(item.ordinal) === String(c));
  form.querySelector('[data-number]').value = stop?.number ?? '';
  const feedback = form.querySelector('[data-number-feedback]');
  feedback.textContent = stop ? label(stop) : t('Finished');
  feedback.hidden = !state.numeric;
  form.querySelector('[data-number-choices]').hidden = true;
  render(form, announce);
}

export function initializePicker(form, items, c, l = 1) {
  states.set(form, { items, l, numeric: items.length > 120, valid: true });
  form.elements.c.hidden = true;
  const available = [...form.elements.c.options].some(option => option.value === String(c));
  const draft = available ? c : items.find(item => item.ordinal > Number(c))?.ordinal ?? items.at(-1).ordinal;
  choose(form, draft, false);
}

export function showAnnouncedBook(form, book) {
  const notice = form.querySelector('[data-book-notice]');
  notice.hidden = false; notice.textContent = t('The guide for Book {book} isn’t ready yet.', { book: book.l });
  const launch = form.querySelector('[data-book-launch]');
  launch.replaceChildren();
  const template = form.querySelector(`[data-book-launch-template="${book.l}"]`);
  if (template) launch.append(template.content.cloneNode(true));
  launch.hidden = false;
}

export function initializePickerBook(form, book, c) {
  stopHeld();
  form.elements.l.value = book.l;
  form.querySelectorAll('[data-picker-book]').forEach(link => Number(link.dataset.pickerBook) === book.l ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current'));
  const announced = book.status === 'announced';
  form.querySelector('.picker-controls').hidden = announced;
  form.querySelector('[data-commit]').hidden = announced;
  form.querySelector('[data-commit]').disabled = announced;
  form.querySelector('[data-book-notice]').hidden = !announced;
  form.querySelector('[data-book-launch]').hidden = !announced;
  if (announced) showAnnouncedBook(form, book);
  if (announced) { states.set(form, { items: [], l: book.l, valid: false }); return; }
  form.elements.c.replaceChildren(...book.items.map(item => new Option(label(item), String(item.ordinal))), ...(book.status === 'complete' ? [new Option(t('I finished this book'), 'fim')] : []));
  form.querySelector('[data-slider]').max = form.elements.c.options.length - 1;
  const ends = form.querySelectorAll('.slider-labels span');
  ends[0].textContent = label(book.items[0]); ends[1].textContent = label(book.items.at(-1));
  form.querySelector('[data-finish]').hidden = book.status !== 'complete';
  initializePicker(form, book.items, c ?? String(book.items[0].ordinal), book.l);
}

export function focusPicker(form) {
  if (!states.get(form).items.length) { form.querySelector('[data-picker-book][aria-current]')?.focus(); return; }
  form.querySelector(states.get(form).numeric ? '[data-number]' : '[data-readout]').focus();
}

function enterNumberMode(form) {
  choose(form, form.elements.c.value, false);
  states.get(form).numeric = true;
  form.querySelector('[data-number-feedback]').hidden = false;
  render(form);
  const input = form.querySelector('[data-number]');
  input.focus(); input.select();
}

function matchNumber(form) {
  const state = states.get(form);
  const value = form.querySelector('[data-number]').value.trim();
  const number = Number(value);
  const matches = /^\d+$/.test(value) && number > 0
    ? state.items.filter(item => item.number === number) : [];
  const feedback = form.querySelector('[data-number-feedback]');
  const choices = form.querySelector('[data-number-choices]');
  choices.replaceChildren(); choices.hidden = true;
  if (matches.length === 1) { choose(form, matches[0].ordinal, false); return; }
  state.valid = false;
  feedback.hidden = !value;
  feedback.textContent = !value ? '' : matches.length ? t('Which position did you mean?')
    : t('There is no letter or chapter {number} in this book.', { number: value });
  if (matches.length > 1) {
    choices.hidden = false;
    const currentOrdinal = Number(form.elements.c.value);
    const nearest = matches.sort((a, b) => Math.abs(a.ordinal - currentOrdinal) - Math.abs(b.ordinal - currentOrdinal));
    nearest.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label(item);
      button.dataset.numberChoice = item.ordinal; button.hidden = index >= 3;
      choices.append(button);
    });
    if (matches.length > 3) {
      const more = document.createElement('button'); more.type = 'button';
      more.textContent = t('Show {count} more', { count: matches.length - 3 }); more.dataset.moreChoices = '';
      choices.append(more);
    }
  }
  render(form);
}

function step(button) {
  const form = button.closest('form');
  if (!button.isConnected || button.disabled) return false;
  touchPicker(form, 'stepper');
  const select = form.elements.c;
  select.selectedIndex += Number(button.dataset.step);
  choose(form, select.value);
  return true;
}

function stopHeld() {
  if (held) clearTimeout(held.timer);
  held = null;
}

document.addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-step]');
  if (!button || button.disabled || event.button !== 0) return;
  stopHeld(); heldClicks.delete(button);
  button.setPointerCapture(event.pointerId);
  const started = performance.now();
  const repeat = () => {
    heldClicks.add(button);
    if (!step(button)) { stopHeld(); return; }
    if (!held) return;
    held.timer = setTimeout(repeat, performance.now() - started >= 1500 ? 1000 / 24 : 125);
  };
  held = { timer: setTimeout(repeat, 400) };
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(event, stopHeld);
addEventListener('blur', stopHeld);
addEventListener('popstate', stopHeld);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopHeld(); });

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  const form = button?.closest('[data-picker]');
  if (!form) return;
  if (button.matches('[data-readout]')) enterNumberMode(form);
  if (button.matches('[data-step]')) {
    if (heldClicks.has(button)) heldClicks.delete(button);
    else step(button);
  }
  if (button.matches('[data-number-choice]')) { touchPicker(form, 'number'); choose(form, button.dataset.numberChoice); focusPicker(form); }
  if (button.matches('[data-more-choices]')) {
    form.querySelectorAll('[data-number-choice]').forEach(choice => { choice.hidden = false; }); button.hidden = true;
  }
  if (button.matches('[data-finish]')) { touchPicker(form, 'chip'); choose(form, 'fim'); }
});

document.addEventListener('input', event => {
  const form = event.target.closest('[data-picker]');
  if (!form) return;
  if (event.target.matches('[data-number]')) { touchPicker(form, 'number'); matchNumber(form); }
  if (event.target.matches('[data-slider]')) {
    touchPicker(form, 'slider');
    form.elements.c.selectedIndex = Number(event.target.value); choose(form, form.elements.c.value, false);
  }
});

document.addEventListener('keydown', event => {
  const form = event.target.closest('[data-picker]');
  if (!form) return;
  if (event.target.matches('[data-number]') && event.key === 'Escape') {
    event.preventDefault(); event.stopPropagation();
    states.get(form).numeric = false; choose(form, form.elements.c.value, false); focusPicker(form);
  }
  if (!event.target.matches('[data-slider]')) return;
  const increments = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: 10, PageDown: -10 };
  const select = form.elements.c;
  let index = select.selectedIndex;
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = select.options.length - 1;
  else if (event.key in increments) index += increments[event.key];
  else return;
  event.preventDefault();
  touchPicker(form, 'slider');
  select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, index));
  choose(form, select.value, false);
});

document.addEventListener('languagechange', () => {
  document.querySelectorAll('[data-picker]').forEach(form => {
    if (states.get(form)?.items.length) render(form);
    form.querySelectorAll('[data-picker-book]').forEach(link => { link.textContent = link.dataset.pickerStatus === 'announced' ? t('Book {number} · coming soon', { number: link.dataset.pickerBook }) : t('Book {number}', { number: link.dataset.pickerBook }); });
  });
});
