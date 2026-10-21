import { track } from './analytics.js';
import { t, sendJSON, errorLine } from './client.js';
const sessions = new WeakMap();
const reasons = {
  spoiler: ['⚠', 'Spoiler!', 'Shows something I haven’t read yet'],
  wrong: ['✗', 'That’s not right', 'The information is wrong'],
  missing: ['+', 'Something is missing', 'Important information is missing'],
};

export function disposeReport(dialog) {
  const state = sessions.get(dialog);
  if (!state) return;
  state.controller?.abort(); state.body.replaceChildren();
  sessions.delete(dialog); delete dialog.dataset.reporting;
}

export function openReport(dialog, context) {
  disposeReport(dialog);
  track('report_open', { scope: context.scope, card: context.card });
  const body = dialog.querySelector('[data-report-body], [data-preview-body]');
  const state = { dialog, body, context, id: crypto.randomUUID(), busy: false, lastReason: null };
  sessions.set(dialog, state); dialog.dataset.reporting = 'true';
  const titleId = dialog.matches('[data-preview-dialog]') ? 'preview-report-title' : 'report-title';
  dialog.setAttribute('aria-labelledby', titleId);
  body.innerHTML = `<h2 tabindex="-1" data-report-title>What’s wrong?</h2><p class="report-about"></p><div class="report-reasons"></div><div data-report-error hidden></div>`;
  const title = body.querySelector('[data-report-title]'); title.id = titleId;
  body.querySelector('.report-about').textContent = t('About: {label}', { label: context.label });
  const rows = body.querySelector('.report-reasons');
  for (const [reason, [glyph, label, subtitle]] of Object.entries(reasons)) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.reportReason = reason;
    button.innerHTML = `<span class="report-glyph" aria-hidden="true">${glyph}</span><span><strong>${t(label)}</strong><span data-reason-subtitle>${t(subtitle)}</span></span>`;
    button.addEventListener('click', () => void sendReason(state, reason)); rows.append(button);
  }
  if (dialog.open) title.focus();
}

const current = state => sessions.get(state.dialog) === state;

async function request(state, method, payload) {
  const endpoint = new URL(`${document.querySelector('[data-report-dialog]').dataset.endpoint}${method === 'PATCH' ? `/${state.id}` : ''}`, location.origin);
  const page = new URL(location.href);
  for (const key of ['k', 'resumos']) if (page.searchParams.has(key)) endpoint.searchParams.set(key, page.searchParams.get(key));
  const receipt = await sendJSON(endpoint, method, payload, state);
  if (receipt.id !== state.id) throw new Error('Invalid report receipt');
}

async function sendReason(state, reason) {
  if (state.busy || !current(state)) return;
  if (state.lastReason && state.lastReason !== reason) state.id = crypto.randomUUID();
  state.lastReason = reason; state.busy = true;
  const rows = [...state.body.querySelectorAll('[data-report-reason]')];
  rows.forEach(row => {
    row.disabled = true;
    if (row.dataset.reportReason === reason) { row.dataset.sending = 'true'; row.querySelector('[data-reason-subtitle]').textContent = t('Sending…'); }
  });
  state.body.querySelector('[data-report-error]').hidden = true;
  try {
    const { label, ...context } = state.context;
    await request(state, 'POST', { ...context, id: state.id, reason });
    track('report_sent', { reason, scope: context.scope, card: context.card, entity: context.entity });
    if (current(state)) confirmation(state, reason);
  } catch {
    if (!current(state)) return;
    rows.forEach(row => { row.disabled = false; delete row.dataset.sending; row.querySelector('[data-reason-subtitle]').textContent = reasons[row.dataset.reportReason][2]; });
    errorLine(state.body.querySelector('[data-report-error]'), 'Couldn’t send · ', () => void sendReason(state, reason));
  } finally { state.busy = false; }
}

function confirmation(state, reason) {
  state.body.innerHTML = `<h2 class="sr-only" data-report-title>Issue received</h2><p tabindex="-1" role="status" data-report-confirmation></p><div data-detail-form><label for="report-detail">Want to tell us more? (optional)</label><textarea id="report-detail" rows="3" maxlength="255" placeholder="What did you see, and where?"></textarea><p class="detail-counter" data-detail-counter>0/255</p><button class="detail-send" data-detail-send disabled>Send details</button><div data-detail-error hidden></div></div><button class="report-close" data-close>Close</button>`;
  state.body.querySelector('[data-report-title]').id = state.dialog.getAttribute('aria-labelledby');
  const confirmation = state.body.querySelector('[data-report-confirmation]');
  confirmation.textContent = document.body.dataset.guideState === 'private' ? t('Received. I’ll fix it within 24 hours.') : reason === 'spoiler' ? t('Sorry about the spoiler. Thanks for letting us know; we’ll fix it.') : t('Received. Thanks for letting us know.');
  confirmation.focus();
  const input = state.body.querySelector('textarea');
  const send = state.body.querySelector('[data-detail-send]');
  input.addEventListener('input', () => {
    state.body.querySelector('[data-detail-counter]').textContent = `${input.value.length}/255`;
    send.disabled = state.busy || !input.value.trim();
  });
  const sendDetail = async () => {
    if (state.busy || !input.value.trim() || !current(state)) return;
    state.busy = true; send.disabled = true;
    state.body.querySelector('[data-detail-error]').hidden = true;
    try {
      await request(state, 'PATCH', { detail: input.value });
      track('report_detail', { reason });
      if (current(state)) {
        const done = document.createElement('p'); done.textContent = t('Details sent.'); done.setAttribute('role', 'status');
        state.body.querySelector('[data-detail-form]').replaceChildren(done);
      }
    } catch {
      if (current(state)) errorLine(state.body.querySelector('[data-detail-error]'), 'Couldn’t send · ', () => void sendDetail());
    } finally { state.busy = false; if (send.isConnected) send.disabled = !input.value.trim(); }
  };
  send.addEventListener('click', () => void sendDetail());
}
