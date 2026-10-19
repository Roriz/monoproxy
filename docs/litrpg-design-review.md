# LitRPG companion landing page: visual review

> Updated 2026-10-18: EPUB wording replaced with current copy; see the EPUB copy rule in docs/enrichreader-seo.md.

## Brief and baseline

Redesign `/litrpg-companion/` while preserving truthful product claims, crawlable
English copy, the dark/cream/gold identity, and separate browser-guide and in-app
reading routes. The live page was captured at 1440×1000 and 390×844 before edits.

A fresh designer subagent received only the screenshots and a short product/design
brief. It had no conversation history, source-code context, or implementation task.
Subsequent rounds reviewed fresh screenshots under the same restriction.

Screenshots are local review artifacts in `tmp/design/litrpg/` (excluded from
release archives). `before-*` captures the live baseline; `round1-*`, `round2-*`,
and `final-*` capture implementation rounds. Each contains full-page and viewport
images. Later rounds also include 320px and 900px widths.

## Round 1: full visual critique

1. **Hierarchy:** The oversized four-line desktop headline occupied the first
   viewport without explaining the differentiator. Shorten the promise, reduce
   its size, and pair it with a visible demonstration.
2. **Product proof:** No screenshot, profile, reading excerpt, or progress control
   showed what the companion actually does. Use a cream reading excerpt beside
   a dark character profile and make reading position explicit.
3. **Actions:** A small underlined launch link was weaker than section headings.
   Provide clear browser-guide and app (“Open EnrichReader”) actions and repeat them near the end.
4. **Composition:** Five identical heading/paragraph sections made all facts look
   equally important. Hero, article, and resource sections used different left
   edges. Establish one grid and distinct sections for explanation, reading routes,
   and practical qualifications.
5. **Typography and atmosphere:** Preserve the serif and restrained palette.
   Remove stars behind paragraphs, limit line lengths, and improve contrast.
6. **Mobile:** The prose became an uninterrupted column, with no tangible payoff.
   Put the demonstration before subsequent marketing sections and use generous
   touch targets.
7. **Navigation and ending:** Too many tiny navigation items competed with the
   page’s purpose. The resource list linked to the same page, and the footer was
   long and faint. Simplify the header and relevant onward paths.

The adopted direction was a reading companion laid open on a desk: warm paper,
quiet dark profile, fine rules, restrained gold annotations, and literary type.
The demonstration is explicitly fictional; it is not an app screenshot or a claim
that a corresponding Skin exists.

## Round 2: rendered redesign critique

The designer accepted the visual direction and requested seven focused changes:

- Move chapter switching next to the resulting profile instead of burying it
  below decorative details.
- Merge hero copy and tighten mobile type/spacing so the reading excerpt appears
  in the first viewport.
- Center a deliberate, same-width hero column when stacking at tablet widths.
- Remove the mobile benefit strip and shorten repeated explanatory sections.
- Enlarge functional demo content and controls rather than miniaturizing them.
- Describe Frankenstein as an available example of the guide format, with readable
  Portuguese-interface/English-profile disclosure, rather than implying LitRPG coverage.
- Make practical details readable and replace the long footer/resource tail with
  a compact footer. Reserve the paired italic treatment for hero and final invitation.

These changes were applied. Essential companion/profile content remains available
without JavaScript; only the fictional chapter-switching controls require it.

## Round 3: final critique

The designer found no material visual blocker in the revised screenshots. It
recommended lifting the desktop copy approximately 40–60px, shortening the
narrow-screen excerpt, and changing “Your files stay local” to the more precise
“Your book stays on your device.” These final refinements were applied.

The visual verdict is not evidence of conversion lift or indexing performance.
Real readers and post-publication measurement remain necessary.

## Implementation and checks

- A page-specific `companion` Hugo layout supplies the simpler header/footer.
- The base template now provides navigation/footer blocks and an optional body
  class; other pages retain their existing defaults.
- Scoped `companion.css` avoids changing the other reader landing pages.
- `litrpg.js` updates the fictional profile, selected button, and polite live
  announcement. Buttons are native controls with `aria-pressed` state.
- A keyboard skip link, focus outlines, anchor offsets, reduced-motion styling,
  and a static no-JavaScript demonstration support reading and navigation.
- Local browser checks cover 320, 390, 900, and 1440px widths, horizontal overflow,
  JavaScript errors, chapter switching in both directions, and no-JavaScript fallback.

No production deployment is included in this design iteration.
