# GEO landing refinement decisions

Confirmed with the owner, 2026-10-28.

- Lead reader pages with “Remember the cast. Stay in the story.” Keep compatibility in setup/FAQ copy.
- Describe supported stories and matching Skins without implying undocumented partnerships or universal coverage.
- Preserve the 24-hour completed-correction promise as requested by the owner.
- Keep legacy reports available for selective direct-link sharing. Remove links from the public site, sitemap entries and current IndexNow discovery; mark the report collection noindex. Navigation within the unlisted collection remains available. Existing index entries may take time to disappear.
- Reconcile operator details against the existing Privacy policy. The Google Play developer name corroborates SOFTWARES. Official registry verification remains outstanding; no registry-verified claim is made.
- Establish reading measurement before testing headlines. No headline experiment is launched by this change.

## Measurement follow-up in reader-app and reader-backend

Reuse existing attribution and telemetry; do not introduce a parallel analytics system.

The primary conversion is the first user-driven forward reading progress after book text renders. It is a proxy for starting to read, not proof of comprehension. Distinguish the sample book from imported books; report return sessions separately. Preserve usage-data controls for guests and signed-in readers.

Source inspection found existing first-touch attribution, guest telemetry, book-start and return events, and corridor engagement events. It also found gaps to verify before an experiment:

- `reader-app/src/lib/utils/attribution.js` stores first-touch acquisition data, but `src/lib/data/api.js` uploads it during signup. Consenting guest reading needs attribution without requiring signup.
- `src/lib/utils/readerTelemetry.js` records opening the first chapter as `book_start`. That event alone does not satisfy the agreed reading-progress conversion.
- `src/lib/data/stores/telemetry_store.js` discards the onboarding sample book's events. Measuring its qualified reading requires a deliberate, separately labeled event path.
- The backend accepts page-turn/chapter-completion aliases; verify frontend emitters and deduplication rather than assuming these aliases establish the required measurement.

These app/backend changes are separate from this website commit. Acceptance requires a fresh guest and signed-in journey from acquisition through first reading advance, sample/import distinction, repeat-event deduplication, and confirmation that disabling usage data prevents recording and transmission. Until that passes, website CTA events must not be reported as actual reading conversions.
