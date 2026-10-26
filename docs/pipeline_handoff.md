# Pipeline Orchestrator Handoff

`bin/pipeline` coordinates the sibling reader-app parser, skin-maker decision-first stages,
reader-backend catalog sync, and reader-app benchmark. Shared artifacts live under
`enrichreader-lfs`: `raws/raw-<rawUuid>.epub`, `volumes/v-<rawUuid>/`, and `skins/<name>.ers`.
Skin-maker resolves its default package directory from `SKINS_DIR` (`LFS_DIR` in its config).
Configure these to point at the same shared hub; monoproxy's `ENRICHREADER_LFS_DIR` controls
its parser inputs, while skin-maker reads its own settings.

## Generate or run

```bash
bin/pipeline generate v-dracula --output-name skin-dracula \
  --ner-version <pinned-NLP-configuration> --decision-model <approved-local-model-path> \
  --client openai --llm-model <pinned-enrichment-model>

bin/pipeline run dracula --output-name skin-dracula \
  --ner-version <pinned-NLP-configuration> --decision-model <approved-local-model-path> \
  --client openai --llm-model <pinned-enrichment-model>
```

Both invoke `process_volume.py decision-first --volume <volumeUuid> --package-output`.
`run` also parses, syncs and benchmarks. Its `--skip-parse`, `--skip-skin`,
`--skip-backend` and `--skip-benchmark` omit individual steps. `--force` only forces
EPUB parsing; stage artifacts determine skin-maker reuse.

`--pipeline recognize|resolve|enrich|decision-first` selects a single-volume route.
`decision-first` (default) and `enrich` export by default; `recognize` and `resolve`
only write stage artifacts. Bare `--package-output` selects `<SKINS_DIR>/<name>.ers`;
`--package-output /absolute/path/custom.ers` selects an explicit destination.
The default name is `--output-name`, or the volume namespace when omitted.
No tier suffix is added. Exporting on `recognize`/`resolve` is rejected by skin-maker.

Pin `--ner-version` for Recognition, the approved local `--decision-model` for Resolution,
and `--client` plus `--llm-model` for uncached Enrichment calls. There is no implicit
LLM provider in this coordinator. Use the approved local decision model rather than the
upstream CLI's historical default. Recognition accepts `--theme lotm|ri|generic`,
`--scope entities|story|both` and `--max-chapters N`; downstream routes consume frozen
Recognition scope. `--artifact-root` and `--input-root` override stage/input directories.
For a standalone continuation, pass `--entity-state-input` / `--story-ledger-input`
frozen predecessor artifacts; `--story-start` declares an initial empty story ledger.

## Series

```bash
bin/pipeline series skin-lotm --skip-parse --phase decision-first \
  --ner-version <pin> --decision-model <approved-local-model-path> \
  --client openai --llm-model <pin>
bin/pipeline series skin-lotm --skip-parse --phase enrich --client openai --llm-model <pin>
```

The configured volume list remains imported from `orchestrate_volumes.VOLUMES_TO_PROCESS`.
Parsing happens first unless skipped. The coordinator then invokes
`orchestrate_volumes.py --series <name> --phase decision-first --package-output`.
The runner respects configured predecessor edges and executes each stage across the
volumes before moving to the next. It exports one consolidated `<SKINS_DIR>/<name>.ers`.
`--phase` accepts the same four routes, and generation options are shared with volume runs.

Legacy `build`, `preview`, `resume`, `sample`, `reverify`, `stats`, `all`, `detect`,
`extract`, `story`, `story-finalize`, `package`, `--prev-volume`, `--fresh`,
`--max-attempts` and `--tier` have no migration alias. Retry by rerunning against the
frozen artifacts; series continuity comes from the configured predecessor edges.

## Other steps

```bash
bin/pipeline parse <rawUuid> [--force]
bin/pipeline sync                       # seed the existing catalog
bin/pipeline sync <skinUuid> <file.ers>  # upload a specific package
bin/pipeline benchmark [rawUuid]
```

Re-shipping the catalog is a separate owner-approved operation. Threads remain paused;
these routing changes do not authorize model calls or a re-ship. The web guide is frozen.
