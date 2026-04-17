# EnrichReader | Design System (DESIGN.md)

This document defines the visual identity and UI patterns for EnrichReader. It is a living artifact designed to be read by **AI Agents** to ensure consistency in code generation and **Humans** to understand the brand soul.

---

## 01. Brand Philosophy: "The Reading Soul"

EnrichReader is not a "tech app"; it is a digital sanctuary for literature.
- **The Vision**: Reclaim the immersion of physical books within a digital interface.
- **The Aesthetic**: *Classic Literature* / *High Fantasy* / *Modern Minimalist*.
- **The Vibe**: Premium, scholarly, warm, and intentional. Avoid "generic tech" blues, harsh whites, and aggressive rounded corners.

---

## 02. Color System (OKLCH)

We use **OKLCH** for perpetual color harmony. All colors are derived from a warm-charcoal base (Hue 35).

### 2.1 The 60/30/10 Strategy
- **60% (Surface)**: The Void (Deep Ink/Charcoal).
- **30% (Content)**: The Parchment (Cream/Ivory).
- **10% (Action)**: The Gold (Burnished Bronze/Sun-kissed Glow).

### 2.2 Core Primitives
| Token | OKLCH Value | Role |
|---|---|---|
| `--color-neutral-950` | `oklch(7% 0.01 35)` | The Void (Body Background) |
| `--color-neutral-900` | `oklch(10% 0.02 35)` | Main Surface / Ink |
| `--color-gold-500` | `oklch(75% 0.14 85)` | Brand Primary (Gold) |
| `--color-cream-300` | `oklch(92% 0.05 85)` | Base Parchment (Readability) |

### 2.3 Reading Themes
| Theme | Surface | Primary Text | Accent |
|---|---|---|---|
| **Midnight** | `neutral-950` | `cream-300` | `gold-500` |
| **Sepia** | `oklch(93% 0.04 85)` | `oklch(12% 0.03 40)` | `oklch(35% 0.14 30)` |
| **Solarized** | `oklch(10% 0.03 205)` | `oklch(85% 0.05 195)` | `oklch(60% 0.15 180)` |

---

## 03. Typography System

We use a tiered hierarchy to distinguish between **Story**, **Interface**, and **Branding**.

| tier | Font Family | Usage |
|---|---|---|
| **Master** | `Playfair Display`, serif | Branding, Page Headers, Display Titles. |
| **Reading** | `Libre Baskerville`, serif | Long-form story content, Narrative quotes. |
| **Interface** | `Inter`, sans-serif | Navigation, Buttons, Labels, Metadata. |

### 3.1 Reading Rhythm
- **Measure**: `65ch` (Maximum width for narrative lines).
- **Line Height**: `1.75` (Optimized for long-duration reading).
- **Font Size**: `1.15rem` (Base story size).
- **Opacity**: `0.95` on story paragraphs to reduce optic glare.

---

## 04. Spacing & Depth

### 4.1 Spacing Scale (4px Base)
Used for margins, paddings, and component alignments.
- `spacing-1`: 4px
- `spacing-2`: 8px
- `spacing-4`: 16px (Standard gutter)
- `spacing-8`: 32px (Section rhythm)
- `spacing-16`: 64px (Editorial breathing room)

### 4.2 Elevation
- **SM**: Subtle grounding for buttons/inputs.
- **MD**: Default for component cards.
- **LG**: Used for immersive modals or focus blocks.
> Note: Shadows must adapt opacity (0.15 on dark / 0.08 on light) based on the current theme.

---

## 05. Component Patterns

### 5.1 Buttons
- **Primary**: Bold Gold (cream/dark-neutral text). High-contrast, standard state.
- **Outline**: Gold border, transparent bg. Secondary actions.
- **Ghost**: Transparent bg, primary-text or gold-muted. Tertiary actions.
- **Radius**: `var(--border-radius-sm)` (4px) or `var(--border-radius-md)` (8px). Never use full circles for buttons.

### 5.2 Cards
- Always use `var(--color-surface-elevated)` (`neutral-800` in dark mode).
- Apply a 1px border using `var(--color-surface-divider)`.
- Use `var(--border-radius-lg)` (16px) for a premium, containerized feel.

---

## 06. Branding: The V-Book Architecture

The logo represents the "Enrich" master brand with modular sub-brands.

- **The Logomark**: A silhouette of a book viewed from the bottom, forming a "V".
- **The Lockup**:
    - **ENRICH** (Master Brand) is always the primary visual anchor.
    - **Reader/Writer/Data** (Modules) are small, modern sans-serif sub-text.
- **The "Bloom"**: Elements emerging from the V-Book changed based on the story context (e.g., character icons from *Lord of the Mysteries*).

---

## 07. Implementation Rule for AI Agents
When generating new code:
1. **Never** use hardcoded colors (e.g., `#hex`). Always use `var(--color-...)`.
2. **Never** use pixels for layout spacing. Always use `var(--spacing-...)`.
3. **Always** check the current theme class (`.theme-sepia`, etc.) before applying custom overrides.
4. **Prioritize** the Reading Serif for any text exceeding 3 lines.
