import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createGuideServer } from './server.mjs';
import { renderGuide } from './guide.mjs';
import { reportRecord } from './reports.mjs';
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
guide.presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));
const render = (path, c = 5) => renderGuide(guide, new URL(`https://enrichreader.com/guia/frankenstein${path}${c == null ? '' : `?l=1&c=${c}`}`));
const main = html => html.match(/<main[^>]*>(.*?)<\/main>/s)[1];
test('section clean pages reveal no cast, scene, questions or searchable keys', () => {
  for (const path of ['/mundo', '/misterios', '/misterios/54', '/tempo', '/tempo/livro-1/cap-28']) {
    const html = render(path, null);
    assert.doesNotMatch(html, /Henry Clerval|Walton|Margaret|The Creature|data-n=|data-preview=|female companion|Who murdered/);
    assert.match(html, /noindex, follow/);
  }
});
test('panel shows a bounded recap and locally ranked cast; app card is gated and replaces footer row', () => {
  assert.equal((main(render('', 9)).match(/class="scene-meta"/g) ?? []).length, 3);
  assert.ok((main(render('', 9)).match(/class="entity-chip"/g) ?? []).length <= 8);
  assert.doesNotMatch(main(render('', 9)), /data-hub|total_mentions|Inspiration of a Waking Nightmare|The Creation and Pursuit/);
  const published = { ...guide, presentation: { ...guide.presentation, app_published: true } };
  const html = renderGuide(published, new URL('https://enrichreader.com/guia/frankenstein?l=1&c=9'));
  assert.match(html, /arquivo EPUB/);
  assert.doesNotMatch(html.match(/<footer>(.*?)<\/footer>/s)[1], /Também no app/);
  assert.doesNotMatch(renderGuide(published, new URL('https://enrichreader.com/guia/frankenstein?l=1&c=1')), /data-app-bridge/);
});
test('hub search uses only displayed current-cut keys; chapter and thread future routes stay absent', () => {
  const early = render('/mundo', 5);
  assert.doesNotMatch(early, /data-n="The Creature"|data-a="[^\n]*The Creature|data-n="Alphonse/);
  assert.match(render('/mundo?ignored', null), /Personagens/);
  assert.match(main(render('/tempo/livro-1/cap-5', 5)), /Aparece mais à frente/);
  assert.doesNotMatch(main(render('/misterios/54', 24)), /revenge|Elizabeth/);
  assert.match(main(render('/misterios/54', 25)), /O que se sabe até aqui/);
  assert.match(main(render('/misterios/54', 28)), /A resposta/);
  assert.doesNotMatch(render('/misterios/54', 28), /"twist"|⚡|importance|merged_from/);
});
test('all connected guide links resolve, old character URLs redirect, and reports reconstruct new cards', async () => {
  const server = createGuideServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['', '/mundo', '/misterios', '/tempo', '/pessoa/henry-clerval', '/tempo/livro-1/cap-25', '/misterios/54']) {
      const response = await fetch(`${base}/guia/frankenstein${path}?l=1&c=26`);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      const links = new Set([...html.matchAll(/href="(\/guia\/frankenstein[^"#]*)"/g)].map(match => match[1].replaceAll('&amp;', '&')));
      for (const link of links) assert.ok((await fetch(base + link)).status < 400, link);
    }
    const legacy = await fetch(`${base}/guia/frankenstein/personagens/henry-clerval?l=1&c=26`, { redirect: 'manual' });
    assert.equal(legacy.status, 301); assert.equal(legacy.headers.get('location'), '/guia/frankenstein/pessoa/henry-clerval?l=1&c=26');
    const record = reportRecord(guide, { id: randomUUID(), page_path: '/guia/frankenstein', l: 1, c: '9', scope: 'card', card: 'recap', entity: null, reason: 'wrong' });
    assert.equal(record.fields.length, 3); assert.ok(record.fields.every(field => Number(field.source.split(':')[1]) < 9));
    assert.throws(() => reportRecord(guide, { id: randomUUID(), page_path: '/guia/frankenstein', l: 1, c: '2', scope: 'card', card: 'curve', reason: 'wrong' }), /Unavailable/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
