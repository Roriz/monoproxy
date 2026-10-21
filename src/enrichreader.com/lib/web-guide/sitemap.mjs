import { publicGuides } from './catalog.mjs';
import { authorsAvailable } from './marketing.mjs';
import { entityPath } from './context.mjs';
import { escape, guideEntities, guideHome } from './content.mjs';

export function guideSitemapPaths(guides, site) {
  const listed = publicGuides(guides);
  const paths = listed.flatMap(guide => {
    const intros = guide.ownership === 'own' ? Object.entries(guide.presentation?.entity_intros ?? {}).filter(([slug, intro]) => intro.approved && !(guide.presentation.hidden_entities ?? []).includes(slug)) : [];
    return [guideHome(guide), ...intros.map(([slug]) => entityPath(guide, guideEntities(guide).find(entity => entity.slug === slug))), ...(intros.length >= 3 ? [`${guideHome(guide)}/mundo`] : [])];
  });
  if (listed.length >= 3) paths.push('/guia');
  if (authorsAvailable(site)) paths.push('/autores');
  return paths;
}
// Omit lastmod until we have reliable per-page content modification dates.
export function guideSitemapXML(paths) {
  return paths.map(path => `<url><loc>https://enrichreader.com${escape(path)}</loc></url>`).join('');
}
