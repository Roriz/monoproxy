import { storyItems } from './position.mjs';

/** Past-only, per-book run projection; dense books never ship one flag per item. */
export function appearanceSegments(guide, present, last) {
  const items = storyItems(guide).filter(item => item.ordinal <= last);
  const books = [...new Set(items.map(item => item.l))];
  const available = 312 - Math.max(0, books.length - 1) * 4;
  let x = 4;
  return books.map(l => {
    const included = items.filter(item => item.l === l);
    const start = included[0].ordinal, end = included.at(-1).ordinal;
    const width = available * included.length / items.length;
    const runs = [];
    for (const ordinal of present.filter(ordinal => ordinal >= start && ordinal <= end)) {
      const previous = runs.at(-1);
      if (previous && ordinal === previous[1] + 1) previous[1] = ordinal;
      else runs.push([ordinal, ordinal]);
    }
    const segment = { l, start, end, x, width, runs };
    x += width + 4;
    return segment;
  });
}

export function appearanceMarks(segments) {
  return segments.map(segment => {
    const { start, end, x, width, runs } = segment;
    const spacing = end === start ? width : width / (end - start);
    const at = ordinal => x + (ordinal - start) * spacing;
    const track = `<path d="M${x} 12h${width}"/>`;
    const marks = runs.map(([first, last]) => spacing < 1
      ? `<rect x="${at(first)}" y="9" width="${Math.max(2, at(last) - at(first))}" height="6" rx="3"/>`
      : Array.from({ length: last - first + 1 }, (_, index) => spacing < 11
        ? `<rect x="${at(first + index) - 1}" y="7" width="2" height="10"/>`
        : `<circle cx="${at(first + index)}" cy="12" r="4"/>`).join('')).join('');
    return track + marks;
  }).join('');
}
