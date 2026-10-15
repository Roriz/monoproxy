/** Shared browser/server matching. Keys contain only text printed at the current cut. */
export const normalize = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
const matches = (field, words) => words.every(word => normalize(field).split(' ').some(value => value.startsWith(word)));
export function searchHit(keys, query) {
  const normalized = normalize(query);
  const words = normalized.split(' ').filter(Boolean);
  if (!words.length) return null;
  const alias = keys.aliases.find(value => matches(value, words));
  const exactAlias = keys.aliases.some(value => normalize(value) === normalized);
  if (matches(keys.name, words)) return { field: 'name', priority: normalize(keys.name) === normalized ? 0 : exactAlias ? 1 : 2 };
  if (alias) return { field: 'alias', alias, priority: exactAlias ? 1 : 2 };
  if (words.every(word => word.length >= 3) && matches(keys.description, words)) return { field: 'description', priority: 3 };
  return null;
}
export function searchRows(rows, query) {
  return rows.map((row, index) => ({ ...row, hit: searchHit(row.keys, query), index })).filter(row => row.hit).sort((a, b) => a.hit.priority - b.hit.priority || a.index - b.index);
}

/** Original-text ranges, so accent folding never changes printed names. */
export function highlightParts(value, query) {
  const text = String(value ?? '');
  const words = normalize(query).split(' ').filter(Boolean);
  const ranges = [];
  for (const match of text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
    const word = normalize(match[0]);
    const length = Math.max(0, ...words.filter(prefix => word.startsWith(prefix)).map(prefix => prefix.length));
    if (!length) continue;
    let folded = 0, end = 0;
    for (const char of match[0]) {
      if (folded >= length && !/\p{M}/u.test(char)) break;
      folded += normalize(char).length;
      end += char.length;
    }
    ranges.push([match.index, match.index + end]);
  }
  const parts = [];
  let offset = 0;
  for (const [start, end] of ranges) {
    if (start > offset) parts.push({ text: text.slice(offset, start), marked: false });
    parts.push({ text: text.slice(start, end), marked: true });
    offset = end;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset), marked: false });
  return parts;
}
