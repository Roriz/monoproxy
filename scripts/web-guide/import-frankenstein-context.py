#!/usr/bin/env python3
"""Supplement frozen reviewed people with package-local mentions and story data.
No final profile facts, global mention totals or final thread importance are used.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src/enrichreader.com/data/web-guide'
p = argparse.ArgumentParser()
p.add_argument('--package', type=Path, required=True)
p.add_argument('--ledger-root', type=Path, required=True)
p.add_argument('--source-root', type=Path, required=True, help='Original input volume containing chapters/*.json')
a = p.parse_args()
guide = json.loads((DATA / 'frankenstein.json').read_text())
assert hashlib.sha256(a.package.read_bytes()).hexdigest() == guide['provenance']['package_sha256']
with zipfile.ZipFile(a.package) as z:
    skin = json.loads(z.read('skin.json'))
    profiles = json.loads(z.read('entities/g000.json'))['entities']
    blocks = json.loads(z.read('chunks/0/blocks.json'))['chapters']
    scenes = json.loads(z.read('story/chunks/0/scenes.json'))['chapters']
    threads = json.loads(z.read('story/v-frankenstein/threads.json'))['threads']
    curve = json.loads(z.read('story/v-frankenstein/curve.json'))['chapters']
    story_index = json.loads(z.read('story/index.json'))['volumes']['v-frankenstein']
ordinal = {int(cid.split('.')[3]): i for i, cid in enumerate(story_index['chapters']) if 8 <= int(cid.split('.')[3]) <= 35}
assert set(ordinal.values()) == set(range(1, 29))
# Derive stable ids from first story version; the two guide identity overlays stay authoritative.
keys = {}
for key, meta in skin['entities'].items():
    versions = [v for v in profiles[key]['versions'] if int(v['c'].split('.')[3]) in ordinal]
    if not versions:
        continue
    name = next((v.get('d', {}).get('display_name') for v in profiles[key]['versions'] if v.get('d', {}).get('display_name')), None)
    if key == 'the creature': name = 'The traveller'
    if key == 'alphonse frankenstein': name = "Victor's father"
    if name: keys[key] = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
assert {keys[k] for k, m in skin['entities'].items() if m['classification'] == 'person' and k in keys} == {e['slug'] for e in guide['entities']}
# Real geographical locations; metaphorical Paradise and demographic/concept NER noise stay out.
world = []
fields = {'display_name', 'definition', 'aliases', 'parent_location', 'status'}
for key, meta in skin['entities'].items():
    if meta['classification'] != 'location' or key == 'paradise' or key not in keys: continue
    versions = []
    for v in profiles[key]['versions']:
        n = int(v['c'].split('.')[3])
        if n not in ordinal: continue
        versions.append({'ordinal': ordinal[n], 'set': {f: x for f, x in v.get('d', {}).items() if f in fields}, 'remove': [f for f in v.get('x', []) if f in fields], 'changed': [f for f in v.get('nr', []) if f in fields]})
    if 'display_name' not in versions[0]['set']:
        versions[0]['set']['display_name'] = next(v['d']['display_name'] for v in profiles[key]['versions'] if 'display_name' in v.get('d', {}))
    world.append({'slug': keys[key], 'classification': 'location', 'versions': versions})
allowed = {e['slug'] for e in guide['entities'] + world}
mentions = []
for chapter in blocks:
    n = int(chapter['chapter_namespace'].split('.')[3])
    if n not in ordinal: continue
    counts = Counter(keys.get(e['entity']) for b in chapter['blocks'] for e in b.get('entities', []))
    mentions.append({'ordinal': ordinal[n], 'counts': {k: c for k, c in counts.items() if k in allowed}})
# Added profiles may be missing in NER block rows. Preserve chapter attribution from
# reviewed version presence without fabricating occurrence counts (presence only).
for row in mentions:
    row['present'] = sorted(set(row['counts']) | {e['slug'] for e in guide['entities'] if any(v['ordinal'] == row['ordinal'] for v in e['versions'])})
scene_exclusions = {
    'sc.0035.09': 'Misattributes Walton narration and notes to Margaret.',
    'sc.0013.01': 'Names Switzerland before its attributed entity introduction; place name absent from source chapter.',
    'sc.0025.03': 'Names Europe before its attributed entity introduction; place name absent from source chapter.',
}
packed_scenes = []
for chapter in scenes:
    n = int(chapter['id'].split('.')[3])
    if n not in ordinal: continue
    for s in chapter['scenes']:
        # Known wrong narrator attribution. Do not rewrite source model prose.
        summary = s.get('sum') if s['id'] not in scene_exclusions else None
        if s.get('w', 0) < 50: summary = None
        packed_scenes.append({'id': s['id'], 'ordinal': ordinal[n], 'index': s['i'], 'tension': s.get('t', 0), 'summary': summary,
          'cast': sorted({keys[e['ref']] for e in s.get('cast', []) if e.get('ref') in keys and keys[e['ref']] in allowed}),
          'setting': keys.get(s.get('set', {}).get('ref')), 'setting_name': s.get('set', {}).get('n'), 'pov': keys.get(s.get('pov', {}).get('ref'))})
# Reuse per-chapter extraction ledger snapshots, independently of final imp.
ledger = {}
ledger_hashes = {}
for file in a.ledger_root.glob('ch.*/story/ledger.json'):
    n = int(file.parent.parent.name.split('.')[3])
    if n not in ordinal: continue
    raw = file.read_bytes(); d = json.loads(raw)
    assert d['chapter_seq'] == ordinal[n]
    ledger[ordinal[n]] = d['threads']
    ledger_hashes[str(ordinal[n])] = hashlib.sha256(raw).hexdigest()
assert set(ledger) == set(range(1, 29))
packed_threads = []
thread_map_file = DATA / 'frankenstein-thread-map.json'
thread_map = json.loads(thread_map_file.read_text())
assert all(isinstance(value, int) and value > 0 for value in thread_map.values())
assert len(set(thread_map.values())) == len(thread_map)
hidden_threads = {'th.frankenstein.0056', 'th.frankenstein.0057', 'th.frankenstein.0062', 'th.frankenstein.0075'}
for id, t in threads.items():
    raised = t['raised']['p'][0]
    if raised < 1 or id in hidden_threads: continue
    rates = []
    previous = None
    for chapter, snapshot in sorted(ledger.items()):
        item = snapshot.get(id)
        if not item: continue
        assert item['question'] == t['q'], f'Stale ledger question: {id}'
        value = item['importance']
        if value != previous: rates.append({'ordinal': chapter, 'value': value}); previous = value
    assert rates and rates[0]['ordinal'] == raised, f'Missing raise importance: {id}'
    raw_thread = ledger[28][id]
    assert raw_thread['question'] == t['q']
    evidence = {(x.get('text'), int(x['chapter'].split('.')[3]) - 7): x.get('quote') for x in raw_thread.get('history', []) + ([raw_thread['working_answer']] if raw_thread.get('working_answer') else [])}
    if id not in thread_map:
        thread_map[id] = max(thread_map.values(), default=0) + 1
    packed_threads.append({'id': id, 'slug': str(thread_map[id]), 'kind': t['k'], 'question': t['q'], 'raised': raised, 'raise_quote': raw_thread['raised'].get('quote'),
       'importance': rates, 'answers': [{'ordinal': x['p'][0], 'scene': x['p'][1], 'text': x['text'], 'quote': evidence.get((x['text'], x['p'][0]))} for x in t.get('answers', []) if x['p'][0] >= raised],
       'closed': {'ordinal': t['closed']['p'][0], 'scene': t['closed']['p'][1], 'answer': t['closed']['answer'], 'quote': (raw_thread.get('closed') or {}).get('quote')} if t.get('closed') else None,
       'entities': sorted({keys[e['ref']] for e in t.get('ents', []) if e.get('ref') in keys and keys[e['ref']] in allowed})})
    if raw_thread.get('revivals'):
        packed_threads[-1]['revivals'] = [{'ordinal': ordinal[int(ref['chapter'].split('.')[3])], 'scene': int(ref['scene'].split('.')[-1])} for ref in raw_thread['revivals'] if int(ref['chapter'].split('.')[3]) in ordinal]
# A ledger quote is evidence only when it is verbatim in its attributed chapter.
# Preserve punctuation and wording; whitespace normalization only. Never repair
# a paraphrase into a fabricated quotation.
source_texts = {}
source_hashes = {}
chapter_ids = set(story_index['chapters'])
for file in (a.source_root / 'chapters').glob('*.json'):
    raw = file.read_bytes()
    chapter = json.loads(raw)
    n = int(chapter['id'].split('.')[3])
    if n not in ordinal:
        continue
    assert chapter['id'] in chapter_ids, 'Source chapter does not match packaged edition'
    seq = ordinal[n]
    source_texts[seq] = re.sub(r'\s+', ' ', ' '.join(b.get('content', {}).get('text', '') for b in chapter['blocks'])).strip()
    source_hashes[str(seq)] = hashlib.sha256(raw).hexdigest()
assert set(source_texts) == set(range(1, 29)), 'Missing original source chapters'
withheld_quotes = []
for thread in packed_threads:
    evidence = [(thread, 'raise_quote', thread['raised'])]
    evidence += [(answer, 'quote', answer['ordinal']) for answer in thread['answers']]
    if thread['closed']:
        evidence.append((thread['closed'], 'quote', thread['closed']['ordinal']))
    for record, field, seq in evidence:
        quote = record.get(field)
        if quote and re.sub(r'\s+', ' ', quote).strip() not in source_texts[seq]:
            withheld_quotes.append({'thread': thread['id'], 'field': field, 'ordinal': seq, 'reason': 'Not verbatim in attributed source chapter.'})
            record[field] = None
out = {'provenance': {'package_sha256': guide['provenance']['package_sha256'], 'ledger_sha256': ledger_hashes, 'source_chapter_sha256': source_hashes},
 'world': world, 'mentions': sorted(mentions, key=lambda x: x['ordinal']),
 'story': {'main_pov': 'victor', 'scenes': packed_scenes, 'threads': packed_threads, 'arcs': [],
 'curve': [{'ordinal': x['seq'], 'tension': x['t'][0]} for x in curve if x['seq'] in ordinal.values()]},
 'review_exclusions': {'quotes': withheld_quotes, 'scenes': scene_exclusions,
 'threads': {id: reason for id, reason in zip(sorted(hidden_threads), ['Closing answer addresses acquittal rather than murder identity.', 'Closure treats ambiguous impending calamity as Elizabeth murder.', 'Latest answer switches Victor to Walton without attribution.', 'Question claims a ship escape not established by the scene.'])},
 'reviewed_names': {'sc.0016.02:frankenstein': 'Surname printed in original chapter V; book title is already public.', 'sc.0018.02:frankenstein': 'Surname printed in original chapter VII; book title is already public.'},
 'arcs': {'arc.frankenstein.01': 'Working title and start derive from excluded 1831 Introduction; no safe novel-only arc supplied.'}}}
thread_map_file.write_text(json.dumps(thread_map, ensure_ascii=False, indent=2)+'\n')
(DATA / 'frankenstein-context.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n')
print(f"Imported {len(world)} places, {len(mentions)} mention rows, {len(packed_scenes)} scenes and {len(packed_threads)} threads; novel arc withheld.")
print(f"Withheld {len(withheld_quotes)} non-verbatim quotations.")
