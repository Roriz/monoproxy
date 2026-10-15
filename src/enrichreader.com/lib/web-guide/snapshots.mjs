import { cutStory, castAt, presenceAt, connectionsAt, threadsFor } from './context.mjs';
import { completedOrdinal } from './content.mjs';
import { storyItems, itemLabel } from './position.mjs';
import { fichaRows, timelineView, quoteText, previousThreadEntries } from './views.mjs';
export function cardSnapshot(guide, route, entities, position, card, entity, viewURL) {
  const story = cutStory(guide, position);
  const last = completedOrdinal(guide, position);
  const items = storyItems(guide);
  const itemAt = ordinal => items.find(item => item.ordinal === ordinal);
  const field = (key, value, ordinal) => { const item = itemAt(ordinal); return { key, value, source: `${item.l}:${item.bookOrdinal}` }; };
  const scenes = story.scenes.filter(scene => scene.summary);
  if (card === 'ficha') return fichaRows(guide, entity).map(row => field(row.key, row.value, row.source));
  if (card === 'aparicoes') {
    const presence = presenceAt(guide, entity, position);
    return [field('count', presence.length, last), field('first', itemLabel(itemAt(presence[0])), presence[0]), field('latest', itemLabel(itemAt(presence.at(-1))), presence.at(-1))];
  }
  if (card === 'conexoes') return connectionsAt(guide, entity, position).map(other => field('entity', other.facts.display_name, last));
  if (card === 'historia') {
    const selected = scenes.filter(scene => scene.cast.includes(entity.slug) || entity.classification === 'location' && scene.setting === entity.slug).slice(-3).reverse();
    const threads = threadsFor(guide, entity, position);
    const shown = [...threads.filter(thread => !thread.closed).sort((a, b) => b.latest - a.latest).slice(0, 3), ...threads.filter(thread => thread.closed).sort((a, b) => b.closed.ordinal - a.closed.ordinal).slice(0, 2)];
    if (!selected.length && !shown.length && !guide.context?.story && entity.facts.chapter_summary && guide.presentation?.summaries !== false && !guide.hideSummaries) return [field('chapter_summary', entity.facts.chapter_summary, entity.sources.chapter_summary)];
    return [...selected.map(scene => field('scene', scene.summary, scene.ordinal)), ...shown.map(thread => field('question', thread.question, thread.raised))];
  }
  if (card === 'recap') {
    const recent = scenes.filter(scene => itemAt(scene.ordinal).l === itemAt(last).l).slice(-3).reverse();
    return recent.length ? recent.map(scene => field('summary', scene.summary, scene.ordinal)) : castAt(guide, entities, position).map(entity => field('entity', entity.facts.display_name, last));
  }
  if (card === 'cast') return castAt(guide, entities, position).map(entity => field('entity', entity.facts.display_name, last));
  if (card === 'threads') return story.threads.filter(thread => !thread.closed && thread.importance === 3 && itemAt(thread.raised).l === itemAt(last).l).sort((a, b) => b.raised - a.raised).slice(0, 3).map(thread => field('question', thread.question, thread.raised));
  if (card === 'curve') return story.curve.filter(point => point.ordinal >= story.arc.start).map(point => field('tension', point.tension, point.ordinal));
  if (card === 'tempo') {
    const rendered = timelineView(guide, entities, position, viewURL);
    return [...rendered.matchAll(/<li id="item-(\d+)"/g)].flatMap(match => {
      const ordinal = Number(match[1]);
      const gist = scenes.filter(scene => scene.ordinal === ordinal).sort((a, b) => b.tension - a.tension || a.index - b.index)[0];
      return [field('item', itemLabel(itemAt(ordinal)), ordinal), ...(gist ? [field('summary', gist.summary, ordinal)] : [])];
    });
  }
  if (route.type === 'chapter') {
    if (card === 'cenas') return scenes.filter(scene => scene.ordinal === route.item.ordinal).map(scene => field('scene', scene.summary, scene.ordinal));
    if (card === 'perguntas') return story.threads.filter(thread => thread.raised === route.item.ordinal).map(thread => field('question', thread.question, thread.raised));
    if (card === 'estreias') return entities.filter(entity => entity.first === route.item.ordinal).map(entity => field('entity', entity.facts.display_name, route.item.ordinal));
    if (card === 'quem_apareceu') return entities.filter(entity => guide.context.mentions.find(row => row.ordinal === route.item.ordinal)?.present.includes(entity.slug)).map(entity => field('entity', entity.facts.display_name, route.item.ordinal));
  }
  if (card === 'misterio') {
    const thread = story.threads.find(thread => thread.id === route.thread.id);
    const answer = thread.closed ? { text: thread.closed.answer, ordinal: thread.closed.ordinal, quote: thread.closed.quote } : thread.answer;
    return [field('question', thread.question, thread.raised), ...(answer ? [field('answer', answer.text, answer.ordinal)] : []), ...(answer?.quote && guide.ownership !== 'third_party' ? [field('answer_quote', quoteText(answer.quote), answer.ordinal)] : []), ...previousThreadEntries(thread).map(entry => field('previous_answer', entry.text, entry.ordinal)), ...(thread.raise_quote && guide.ownership !== 'third_party' ? [field('raise_quote', quoteText(thread.raise_quote), thread.raised)] : [])];
  }
  return [];
}
