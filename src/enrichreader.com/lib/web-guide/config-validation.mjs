import { validateMap } from './map-validation.mjs';
import { resolvePosition, storyItems } from './position.mjs';
import { cutEntities, guideEntities } from './content.mjs';
import { cutStory, hasName } from './context.mjs';
import { proseChips } from './views.mjs';
import { isPublished } from './states.mjs';

export function validateGuideConfig(guide) {
  validateMap(guide);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.series) || !guide.title || !Array.isArray(guide.authors) || !guide.authors.length) throw new Error('Missing guide identity');
  if (!['public', 'private', 'unlisted', 'taken_down'].includes(guide.state)) throw new Error('Invalid guide state');
  if (!['own', 'third_party', 'public-domain'].includes(guide.ownership)) throw new Error('Invalid guide ownership');
  const config = guide.presentation ?? {};
  for (const book of guide.books) for (const item of book.items ?? []) {
    if (item.retired && !book.items.some(value => value.ordinal === item.replacement_ordinal && !value.retired)) throw new Error('Retired chapter needs a live replacement ordinal');
  }
  const builtBooks = guide.books.filter(book => book.status !== 'announced');
  if (!builtBooks.length || builtBooks.some((book, index) => book.l !== index + 1)) throw new Error('Guide needs built books starting at one without gaps');
  if (guide.ownership === 'third_party' && guide.state !== 'unlisted' && guide.state !== 'taken_down') throw new Error('Third-party guides must be unlisted');
  if (config.blurb != null && (typeof config.blurb !== 'string' || config.blurb.length > 600)) throw new Error('Invalid book-one blurb');
  if (guide.state === 'public' && guide.ownership !== 'public-domain' && (!config.blurb || config.blurb_approved !== true)) throw new Error('Public author guide requires approved blurb');
  if (guide.ownership === 'own' && isPublished(guide) && !['autores', 'editora'].includes(config.approved_by)) throw new Error('Published own guide needs an approval actor');
  if (guide.ownership === 'third_party' && (!config.publisher?.name || !config.publisher?.store_url)) throw new Error('Third-party guide needs publisher metadata');
  if (config.publisher?.store_url && !['https:', 'http:'].includes(new URL(config.publisher.store_url).protocol)) throw new Error('Invalid publisher store');
  const sourceOrdinals = new Set(storyItems(guide).map(item => item.ordinal));
  const entities = guideEntities(guide);
  const slugs = new Set();
  for (const entity of entities) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.slug) || slugs.has(entity.slug)) throw new Error('Invalid or repeated entity slug');
    slugs.add(entity.slug);
    if (entity.classification != null && !['person', 'location', 'organization', 'object', 'other'].includes(entity.classification)) throw new Error('Invalid entity class');
    if (!Array.isArray(entity.versions) || !entity.versions.length || typeof entity.versions[0].set?.display_name !== 'string' || !entity.versions[0].set.display_name.trim()) throw new Error('Entity needs an attributed first name');
    let prior = 0;
    for (const version of entity.versions) {
      if (!version.set || typeof version.set !== 'object' || Array.isArray(version.set) || !Array.isArray(version.remove)) throw new Error('Invalid entity delta');
      if (version.set.aliases != null && (!Array.isArray(version.set.aliases) || version.set.aliases.some(value => typeof value !== 'string'))) throw new Error('Invalid printed aliases');
      if (version.ordinal < prior || !sourceOrdinals.has(version.ordinal)) throw new Error('Invalid version source');
      prior = version.ordinal;
    }
  }
  for (const slug of config.hidden_entities ?? []) if (!slugs.has(slug)) throw new Error('Unknown hidden entity');
  for (const [slug, ordinal] of Object.entries(config.freeze_after ?? {})) if (!slugs.has(slug) || !Number.isSafeInteger(ordinal) || ordinal < 1) throw new Error('Invalid freeze');
  for (const link of config.links ?? []) {
    if (!['store', 'launch', 'site', 'social'].includes(link.kind) || !link.label || !['https:', 'http:'].includes(new URL(link.url).protocol)) throw new Error('Invalid author link');
  }
  const intros = Object.entries(config.entity_intros ?? {});
  if (intros.length > 8 || guide.ownership !== 'own' && intros.length) throw new Error('Invalid intro set');
  const allowed = intros.map(([slug]) => entities.find(entity => entity.slug === slug)?.versions[0]?.set.display_name).filter(Boolean);
  const universe = new Set(guide.aliasUniverse ?? []);
  for (const entity of entities) for (const version of entity.versions) for (const name of [version.set.display_name, ...(Array.isArray(version.set.aliases) ? version.set.aliases : [])].filter(value => typeof value === 'string')) universe.add(name);
  for (const [slug, intro] of intros) {
    if (!slugs.has(slug) || intro.approved !== true || typeof intro.text !== 'string' || !intro.text.trim() || intro.text.length > 140) throw new Error('Invalid or unapproved intro');
    const safeNames = [...allowed, ...[...universe].filter(name => config.blurb_approved && hasName(config.blurb, name))];
    const pattern = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeSpans = safeNames.flatMap(name => [...intro.text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${pattern(name)}(?![\\p{L}\\p{N}])`, 'giu'))].map(match => [match.index, match.index + match[0].length]));
    for (const name of universe) {
      const matches = [...intro.text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${pattern(name)}(?![\\p{L}\\p{N}])`, 'giu'))];
      if (matches.some(match => !safeSpans.some(([start, end]) => start <= match.index && end >= match.index + match[0].length))) throw new Error(`Intro names an unapproved identity: ${name}`);
    }
  }
  if (guide.state !== 'private') return;
  const tour = config.tour;
  if (!tour || !slugs.has(tour.entity) || tour.start?.l !== tour.forward?.l || tour.start?.l !== 1) throw new Error('Missing valid private tour');
  for (const position of [tour.start, tour.forward]) if (resolvePosition(guide, new URLSearchParams(position)).state !== 'positioned' || position.c === 'fim') throw new Error('Invalid tour position');
  if (Number(tour.forward.c) <= Number(tour.start.c)) throw new Error('Tour must move forward');
  const entity = entities.find(entity => entity.slug === tour.entity);
  const debut = entity.versions[0].ordinal;
  if (debut !== 1 && !(config.blurb && hasName(config.blurb, entity.versions[0].set.display_name))) throw new Error('Tour entity is not page-one safe');
  if (Number(tour.start.c) <= debut) throw new Error('Tour starts before entity debut');
  const scenes = cutStory(guide, tour.start).scenes.filter(scene => scene.summary).slice(-3).reverse();
  const atStart = cutEntities(guide, tour.start);
  const first = scenes[0];
  if (!first || !proseChips(guide, first.summary, first.ordinal, atStart, tour.start, new Set(), first.cast).includes(`data-preview="preview-${tour.entity}"`)) throw new Error('Tour entity is not a chip in recap item one');
  const forward = cutStory(guide, tour.forward).scenes.filter(scene => scene.summary).slice(-3);
  if (!forward.length || forward.some(scene => scene.ordinal < Number(tour.start.c))) throw new Error('Tour forward recap does not fully change');
}
