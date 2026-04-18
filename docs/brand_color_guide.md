# EnrichReader — Brand Image Color Guide

Based on the design tokens in `design-tokens.css`, here is the recommended color mapping for every element of the brand image across **both themes**.

---

## 🌑 Dark Theme

### Color Assignments

| Element | Token | OKLCH Value | Hex Approx. | Rationale |
|---|---|---|---|---|
| **"ENRICH" text** | `--color-brand-primary` → `--color-gold-500` | `oklch(75% 0.14 85)` | `#C9A84C` | The hero word uses the primary brand gold — the signature color of the entire system. |
| **"READER" text** | `--color-text-primary` → `--color-cream-200` | `oklch(95% 0.03 85)` | `#F2EAD8` | Parchment cream gives "Reader" a secondary, elegant feel — supporting the hierarchy. |
| **Book cover (spine & edges)** | `--color-gold-700` | `oklch(50% 0.10 85)` | `#8A7240` | Burnished, darker gold for the physical structure — gives weight and depth to the book. |
| **Book pages** | `--color-cream-300` | `oklch(92% 0.05 85)` | `#ECDFC4` | The "base parchment" tone — warm, aged paper that feels literary and tactile. |
| **Book content — main shapes** (trees, castle, large figures) | `--color-cream-100` | `oklch(98% 0.02 85)` | `#FAF6EE` | Cleanest ivory for the primary silhouettes — maximum contrast against the dark background. |
| **Book content — details** (stars, sparkles, small symbols, splashes) | `--color-gold-300` | `oklch(85% 0.09 85)` | `#DCC88A` | Sun-kissed glow for the magical accents — ties the fantastical elements back to the brand gold. |

---

---

## 🌕 Light Theme

### Color Assignments

| Element | Token | OKLCH Value | Hex Approx. | Rationale |
|---|---|---|---|---|
| **Background** | `--color-cream-100` | `oklch(98% 0.02 85)` | `#FAF6EE` | Warm ivory — avoids clinical white, stays within the literary warmth. |
| **"ENRICH" text** | `--color-gold-700` | `oklch(50% 0.10 85)` | `#8A7240` | Darkened gold for legibility on light bg — still unmistakably gold. |
| **"READER" text** | `--color-neutral-600` | `oklch(30% 0.02 35)` | `#4A4541` | Deep warm charcoal — clear hierarchy below "ENRICH", readable. |
| **Book cover (spine & edges)** | `--color-gold-800` | `oklch(35% 0.08 85)` | `#6B5A32` | Deep burnished bronze — structural weight pops against cream bg. |
| **Book pages** | `--color-cream-400` | `oklch(85% 0.04 85)` | `#D9CEAE` | Slightly tanned parchment — needs separation from the cream-100 bg. |
| **Book content — main shapes** | `--color-neutral-800` | `oklch(14% 0.02 35)` | `#2A2623` | Near-black warm ink — the silhouettes become dark cutouts on light. |
| **Book content — details** | `--color-gold-600` | `oklch(65% 0.12 85)` | `#A8903E` | Mid gold for sparkle accents — darker than dark-theme's gold-300 but same role. |

> [!IMPORTANT]
> The biggest trap in light mode is using `gold-500` for "ENRICH" — at 75% lightness on a 98% lightness background, it has **terrible contrast** (~2.1:1). `Gold-700` at 50% lightness gives you a solid ~5.5:1 ratio while still reading as unmistakably gold.

---

## Side-by-Side Comparison

| Element | Dark Theme | Light Theme | Shift Logic |
|---|---|---|---|
| **Background** | `neutral-950` — The Void | `cream-100` — Clean Ivory | Full inversion |
| **"ENRICH"** | `gold-500` — Primary Gold | `gold-700` — Burnished Gold | ↓ 2 stops darker for contrast |
| **"READER"** | `cream-200` — Parchment | `neutral-600` — Deep Charcoal | Flip from cream → neutral |
| **Book cover** | `gold-700` — Burnished | `gold-800` — Deep Bronze | ↓ 1 stop darker |
| **Book pages** | `cream-300` — Base Parchment | `cream-400` — Tanned Parchment | ↓ 1 stop for bg separation |
| **Content main** | `cream-100` — Cleanest Ivory | `neutral-800` — Deep Ink | Full inversion |
| **Content details** | `gold-300` — Sun-kissed | `gold-600` — Mid Gold | ↓ 3 stops darker |

> [!TIP]
> Notice the pattern: **gold shifts down ~2-3 stops** and **cream↔neutral swap roles**. The brand gold hue (85) stays constant — only lightness changes. This keeps both versions feeling like the same brand.

---

## Visual Hierarchy Logic

### Dark Theme

```
                    ┌─────────────────────────────────────┐
                    │         BACKGROUND (The Void)       │
                    │       --color-neutral-950            │
                    │       oklch(7% 0.01 35)              │
                    │                                      │
                    │    ┌──── CONTENT DETAILS ────┐       │
                    │    │  gold-300 (sparkle/stars)│       │
                    │    │                          │       │
                    │    │  ┌── CONTENT MAIN ──┐   │       │
                    │    │  │  cream-100        │   │       │
                    │    │  │  (silhouettes)    │   │       │
                    │    │  └───────────────────┘   │       │
                    │    └──────────────────────────┘       │
                    │                                      │
                    │    ╔══════ BOOK PAGES ══════╗        │
                    │    ║  cream-300 (parchment)  ║        │
                    │    ╠══════ BOOK COVER ══════╣        │
                    │    ║  gold-700 (burnished)   ║        │
                    │    ╚═════════════════════════╝        │
                    │                                      │
                    │    ENRICH → gold-500 (primary)       │
                    │    READER → cream-200 (secondary)    │
                    └─────────────────────────────────────┘
```

### Light Theme

```
                    ┌─────────────────────────────────────┐
                    │         BACKGROUND (Ivory)          │
                    │       --color-cream-100              │
                    │       oklch(98% 0.02 85)             │
                    │                                      │
                    │    ┌──── CONTENT DETAILS ────┐       │
                    │    │  gold-600 (mid gold)     │       │
                    │    │                          │       │
                    │    │  ┌── CONTENT MAIN ──┐   │       │
                    │    │  │  neutral-800      │   │       │
                    │    │  │  (dark ink)       │   │       │
                    │    │  └───────────────────┘   │       │
                    │    └──────────────────────────┘       │
                    │                                      │
                    │    ╔══════ BOOK PAGES ══════╗        │
                    │    ║  cream-400 (tanned)     ║        │
                    │    ╠══════ BOOK COVER ══════╣        │
                    │    ║  gold-800 (deep bronze)  ║        │
                    │    ╚═════════════════════════╝        │
                    │                                      │
                    │    ENRICH → gold-700 (burnished)     │
                    │    READER → neutral-600 (charcoal)   │
                    └─────────────────────────────────────┘
```

---

## The 60/30/10 Rule Applied

### Dark Theme

- **60% — The Void** (`neutral-950`): The dark background that everything sits on.
- **30% — Cream family** (`cream-100` through `cream-300`): Pages, silhouettes — the warm, literary body.
- **10% — Gold family** (`gold-300`, `gold-500`, `gold-700`): Cover, accents, "ENRICH" text — the premium signature.

### Light Theme

- **60% — Ivory** (`cream-100`): The warm, clean background.
- **30% — Dark Neutrals** (`neutral-600` through `neutral-800`): Silhouettes, "READER" text — the structural body.
- **10% — Deep Golds** (`gold-600`, `gold-700`, `gold-800`): Cover, accents, "ENRICH" text — the premium signature, darkened for readability.

> [!TIP]
> **Dark theme key:** Book cover uses `gold-700` (not the generic goldenrod), and content details use `gold-300` instead of cream to add a shimmer layer.
>
> **Light theme key:** Everything gold shifts 2-3 stops darker. The silhouettes flip from cream → dark ink. Book pages shift from `cream-300` → `cream-400` to maintain separation from the now-cream background.
