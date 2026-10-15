import { readFile } from 'node:fs/promises';
import { validateGuideConfig } from './config-validation.mjs';
import { validateMap } from './map-validation.mjs';
import { validateThreadMap } from './thread-map.mjs';
const root = new URL('../../data/web-guide/', import.meta.url);
const read = async file => {
  if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error('Invalid catalog artifact path');
  return JSON.parse(await readFile(new URL(file, root), 'utf8'));
};
export async function loadCatalog() {
  const entries = await read('catalog.json');
  const guides = await Promise.all(entries.map(async entry => {
    const guide = await read(entry.data);
    if (guide.series !== entry.series) throw new Error('Catalog identity mismatch');
    guide.presentation = await read(entry.presentation);
    guide.context = entry.context ? await read(entry.context) : null;
    guide.state = guide.presentation.state ?? guide.state;
    guide.ownership = guide.presentation.ownership ?? guide.ownership;
    guide.look = { ...guide.look, ...guide.presentation.look, cover: guide.presentation.assets?.cover?.path ?? null };
    validateMap(guide, await read(entry.baseline));
    if (guide.context?.story) {
      if (!entry.thread_map) throw new Error('Story catalog needs permanent mystery URLs');
      validateThreadMap(guide.context.story.threads, await read(entry.thread_map));
    }
    validateGuideConfig(guide);
    return guide;
  }));
  if (new Set(guides.map(guide => guide.series)).size !== guides.length) throw new Error('Duplicate catalog slug');
  return guides;
}
export const publicGuides = guides => guides.filter(guide => guide.state === 'public').sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
