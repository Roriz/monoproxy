import { internalURL, completedIndex, storyItems, itemAt, itemLabel } from './position.mjs';
export const guideHome = guide => `/guia/${guide.series}`;
export const guideURL = guide => `https://enrichreader.com${guideHome(guide)}`;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const placeholders = /^(unknown|none\.?|not applicable\.?|not specified.*|não especificado.*)$/i;
const stateFields = new Set(['display_name', 'aliases', 'status', 'location', 'occupation']);
export const previewRoles = new Map([['protagonist', 'Protagonista'], ['antagonist', 'Antagonista']]);
export const completedOrdinal = completedIndex;
export const guideEntities = guide => [...guide.entities, ...(guide.context?.world ?? [])];
export const currentItem = (guide, position) => storyItems(guide).find(item => item.l === position.l && String(item.bookOrdinal) === position.c);
export const positionHref = (path, position) => {
  const url = internalURL(path, position);
  return escape(url.pathname + url.search);
};

/** Fold only included deltas. Never seed from a profile's final facts or global role. */
export function cutEntities(guide, position) {
  const last = completedOrdinal(guide, position);
  return guideEntities(guide).filter(entity => !(guide.presentation?.hidden_entities ?? []).includes(entity.slug)).flatMap(entity => {
    const facts = {};
    const sources = {};
    const changes = {};
    let first = null;
    for (const version of entity.versions) {
      if (version.ordinal > last || version.ordinal > (guide.presentation?.freeze_after?.[entity.slug] ?? Infinity)) break;
      first ??= version.ordinal;
      for (const field of version.remove) { delete facts[field]; delete sources[field]; delete changes[field]; }
      for (const [field, value] of Object.entries(version.set)) {
        const isNew = facts[field] === undefined;
        // Reviewed corrections can alter the delta without refreshing its marker metadata.
        const changed = version.changed?.includes(field) || JSON.stringify(facts[field]) !== JSON.stringify(value);
        changes[field] = isNew ? 'new' : changed ? 'changed' : null;
        facts[field] = value;
        sources[field] = version.ordinal;
      }
    }
    if (!first || !facts.display_name) return [];
    for (const field of guide.presentation?.hidden_fields?.[entity.slug] ?? []) { delete facts[field]; delete sources[field]; }
    for (const [field, value] of Object.entries(facts)) {
      if (Array.isArray(value)) facts[field] = value.filter(entry => entry != null && (typeof entry !== 'string' || entry.trim() && !placeholders.test(entry.trim())));
      if (value == null || (typeof value === 'string' && (!value.trim() || placeholders.test(value.trim())))) {
        delete facts[field]; delete sources[field];
      }
      if (Array.isArray(facts[field]) && !facts[field].length) { delete facts[field]; delete sources[field]; }
    }
    if (!facts.display_name) return [];
    return [{ slug: entity.slug, classification: entity.classification ?? 'person', facts, sources, changes, first }];
  }).sort((a, b) => a.facts.display_name.localeCompare(b.facts.display_name, 'en'));
}

export function positionLabel(guide, position) {
  return position.c === 'fim' ? `Terminei o Livro ${position.l}` : `${guide.books.length > 1 ? `L${position.l} · ` : ''}${itemLabel(currentItem(guide, position))}`;
}

export function source(guide, entity, field, position, dense = false) {
  const ordinal = entity.sources[field];
  const item = itemAt(guide, ordinal);
  const last = completedOrdinal(guide, position);
  const newEntity = entity.first === last;
  const kind = newEntity ? (field === 'display_name' ? 'new' : null)
    : stateFields.has(field) && ordinal === last ? entity.changes[field] : null;
  const inline = `${item.l !== position.l ? `L${item.l} · ` : ''}${itemLabel(item, true)}`;
  const article = item.gender === 'f' ? 'na' : 'no';
  const text = kind ? `✦ ${kind === 'new' ? 'novo' : 'mudou'} ${article} ${inline}`
    : dense || !stateFields.has(field) ? inline : `desde ${item.gender === 'f' ? 'a' : 'o'} ${inline}`;
  return `<span class="source${kind ? ' source-loud' : ''}"><span aria-hidden="true">${escape(text)}</span><span class="sr-only">${escape(text.replace('cap.', 'capítulo'))}</span></span>`;
}
