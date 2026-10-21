import { mkdir, readdir, readFile, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { syncDirectory, temporaryFile, replaceFile } from './durable.mjs';
import { resolvePosition } from './position.mjs';
import { guideRoute } from './routes.mjs';
import { cardSnapshot } from './snapshots.mjs';
import { cutEntities, reportFields, renderGuide } from './guide.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const viewKeys = { n: /^(?:[1-9]\d{0,5})$/, arco: /^[1-9]\d{0,3}\.[1-9]\d{0,3}$/, livro: /^[1-9]\d{0,3}$/, estado: /^(?:aberto|abertos|resolvidos|todos)$/, resumos: /^0$/ };
const alertVariants = ['ahead', 'behind', 'nomemory', 'invalid', 'notbuilt'];
export class ReportError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function reportRecord(guide, input) {
  if (!input || !uuid.test(input.id) || !['spoiler', 'wrong', 'missing'].includes(input.reason)
    || !['card', 'sheet', 'guia'].includes(input.scope)) throw new ReportError(400, 'Invalid report');
  const path = input.page_path;
  const route = typeof path === 'string' ? guideRoute(guide, path) : { type: 'not_found' };
  if (route.type === 'not_found') throw new ReportError(400, 'Invalid page');
  const query = input.view_query ?? '';
  if (typeof query !== 'string' || query.length > 256) throw new ReportError(400, 'Invalid view');
  const view = new URLSearchParams(query);
  for (const [key, value] of view) {
    if (view.getAll(key).length !== 1 || !viewKeys[key]?.test(value)) throw new ReportError(400, 'Invalid view');
  }
  const viewGuide = { ...guide, hideSummaries: guide.state === 'private' && view.get('resumos') === '0' };
  const subject = route.entity?.slug;
  const clean = input.l == null && input.c == null;
  const resolved = clean ? { state: 'clean' } : resolvePosition(guide, new URLSearchParams({ l: input.l, c: input.c }));
  if (!['clean', 'positioned'].includes(resolved.state)) throw new ReportError(400, 'Invalid position');
  const position = resolved.position ?? null;
  const entities = position ? cutEntities(viewGuide, position) : [];
  const entity = entities.find(entity => entity.slug === input.entity);
  if (input.scope === 'sheet' && !entity) throw new ReportError(400, 'Unavailable card');
  if (input.scope === 'sheet' && input.card !== 'sheet') throw new ReportError(400, 'Invalid sheet');
  let viewURL;
  if (input.scope === 'card') {
    if (!position || typeof input.card !== 'string' || !/^[a-z_]+$/.test(input.card)) throw new ReportError(400, 'Unavailable card');
    if (route.type === 'entity' && (!entity || subject !== entity.slug)) throw new ReportError(400, 'Unavailable card');
    if (route.type !== 'entity' && input.entity != null) throw new ReportError(400, 'Unavailable card');
    viewURL = new URL(path, 'https://enrichreader.com');
    viewURL.search = view; viewURL.searchParams.set('l', String(position.l)); viewURL.searchParams.set('c', position.c);
    if (!renderGuide(viewGuide, viewURL).includes(`data-scope="card" data-card="${input.card}"`)) throw new ReportError(400, 'Unavailable card');
  }
  if (input.scope === 'guia' && (input.entity != null || input.card != null)) throw new ReportError(400, 'Invalid guide scope');
  if (input.alert_variant != null && !alertVariants.includes(input.alert_variant)) throw new ReportError(400, 'Invalid alert');
  return {
    id: input.id.toLowerCase(), guide: guide.series, guide_state: guide.state,
    view_query: view.toString(), page_path: path, page_type: route.type === 'home' ? position ? 'painel' : 'gate' : route.type,
    scope: input.scope, card: input.scope === 'guia' ? null : input.card,
    entity: entity?.slug ?? null,
    fields: input.scope === 'guia' ? [] : input.scope === 'sheet' || input.card === 'ficha' ? reportFields(guide, entity, position, input.scope) : cardSnapshot(viewGuide, route, entities, position, input.card, entity, viewURL),
    l: position?.l ?? null, c: position?.c ?? null,
    alert_variant: input.alert_variant ?? null, reason: input.reason,
    detail: '', ts: new Date().toISOString(),
  };
}

/** One private file per report. Details replace the file atomically; no public read API. */
export class FileReportStore {
  #queue = Promise.resolve();
  constructor(directory) { this.directory = directory; }
  #serialize(operation) {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => {});
    return result;
  }
  #path(id) { return join(this.directory, `${id.toLowerCase()}.json`); }
  create(record) {
    return this.#serialize(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const path = this.#path(record.id);
      const temporary = await temporaryFile(path, JSON.stringify(record) + '\n');
      try { await link(temporary, path); await syncDirectory(this.directory); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const existing = JSON.parse(await readFile(path, 'utf8'));
        // Retry after a lost response returns the existing receipt, never a second row.
        for (const key of ['guide', 'page_path', 'scope', 'card', 'entity', 'l', 'c', 'reason']) {
          if (existing[key] !== record[key]) throw new ReportError(409, 'Report id already used');
        }
        if ((existing.view_query ?? '') !== (record.view_query ?? '')) throw new ReportError(409, 'Report id already used');
        return false;
      }
      finally { await unlink(temporary); }
      return true;
    });
  }
  async get(id) {
    if (!uuid.test(id)) throw new ReportError(400, 'Invalid record id');
    try { return JSON.parse(await readFile(this.#path(id), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  /** Every record, oldest first. Operator-only: never exposed over HTTP. */
  async list() {
    let files;
    try { files = await readdir(this.directory); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const records = await Promise.all(files.filter(file => /^[0-9a-f-]+\.json$/i.test(file)).map(async file => JSON.parse(await readFile(join(this.directory, file), 'utf8'))));
    return records.sort((a, b) => a.ts.localeCompare(b.ts));
  }
  put(record) {
    if (!uuid.test(record.id)) throw new ReportError(400, 'Invalid record id');
    return this.#serialize(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await replaceFile(this.#path(record.id), JSON.stringify(record) + '\n');
    });
  }
  detail(id, detail) {
    if (!uuid.test(id) || typeof detail !== 'string' || !detail.trim() || detail.length > 255) {
      throw new ReportError(400, 'Invalid detail');
    }
    return this.#serialize(async () => {
      const record = await this.get(id);
      if (!record) throw new ReportError(404, 'Unknown report');
      await replaceFile(this.#path(id), JSON.stringify({ ...record, detail }) + '\n');
    });
  }
}

export class ReportLimiter {
  constructor({ limit = 20, windowMs = 600000, now = Date.now } = {}) {
    this.limit = limit; this.windowMs = windowMs; this.now = now; this.counters = new Map();
  }
  allow(ip, guide) {
    const now = this.now();
    for (const [key, value] of this.counters) if (value.until <= now) this.counters.delete(key);
    const key = `${guide}:${ip}`;
    const value = this.counters.get(key) ?? { count: 0, until: now + this.windowMs };
    if (value.count >= this.limit) return false;
    value.count++; this.counters.set(key, value); return true;
  }
}

export async function reportJSON(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new ReportError(415, 'Expected JSON');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new ReportError(413, 'Report too large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ReportError(400, 'Invalid JSON'); }
}
