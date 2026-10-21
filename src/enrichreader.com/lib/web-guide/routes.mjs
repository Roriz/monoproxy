import { storyItems } from './position.mjs';
import { classPaths } from './context.mjs';
import { guideEntities, guideHome } from './content.mjs';
export function guideRoute(guide, path) {
  const home = guideHome(guide);
  if (path !== home && !path.startsWith(`${home}/`)) return { type: 'not_found' };
  const tail = path.replace(/\/$/, '').slice(home.length);
  if (!tail) return { type: 'home', tab: 'painel' };
  if (tail === '/mundo') return { type: 'mundo', tab: 'mundo' };
  if (tail === '/misterios' && guide.context?.story) return { type: 'misterios', tab: 'misterios' };
  if (tail === '/tempo') return { type: 'tempo', tab: 'tempo' };
  const entityMatch = tail.match(/^\/(pessoa|lugar|organizacao|objeto|outro|personagens)\/([a-z0-9-]+)$/);
  if (entityMatch) {
    const entity = guideEntities(guide).find(entity => entity.slug === entityMatch[2]);
    const expected = entity && classPaths[entity.classification ?? 'person'];
    if (!entity || (entityMatch[1] !== expected && !(entityMatch[1] === 'personagens' && expected === 'pessoa')) || (guide.presentation?.hidden_entities ?? []).includes(entity.slug)) return { type: 'not_found' };
    return { type: 'entity', tab: 'mundo', entity, legacy: entityMatch[1] === 'personagens' };
  }
  const threadMatch = tail.match(/^\/misterios\/([1-9]\d*)$/);
  if (threadMatch) {
    const thread = guide.context?.story.threads.find(thread => thread.slug === threadMatch[1]);
    if (thread && !(guide.presentation?.hidden_threads ?? []).includes(thread.id)) return { type: 'misterio', tab: 'misterios', thread };
  }
  const chapterMatch = tail.match(/^\/tempo\/livro-([1-9]\d*)\/cap-([1-9]\d*)$/);
  if (chapterMatch) {
    const item = storyItems(guide).find(item => item.l === Number(chapterMatch[1]) && item.bookOrdinal === Number(chapterMatch[2]));
    if (item?.retired) {
      const target = guide.books.find(book => book.l === item.l).items.find(value => value.ordinal === item.replacement_ordinal && !value.retired);
      return target ? { type: 'chapter', tab: 'tempo', item, redirect: `${home}/tempo/livro-${item.l}/cap-${target.ordinal}` } : { type: 'not_found' };
    }
    if (item) return { type: 'chapter', tab: 'tempo', item };
  }
  return { type: 'not_found' };
}
