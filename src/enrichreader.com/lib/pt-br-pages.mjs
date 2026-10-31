// Static Brazilian Portuguese copies of the reader pages, at /pt-br/<path>, for search engines and AI
// crawlers that never run the in-browser switch. Each copy is the built English page with its text
// translated by static/i18n.js itself (loaded here with a stub DOM), so the copy says exactly what
// switching the English page in the browser shows. Hugo decides which pages get a copy
// (site.Params.ptBRPages): such a page declares an hreflang="pt-BR" alternate, and that is what
// this step looks for. scripts/web-guide/build-pt-br.mjs runs it after Hugo in bin/build.
import vm from 'node:vm';

export const prefix = '/pt-br';

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
// The same text, attribute and metadata rules as static/i18n.js (excludedSubtreeSelector,
// translatableAttributes and metadataSelector there).
const excludedTags = new Set(['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp', 'svg']);
const translatableAttributes = ['title', 'aria-label', 'placeholder', 'alt'];
const metadata = { name: ['description', 'title', 'twitter:title', 'twitter:description'], property: ['og:title', 'og:description'] };

const namedEntities = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', trade: '™',
  bull: '•', middot: '·', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“',
  rdquo: '”', laquo: '«', raquo: '»', times: '×', rarr: '→', larr: '←', harr: '↔', uarr: '↑', darr: '↓',
  deg: '°', eacute: 'é', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ',
  ccedil: 'ç', ecirc: 'ê', acirc: 'â', ocirc: 'ô', agrave: 'à', Eacute: 'É', Aacute: 'Á', Ccedil: 'Ç',
};
const decode = value => value.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([A-Za-z][A-Za-z0-9]*));/g, (entity, decimal, hex, name) => {
  if (decimal) return String.fromCodePoint(Number(decimal));
  if (hex) return String.fromCodePoint(parseInt(hex, 16));
  return Object.hasOwn(namedEntities, name) ? namedEntities[name] : entity;
});
const escapeText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = value => escapeText(value).replace(/"/g, '&quot;');
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();

// static/i18n.js run against a stub page: only its dictionary matching is used (translateValue).
export function createTranslator(runtimeSource, dictionaries) {
  const inert = () => {};
  const document = {
    readyState: 'loading', documentElement: { getAttribute: () => 'en' }, addEventListener: inert,
    querySelector: () => null, querySelectorAll: () => [],
  };
  const context = {
    document, navigator: { languages: ['en'] }, URL, URLSearchParams,
    MutationObserver: class { observe() {} },
    location: { href: 'https://enrichreader.com/', search: '' },
    localStorage: { getItem: () => null, setItem: inert },
    EnrichReaderTranslations: dictionaries,
  };
  context.window = context;
  vm.runInNewContext(runtimeSource, context, { filename: 'i18n.js' });
  const runtime = context.EnrichReaderI18n;
  if (typeof runtime?.translateValue !== 'function') throw new Error('static/i18n.js does not expose translateValue');
  return value => runtime.translateValue(value, 'pt-BR');
}

// The page's own inline dictionaries: window.EnrichReaderTranslations = { shared, page } (baseof.html).
export function pageDictionaries(html) {
  const script = html.match(/<script>(window\.EnrichReaderTranslations\s*=[\s\S]*?)<\/script>/);
  if (!script) throw new Error('Page has no inline translation dictionaries');
  const context = { window: {} };
  vm.runInNewContext(script[1], context);
  return context.window.EnrichReaderTranslations;
}

const attributePattern = /([^\s"'>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
// A start tag's attributes in order, with where each one sits in the tag.
function parseAttributes(tag) {
  const offset = tag.match(/^<[^\s/>]+/)[0].length;
  const body = tag.slice(offset).replace(/\/?>$/, '');
  return [...body.matchAll(attributePattern)].map(match => {
    const quoted = match[2];
    const raw = quoted === undefined ? '' : /^["']/.test(quoted) ? quoted.slice(1, -1) : quoted;
    return { name: match[1].toLowerCase(), value: decode(raw), start: offset + match.index, end: offset + match.index + match[0].length };
  });
}
function attributes(tag) {
  const found = new Map();
  for (const { name, value } of parseAttributes(tag)) if (!found.has(name)) found.set(name, value);
  return found;
}
// Replace (or with null, remove) one attribute in a start tag, leaving the rest of it as written.
function setAttribute(tag, name, value) {
  const existing = parseAttributes(tag).find(attribute => attribute.name === name);
  const written = value === null ? '' : `${name}="${escapeAttribute(value)}"`;
  if (existing) {
    const before = value === null ? tag.slice(0, existing.start).replace(/\s+$/, '') : tag.slice(0, existing.start);
    return before + written + tag.slice(existing.end);
  }
  return value === null ? tag : tag.replace(/\s*(\/?)>$/, ` ${written}$1>`);
}

const tokenPattern = /<!--[\s\S]*?-->|<(script|style|textarea)\b(?:"[^"]*"|'[^']*'|[^'">])*>[\s\S]*?<\/\1\s*>|<\/?[A-Za-z][^\s/>]*(?:"[^"]*"|'[^']*'|[^'">])*>|<![^>]*>|[^<]+|</g;

/**
 * The Portuguese copy of one built English page.
 * - englishURL / portugueseURL: absolute URLs of the two versions.
 * - localized: Map of English path → Portuguese path for every page with a copy (internal links).
 * - translate: value → Portuguese or null (createTranslator), for this page's dictionaries.
 * - untranslated: optional (value) callback for text and attribute values left as they were.
 */
export function localizePage(html, { englishURL, portugueseURL, localized, translate: translateValue, untranslated = () => {} }) {
  const translate = value => {
    const next = translateValue(value);
    if (next === null) untranslated(value);
    return next;
  };
  const origin = new URL(englishURL).origin;
  const localizedHref = href => {
    if (!/^(?:\/(?!\/)|https?:)/i.test(href)) return null;
    let url;
    try { url = new URL(href, englishURL); } catch { return null; }
    if (url.origin !== origin || !localized.has(url.pathname)) return null;
    const path = localized.get(url.pathname) + url.search + url.hash;
    return /^https?:/i.test(href) ? origin + path : path;
  };
  const exclusions = [];
  let output = html.replace(tokenPattern, token => {
    if (token.startsWith('<!') || token === '<' || /^<(?:script|style|textarea)\b/i.test(token)) return token;
    if (token[0] === '<') {
      const closing = token[1] === '/';
      const tag = token.match(/^<\/?([^\s/>]+)/)[1].toLowerCase();
      if (closing) {
        exclusions.forEach(entry => { if (entry.tag === tag) entry.depth -= 1; });
        for (let index = exclusions.length - 1; index >= 0; index -= 1) if (exclusions[index].depth <= 0) exclusions.splice(index, 1);
        return token;
      }
      const values = attributes(token);
      const opens = !voidTags.has(tag) && !/\/\s*>$/.test(token);
      if (opens) exclusions.forEach(entry => { if (entry.tag === tag) entry.depth += 1; });
      const excluded = excludedTags.has(tag) || values.has('data-i18n-ignore');
      if (!exclusions.length && !excluded) {
        const names = [...translatableAttributes];
        if (tag === 'meta' && (metadata.name.includes(values.get('name')) || metadata.property.includes(values.get('property')))) names.unshift('content');
        for (const name of names) {
          if (!values.has(name)) continue;
          const next = translate(values.get(name));
          if (next !== null && next !== values.get(name)) token = setAttribute(token, name, next);
        }
      }
      if (excluded && opens) exclusions.push({ tag, depth: 1 });

      if (tag === 'html') token = setAttribute(token, 'lang', 'pt-BR');
      else if (tag === 'link' && values.get('rel') === 'canonical') token = setAttribute(token, 'href', portugueseURL);
      else if (tag === 'meta' && values.get('property') === 'og:url') token = setAttribute(token, 'content', portugueseURL);
      else if (tag === 'meta' && values.get('property') === 'og:locale') token = setAttribute(token, 'content', 'pt_BR');
      else if (tag === 'meta' && values.get('property') === 'og:locale:alternate') token = setAttribute(token, 'content', 'en_US');
      else if (tag === 'a' && values.has('data-language-choice')) {
        // The language switch links the two versions: keep its targets, move the current marker.
        token = setAttribute(token, 'aria-current', values.get('data-language-choice') === 'pt-BR' ? 'true' : null);
      } else if (tag === 'a' && values.has('href') && !values.has('hreflang')) {
        const href = localizedHref(values.get('href'));
        if (href) token = setAttribute(token, 'href', href);
      }
      return token;
    }
    if (exclusions.length) return token;
    const value = decode(token);
    if (!normalize(value)) return token;
    const next = translate(value);
    return next === null || next === value ? token : escapeText(next);
  });
  if (exclusions.length) throw new Error(`Unclosed ${exclusions.map(entry => `<${entry.tag}>`).join(', ')} while localizing ${englishURL}`);
  output = output.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (_whole, open, data, close) =>
    open + JSON.stringify(localizeSchema(JSON.parse(data), { englishURL, portugueseURL, localizedHref, translate: translateValue, faq: faqItems(output) })).replace(/</g, '\\u003c') + close);
  return output;
}

// The visible FAQ, read the way layouts/partials/shared/faq-items.html reads it for the English page.
export function faqItems(html) {
  const section = html.match(/<section\b[^>]*\bid="faq"[^>]*>[\s\S]*?<\/section>/);
  if (!section) return [];
  const plain = value => normalize(decode(value.replace(/<[^>]*>/g, '')));
  return [...section[0].matchAll(/<(?:h3|dt)\b[^>]*>([\s\S]*?)<\/(?:h3|dt)>\s*<(?:p|dd)\b[^>]*>([\s\S]*?)<\/(?:p|dd)>/g)]
    .map(([, question, answer]) => ({ question: plain(question), answer: plain(answer) }))
    .filter(item => item.question && item.answer);
}

const trimTitle = value => value.replace(/\s*\|\s*EnrichReader\s*$/, '');
// The page's own WebPage node (software-schema.html) becomes the Portuguese page. Site-wide
// entities on the home page (organization, website, app) are shared by both versions and stay as they are.
function localizeSchema(schema, { englishURL, portugueseURL, localizedHref, translate, faq }) {
  const id = `${englishURL}#webpage`;
  const graph = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
  const page = graph.find(node => node?.['@id'] === id);
  if (!page) return schema;
  const text = value => (typeof value === 'string' ? translate(value) ?? value : value);
  const englishTitle = page.name;
  page['@id'] = `${portugueseURL}#webpage`;
  page.url = portugueseURL;
  page.inLanguage = 'pt-BR';
  page.name = text(page.name);
  page.description = text(page.description);
  for (const crumb of page.breadcrumb?.itemListElement ?? []) {
    const translated = translate(crumb.name);
    crumb.name = translated ?? (typeof englishTitle === 'string' && crumb.name === trimTitle(englishTitle) ? trimTitle(page.name) : crumb.name);
    const href = typeof crumb.item === 'string' ? localizedHref(crumb.item) : null;
    if (href) crumb.item = href;
  }
  if (page.mainEntity?.['@type'] === 'ItemList') for (const item of page.mainEntity.itemListElement ?? []) item.name = text(item.name);
  if (Array.isArray(page.mainEntity) && page.mainEntity.some(item => item?.['@type'] === 'Question')) {
    if (faq.length !== page.mainEntity.length) throw new Error(`${englishURL}: the Portuguese FAQ has ${faq.length} questions, the English FAQPage ${page.mainEntity.length}`);
    page.mainEntity.forEach((question, index) => {
      question.name = faq[index].question;
      question.acceptedAnswer.text = faq[index].answer;
    });
  }
  return schema;
}

// The absolute URL of a built page's Portuguese copy (its hreflang="pt-BR" alternate), or null.
export function portugueseAlternate(html) {
  const end = html.search(/<\/head>/i);
  const head = end < 0 ? html : html.slice(0, end);
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const values = attributes(tag);
    if (values.get('rel') === 'alternate' && values.get('hreflang') === 'pt-BR' && values.get('href')) return values.get('href');
  }
  return null;
}
