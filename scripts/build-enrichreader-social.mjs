// Rebuild social cards after changing report titles or headline statistics.
// Requires rsvg-convert and ImageMagick (the existing site-asset build tools).
import { readdir, readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { escape } from '../src/enrichreader.com/lib/web-guide/content.mjs';

const source = new URL('../src/enrichreader.com/', import.meta.url);
const output = new URL('static/assets/social/', source);
await mkdir(output, { recursive: true });
const cards = [{ slug: 'reader', lines: ['Your spoiler-free companion.', 'Your place in the story.'], detail: 'Character profiles and lore for partner series', label: 'SPOILER-FREE STORY COMPANION' }];
for (const slug of await readdir(new URL('content/', source))) {
  const file = new URL(`content/${slug}/index.html`, source);
  let text;
  try { text = await readFile(file, 'utf8'); } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) continue; throw error; }
  if (!text.includes('series_data:')) continue;
  const field = name => text.match(new RegExp(`^${name}: "?([^"\\n]+)`, 'm'))?.[1];
  cards.push({ slug, lines: [field('series_title_first'), field('series_title_second')], detail: `${field('stat_characters')} named characters / ${field('stat_chapters')} chapters analyzed`, label: 'CHARACTERS, TIMELINES & STATISTICS' });
}
const temporary = await mkdtemp(join(tmpdir(), 'enrichreader-social-'));
try {
  for (const card of cards) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#111114"/><rect x="64" y="64" width="80" height="5" fill="#d4af37"/><g font-family="Arial,sans-serif"><text x="64" y="125" fill="#d4af37" font-size="22">${escape(card.label)}</text>${card.lines.map((line, index) => `<text x="64" y="${255 + index * 85}" fill="#f3eee2" font-size="64">${escape(line)}</text>`).join('')}<text x="64" y="445" fill="#c1c1c8" font-size="28">${escape(card.detail)}</text><text x="64" y="560" fill="#d4af37" font-size="26">EnrichReader · enrichreader.com</text></g></svg>`;
    const input = join(temporary, 'card.svg'); const png = join(temporary, 'card.png');
    await writeFile(input, svg);
    execFileSync('rsvg-convert', ['-o', png, input]);
    execFileSync('magick', [png, '-strip', '-quality', '85', new URL(`${card.slug}.jpg`, output).pathname]);
  }
} finally { await rm(temporary, { recursive: true, force: true }); }
console.log(`Built ${cards.length} EnrichReader social cards.`);
