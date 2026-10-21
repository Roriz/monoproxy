import { readFile } from 'node:fs/promises';
import { validateGuideConfig } from './config-validation.mjs';
import { validateMap } from './map-validation.mjs';
import { validateThreadMap } from './thread-map.mjs';
import { isListed } from './states.mjs';
const root = new URL('../../data/web-guide/', import.meta.url);
const read = async file => {
  if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error('Invalid catalog artifact path');
  return JSON.parse(await readFile(new URL(file, root), 'utf8'));
};
// Artifacts default to `<series>[-suffix].json`; an entry may name a file explicitly. Context is opt-in
// (`"context": true` or a file name) so a draft sitting in data/web-guide never reaches a guide's pages.
const artifact = (entry, key, suffix, optional = false) => read(typeof entry[key] === 'string' ? entry[key] : `${entry.series}${suffix}.json`)
  .catch(error => { if (optional && error.code === 'ENOENT') return null; throw error; });
export async function loadCatalog() {
  const entries = (await read('catalog.json')).map(entry => typeof entry === 'string' ? { series: entry } : entry);
  const guides = await Promise.all(entries.map(async entry => {
    const [guide, presentation, context, baseline] = await Promise.all([artifact(entry, 'data', ''), artifact(entry, 'presentation', '-presentation'), entry.context ? artifact(entry, 'context', '-context') : null, artifact(entry, 'baseline', '-map-baseline')]);
    if (guide.series !== entry.series) throw new Error('Catalog identity mismatch');
    guide.presentation = presentation;
    guide.context = context;
    guide.state = guide.presentation.state ?? guide.state;
    guide.ownership = guide.presentation.ownership ?? guide.ownership;
    guide.look = { ...guide.look, ...guide.presentation.look, cover: guide.presentation.assets?.cover?.path ?? null };
    validateMap(guide, baseline);
    if (guide.context?.story) {
      const threadMap = await artifact(entry, 'thread_map', '-thread-map', true);
      if (!threadMap) throw new Error('Story catalog needs permanent mystery URLs');
      validateThreadMap(guide.context.story.threads, threadMap);
    }
    validateGuideConfig(guide);
    return guide;
  }));
  if (new Set(guides.map(guide => guide.series)).size !== guides.length) throw new Error('Duplicate catalog slug');
  return guides;
}
export const publicGuides = guides => guides.filter(isListed).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
