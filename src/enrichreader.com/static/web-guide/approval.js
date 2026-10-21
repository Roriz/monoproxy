import { track } from './analytics.js';
import { t, sendJSON, errorLine } from './client.js';
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
    state.busy = true; submit.disabled = true; submit.textContent = t('Sending…');
    form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = true; });
    const error = form.querySelector('[data-approval-error]'); error.hidden = true;
    try {
      const endpoint = `${form.dataset.endpoint}?k=${encodeURIComponent(new URL(location.href).searchParams.get('k'))}`;
      const receipt = await sendJSON(endpoint, 'POST', payload, state);
      if (receipt.approved !== true) throw new Error('Invalid approval receipt');
      track('approval_sent', { divulgar: receipt.divulgar, resumos: receipt.resumos, outcome: receipt.outcome });
      if (!state.active) return;
      form.replaceChildren();
      const title = document.createElement('p'); title.setAttribute('role', 'status'); title.tabIndex = -1; title.dataset.approvalConfirmation = '';
      title.textContent = t('Approved. Thanks!');
      const text = document.createElement('p'); text.textContent = t('It will go live within 24 hours at this same address. I’ll send the bio and post links on WhatsApp.');
      const close = document.createElement('button'); close.type = 'button'; close.dataset.close = ''; close.textContent = t('Close');
      form.append(title, text, close); title.focus();
    } catch {
      if (!state.active) return;
      errorLine(error, 'Error sending · ', () => void send());
    } finally {
      state.busy = false;
      if (state.active && form.querySelector('[data-approve-submit]')) { form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = false; }); submit.textContent = t('Approve and publish'); validate(); }
    }
  }
  form.onsubmit = event => void send(event);
  validate();
}
