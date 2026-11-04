import { escape } from './content.mjs';
/** The document shell every web-guide page renders through; server.mjs localizes it afterwards. */
export const page = ({ look, head, attrs = '', body }) => `<!doctype html><html lang="pt-BR"${look ? ` data-scheme="${look.scheme}" style="${escape(look.style)}"` : ''}><head><meta charset="utf-8">${head}</head><body${attrs}>${body}</body></html>`;
export const styles = '<link rel="stylesheet" href="/style/fonts.css"><link rel="stylesheet" href="/web-guide/guide.css">';
