import { completedOrdinal, cutEntities } from './content.mjs';
import { storyItems, positionAfter } from './position.mjs';
import { activeArc, arcAt } from './story-codec.mjs';

export const classNames = { person: 'Pessoa', location: 'Lugar', organization: 'Organização', object: 'Objeto', other: '' };
export const classPaths = { person: 'pessoa', location: 'lugar', organization: 'organizacao', object: 'objeto', other: 'outro' };
export const threadKinds = { mystery: 'Mistério', threat: 'Ameaça', goal: 'Objetivo' };
export const entityPath = (guide, entity) => `/guia/${guide.series}/${classPaths[entity.classification ?? 'person']}/${entity.slug}`;
export const chapterPath = (guide, ordinal) => {
  const item = storyItems(guide).find(item => item.ordinal === ordinal);
  return `/guia/${guide.series}/tempo/livro-${item.l}/cap-${item.bookOrdinal}`;
};
export const threadPath = (guide, thread) => `/guia/${guide.series}/misterios/${thread.slug}`;
export const knownNames = entity => [entity.facts.display_name, ...(Array.isArray(entity.facts.aliases) ? entity.facts.aliases : [])].filter(name => typeof name === 'string' && name.trim());
const regexText = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const hasName = (text, name) => new RegExp(`(?<![\\p{L}\\p{N}])${regexText(name)}(?![\\p{L}\\p{N}])`, 'iu').test(text);

/** Story projection explicitly omits final importance, unrevealed closure and future answers. */
export function cutStory(guide, position) {
  const last = completedOrdinal(guide, position);
  const story = guide.context?.story;
  if (!story || !last) return { scenes: [], threads: [], arcs: [], arc: null, curve: [] };
  const summaries = guide.presentation?.summaries !== false && !guide.hideSummaries;
  const scenes = story.scenes.filter(scene => scene.ordinal <= last).map(scene => ({
    id: scene.id, ordinal: scene.ordinal, index: scene.index,
    summary: summaries ? scene.summary : null, tension: scene.tension,
    cast: scene.cast.filter(slug => !(guide.presentation?.hidden_entities ?? []).includes(slug)),
    setting: scene.setting, setting_name: scene.setting_name, pov: scene.pov,
  }));
  const threads = story.threads.filter(thread => thread.raised <= last && !(guide.presentation?.hidden_threads ?? []).includes(thread.id)).map(thread => {
    const rate = thread.importance.filter(value => value.ordinal <= last).at(-1);
    if (!rate) throw new Error('Missing chapter-local thread importance');
    const entries = thread.answers.filter(value => value.ordinal <= last).map(({ text, ordinal, scene, quote }) => ({ text, ordinal, scene, quote }));
    const closures = [...(thread.closures ?? []), ...(thread.closed ? [thread.closed] : [])].filter(value => value.ordinal <= last);
    const events = [...closures.map(value => ({ ...value, kind: 'close' })), ...(thread.revivals ?? []).filter(value => value.ordinal <= last).map(value => ({ ordinal: value.ordinal, scene: value.scene, kind: 'revive' }))]
      .sort((a, b) => a.ordinal - b.ordinal || (a.scene ?? 0) - (b.scene ?? 0) || Number(a.kind === 'revive') - Number(b.kind === 'revive'));
    const event = events.at(-1);
    const closed = event?.kind === 'close' ? event : null;
    for (const closure of closures) {
      const laterRevival = events.some(value => value.kind === 'revive' && (value.ordinal > closure.ordinal || value.ordinal === closure.ordinal && (value.scene ?? 0) >= (closure.scene ?? 0)));
      if (laterRevival && !entries.some(entry => entry.ordinal === closure.ordinal && entry.scene === closure.scene && entry.text === closure.answer)) entries.push({ text: closure.answer, ordinal: closure.ordinal, scene: closure.scene, quote: closure.quote });
    }
    entries.sort((a, b) => a.ordinal - b.ordinal || (a.scene ?? 0) - (b.scene ?? 0));
    const answer = entries.at(-1);
    return { id: thread.id, slug: thread.slug, kind: thread.kind, question: thread.question,
      raised: thread.raised, raise_quote: thread.raise_quote, importance: rate.value, entries,
      answer: answer ? { text: answer.text, ordinal: answer.ordinal, scene: answer.scene, quote: answer.quote } : null,
      closed: closed ? { answer: closed.answer, ordinal: closed.ordinal, scene: closed.scene, quote: closed.quote } : null,
      latest: Math.max(event?.ordinal ?? 0, answer?.ordinal ?? 0, thread.raised) };
  });
  const packed = { arcs: story.arcs ?? [] };
  const pos = [last, Number.MAX_SAFE_INTEGER];
  // The app codec decides reveals. Never hand an unrevealed end or peak to a view.
  const arc = activeArc(packed, pos);
  const arcs = packed.arcs.map(value => arcAt(value, pos)).filter(Boolean).map(({ id, title, start, complete, end, description }) => ({ id, title, start, complete, ...(complete ? { end, description } : {}) }));
  return { scenes, threads, arcs, arc: arc ? arcs.find(value => value.id === arc.id) : null,
    curve: story.curve.filter(point => point.ordinal <= last).map(point => ({ ordinal: point.ordinal, tension: point.tension })) };
}

export function castAt(guide, entities, position) {
  const last = completedOrdinal(guide, position);
  const rows = guide.context?.mentions ?? [];
  const row = rows.find(value => value.ordinal === last);
  const present = new Set(row?.present ?? []);
  const totals = new Map();
  for (const item of rows.filter(value => value.ordinal <= last)) for (const [slug, count] of Object.entries(item.counts)) totals.set(slug, (totals.get(slug) ?? 0) + count);
  return entities.filter(entity => entity.classification === 'person' && present.has(entity.slug)).sort((a, b) => Number(b.first === last) - Number(a.first === last) || (row.counts[b.slug] ?? 0) - (row.counts[a.slug] ?? 0) || (totals.get(b.slug) ?? 0) - (totals.get(a.slug) ?? 0) || a.first - b.first || a.facts.display_name.localeCompare(b.facts.display_name)).slice(0, 8);
}

export function presenceAt(guide, entity, position) {
  const last = completedOrdinal(guide, position);
  const items = new Set((guide.context?.mentions ?? []).filter(row => row.ordinal <= last && row.present.includes(entity.slug)).map(row => row.ordinal));
  if (entity.classification === 'location') for (const scene of cutStory(guide, position).scenes) if (scene.setting === entity.slug) items.add(scene.ordinal);
  return [...items].sort((a, b) => a - b);
}

export function connectionsAt(guide, entity, position) {
  const counts = new Map();
  for (const scene of cutStory(guide, position).scenes) {
    if (!scene.cast.includes(entity.slug)) continue;
    for (const slug of scene.cast) if (slug !== entity.slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return cutEntities(guide, position).filter(other => counts.has(other.slug)).sort((a, b) => counts.get(b.slug) - counts.get(a.slug)).slice(0, 6);
}

export function threadsFor(guide, entity, position) {
  return cutStory(guide, position).threads.filter(thread => {
    const atRaise = cutEntities(guide, positionAfter(guide, thread.raised)).find(value => value.slug === entity.slug);
    return atRaise && knownNames(atRaise).some(name => hasName(thread.question, name));
  });
}
