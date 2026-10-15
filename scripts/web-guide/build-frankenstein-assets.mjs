// Deterministic rendering of the supplied SVG cover and a page-1-safe social card.
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/web-guide/build-frankenstein-assets.mjs /path/to/cover.svg');
const guide = JSON.parse(await readFile(resolve(root, 'src/enrichreader.com/data/web-guide/frankenstein.json'), 'utf8'));
const coverSource = await readFile(input);
const directory = resolve(root, 'src/enrichreader.com/static/guia/frankenstein');
const work = await mkdtemp(join(tmpdir(), 'frankenstein-assets-'));
const xml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const hash = data => createHash('sha256').update(data).digest('hex').slice(0, 8);
const assets = {};
const manifestPath = resolve(root, 'src/enrichreader.com/data/web-guide/frankenstein-presentation.json');
let existing = {};
try { existing = JSON.parse(await readFile(manifestPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(directory, { recursive: true });
async function publish(file, name, width, height, type) {
  const data = await readFile(file);
  const filename = `${name}-${hash(data)}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
  await writeFile(join(directory, filename), data);
  return { path: `/guia/frankenstein/${filename}`, width, height, type, bytes: data.length };
}
try {
  for (const [name, width, height] of [['thumb', 48, 72], ['cover', 192, 288], ['about', 144, 216], ['shelf', 512, 768]]) {
    const png = join(work, `${name}.png`), webp = join(work, `${name}.webp`);
    await run('rsvg-convert', ['-w', String(width), '-h', String(height), input, '-o', png]);
    await run('magick', [png, '-strip', '-quality', '85', webp]);
    assets[name] = await publish(webp, `cover-${name}`, width, height, 'image/webp');
  }
  const source = `data:image/svg+xml;base64,${coverSource.toString('base64')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><filter id="blur"><feGaussianBlur stdDeviation="24"/></filter><clipPath id="cover"><rect x="504" y="84" width="192" height="288" rx="8"/></clipPath></defs>
    <rect width="1200" height="630" fill="#0b0b10"/>
    <image href="${source}" x="-80" y="-150" width="1360" height="930" preserveAspectRatio="xMidYMid slice" filter="url(#blur)"/>
    <rect width="1200" height="630" fill="#080a10" opacity=".82"/>
    <text x="600" y="58" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="600" letter-spacing="2" fill="#b5c9fa">GUIA SEM SPOILER</text>
    <image href="${source}" x="504" y="84" width="192" height="288" clip-path="url(#cover)"/>
    <text x="600" y="435" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-size="44" font-weight="600" fill="#f1f1f7">${xml(guide.title)}</text>
    <text x="600" y="504" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="26" fill="#c4c4d2">de ${xml(guide.authors.join(' e '))}</text>
    <rect x="445" y="548" width="310" height="52" rx="26" fill="none" stroke="#b5c9fa" stroke-width="2"/>
    <text x="600" y="582" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600" fill="#f1f1f7">Onde você está? ▾</text>
    <text x="1168" y="606" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="18" fill="#aaaaba">enrichreader.com</text></svg>`;
  const svgFile = join(work, 'og.svg'), png = join(work, 'og.png'), jpeg = join(work, 'og.jpg');
  await writeFile(svgFile, svg);
  await run('rsvg-convert', [svgFile, '-o', png]);
  await run('magick', [png, '-strip', '-quality', '85', jpeg]);
  assets.og = await publish(jpeg, 'og-public-domain', 1200, 630, 'image/jpeg');
  if (assets.og.bytes > 300 * 1024) throw new Error('Social card exceeds 300 KB');
  const manifest = {
    ...existing,
    source: { edition: guide.edition, cover_sha256: createHash('sha256').update(coverSource).digest('hex') },
    app_published: existing.app_published ?? false,
    links: existing.links ?? [{ kind: 'site', label: 'Ler esta edição · Standard Ebooks', url: 'https://standardebooks.org/ebooks/mary-shelley/frankenstein' }],
    assets,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(assets, null, 2));
} finally { await rm(work, { recursive: true, force: true }); }
