# Pipeline Orchestrator Handoff

Unified cross-repository workflow for ingesting raw books, generating skins, syncing the backend, and verifying benchmarks.

---

## 1. Shared Data Hub (`enrichreader-lfs`)

All canonical cross-repository artifacts live exclusively in `enrichreader-lfs`:
* `raws/raw-<rawUuid>.epub`: Raw book source files.
* `volumes/v-<rawUuid>/`: Structured volume JSONs (`volume.json`, `chapters/`, `assets/`).
* `skins/skin-<skinUuid>.ers`: Compiled skin packages.

---

## 2. CLI Commands (`monoproxy/bin/pipeline`)

Run all commands from `~/projects/monoproxy`:

### Full End-to-End Run
Runs **Parse $\to$ Skin Generation $\to$ Backend Sync $\to$ Benchmark Verification**:
```bash
bin/pipeline run <rawUuid> [options]
```
**Example:**
```bash
bin/pipeline run dungeon_crawler_carl_1 --theme dungeon_crawler_carl --client vertex
```

### Individual Steps
```bash
# 1. Parse EPUB raw into Volume JSON (reader-app -> enrichreader-lfs/volumes)
bin/pipeline parse <rawUuid>

# 2. Generate Skin .ers from Volume (skin-maker -> enrichreader-lfs/skins)
bin/pipeline generate <volumeUuid> [--theme <theme>] [--client <client>] [--output-name <name>] [--prev-volume <vol>]

# 3. Sync Backend DB & ActiveStorage (reader-backend)
bin/pipeline sync

# 4. Run Benchmark Verification (reader-app)
bin/pipeline benchmark [rawUuid]
```

### Options for `bin/pipeline run`
* `--theme <theme>`: Series theme for fact extraction (e.g. `lotm`, `dungeon_crawler_carl`, `mistborn`).
* `--client <client>`: LLM client (`vertex` [default], `gemini`, `openai`, `grok`, `llama`, `agy`).
* `--output-name <name>`: Consolidated output skin name (e.g. `skin-lotm`).
* `--prev-volume <volUuid>`: Previous volume namespace for multi-volume progression.
* `--skip-parse`: Skip parsing if volume already exists in LFS.
* `--skip-skin`: Skip LLM skin generation.
* `--skip-backend`: Skip backend database sync.
* `--skip-benchmark`: Skip reader-app verification benchmark.
