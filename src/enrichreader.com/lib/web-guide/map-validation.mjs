/** Build-time guard for already published URL boundaries. Never serve this file. */
export function validateMap(map, previous = null) {
  if (!map.series || !Array.isArray(map.books) || !map.books.length) throw new Error('Missing chapter map');
  const books = new Set();
  for (const book of map.books) {
    if (!Number.isSafeInteger(book.l) || book.l < 1 || books.has(book.l)) throw new Error('Invalid book number');
    books.add(book.l);
    if (book.release != null && (typeof book.release !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(book.release))) throw new Error('Invalid release month');
    if (!['complete', 'ongoing', 'announced'].includes(book.status)) throw new Error('Invalid book status');
    if (book.status === 'announced') {
      if (book.items?.length || book.end_cut) throw new Error('Announced book has content');
      continue;
    }
    if (!book.items?.length || !book.items.some(item => !item.retired)) throw new Error('Built book has no live stops');
    if (book.last_ordinal != null && book.last_ordinal !== book.items.at(-1).ordinal) throw new Error('Invalid permanent book span');
    if (book.retired_ordinals?.some(ordinal => !book.items.some(item => item.ordinal === ordinal && item.retired))) throw new Error('Invalid retired boundary');
    const ordinals = new Set();
    for (const [index, item] of book.items.entries()) {
      if (!Number.isSafeInteger(item.ordinal) || item.ordinal < 1 || ordinals.has(item.ordinal)) throw new Error('Invalid ordinal');
      if (item.ordinal !== index + 1) throw new Error('Permanent ordinals must remain consecutive, including retired stops');
      ordinals.add(item.ordinal);
      if (typeof item.label !== 'string' || !item.label.trim() || !item.cut_before || !['m', 'f'].includes(item.gender)) throw new Error('Incomplete story item');
      if (item.kind != null && !['chapter', 'prologue', 'interlude', 'epilogue', 'section'].includes(item.kind)) throw new Error('Invalid story item kind');
      if (item.number != null && (!Number.isSafeInteger(item.number) || item.number < 1)) throw new Error('Invalid printed item number');
      if (item.part != null && !(Number.isSafeInteger(item.part) && item.part > 0) && !(typeof item.part === 'string' && /^(?:letters|chapters|[1-9]\d*|[IVXLCDM]+)$/i.test(item.part))) throw new Error('Invalid printed part');
    }
    if (book.status === 'complete' && !book.end_cut) throw new Error('Complete book needs a fixed end');
  }
  for (let index = 1; index < map.books.length; index++) {
    const before = map.books[index - 1], book = map.books[index];
    if (book.l <= before.l) throw new Error('Books must stay in reading order');
    if (book.status !== 'announced' && (before.status !== 'complete' || book.items[0].cut_before !== before.end_cut)) throw new Error('Next book must continue the completed boundary');
  }
  if (!previous) return;
  if (map.series !== previous.series) throw new Error('Cannot replace a series map');
  for (const oldBook of previous.books) {
    const book = map.books.find(value => value.l === oldBook.l);
    if (!book) throw new Error('Cannot remove a book number');
    if (oldBook.status === 'announced') continue;
    if (book.status === 'announced') throw new Error('Cannot unbuild a book');
    if (oldBook.status === 'complete' && (book.status !== 'complete' || book.end_cut !== oldBook.end_cut || book.items.length !== oldBook.items.length)) throw new Error('Cannot grow a completed book');
    for (const old of oldBook.items) {
      const item = book.items.find(value => value.ordinal === old.ordinal);
      if (!item || item.cut_before !== old.cut_before) throw new Error('Cannot remove or move a permanent boundary');
      if (old.retired && !item.retired) throw new Error('Cannot reuse a retired ordinal');
    }
    const oldOrder = oldBook.items.map(item => item.ordinal);
    if (book.items.slice(0, oldOrder.length).some((item, index) => item.ordinal !== oldOrder[index])) throw new Error('Cannot reorder existing ordinals');
    if (book.items.slice(oldOrder.length).some(item => item.ordinal <= Math.max(...oldOrder))) throw new Error('New ordinals must append');
  }
}
