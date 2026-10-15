import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../../src/enrichreader.com/data/web-guide/', import.meta.url);
const guide = JSON.parse(await readFile(new URL('frankenstein.json', root)));
const context = JSON.parse(await readFile(new URL('frankenstein-context.json', root)));
const known = new Map();
for (const entity of [...guide.entities, ...context.world]) {
  for (const version of entity.versions) {
    for (const name of [version.set.display_name, ...(version.set.aliases ?? [])].filter(value => typeof value === 'string' && value.length > 2)) {
      const key = name.toLowerCase();
      known.set(key, Math.min(known.get(key) ?? Infinity, version.ordinal));
    }
  }
}
const hits = [];
const reviewed = [];
const reviewedNames = context.review_exclusions.reviewed_names ?? {};
function check(text, ordinal, id, field) {
  for (const [name, first] of known) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (first > ordinal && new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(text)) {
      const hit = { id, field, ordinal, name, first };
      if (reviewedNames[`${id}:${name}`]) reviewed.push({ ...hit, evidence: reviewedNames[`${id}:${name}`] });
      else hits.push(hit);
    }
  }
}
for (const scene of context.story.scenes) if (scene.summary) check(scene.summary, scene.ordinal, scene.id, 'summary');
for (const thread of context.story.threads) {
  check(thread.question, thread.raised, thread.id, 'question');
  for (const answer of thread.answers) check(answer.text, answer.ordinal, thread.id, 'answer');
  if (thread.closed) check(thread.closed.answer, thread.closed.ordinal, thread.id, 'closed');
}
await mkdir(new URL('../../tmp/web-guide-audit/', import.meta.url), { recursive: true });
await writeFile(new URL('../../tmp/web-guide-audit/context.json', import.meta.url), JSON.stringify({ later_names: hits, reviewed_names: reviewed, exclusions: context.review_exclusions }, null, 2));
console.log(JSON.stringify({ unresolved_later_names: hits.length, source_verified_names: reviewed.length }));
if (hits.length) process.exitCode = 1;
