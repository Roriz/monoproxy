import { track } from './analytics.js';
const sessions = new WeakMap();
const reasons = {
  spoiler: ['⚠', 'Spoiler!', 'Mostra algo que eu ainda não li'],
  wrong: ['✗', 'Não é isso', 'A informação está errada'],
  missing: ['+', 'Falta algo', 'Faltou alguma coisa importante'],
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
  body.innerHTML = `<h2 tabindex="-1" data-report-title>O que está errado?</h2><p class="report-about"></p><div class="report-reasons"></div><div data-report-error hidden></div>`;
  const title = body.querySelector('[data-report-title]'); title.id = titleId;
  body.querySelector('.report-about').textContent = `Sobre: ${context.label}`;
  const rows = body.querySelector('.report-reasons');
  for (const [reason, [glyph, label, subtitle]] of Object.entries(reasons)) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.reportReason = reason;
    button.innerHTML = `<span class="report-glyph" aria-hidden="true">${glyph}</span><span><strong>${label}</strong><span data-reason-subtitle>${subtitle}</span></span>`;
    button.addEventListener('click', () => void sendReason(state, reason)); rows.append(button);
  }
  if (dialog.open) title.focus();
}

const current = state => sessions.get(state.dialog) === state;

async function request(state, method, payload) {
  const controller = new AbortController(); state.controller = controller;
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const base = `/guia/${encodeURIComponent(state.context.guide)}/reports${method === 'PATCH' ? `/${state.id}` : ''}`;
    const endpoint = new URL(base, location.origin);
    const page = new URL(location.href);
    for (const key of ['k', 'resumos']) if (page.searchParams.has(key)) endpoint.searchParams.set(key, page.searchParams.get(key));
    const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    if (!response.ok) throw new Error('Report request failed');
    const receipt = await response.json();
    if (receipt.id !== state.id) throw new Error('Invalid report receipt');
  } finally { clearTimeout(timer); }
}

function errorLine(node, retry) {
  node.hidden = false; node.replaceChildren(document.createTextNode('Não deu para enviar · '));
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Tentar de novo';
  button.addEventListener('click', retry); node.append(button);
}

async function sendReason(state, reason) {
  if (state.busy || !current(state)) return;
  if (state.lastReason && state.lastReason !== reason) state.id = crypto.randomUUID();
  state.lastReason = reason; state.busy = true;
  const rows = [...state.body.querySelectorAll('[data-report-reason]')];
  rows.forEach(row => {
    row.disabled = true;
    if (row.dataset.reportReason === reason) { row.dataset.sending = 'true'; row.querySelector('[data-reason-subtitle]').textContent = 'Enviando…'; }
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
    errorLine(state.body.querySelector('[data-report-error]'), () => void sendReason(state, reason));
  } finally { state.busy = false; }
}

function confirmation(state, reason) {
  state.body.innerHTML = `<h2 class="sr-only" data-report-title>Aviso recebido</h2><p tabindex="-1" role="status" data-report-confirmation></p><div data-detail-form><label for="report-detail">Quer contar mais? (opcional)</label><textarea id="report-detail" rows="3" maxlength="255" placeholder="O que você viu, e onde?"></textarea><p class="detail-counter" data-detail-counter>0/255</p><button class="detail-send" data-detail-send disabled>Enviar detalhe</button><div data-detail-error hidden></div></div><button class="report-close" data-close>Fechar</button>`;
  state.body.querySelector('[data-report-title]').id = state.dialog.getAttribute('aria-labelledby');
  const confirmation = state.body.querySelector('[data-report-confirmation]');
  confirmation.textContent = document.body.dataset.guideState === 'private' ? 'Recebido. Corrijo em até 24h.' : reason === 'spoiler' ? 'Desculpe pelo spoiler. Obrigado por avisar: vamos corrigir.' : 'Recebido. Obrigado por avisar.';
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
        const done = document.createElement('p'); done.textContent = 'Detalhe enviado.'; done.setAttribute('role', 'status');
        state.body.querySelector('[data-detail-form]').replaceChildren(done);
      }
    } catch {
      if (current(state)) errorLine(state.body.querySelector('[data-detail-error]'), () => void sendDetail());
    } finally { state.busy = false; if (send.isConnected) send.disabled = !input.value.trim(); }
  };
  send.addEventListener('click', () => void sendDetail());
}
