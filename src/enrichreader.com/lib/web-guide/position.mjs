/** U0 position rules. This module has no browser state or content fetching. */
const integer = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

export function releaseLabel(book) {
  return typeof book.release === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(book.release)
    ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${book.release}-01T12:00:00Z`)).replace(' de ', ' ') : null;
}
export function announcedNotice(book) {
  const release = releaseLabel(book);
  return `O guia do Livro ${book.l} ainda não está pronto.${release ? ` O livro sai em ${release}.` : ''}`;
}
export function partLabel(item) {
  if (Number.isSafeInteger(item.part) && item.part > 0 || typeof item.part === 'string' && /^(?:[1-9]\d*|[IVXLCDM]+)$/i.test(item.part)) return `Parte ${item.part}`;
  return '';
}
export function itemLabel(item, inline = false) {
  const part = partLabel(item);
  return `${part ? `${part} · ` : ''}${inline ? item.label.replace('Cap.', 'cap.') : item.label}`;
}

/** Server story sources use one serial index; URLs retain per-book ordinals. */
export function storyItems(map) {
  let offset = 0;
  return map.books.flatMap(book => {
    if (book.status === 'announced') return [];
    const items = book.items.map(item => ({ ...item, l: book.l, bookOrdinal: item.ordinal, ordinal: offset + item.ordinal }));
    offset += book.last_ordinal ?? book.items.at(-1).ordinal;
    return items;
  });
}

export function completedIndex(map, position) {
  const book = map.books.find(book => book.l === position.l);
  if (!book || book.status === 'announced') throw new Error('Invalid story position');
  const offset = map.books.filter(value => value.l < book.l && value.status !== 'announced').reduce((sum, value) => sum + (value.last_ordinal ?? value.items.at(-1).ordinal), 0);
  return offset + (position.c === 'fim' ? book.last_ordinal ?? book.items.at(-1).ordinal : Number(position.c) - 1);
}

/** Position immediately after a source item, without adding a growing end cut. */
export function positionAfter(map, ordinal) {
  const source = storyItems(map).find(item => item.ordinal === ordinal);
  if (!source) throw new Error('Unknown source item');
  const book = map.books.find(book => book.l === source.l);
  const next = book.items.find(item => item.ordinal > source.bookOrdinal);
  if (next) return { l: book.l, c: String(next.ordinal) };
  if (book.status === 'complete') return { l: book.l, c: 'fim' };
  throw new Error('Ongoing final item has no included boundary');
}

/** Invalid positions stay clean; never guess or clamp a reader's position. */
export function resolvePosition(map, search) {
  const params = new URLSearchParams(search);
  if (!params.has('l') && !params.has('c')) return { state: 'clean' };
  if (params.getAll('l').length > 1 || params.getAll('c').length !== 1) {
    return { state: 'invalid' };
  }
  const built = map.books.filter(book => book.status !== 'announced');
  const rawBook = params.get('l') ?? (built.length === 1 ? String(built[0].l) : null);
  if (!integer(rawBook)) return { state: 'invalid' };
  const book = map.books.find(book => book.l === Number(rawBook));
  if (!book) return { state: 'invalid' };
  if (book.status === 'announced') return { state: 'notbuilt', l: book.l };
  const c = params.get('c');
  if (c === 'fim') {
    if (book.status !== 'complete') return { state: 'invalid' };
  } else if (!integer(c) || !book.items.some(item => item.ordinal === Number(c)) && !(book.retired_ordinals ?? []).includes(Number(c))) {
    return { state: 'invalid' };
  }
  return { state: 'positioned', position: { l: book.l, c: c === 'fim' ? c : String(Number(c)) } };
}

/**
 * Build-side boundary, never a content payload. A cut_before is a permanent,
 * opaque boundary supplied by the confirmed map, including for retired items.
 * end_cut is the fixed end boundary required for a complete book.
 * The next book's first item must use the previous book's end_cut.
 */
export function resolveCut(map, position) {
  const resolved = resolvePosition(map, new URLSearchParams(position));
  if (resolved.state !== 'positioned') throw new Error('Invalid guide position');
  const book = map.books.find(book => book.l === resolved.position.l);
  const boundary = resolved.position.c === 'fim'
    ? book.end_cut
    : book.items.find(item => item.ordinal === Number(resolved.position.c)).cut_before;
  if (typeof boundary !== 'string' || !boundary) throw new Error('Missing confirmed cut boundary');
  return boundary;
}

/** Explicit allowlist: no spine ids, titles, cuts, or retired stops reach the picker. */
export function pickerMap(map) {
  return {
    series: map.series,
    books: map.books.map(book => {
      const publicBook = { l: book.l, status: book.status, release: book.release ?? null };
      if (book.status !== 'announced') {
        publicBook.last_ordinal = book.items.at(-1).ordinal;
        const retired = book.items.filter(item => item.retired).map(item => item.ordinal);
        if (retired.length) publicBook.retired_ordinals = retired;
        publicBook.items = book.items.filter(item => !item.retired).map(item => ({
          ordinal: item.ordinal, label: item.label, kind: item.kind,
          number: item.number, part: item.part, gender: item.gender,
        }));
      }
      return publicBook;
    }),
  };
}

/** Commit on the current page retains its campaign parameters. */
export function commitURL(currentURL, position, { preserveTimeline = false } = {}) {
  const url = new URL(currentURL);
  url.searchParams.set('l', String(position.l));
  url.searchParams.set('c', String(position.c));
  if (!preserveTimeline) url.searchParams.delete('n');
  url.searchParams.delete('book');
  return url;
}

/** Internal navigation carries only position; clean shares are the default. */
export function internalURL(path, position = null) {
  const url = new URL(path, 'https://enrichreader.com');
  if (url.origin !== 'https://enrichreader.com') throw new Error('Expected a guide path');
  url.search = '';
  url.hash = '';
  if (position) {
    if (position.l != null && position.c != null) {
      url.searchParams.set('l', String(position.l));
      url.searchParams.set('c', String(position.c));
    }
    if (position.k) url.searchParams.set('k', position.k);
    if (position.resumos === '0') url.searchParams.set('resumos', '0');
  }
  return url;
}

export function shareURL(path, position = null) {
  const url = internalURL(path, position && { l: position.l, c: position.c });
  url.searchParams.set('utm_source', 'share');
  return url;
}

/** Author links keep existing attribution and fragments; social links stay untouched. */
export function authorURL(link, series) {
  const url = new URL(link.url);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Expected an HTTP author link');
  if (link.utm !== false && ['store', 'launch', 'site'].includes(link.kind)
    && ![...url.searchParams.keys()].some(key => key.startsWith('utm_'))) {
    url.searchParams.set('utm_source', 'enrichreader');
    url.searchParams.set('utm_medium', 'guia');
    url.searchParams.set('utm_campaign', series);
  }
  return url;
}
