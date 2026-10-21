// Shared browser helpers for the web guide scripts.
export const t = (key, params = {}) => window.EnrichReaderI18n?.t(key, params) ?? key.replace(/\{([\w]+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));

/** Sends JSON with a 15s timeout; `holder.controller` lets the caller abort it. */
export async function sendJSON(url, method, payload, holder) {
  const controller = new AbortController(); holder.controller = controller;
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    if (!response.ok) throw new Error(`${method} failed`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

/** Shows "<message> [Try again]" in `node`. */
export function errorLine(node, message, retry) {
  node.hidden = false; node.replaceChildren(document.createTextNode(t(message)));
  const button = document.createElement('button'); button.type = 'button'; button.textContent = t('Try again');
  button.addEventListener('click', retry); node.append(button);
}
