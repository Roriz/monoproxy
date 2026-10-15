// Vendored from reader-app/src/lib/data/story_codec.js, 2026-10-13.
// Source SHA-256 recorded in docs/web-guide-implementation.md.
/**
 * Decoder for the story layer of a skin (`skins/{uuid}/story/`, schema 1).
 *
 * Mirrors skin-maker's `docs/story_codec.ts`, the reader contract for the layer. Everything in
 * it is positional: an item says where it may first be shown as `[chapter seq, scene index]`
 * inside its volume, and the reader compares that against where the person is. Nothing
 * verbatim from the book ships; evidence is a skin block id (`at`) the reader can highlight.
 *
 * The second half of this module is the reader's own bridge from that contract to the DOM:
 * scene spans are skin block ids, the prose carries volume block ids, and the enrichment
 * step wrote the mapping between them onto each block (`skins_block_id`).
 */

// ── Positions ──────────────────────────────────────────────────────────────

/** @typedef {[number, number]} Position `[chapter seq within the volume, scene index within the chapter]` */

/**
 * @param {Position} a
 * @param {Position} b
 * @returns {number}
 */
export function comparePos(a, b) {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

/**
 * True when an item revealed at `at` may be shown to a reader standing at `pos`.
 * @param {Position|undefined} at
 * @param {Position} pos
 */
export function visible(at, pos) {
  return !!at && comparePos(at, pos) <= 0;
}

// ── Index ──────────────────────────────────────────────────────────────────

/** @param {unknown} value */
export function isStoryIndex(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.schema === 1 &&
    typeof value.volumes === 'object' &&
    value.volumes !== null
  );
}

/**
 * The story volume a skin chapter belongs to, and the chapter's seq inside it.
 *
 * Story volumes are the pipeline's own namespaces (`v-lotm-1`), not the reader's, so the only
 * way from a chapter to its volume is through each volume's chapter list.
 *
 * @param {Object} index Parsed `story/index.json`
 * @param {string} skinChapterId
 * @returns {{volume: string, entry: Object, seq: number}|null}
 */
export function findStoryVolume(index, skinChapterId) {
  if (!index || !skinChapterId) return null;
  for (const [volume, entry] of Object.entries(index.volumes)) {
    const seq = entry.chapters?.indexOf(skinChapterId) ?? -1;
    if (seq >= 0) return { volume, entry, seq };
  }
  return null;
}

/**
 * The chunk holding a chapter's scenes: chunks are cut by the chapter's global index in
 * `skin.json.chapter_ids`, the same way `chunks/<id>/` is.
 * @param {number} globalIndex
 * @param {number} [chunkSize]
 */
export function chunkIdOf(globalIndex, chunkSize = 100) {
  return String(Math.floor(globalIndex / chunkSize) * chunkSize);
}

// ── Threads ────────────────────────────────────────────────────────────────

/**
 * What a reader at `pos` may know about a thread, or null when it has not been raised yet.
 * @param {string} id
 * @param {Object} t Packed thread
 * @param {Position} pos
 */
export function threadAt(id, t, pos) {
  if (!t?.raised || !visible(t.raised.p, pos)) return null;
  const shown = (t.answers ?? []).filter((a) => visible(a.p, pos));
  const view = {
    id,
    kind: t.k,
    question: t.q,
    importance: t.imp ?? 0,
    entities: t.ents ?? [],
    raisedAt: t.raised.at,
    /** Where the reader's knowledge of it last changed; what "recent" sorts on. */
    lastSeen: shown.length ? shown[shown.length - 1].p : t.raised.p
  };
  if (shown.length) view.answer = shown[shown.length - 1].text;
  if (t.closed && visible(t.closed.p, pos)) {
    view.closed = { answer: t.closed.answer, twist: t.closed.twist, at: t.closed.at };
    view.lastSeen = t.closed.p;
  }
  return view;
}

/**
 * @param {Object} file Parsed `threads.json`
 * @param {Position} pos
 */
export function visibleThreads(file, pos) {
  const out = [];
  for (const [id, t] of Object.entries(file?.threads ?? {})) {
    const v = threadAt(id, t, pos);
    if (v) out.push(v);
  }
  return out;
}

/**
 * The open threads worth a briefing card: highest stakes first, then the ones the reader
 * touched most recently, capped so the card stays a glance and not a ledger.
 * @param {Object} file Parsed `threads.json`
 * @param {Position} pos
 * @param {number} [limit]
 */
export function openThreads(file, pos, limit = 5) {
  return visibleThreads(file, pos)
    .filter((t) => !t.closed)
    .sort((a, b) => b.importance - a.importance || comparePos(b.lastSeen, a.lastSeen))
    .slice(0, limit);
}

// ── Arcs ───────────────────────────────────────────────────────────────────

/**
 * What a reader at `pos` may know about an arc, or null before its first scene.
 *
 * The working name is the only title until the arc's last scene is read; the true name, the
 * description and the arc's end are revealed together there. Knowing where an arc ends is
 * itself a tell, so it stays hidden with the rest.
 *
 * @param {Object} a Packed arc
 * @param {Position} pos
 */
export function arcAt(a, pos) {
  if (!visible(a?.reveal?.wn, pos)) return null;
  const complete = visible(a.reveal.name, pos);
  const view = {
    id: a.id,
    title: complete && a.name ? a.name : a.wn,
    start: a.start,
    complete
  };
  if (complete) {
    view.description = a.desc;
    view.end = a.end;
  }
  if (visible(a.reveal.peak, pos)) view.peak = a.peak;
  return view;
}

/**
 * The top-level arc the reader is inside at `pos`, as they may see it. Sub-arcs (`parent`
 * set) are structure for other surfaces; the briefing names the macro arc.
 * @param {Object} file Parsed `arcs.json`
 * @param {Position} pos
 */
export function activeArc(file, pos) {
  const seq = pos[0];
  const arc = (file?.arcs ?? []).find((a) => a.parent == null && a.start <= seq && seq <= a.end);
  return arc ? arcAt(arc, pos) : null;
}
