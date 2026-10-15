import { track } from './analytics.js';
const states = new WeakMap();
export function disposeApproval(dialog) {
  const state = states.get(dialog);
  if (state) { state.controller?.abort(); state.active = false; states.delete(dialog); }
}
export function initializeApproval() {
  const dialog = document.querySelector('[data-approval-dialog]');
  const form = dialog?.querySelector('[data-approval-form]');
  if (!form || !form.querySelector('[data-approve-submit]')) return;
  const state = { active: true, busy: false }; states.set(dialog, state);
  const submit = form.querySelector('[data-approve-submit]');
  const date = form.querySelector('input[type=date]');
  function validate() {
    const selected = form.querySelector('input[name=divulgar]:checked')?.value;
    const dated = selected === 'data';
    form.querySelector('[data-approval-date]').hidden = !dated;
    date.required = dated;
    submit.disabled = state.busy || !selected || dated && !date.checkValidity();
  }
  form.onchange = validate; date.oninput = validate;
  async function send(event) {
    event?.preventDefault(); if (!state.active) return; validate();
    if (submit.disabled || state.busy) return;
    const payload = Object.fromEntries(new FormData(form));
    if (payload.divulgar !== 'data') delete payload.data;
    state.busy = true; submit.disabled = true; submit.textContent = 'Enviando…';
    form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = true; });
    const error = form.querySelector('[data-approval-error]'); error.hidden = true;
    const controller = new AbortController(); state.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = new URL(location.href);
      const endpoint = `/guia/${JSON.parse(document.querySelector('#guide-map').textContent).series}/aprovacao?k=${encodeURIComponent(url.searchParams.get('k'))}`;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new Error('Approval failed');
      const receipt = await response.json();
      if (receipt.approved !== true) throw new Error('Invalid approval receipt');
      track('approval_sent', { divulgar: receipt.divulgar, resumos: receipt.resumos, outcome: receipt.outcome });
      if (!state.active) return;
      form.replaceChildren();
      const title = document.createElement('p'); title.setAttribute('role', 'status'); title.tabIndex = -1; title.dataset.approvalConfirmation = '';
      title.textContent = 'Aprovado. Obrigado!';
      const text = document.createElement('p'); text.textContent = 'Vai ao ar em até 24h, neste mesmo endereço. Te aviso no WhatsApp com os links para a bio e os posts.';
      const close = document.createElement('button'); close.type = 'button'; close.dataset.close = ''; close.textContent = 'Fechar';
      form.append(title, text, close); title.focus();
    } catch {
      if (!state.active) return;
      error.hidden = false; error.replaceChildren(document.createTextNode('Não deu para enviar · '));
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Tentar de novo'; retry.addEventListener('click', () => void send()); error.append(retry);
    } finally {
      clearTimeout(timeout); state.busy = false;
      if (state.active && form.querySelector('[data-approve-submit]')) { form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = false; }); submit.textContent = 'Aprovar e publicar'; validate(); }
    }
  }
  form.onsubmit = event => void send(event);
  validate();
}
