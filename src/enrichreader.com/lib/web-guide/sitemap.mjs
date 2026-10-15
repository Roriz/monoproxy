import { publicGuides } from './catalog.mjs';
import { authorsAvailable } from './marketing.mjs';
import { entityPath } from './context.mjs';
import { escape } from './content.mjs';

export function guideSitemapPaths(guides, site) {
  const listed = publicGuides(guides);
  const paths = listed.flatMap(guide => {
    const intros = guide.ownership === 'own' ? Object.entries(guide.presentation?.entity_intros ?? {}).filter(([slug, intro]) => intro.approved && !(guide.presentation.hidden_entities ?? []).includes(slug)) : [];
    return [`/guia/${guide.series}`, ...intros.map(([slug]) => entityPath(guide, [...guide.entities, ...(guide.context?.world ?? [])].find(entity => entity.slug === slug))), ...(intros.length >= 3 ? [`/guia/${guide.series}/mundo`] : [])];
  });
  if (listed.length >= 3) paths.push('/guia');
  if (authorsAvailable(site)) paths.push('/autores');
  return paths;
}
export function guideSitemapXML(paths, date = new Date().toISOString().slice(0, 10)) {
  return paths.map(path => `<url><loc>https://enrichreader.com${escape(path)}</loc><lastmod>${date}</lastmod></url>`).join('');
}
