import { mkdir, readFile, rename, open, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolvePosition } from './position.mjs';
import { guideRoute } from './routes.mjs';
import { cardSnapshot } from './snapshots.mjs';
import { cutEntities, guidePath, reportFields, renderGuide } from './guide.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ReportError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function reportRecord(guide, input) {
  const guidePath = `/guia/${guide.series}`;
  if (!input || !uuid.test(input.id) || !['spoiler', 'wrong', 'missing'].includes(input.reason)
    || !['card', 'sheet', 'guia'].includes(input.scope)) throw new ReportError(400, 'Invalid report');
  const path = input.page_path;
  if (typeof path !== 'string' || !(path === guidePath || path.startsWith(`${guidePath}/`))) throw new ReportError(400, 'Invalid page');
  const route = guideRoute(guide, path);
  if (route.type === 'not_found') throw new ReportError(400, 'Invalid page');
  const query = input.view_query ?? '';
  if (typeof query !== 'string' || query.length > 256) throw new ReportError(400, 'Invalid view');
  const view = new URLSearchParams(query);
  for (const [key, value] of view) {
    if (view.getAll(key).length !== 1 || !({ n: /^(?:[1-9]\d{0,5})$/, arco: /^[1-9]\d{0,3}\.[1-9]\d{0,3}$/, livro: /^[1-9]\d{0,3}$/, estado: /^(?:aberto|abertos|resolvidos|todos)$/, resumos: /^0$/ }[key]?.test(value))) throw new ReportError(400, 'Invalid view');
  }
  const viewGuide = { ...guide, hideSummaries: guide.state === 'private' && view.get('resumos') === '0' };
  const subject = route.entity?.slug;
  const clean = input.l == null && input.c == null;
  const resolved = clean ? { state: 'clean' } : resolvePosition(guide, new URLSearchParams({ l: input.l, c: input.c }));
  if (!['clean', 'positioned'].includes(resolved.state)) throw new ReportError(400, 'Invalid position');
  const position = resolved.position ?? null;
  const entity = position && cutEntities(viewGuide, position).find(entity => entity.slug === input.entity);
  if (input.scope === 'sheet' && !entity) throw new ReportError(400, 'Unavailable card');
  if (input.scope === 'sheet' && input.card !== 'sheet') throw new ReportError(400, 'Invalid sheet');
  if (input.scope === 'card') {
    if (!position || typeof input.card !== 'string' || !/^[a-z_]+$/.test(input.card)) throw new ReportError(400, 'Unavailable card');
    if (route.type === 'entity' && (!entity || subject !== entity.slug)) throw new ReportError(400, 'Unavailable card');
    if (route.type !== 'entity' && input.entity != null) throw new ReportError(400, 'Unavailable card');
    const renderURL = new URL(path, 'https://enrichreader.com');
    renderURL.search = view; renderURL.searchParams.set('l', String(position.l)); renderURL.searchParams.set('c', position.c);
    const rendered = renderGuide(viewGuide, renderURL);
    if (!rendered.includes(`data-scope="card" data-card="${input.card}"`)) throw new ReportError(400, 'Unavailable card');
  }
  if (input.scope === 'guia' && (input.entity != null || input.card != null)) throw new ReportError(400, 'Invalid guide scope');
  const variants = ['ahead', 'behind', 'nomemory', 'invalid', 'notbuilt'];
  if (input.alert_variant != null && !variants.includes(input.alert_variant)) throw new ReportError(400, 'Invalid alert');
  return {
    id: input.id.toLowerCase(), guide: guide.series, guide_state: guide.state,
    view_query: view.toString(), page_path: path, page_type: route.type === 'home' ? position ? 'painel' : 'gate' : route.type,
    scope: input.scope, card: input.scope === 'guia' ? null : input.card,
    entity: entity?.slug ?? null,
    fields: input.scope === 'guia' ? [] : input.scope === 'sheet' || input.card === 'ficha' ? reportFields(guide, entity, position, input.scope) : cardSnapshot(viewGuide, route, cutEntities(viewGuide, position), position, input.card, entity, new URL(`${path}?${view}&l=${position.l}&c=${position.c}`, 'https://enrichreader.com')),
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
  async #temporary(record) {
    const path = join(this.directory, `${record.id}.${randomUUID()}.tmp`);
    const handle = await open(path, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(record) + '\n'); await handle.sync(); }
    catch (error) { await unlink(path); throw error; }
    finally { await handle.close(); }
    return path;
  }
  async #syncDirectory() {
    const handle = await open(this.directory, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
  }
  create(record) {
    return this.#serialize(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const path = join(this.directory, `${record.id}.json`);
      const temporary = await this.#temporary(record);
      try { await link(temporary, path); await this.#syncDirectory(); }
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
    try { return JSON.parse(await readFile(join(this.directory, `${id.toLowerCase()}.json`), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  put(record) {
    if (!uuid.test(record.id)) throw new ReportError(400, 'Invalid record id');
    return this.#serialize(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = await this.#temporary(record);
      try { await rename(temporary, join(this.directory, `${record.id}.json`)); await this.#syncDirectory(); }
      finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    });
  }
  detail(id, detail) {
    if (!uuid.test(id) || typeof detail !== 'string' || !detail.trim() || detail.length > 255) {
      throw new ReportError(400, 'Invalid detail');
    }
    return this.#serialize(async () => {
      const path = join(this.directory, `${id.toLowerCase()}.json`);
      let record;
      try { record = JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') throw new ReportError(404, 'Unknown report'); throw error; }
      record.detail = detail;
      const temporary = await this.#temporary(record);
      await rename(temporary, path);
      await this.#syncDirectory();
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
