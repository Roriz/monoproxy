#!/usr/bin/env python3
"""Import reviewed package histories into build/server-only guide data. No LLM calls."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--package', type=Path, required=True)
parser.add_argument('--truth-record', type=Path, required=True)
args = parser.parse_args()
with zipfile.ZipFile(args.package) as package:
    skin = json.loads(package.read('skin.json'))
    profiles = {}
    index = json.loads(package.read('entities/index.json'))
    for group in index['groups']:
        profiles.update(json.loads(package.read(f'entities/{group}'))['entities'])

# Guard against importing the loose, pre-truth cache or the earlier package.
assert skin['skin_version'] == '20261010225628', 'Expected the October 10 truth-reviewed package'
assert not {'god', 'frankenstein', 'satan', 'werther'} & skin['entities'].keys()
assert {'the creature', 'alphonse frankenstein', 'waldman'} <= skin['entities'].keys()
chapter_ids = {int(c.split('.')[3]): c for c in skin['chapter_ids']}
assert set(range(8, 36)) <= chapter_ids.keys()

fields = {'display_name', 'aliases', 'definition', 'status', 'location', 'occupation',
          'current_objective', 'personality_traits', 'chapter_summary', 'narrative_role'}
role_fields = {'chapter_role', 'narrative_role'}
items = []
for ordinal, file_number in enumerate(range(8, 36), 1):
    letter = file_number <= 11
    number = file_number - (7 if letter else 11)
    items.append({
        'ordinal': ordinal, 'kind': 'section' if letter else 'chapter',
        'number': number, 'part': 'letters' if letter else 'chapters',
        'label': f'Carta {number}' if letter else f'Cap. {number}',
        'gender': 'f' if letter else 'm', 'source_file': file_number,
        'cut_before': f'before-{ordinal}',
    })
ordinal_by_id = {chapter_ids[item['source_file']]: item['ordinal'] for item in items}
entities = []
slugs = set()
for key, meta in skin['entities'].items():
    if meta['classification'] != 'person':
        continue  # First increment: truth-reviewed people, not unreviewed world entities.
    versions = []
    roles = {}
    for v in profiles[key]['versions']:
        if v['c'] not in ordinal_by_id:
            continue  # The 1831 Introduction and all non-story matter are excluded.
        updates = v.get('d', {})
        removals = v.get('x', [])
        delta = {k: value for k, value in updates.items() if k in fields}
        removed = [k for k in removals if k in fields]
        # Fold both local role channels, including removals; never use the manifest role.
        for field in role_fields:
            if field in removals:
                roles.pop(field, None)
            if field in updates:
                roles[field] = updates[field]
        if role_fields & (updates.keys() | set(removals)):
            role = roles.get('chapter_role', roles.get('narrative_role'))
            if role is not None:
                delta['narrative_role'] = role
                removed = [field for field in removed if field != 'narrative_role']
            else:
                removed.append('narrative_role')
        versions.append({'ordinal': ordinal_by_id[v['c']], 'set': delta,
                         'remove': removed, 'changed': [k for k in v.get('nr', []) if k in fields]})
    versions.sort(key=lambda v: v['ordinal'])
    if not versions:
        continue
    # Reviewed card headings occasionally name an identity earlier than the prose.
    # These guide-only overlays withhold that identity until the text names it.
    if key == 'the creature':
        versions[0]['set']['display_name'] = 'The traveller'
        revealed = next(v for v in versions if v['ordinal'] == 9)  # Chapter V.
        revealed['set']['display_name'] = 'The Creature'
        revealed['changed'].append('display_name')
    if key == 'alphonse frankenstein':
        versions[0]['set']['display_name'] = "Victor's father"
        revealed = next(v for v in versions if v['ordinal'] == 11)  # Chapter VII's signed letter.
        revealed['set']['display_name'] = 'Alphonse Frankenstein'
        revealed['changed'].append('display_name')
    name = versions[0]['set'].get('display_name')
    assert name, f'Missing first-appearance name: {key}'
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    assert slug and slug not in slugs, f'Duplicate first-appearance slug: {slug}'
    slugs.add(slug)
    entities.append({'slug': slug, 'versions': versions})

data = {
    'series': 'frankenstein', 'title': 'Frankenstein', 'authors': ['Mary Shelley'],
    'state': 'public', 'ownership': 'public-domain', 'edition': 'Standard Ebooks · texto de 1831',
    'text_language': 'en',
    'look': {'hue': 265, 'scheme': 'noite', 'title_font': 'playfair', 'cover': None},
    'provenance': {'review_date': '2026-10-10', 'skin_version': skin['skin_version'],
                   'package_sha256': hashlib.sha256(args.package.read_bytes()).hexdigest(),
                   'truth_record_sha256': hashlib.sha256(args.truth_record.read_bytes()).hexdigest(),
                   'review': 'skin-maker/docs/truth-reviews/frankenstein.md'},
    'books': [{'l': 1, 'status': 'complete', 'end_cut': 'end-book-1', 'items': items}],
    'entities': entities,
}
destination = ROOT / 'src/enrichreader.com/data/web-guide/frankenstein.json'
destination.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Imported {len(entities)} reviewed people and {len(items)} story stops into {destination}')
