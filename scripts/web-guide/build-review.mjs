import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { guideLook, contrast } from '../../src/enrichreader.com/lib/web-guide/look.mjs';
import { cutEntities, escape } from '../../src/enrichreader.com/lib/web-guide/content.mjs';
import { validateGuideConfig } from '../../src/enrichreader.com/lib/web-guide/config-validation.mjs';
const root = new URL('../../src/enrichreader.com/data/web-guide/', import.meta.url);
const guide = JSON.parse(await readFile(new URL('frankenstein.json', root)));
guide.presentation = JSON.parse(await readFile(new URL('frankenstein-presentation.json', root)));
guide.context = JSON.parse(await readFile(new URL('frankenstein-context.json', root)));
guide.state = guide.presentation.state ?? guide.state;
guide.ownership = guide.presentation.ownership ?? guide.ownership;
const output = new URL('../../tmp/web-guide-audit/', import.meta.url);
await mkdir(output, { recursive: true, mode: 0o700 });
let configResult;
try { validateGuideConfig(guide); configResult = 'Passou'; } catch (error) { configResult = error.message; }
const label = ordinal => guide.books[0].items.find(item => item.ordinal === ordinal)?.label ?? 'Sem fonte';
const token = process.env.WEB_GUIDE_REVIEW_TOKEN;
if (token && !/^[a-zA-Z0-9_-]{22,128}$/.test(token)) throw new Error('Invalid review token');
const deepLink = (path, ordinal) => {
  const url = new URL(`/guia/${guide.series}${path}`, 'https://enrichreader.com');
  if (token) url.searchParams.set('k', token);
  url.searchParams.set('l', '1'); url.searchParams.set('c', ordinal === guide.books[0].items.length ? 'fim' : String(ordinal + 1));
  return `<a href="${escape(url.href)}">${escape(label(ordinal))}</a>`;
};
const section = (title, content) => `<section><h2>${title}</h2>${content}</section>`;
const pre = data => `<pre>${escape(JSON.stringify(data, null, 2))}</pre>`;
const entities = [...guide.entities, ...guide.context.world];
const fields = ['display_name', 'aliases', 'status', 'location', 'occupation'];
const stateRows = entities.map(entity => `<details><summary>${escape(entity.slug)}</summary><table><thead><tr><th>Fonte</th><th>Campo</th><th>Valor</th></tr></thead><tbody>${entity.versions.flatMap(version => fields.filter(key => Object.hasOwn(version.set, key)).map(key => `<tr><td>${deepLink(`/${entity.classification === 'location' ? 'lugar' : 'pessoa'}/${entity.slug}`, version.ordinal)}</td><td>${key}</td><td>${escape(JSON.stringify(version.set[key]))}</td></tr>`)).join('')}</tbody></table></details>`).join('');
const laterNames = [];
const nameSources = new Map();
for (const entity of entities) for (const version of entity.versions) for (const value of [version.set.display_name, ...(Array.isArray(version.set.aliases) ? version.set.aliases : [])].filter(value => typeof value === 'string' && value.length > 2)) nameSources.set(value.toLowerCase(), Math.min(nameSources.get(value.toLowerCase()) ?? Infinity, version.ordinal));
const scan = (id, text, ordinal) => {
  for (const [name, first] of nameSources) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (ordinal < first && new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(text)) laterNames.push({ id, ordinal, name, first });
  }
};
for (const scene of guide.context.story.scenes) if (scene.summary) scan(scene.id, scene.summary, scene.ordinal);
for (const thread of guide.context.story.threads) {
  scan(thread.id, thread.question, thread.raised);
  for (const entry of thread.answers) scan(thread.id, entry.text, entry.ordinal);
  if (thread.closed) scan(thread.id, thread.closed.answer, thread.closed.ordinal);
}
for (const entity of entities) for (const version of entity.versions) for (const key of fields) if (version.set[key]) scan(`${entity.slug}.${key}`, JSON.stringify(version.set[key]), version.ordinal);
const merges = [];
for (const entity of guide.entities) {
  const previousWords = new Set(); let previousName;
  for (const version of entity.versions) {
    const occupation = version.set.occupation;
    const words = typeof occupation === 'string' ? occupation.toLowerCase().split(/\W+/).filter(word => word.length > 2) : [];
    if (words.length && previousWords.size && !words.some(word => previousWords.has(word))) merges.push({ entity: entity.slug, ordinal: version.ordinal, field: 'occupation', value: occupation });
    words.forEach(word => previousWords.add(word));
    if (version.set.display_name && previousName && version.set.display_name.split(/\s+/).at(-1) !== previousName.split(/\s+/).at(-1)) merges.push({ entity: entity.slug, ordinal: version.ordinal, field: 'display_name', value: version.set.display_name });
    previousName = version.set.display_name ?? previousName;
  }
}
const duplicateNames = []; const seenPairs = new Set();
for (let ordinal = 1; ordinal <= 28; ordinal++) {
  const names = new Map();
  for (const entity of cutEntities(guide, { l: 1, c: ordinal === 28 ? 'fim' : String(ordinal + 1) })) {
    const other = names.get(entity.facts.display_name);
    if (other && !seenPairs.has(`${other}:${entity.slug}`)) { duplicateNames.push({ first: ordinal, name: entity.facts.display_name, slugs: [other, entity.slug] }); seenPairs.add(`${other}:${entity.slug}`); }
    names.set(entity.facts.display_name, entity.slug);
  }
}
const look = guideLook(guide.look);
const closures = guide.context.story.threads.filter(thread => thread.closed).map(thread => ({ id: thread.id, question: thread.question, ...thread.closed }));
const sections = [
  section('1. Mapa de capítulos', `${pre(guide.books)}<p>Configuração: ${escape(configResult)}</p>`),
  section('2. Aparência', `${pre(guide.look)}${pre({ button: contrast(look.colors['text-on-sapphire'], look.colors['brand-primary']), accent: contrast(look.colors['brand-accent'], look.colors['surface-base']) })}`),
  section('3. Linha dos campos de estado', '<p>Os lugares vieram do pacote e não fizeram parte da revisão de campos de pessoas em 10 de outubro.</p>' + stateRows),
  section('4. Nomes conhecidos mais tarde', pre(laterNames)),
  section('5. Possíveis mesclas', pre(merges)),
  section('6. Mesmo nome impresso', pre(duplicateNames)),
  section('7. Entidades ocultas e ruído', pre({ hidden: guide.presentation.hidden_entities ?? [], exclusions: guide.context.review_exclusions })),
  section('8. Placeholders e enums', pre({ enums: guide.presentation.enums ?? { alive: 'Vivo', dead: 'Morto', missing: 'Desaparecido' }, statuses: [...new Set(entities.flatMap(entity => entity.versions.flatMap(version => version.set.status ? [version.set.status] : [])))] })),
  section('9. Percurso de demonstração', pre({ tour: guide.presentation.tour ?? null, config_check: configResult })),
  section('10. Sinopse, apresentações e links', pre({ blurb: guide.presentation.blurb ?? null, blurb_approved: guide.presentation.blurb_approved ?? false, intros: guide.presentation.entity_intros ?? {}, links: guide.presentation.links })),
  section('11. Catálogo do app', pre({ app_published: guide.presentation.app_published })),
  section('12. Autor fundador', pre({ fundador: guide.presentation.fundador ?? false })),
  section('13. Respostas de encerramento', pre(closures)),
  section('14. Perguntas ocultas', pre(guide.presentation.hidden_threads ?? [])),
  section('15. Mapa permanente das perguntas', pre(JSON.parse(await readFile(new URL('frankenstein-thread-map.json', root))))),
];
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Revisão local · ${escape(guide.title)}</title><style>body{max-width:1000px;margin:32px auto;font:16px/1.5 system-ui;padding:16px}section{border-top:1px solid #ccc;padding:24px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{padding:8px;text-align:left;border-bottom:1px solid #ddd}details{margin:12px 0}</style></head><body><h1>Revisão local · ${escape(guide.title)}</h1><p>Arquivo do operador. Nunca publicar nem incluir na pasta do site.</p>${sections.join('')}</body></html>`;
await writeFile(new URL(`revisao-${guide.series}.html`, output), html, { mode: 0o600 });
await writeFile(new URL('review-findings.json', output), JSON.stringify({ laterNames, merges, duplicateNames, closures: closures.length }, null, 2), { mode: 0o600 });
console.log(`Local review written to tmp/web-guide-audit/revisao-${guide.series}.html`);
