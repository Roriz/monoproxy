import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadCatalog, publicGuides } from '../../src/enrichreader.com/lib/web-guide/catalog.mjs';
import { escape } from '../../src/enrichreader.com/lib/web-guide/content.mjs';
const output = new URL('../../src/enrichreader.com/static/web-guide/assets/', import.meta.url);
const manifestPath = new URL('../../src/enrichreader.com/data/web-guide/site-assets.json', import.meta.url);
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'guide-site-art-'));
const cards = {
  shelf: { background: '#11121a', ink: '#edf0fa', kicker: 'GUIAS SEM SPOILER', title: ['Escolha o seu livro'], line: ['Você escolhe a posição.', 'O guia mostra só o que já leu.'] },
  authors: { background: '#f4f2ed', ink: '#25283a', kicker: 'GUIA SEM SPOILER · PARA AUTORES', title: ['Um guia sem spoiler', 'para o seu livro'], line: [] },
  showcase: { background: '#11121a', ink: '#edf0fa', kicker: 'ENRICHREADER', title: ['Um guia sem spoiler', 'para cada série'], line: ['Preparado para o seu catálogo.'] },
};
const manifest = {};
const listed = publicGuides(await loadCatalog());
const shelfImages = listed.length >= 3 ? await Promise.all(listed.slice(0, 3).map(async (guide, index) => {
  const cover = guide.presentation.assets?.shelf ?? guide.presentation.assets?.cover;
  const x = 355 + index * 165;
  if (!cover) return `<rect x="${x}" y="235" width="145" height="218" rx="6" fill="#292d42"/><text x="${x + 72}" y="355" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="#edf0fa">${escape(guide.title[0])}</text>`;
  if (!/^\/web-guide\/assets\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/.test(cover.path)) throw new Error('Shelf sharing image needs a local bitmap cover');
  const image = await readFile(new URL(`../../src/enrichreader.com/static${cover.path}`, import.meta.url));
  return `<image x="${x}" y="235" width="145" height="218" href="data:${cover.type};base64,${image.toString('base64')}" preserveAspectRatio="xMidYMid meet"/>`;
})) : [];
try {
  for (const [name, card] of Object.entries(cards)) {
    let text = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${card.background}"/><rect x="300" y="130" width="64" height="4" rx="2" fill="#929ee7"/><g fill="${card.ink}"><text x="300" y="190" font-family="Inter,Arial,sans-serif" font-size="22" letter-spacing="2">${card.kicker}</text>${card.title.map((line, index) => `<text x="300" y="${280 + index * 62}" font-family="Playfair Display,Georgia,serif" font-size="48">${line}</text>`).join('')}${card.line.map((line, index) => `<text x="300" y="${420 + index * 36}" font-family="Inter,Arial,sans-serif" font-size="26">${line}</text>`).join('')}<text x="300" y="535" font-family="Inter,Arial,sans-serif" font-size="19" opacity=".7">feito com EnrichReader</text></g></svg>`;
    if (name === 'shelf' && shelfImages.length) text = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#11121a"/><g fill="#edf0fa"><text x="300" y="170" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">GUIAS SEM SPOILER</text><text x="300" y="210" font-family="Georgia,serif" font-size="38">Escolha o seu livro</text>${shelfImages.join('')}<text x="300" y="515" font-family="Arial,sans-serif" font-size="20">Você escolhe a posição. Só aparece o que já leu.</text><text x="300" y="550" font-family="Arial,sans-serif" font-size="18" opacity=".7">feito com EnrichReader</text></g></svg>`;
    const svg = join(temporary, `${name}.svg`); const png = join(temporary, `${name}.png`); const jpg = join(temporary, `${name}.jpg`);
    await writeFile(svg, text); execFileSync('rsvg-convert', ['-o', png, svg]); execFileSync('magick', [png, '-strip', '-quality', '85', jpg]);
    const bytes = await readFile(jpg); if (bytes.length > 300 * 1024) throw new Error('Social card too large');
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8); const file = `og-${name}-${hash}.jpg`;
    await writeFile(new URL(file, output), bytes);
    manifest[name] = { path: `/web-guide/assets/${file}`, type: 'image/jpeg', width: 1200, height: 630, bytes: bytes.length, ...(name === 'shelf' ? { kind: shelfImages.length ? 'covers' : 'generic', source_guides: shelfImages.length ? listed.slice(0, 3).map(guide => guide.series) : [] } : {}) };
  }
  const fiction = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><rect width="640" height="800" rx="24" fill="#f4f2ed"/><text x="32" y="48" font-family="Arial,sans-serif" font-size="18" fill="#51576e">EXEMPLO · LIVRO E AUTORA FICTÍCIOS</text><rect x="32" y="88" width="180" height="270" rx="6" fill="#263854"/><path d="M32 270 Q77 230 122 270 T212 270 V358H32Z" fill="#7db2b8"/><path d="M32 290 Q77 250 122 290 T212 290" fill="none" stroke="#cbe4dc" stroke-width="3"/><text x="52" y="132" font-family="Georgia,serif" font-size="22" fill="#f2f2ea">As Marés</text><text x="52" y="160" font-family="Georgia,serif" font-size="22" fill="#f2f2ea">de Ondina</text><g fill="#25283a"><text x="240" y="112" font-family="Arial,sans-serif" font-size="15">GUIA OFICIAL SEM SPOILER</text><text x="240" y="158" font-family="Georgia,serif" font-size="29">As Marés de Ondina</text><text x="240" y="194" font-family="Arial,sans-serif" font-size="19">de Autora Exemplo</text><text x="240" y="226" font-family="Arial,sans-serif" font-size="17">✓ aprovou este guia</text><text x="32" y="424" font-family="Georgia,serif" font-size="28">Sobre a série</text><text x="32" y="470" font-family="Georgia,serif" font-size="21">Na vila de Ondina, o mar recua um pouco</text><text x="32" y="504" font-family="Georgia,serif" font-size="21">a cada lua. Quando a avó de Lia some na</text><text x="32" y="538" font-family="Georgia,serif" font-size="21">maré mais baixa do século, ela encontra</text><text x="32" y="572" font-family="Georgia,serif" font-size="21">no farol um caderno escrito com a sua</text><text x="32" y="606" font-family="Georgia,serif" font-size="21">própria letra.</text><text x="32" y="644" font-family="Arial,sans-serif" font-size="16">por Autora Exemplo</text><text x="32" y="706" font-family="Arial,sans-serif" font-size="17">Livro 2 · sai em mar. 2027</text><text x="32" y="736" font-family="Arial,sans-serif" font-size="17">Pré-venda no Catarse ↗</text></g></svg>`;
  const hash = createHash('sha256').update(fiction).digest('hex').slice(0, 8); const file = `fictional-example-${hash}.svg`;
  await writeFile(new URL(file, output), fiction);
  const cover = fiction.replace('width="640" height="800" viewBox="0 0 640 800"', 'width="180" height="270" viewBox="32 88 180 270"');
  const coverHash = createHash('sha256').update(cover).digest('hex').slice(0, 8);
  await writeFile(new URL(`fictional-cover-${coverHash}.svg`, output), cover);
  manifest.fictionCover = { path: `/web-guide/assets/fictional-cover-${coverHash}.svg`, type: 'image/svg+xml', width: 180, height: 270 };
  manifest.fiction = { path: `/web-guide/assets/${file}`, type: 'image/svg+xml', width: 640, height: 800 };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
} finally { await rm(temporary, { recursive: true, force: true }); }
console.log('Built shelf, author and publisher sharing cards plus the explicitly fictional example.');
