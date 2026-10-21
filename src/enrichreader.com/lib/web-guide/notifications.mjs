import { FileReportStore } from './reports.mjs';
import { recordID } from './approval.mjs';
import { guideHome } from './content.mjs';

const retryWindow = 23 * 60 * 60 * 1000;
const email = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function resendTransport({ apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  return async (payload, id) => {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `guide-approval/${id}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Email delivery HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.id !== 'string' || !result.id) throw new Error('Missing email delivery receipt');
    return result.id;
  };
}

/** Durable approval-only outbox. Tokens, report prose and credentials never enter it. */
export class ApprovalNotifications {
  #queue = Promise.resolve();
  constructor({ directory, to, from, send = null, now = Date.now }) {
    if (!email(to) || !email(from)) throw new Error('Invalid approval email configuration');
    this.store = new FileReportStore(directory);
    this.to = to; this.from = from; this.send = send; this.now = now;
  }
  async enqueue(guide, approval) {
    const id = recordID(`alert:approval:${approval.id}`);
    const prior = await this.store.get(id);
    if (prior) return;
    const text = [
      `Guia aprovado: ${guide.title}`, `Autor: ${guide.authors.join(' e ')}`,
      `Recebido em: ${approval.ts}`, `Divulgação: ${approval.divulgar}${approval.data ? ` (${approval.data})` : ''}`,
      `Resumos: ${approval.resumos}`, `Destino: ${approval.blurb_approved_at_approval ? 'público' : 'não listado'}`,
      'Publicar em até 24 horas e confirmar com o autor no WhatsApp.',
      `Guia: https://enrichreader.com${guideHome(guide)}`,
      'A aprovação está salva. Consulte bin/web-guide approvals para a revisão operacional.',
    ].join('\n');
    await this.store.create({ id, guide: guide.series, reason: 'approval_alert', page_path: guideHome(guide), ts: approval.ts,
      status: 'pending', attempts: 0, next_attempt: this.now(),
      payload: { from: this.from, to: [this.to], subject: `Guia aprovado · ${guide.title}`, text } });
  }
  flush() {
    const result = this.#queue.then(() => this.#flush());
    this.#queue = result.catch(() => {});
    return result;
  }
  async #flush() {
    if (!this.send) return;
    for (const record of await this.store.list()) {
      if (record.status !== 'pending' || record.next_attempt > this.now()) continue;
      // Resend's idempotency cache expires after 24h. Ambiguous old deliveries
      // need operator review, rather than risking a second message.
      if (record.first_attempt != null && this.now() - record.first_attempt >= retryWindow) {
        await this.store.put({ ...record, status: 'needs_review' }); continue;
      }
      record.first_attempt ??= this.now();
      record.attempts++;
      await this.store.put(record);
      try {
        const receipt = await this.send(record.payload, record.id);
        await this.store.put({ ...record, status: 'sent', receipt, sent_at: new Date(this.now()).toISOString() });
      } catch {
        await this.store.put({ ...record, next_attempt: this.now() + Math.min(15 * 60000, 30000 * 2 ** Math.min(record.attempts - 1, 5)) });
      }
    }
  }
  start({ intervalMs = 10000, onError = () => console.error('Approval notification outbox unavailable') } = {}) {
    void this.flush().catch(onError);
    const timer = setInterval(() => { void this.flush().catch(onError); }, intervalMs);
    timer.unref();
    return () => clearInterval(timer);
  }
}
