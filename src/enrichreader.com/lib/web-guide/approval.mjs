import { createHash } from 'node:crypto';
import { FileReportStore, ReportError } from './reports.mjs';
import { guideHome } from './content.mjs';

export function recordID(key) {
  const chars = createHash('sha256').update(key).digest('hex').slice(0, 32).split('');
  chars[12] = '4'; chars[16] = '8';
  const s = chars.join(''); return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
export function approvalRecord(guide, input, now = new Date()) {
  if (guide.state !== 'private' || guide.presentation?.approval_open !== true) throw new ReportError(409, 'Approval not open');
  if (!input || !['semana', 'lancamento', 'data', 'nao_sei'].includes(input.divulgar) || !['on', 'off'].includes(input.resumos)) throw new ReportError(400, 'Invalid approval');
  const nextBook = guide.books.find(book => book.status === 'announced');
  if (input.divulgar === 'lancamento' && !nextBook) throw new ReportError(400, 'No announced launch');
  // Use the founder's local date, not the client's clock or timezone.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
  if (input.divulgar === 'data' && (typeof input.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.data) || !Number.isFinite(Date.parse(input.data)) || new Date(input.data).toISOString().slice(0, 10) !== input.data || input.data < today)) throw new ReportError(400, 'Invalid date');
  return { id: recordID(`approval:${guide.series}`), guide: guide.series, reason: 'approval', page_path: guideHome(guide),
    divulgar: input.divulgar, ...(input.divulgar === 'data' ? { data: input.data } : {}), resumos: input.resumos,
    blurb_approved_at_approval: guide.presentation.blurb_approved === true && !!guide.presentation.blurb,
    ts: now.toISOString() };
}
export class ApprovalStore {
  constructor(directory) { this.store = new FileReportStore(directory); }
  async get(series) { return this.store.get(recordID(`approval:${series}`)); }
  async create(record) { await this.store.create(record); return this.get(record.guide); }
}
/** Durable operator inbox. No external messages are sent without configuring a channel. */
export class OperatorInbox {
  constructor(directory) { this.store = new FileReportStore(directory); }
  async approval(guide, record) {
    return this.store.create({ id: recordID(`notice:approval:${guide.series}`), guide: guide.series, reason: 'approval_notice', page_path: guideHome(guide), ts: record.ts,
      message: `Guia aprovado · ${guide.title} · ${record.divulgar} · resumos ${record.resumos}` });
  }
  async opened(guide, tokenHash, request, now = new Date(), showcase = false) {
    const ua = request.headers['user-agent'] ?? '';
    if (/facebookexternalhit|Facebot|WhatsApp|TelegramBot|Slackbot|Discordbot|LinkedInBot|Twitterbot/i.test(ua) || /(?:^|;\s*)er_ops=1(?:;|$)/.test(request.headers.cookie ?? '')) return;
    const origin = /Instagram/i.test(ua) ? 'Instagram' : /FBAN|FBAV|Facebook/i.test(ua) ? 'Facebook' : 'navegador';
    const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'celular' : 'desktop';
    const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(now);
    const id = recordID(`notice:open:${guide.series}:${tokenHash}${showcase ? `:${origin}:${device}` : ''}`);
    const prior = await this.store.get(id);
    if (prior && now.getTime() - Date.parse(prior.ts) < 6 * 60 * 60 * 1000) return;
    await this.store.put({ id, guide: guide.series, reason: 'open_notice', page_path: showcase ? `/guia/v/${guide.publisher}` : guideHome(guide), ts: now.toISOString(), message: `${showcase ? 'Vitrine aberta' : 'Prévia aberta'} · ${guide.title} · ${origin} · ${device} · ${time}` });
  }
}
