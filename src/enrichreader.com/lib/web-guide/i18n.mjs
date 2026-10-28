import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../../', import.meta.url));
export const webGuideTranslations = JSON.parse(readFileSync(resolve(site, 'data/translations/web-guide.json'), 'utf8'));
const runtimeSource = readFileSync(resolve(site, 'static/i18n.js'), 'utf8');

const decode = value => value.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, entity => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
})[entity]);
const escapeText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = value => escapeText(value).replace(/"/g, '&quot;');
const norm = value => value.replace(/\s+/g, ' ').trim();
const preserveEdges = (original, replacement) => `${(original.match(/^\s*/) ?? [''])[0]}${replacement}${(original.match(/\s*$/) ?? [''])[0]}`;
const reverse = new Map();
for (const [english, portuguese] of Object.entries(webGuideTranslations)) {
  const value = norm(portuguese);
  if (!value) continue;
  if (reverse.has(value) && reverse.get(value) !== english) reverse.set(value, null);
  else if (!reverse.has(value)) reverse.set(value, english);
}
for (const [value, english] of reverse) if (english === null) reverse.delete(value);

const templates = Object.entries(webGuideTranslations)
  .filter(([english, portuguese]) => /\{[a-zA-Z][\w]*\}/.test(english) && /\{[a-zA-Z][\w]*\}/.test(portuguese))
  .sort(([a], [b]) => norm(b.replace(/\{[a-zA-Z][\w]*\}/g, '')).length - norm(a.replace(/\{[a-zA-Z][\w]*\}/g, '')).length)
  .map(([english, portuguese]) => {
    const pattern = norm(portuguese);
    const names = [...pattern.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(match => match[1]);
    const pieces = pattern.split(/\{[a-zA-Z][\w]*\}/g).map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const captures = names.map(name => name === 'count' ? '(\\d[\\d,.]*)' : '([\\s\\S]+?)');
    const source = pieces.map((piece, index) => piece + (captures[index] ?? '')).join('');
    return { english, names, regex: new RegExp(`^${source}$`) };
  });
function translate(value) {
  const key = norm(value);
  if (reverse.has(key)) return reverse.get(key);
  const chapter = key.match(/^(cap(?:ítulo|\.)|carta)\s+(\d+)$/i);
  if (chapter) return `${chapter[1].toLowerCase().startsWith('carta') ? 'Letter' : 'Chapter'} ${chapter[2]}`;
  const book = key.match(/^livro\s+(\d+)(?:\s+·\s+em breve)?$/i);
  if (book) return `Book ${book[1]}${/em breve$/i.test(key) ? ' · Coming soon' : ''}`;
  const since = key.match(/^desde\s+(?:o|a)\s+(cap(?:ítulo|\.)|carta)\s+(\d+)$/i);
  if (since) return `since ${since[1].toLowerCase().startsWith('carta') ? 'Letter' : 'Chapter'} ${since[2]}`;
  for (const { english, names, regex } of templates) {
    const match = key.match(regex);
    if (!match) continue;
    let result = english;
    names.forEach((name, index) => { result = result.replace(`{${name}}`, translate(match[index + 1]) ?? match[index + 1]); });
    return norm(result);
  }
  return null;
}

function translateHTML(html) {
  const protectedStack = [];
  const englishStack = [];
  return html.replace(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g, token => {
    if (token.startsWith('<!--')) return token;
    if (token[0] === '<') {
      const closing = /^<\//.test(token);
      const tag = token.match(/^<\/?([\w-]+)/)?.[1]?.toLowerCase();
      if (!tag) return token;
      if (closing) {
        for (const stack of [protectedStack, englishStack]) {
          const index = stack.lastIndexOf(tag);
          if (index >= 0) stack.splice(index, 1);
        }
        return token;
      }
      const inProtected = protectedStack.length > 0;
      const inEnglish = englishStack.length > 0;
      const english = /\blang=["']en["']/i.test(token);
      if (!inProtected && !inEnglish && !english) {
        token = token.replace(/\b(title|aria-label|placeholder|alt|content)=("[^"]*"|'[^']*')/gi, (whole, name, quoted) => {
          const quote = quoted[0];
          const value = decode(quoted.slice(1, -1));
          const next = translate(value);
          return next === null ? whole : `${name}=${quote}${escapeAttribute(preserveEdges(value, next))}${quote}`;
        });
      }
      if (english && tag !== 'html' && !/\bdata-i18n-ignore\b/i.test(token)) token = token.replace(/\s*\/?>$/, suffix => ` data-i18n-ignore${suffix}`);
      if (!/\/\s*>$/.test(token) && !['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag)) {
        if (['script', 'style', 'noscript', 'code', 'pre', 'svg'].includes(tag)) protectedStack.push(tag);
        if (english) englishStack.push(tag);
      }
      return token;
    }
    if (protectedStack.length || englishStack.length) return token;
    const value = decode(token);
    const next = translate(value);
    return next === null ? token : escapeText(preserveEdges(value, next));
  });
}

export function localizeWebGuideHTML(html, { runtime = true } = {}) {
  const localizedSchema = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (_whole, open, data, close) => {
    const schema = JSON.parse(data);
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (['WebPage', 'CollectionPage'].includes(value['@type'])) {
        value.inLanguage = 'en';
        if (typeof value.name === 'string') value.name = translate(value.name) ?? value.name;
      }
      if (value['@type'] === 'ListItem' && typeof value.name === 'string') value.name = translate(value.name) ?? value.name;
      Object.values(value).forEach(visit);
    };
    visit(schema);
    return open + JSON.stringify(schema).replace(/</g, '\\u003c') + close;
  });
  let result = translateHTML(localizedSchema).replace(/(<html\b[^>]*\blang=)(['"])pt-BR\2/i, '$1"en"');
  result = result.replace(/(<meta\s+property="og:locale"\s+content=")pt_BR("\s*\/?\s*>)/i, '$1en_US$2');
  if (!runtime || !/<\/head>/i.test(result) || !/<\/body>/i.test(result)) return result;
  const boot = `<script>window.EnrichReaderTranslations={shared:{},page:${JSON.stringify(webGuideTranslations).replace(/</g, '\\u003c')}};</script><script>${runtimeSource}</script><script>const syncLocale=()=>{const locale=document.querySelector('meta[property="og:locale"]');if(locale)locale.content=document.documentElement.lang==='pt-BR'?'pt_BR':'en_US'};syncLocale();document.addEventListener('languagechange',syncLocale);</script>`;
  const selector = '<div class="language-switch" role="group" aria-label="Language"><button type="button" lang="en" aria-label="English" title="English" aria-pressed="true" data-language-choice="en">EN</button><button type="button" lang="pt-BR" aria-label="Português" title="Português" aria-pressed="false" data-language-choice="pt-BR">PT</button></div>';
  result = result.replace(/<\/head>/i, () => `${boot}</head>`);
  const header = /(<header\b[^>]*class="[^"]*(?:topbar|marketing-header)[^"]*"[^>]*>[\s\S]*?)<\/header>/i;
  return header.test(result) ? result.replace(header, `$1${selector}</header>`) : result.replace(/<body\b([^>]*)>/i, `<body$1><header class="guide-language-header">${selector}</header>`);
}
