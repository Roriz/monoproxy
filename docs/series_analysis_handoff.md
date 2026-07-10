# Handoff: Replicating a Series Analysis Page for a New Book Series

This document guides developers on how to build a quantitative, interactive narrative analysis page (like the Dungeon Crawler Carl "by the numbers" page) for a new book series. Since layouts have been unified, reproducing this page for a third series requires **no new HTML template files**; it is entirely configured via the page's markdown frontmatter.

---

## 1. Page Architecture (Hugo & HTML)

Each series page resides in `src/enrichreader.com/content/<series_namespace>/index.html`. 

### A. Frontmatter Configuration
The page metadata, styles, scripts, and visualizer data-binding values are defined in the frontmatter:

```yaml
---
title: "Series Title, by the numbers | EnrichReader"
description: "Quantitative analysis of the series. X chapters, Y words, Z unique characters analyzed."
fonts_override: '<link href="https://fonts.googleapis.com/...">'
stylesheets:
  - "/dcc/style.css" # Unified base layout stylesheet
scripts:
  - "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"
  - "/<series_namespace>/bar_chart_race.js"
  - "/<series_namespace>/character_mortality.js"
  - "/<series_namespace>/entity_journey.js"
  - "/<series_namespace>/reveal.js"
  - "/<series_namespace>/race_selection_matrix.js"
  - "/<series_namespace>/keyboard_shortcuts.js"
scripts_defer: false
nav_logo_height: "44px"
nav_bg_border: false
nav_minimal: true
series_title_first: "Series"
series_title_second: "Name"
series_subtitle: "by the numbers"
series_intro: "Introductory hook detailing the quantitative autopsy of the text."
series_data: "/<series_namespace>/series_data.json"

# Core Visualizer Stats
stat_chapters: 515
stat_words: "1,245,618"
stat_characters: 317
hero_visual_metadata_1: "CRAWL_SERIES_TIMELINE"
hero_visual_metadata_2: "TOTAL_FLOORS_ANALYZED_09"
timeline_scope: "ALL VOLUMES"

# 1. Attribute Matrix Config
matrix:
  noun_singular: "race"
  noun_plural: "races"
  noun_plural_capital: "Races"
  columns:
    - "Vol 1"
    - "Vol 2"
    - "Vol 3"
    - "Vol 4"
    - "Vol 5"
    - "Vol 6"
    - "Vol 7"
  toggle_count_text: "all 57 races (yes, even Frenzied Gerbil)"
  insights:
    - title: "Least Diverse Entry: Volume 1"
      color: "var(--color-person)"
      insight: "Only <strong>5 unique races</strong> detected. <strong>Humans (4)</strong> make up 44% of the early cast."
      lore: "Survivors have just entered the dungeon and haven't had their first opportunities to purchase race change options."
    - title: "Maximum Diversity: Volume 7"
      color: "var(--color-location)"
      insight: "A staggering <strong>36 unique races</strong> recorded across 47 active characters."
      lore: "Volume 7 centers around the Faction War on the 9th floor where intergalactic military forces merge."
  table:
    - name: "Gnome"
      count: 4
    - name: "Changeling"
      count: 4

# 2. Funnel & Category Breakdown Config
funnel_breakdown:
  min_chapter: 2
  max_chapter: 515
  raw_mentions: "4,280"
  unique_characters: 317
  unique_entities: "317"
  summary_title: "Volume 7, Chapter 119"
  insights:
    - title: "Loot-Driven Narrative"
      color: "var(--color-item)"
      text: "Unique items (<strong>140</strong>) outnumber unique locations (<strong>107</strong>) by a significant margin."
  table:
    - category: "Person / Character"
      count: 317

# 3. Survival Curve & Mortality Config
survival_mortality:
  section_subtitle: "LitRPGs are brutal. Track the survival curve of characters introduced across the series."
  summary_title: "Volume 7, Chapter 119"
  insights:
    - title: "The Early Floor Filter"
      color: "var(--color-person)"
      text: "By the end of Volume 1, 26 characters have died out of 120 introduced."
  table:
    - metric: "Total Characters Introduced"
      value: "317"

# 4. Entity Mentions Timeline Config
mentions_race:
  min_chapter: 2
  max_chapter: 515
  table_title: "Volume 7, Chapter 119"
  insights:
    - title: "The Narrative Duo"
      color: "var(--color-person)"
      text: "Carl (<strong>6,458 mentions</strong>) and Princess Donut (<strong>6,173 mentions</strong>) lead the entire text in lockstep."
  table:
    - entity: "Carl"
      classification: "character"
      mentions: "6,458"

# 5. Narrative Absence Gaps Config
absence_gaps:
  summary_title: "Volume 7"
  insights:
    - title: "The Perspective Anchors"
      color: "var(--color-person)"
      insight: "Carl and Donut have maximum disappearance gaps of only <strong>4</strong> and <strong>8 chapters</strong> respectively."
      lore: "As central narrative engines, their constant presence forms the structural spine."
  table:
    - character: "Zev"
      gap: 285
      from: 82
      to: 367

# 6. Word Cloud & Pronoun Demographics Config
word_trends:
  section_subtitle: "Explore the keywords that define the crawl, alongside a clear demographic breakdown of character pronouns."
  cloud_title: "Crawl Keyword Map"
  total_pronouns: "1,655"
  total_pronouns_label: "tagged mentions"
  table_count_header: "Mentions"
---
```

### B. Standard Layout Partial References
Call the unified partial templates directly under the `shared/` directory. Pass the current page context (`.`) to authorize variables interpolation:

```html
{{< partial "shared/hero.html" >}}

<!-- Sticky Navigation Pill Bar -->
<div class="report-nav-sticky-container" id="report-nav-sticky">
  <nav class="report-nav-pill-wrapper" aria-label="Report section navigation">
    <a href="#race-selection-matrix-section" class="report-nav-link">Races</a>
    <a href="#entity-journey" class="report-nav-link">Funnel</a>
    <a href="#character-mortality" class="report-nav-link">Survival</a>
    <a href="#entity-race" class="report-nav-link">Mentions</a>
    <a href="#vanishing-characters" class="report-nav-link">Absences</a>
    <a href="#word-trends" class="report-nav-link">Demographics</a>
  </nav>
</div>

<main id="dcc-main-content" data-series-data="/<series_namespace>/series_data.json">
  {{< partial "shared/race_selection_matrix.html" >}}
  {{< partial "shared/funnel_breakdown.html" >}}
  {{< partial "shared/survival_mortality.html" >}}
  {{< partial "shared/mentions_race.html" >}}
  {{< partial "shared/absence_gaps.html" >}}
  {{< partial "shared/word_trends.html" >}}
  {{< partial "shared/contact.html" >}}
</main>

{{< partial "shared/footer.html" >}}
```

---

## 2. Data Structure Specifications

Ensure datasets are compiled and generated according to standard specs.

### A. Main Dataset (`series_data.json`)
Exposed at the path configured in the `series_data` parameter. 

```json
{
  "metadata": {
    "total_chapters": 515,
    "total_words": 1245618,
    "total_characters": 317,
    "survival_rate": 0.6215,
    "total_dead": 120,
    "total_survived": 197,
    "most_lethal_chapter": 13,
    "max_deaths_single_chapter": 5
  },
  "chapters": [
    { "series_index": 1, "volume": 1, "chapter_num": 2, "label": "Vol. 1, Ch. 2" }
  ],
  "race_data": [
    {
      "chapter_num": 2,
      "series_index": 1,
      "volume": 1,
      "label": "Vol. 1, Ch. 2",
      "data": [
        { "entity": "Carl", "classification": "person", "mentions": 22 },
        { "entity": "Dungeon", "classification": "location", "mentions": 11 }
      ]
    }
  ],
  "survival_timeline": [
    {
      "chapter_num": 2,
      "series_index": 1,
      "volume": 1,
      "label": "Vol. 1, Ch. 2",
      "alive_count": 94,
      "dead_count": 26,
      "new_deaths": []
    }
  ],
  "absence_gaps": [
    {
      "character": "Zev",
      "gap_chapters": 285,
      "from_chapter": 82,
      "to_chapter": 367
    }
  ],
  "word_cloud": [
    { "text": "carl", "value": 6458, "category": "person" }
  ],
  "breakdowns": {
    "pronouns": {
      "He/Him": 182,
      "She/Her": 84,
      "They/Them": 23,
      "It/Its": 28
    }
  }
}
```

*Note on Classifications:* Standard entities must be tagged with one of: `"person"`, `"location"`, `"organization"`, `"item"`, `"event"`, or `"other"`. These match the unified global chart colors.

### B. Attribute Matrix Dataset (`person_race_selection_counts.json`)
Exposed at the visualizer path. It maps volumes to specific selected attributes (e.g. races or factions).

```json
{
  "classification": "person",
  "field": "race_selection",
  "volumes": [
    {
      "volume": "v-series_name_1",
      "counts": { "Human": 4, "Goblin": 2 },
      "examples": { "Human": ["carl"], "Goblin": ["lorelai"] }
    }
  ],
  "series": {
    "counts": { "Human": 4, "Goblin": 2 },
    "examples": { "Human": ["carl"], "Goblin": ["lorelai"] }
  }
}
```

---

## 3. Core JavaScript Components

The visualizers share execution states and events using shared global variables.

### A. Data Promise Sharing
To avoid redundant network fetches, the first script loaded initializes a global promise:
```javascript
const dataContainer = document.querySelector('[data-series-data]');
const dataUrl = dataContainer ? dataContainer.getAttribute('data-series-data') : 'series_data.json';

window.dccDataPromise = window.dccDataPromise || fetch(dataUrl).then(res => {
  if (!res.ok) throw new Error('Failed to load ' + dataUrl);
  return res.json();
});
```
Subsequent scripts resolve `window.dccDataPromise` to initialize their charts asynchronously.

### B. Shared Time Series Player
The `TimeSeriesPlayer` class (defined in `bar_chart_race.js`) manages the scrubbers. It controls playing, pausing, scrubbing, and speed increments. You can register multiple visualizers (e.g. the bar chart race and the entity journey funnel) to react to its `onUpdate(seriesIndex)` callback.

```javascript
const player = new TimeSeriesPlayer({
  playBtnId: 'playBtn',
  playIconId: 'playIcon',
  pauseIconId: 'pauseIcon',
  sliderId: 'scrubberSlider',
  onUpdate(seriesIndex) {
    updateChart(seriesIndex); // Custom redraw hook
  }
});
```

---

## 4. Implementation Checklist for a New Series

1. [ ] **Format Datasets:** Generate `series_data.json` and `attribute_counts.json` matching the schemas in Section 2.
2. [ ] **Write Scripts:** Develop or copy the JS files managing the chart instantiations (binding to `window.dccDataPromise`) in the directory `static/<series_namespace>/`.
3. [ ] **Add Unit Tests:** Write `*.test.js` files matching the visualizer names and execute them using `node <script>.test.js` to assert data parsing correctness.
4. [ ] **Assemble Page:** Create `content/<series_namespace>/index.html`. Configure all stats, insights, and SEO table records in the frontmatter parameters block. Reference the shared layouts (e.g. `{{< partial "shared/hero.html" >}}`) in the page template.
5. [ ] **Compile Site:** Run `./bin/build` from the repository root to verify that the Hugo compiler outputs the compiled files successfully.
