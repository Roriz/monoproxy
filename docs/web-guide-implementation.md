# Web guide implementation

Current deployment/readiness instructions: [web-guide-operations.md](web-guide-operations.md).
The incremental notes below preserve implementation history; the operations guide
and persisted goal file describe the final state.

Design source: `~/projects/thoughts/startups/Enrichreader/design/web-guide/00-program.md`
and its final unit documents. Follow the program's U0 → U1 → U2 order in small increments.

## First increment: U0 position foundation

`src/enrichreader.com/lib/web-guide/position.mjs` implements URL parsing, cut
resolution, a picker map projection, and commit/navigation/share URL construction.
It is outside Hugo's `static` directory and is not published or wired to a page yet.
No real guide data or routes are introduced in this increment.

Run the boundary tests with:

```sh
node --test src/enrichreader.com/lib/web-guide/position.test.mjs
```

The build map retains the design's permanent `cut_before` values, including retired
ordinals. This implementation additionally expects `end_cut` on complete books:
a fixed opaque boundary for `fim`. The next book's first item's `cut_before` must
equal that boundary. A missing boundary throws; it never falls back to another cut.
The eventual map validator must enforce this equality and founder confirmation.

`pickerMap` allows only the specified reader fields. The full map must stay on the
build/server side. These helpers do not filter story content: the serving layer
must return only content permitted by the resolved cut, as required by the safety
contract. Hugo alone cannot render different responses for query parameters.

## Second increment: public Frankenstein example

Routes: `/guia`, `/guia/frankenstein`, and
`/guia/frankenstein/personagens/<first-appearance-slug>`. The home changes from
the soft gate to a character panel when `l`/`c` are valid. A dependency-free Node
server handles these routes and assets; Caddy forwards them to port 3003. Hugo
continues serving the rest of the site. The full histories stay outside `static`.
The server folds only included version deltas, never final `facts` or global roles.

Run locally:

```sh
bin/web-guide dev
# Open http://127.0.0.1:3003/guia/frankenstein
```

`bin/up` starts the guide container with the normal Caddy stack. Deployment
recreates it after the release swap so its read-only mount uses the final path.
`bin/dev down` stops it with the proxy. Independent container commands are
`bin/web-guide up` and `bin/web-guide down`. No production deployment has been
performed for this increment.

### Source and publication decision

- Source: `enrichreader-lfs/skins/skin-frankenstein.ers`, version
  `20261010225628`, from the 2026-10-10 truth review. The loose skin cache is
  pre-review and must not be used as this example's input.
- Build-only data records SHA-256 hashes of the package and truth record. Only
  the 23 reviewed people are imported; world entities and story layers wait for
  later increments. Reviewed text stays in English; UI copy is in Portuguese.
- Labels follow the reviewed 1831 Standard Ebooks edition: files 8–11 become
  Carta 1–4 (ordinals 1–4), and files 12–35 become Cap. 1–24 (ordinals 5–28).
  The Introduction and front/back matter are excluded. Future editions must not
  overwrite these permanent ordinals.
- Founder instruction in this session: this example is public. Config records
  `ownership: public-domain`. This extends the design's living-author publication
  rules for this example: no author-approval claim, official seal, or purported
  author-approved blurb. Clean home/shelf URLs are indexable; positioned URLs and
  character pages are noindex. The guide sitemap lists only the shelf and clean
  home. Positioned previews use the same safe metadata.
- Two conservative web-only identity overlays: “The traveller” until Chapter V
  is completed, and “Victor's father” until Chapter VII's signed letter is read.
  Their permanent slugs come from those early names. Original truth records and
  packages remain untouched.

Re-import explicitly (earlier package versions are rejected):

```sh
python3 scripts/web-guide/import-frankenstein.py \
  --package ~/projects/enrichreader-lfs/skins/skin-frankenstein.ers \
  --truth-record ~/projects/skin-maker/skin_entities/series_config/truth/skin-frankenstein.jsonl
```

### Verification

```sh
node --test --test-isolation=none src/enrichreader.com/lib/web-guide/*.test.mjs
WEB_GUIDE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node --test --test-isolation=none src/enrichreader.com/lib/web-guide/browser.test.mjs
```

30 unit/HTTP checks and five browser tests cover zero/invalid positions,
every cut's source boundaries, safe metadata, early identities, Clerval's reviewed
death boundary, raw-data denial, memory, browser-back sheet closure, search, clean
sharing, backwards movement and network failure/retry, typed-number ambiguity,
held steppers, slider keyboard commands, cancelling drafts, sheet swipes, manual
sharing fallback, no-JavaScript entry, current-cut previews, focus return and
preview-to-profile browser history, report persistence, chapter-safe snapshots,
duplicate receipts, bounded details, rate limiting and report failure/retry.
Asset checks cover mobile/desktop cover placement, actual image decoding,
safe position-independent social metadata, footer sharing and outbound attribution.
Palette checks cover all 360 hues in both
schemes. Browser tests skip when
Playwright is unavailable; no dependencies are downloaded. External font requests
are blocked during browser verification. Screenshots go to `/tmp`.

### Remaining program work

The U0 refinement replaces the enhanced dropdown with the designed readout,
slider and steppers. Tapping the readout enables printed-number entry. Letters and
chapters with the same number require an explicit choice; invalid input cannot
commit. A held stepper repeats after 400ms at 8 stops/s, accelerating to 24 stops/s
after 1.5s. Changes remain draft-only until commit. The sheet keeps its commit
visible when constrained by the visual viewport, supports a grabber swipe, and
honors reduced motion. Native select/form entry remains available without JS.

Source tags are unboxed and accessible. Newly visible entities get one loud tag
on their name; existing entities' new/changed state fields get a loud tag only
when sourced in the last included item. Prose stays quiet. The clean gate now
shows the remembered-position hint. Manual sharing replaces the buttons and
resets on reopening; positioned sharing includes an explicit spoiler warning.

### U1: guide look and character previews

The finalized U1 spec makes appearance a **guide configuration**, not a reader
setting. The earlier implementation summary's proposed appearance controls were
incorrect. `look` now supports the configured accent hue, `noite`/`papel` scheme,
and the four title-font choices. Frankenstein retains sapphire/night/Playfair.
Generated colors enforce button text, accent text and control contrast, nudge
lightness in at most four 2% steps, and fall back to sapphire. Title fonts affect
only the series identity; shared headings retain Playfair. Cover rendering and
cover-derived hue extraction remain pending.

Tapping a character card opens a preview from an inert server-rendered template
already cut to the URL's position. No request or full-history payload is needed.
The sheet shows the current name, first-appearance source, an optional chapter-local
protagonist/antagonist role and a sentence-bounded description of at most 240
characters. The content scrolls inside the sheet while `Abrir página` stays visible.
The importer folds local role fields and removals, never manifest roles.
Long descriptions with no complete sentence inside the budget are omitted from
the preview; the full sourced definition remains on the profile.

Native links remain usable without JS and with modifier clicks. Preview sheets
share the existing back/escape/swipe behavior, trap focus and return it to their
opener. `Abrir página` replaces the sheet entry; Back returns to the underlying
page with the sheet closed. Moving position clears the old preview content before
fetching so even a failed backward move retains no future preview facts.

### U1: correction reports

`Algo errado?` is available on the profile (`card/ficha`), inside its preview
(`sheet/sheet`), and in the footer (`guia`). Preview reports reuse the open sheet
and its history entry. A reason tap sends immediately; confirmation appears only
after the server has durably saved it. An optional detail of at most 255 characters
PATCHes that receipt. Failed requests retain the detail and offer retry; nothing
is queued in browser storage. Reports do not alter guide content automatically.

The same-origin API is `/guia/frankenstein/reports` (POST) and
`/guia/frankenstein/reports/<uuid>` (PATCH). The client generates a random UUID;
retrying it recovers the same receipt, while a new report gets a distinct row.
There is no public read/list API. The server reconstructs the displayed card or
preview fields from the requested chapter cut, ignores client-supplied facts,
and rejects unavailable subjects. Guide-wide reports carry no entity facts.

Reports are private JSON files with mode 0600, created atomically after a synced
temporary write. Detail updates use synced writes and atomic replacement. Local
development stores them in `tmp/web-guide-reports`; `WEB_GUIDE_REPORT_DIR` can
override that location. Docker uses the persistent `reports` named volume and a
limited initialization job to give its data directory to the Node user (uid 1000).
Normal service shutdown and release replacement preserve this volume. Back it up
with the deployment's other persistent data.

Read reports as the operator with `bin/web-guide reports` locally or
`bin/web-guide reports-docker` for the running container. These print the stored
context and optional detail as JSON; no HTTP admin page or email delivery is added.

Abuse controls limit mutation requests to 20 per IP/guide per ten minutes, with
short-lived in-memory counters. IPs and device identifiers are not stored in
reports. Caddy overwrites a dedicated client-IP header before proxying to the
loopback-only service. Cross-origin requests, oversized/non-JSON bodies, invalid
reasons/positions and details over the limit are rejected. A random receipt UUID
acts as the capability for its optional detail; it is kept only in the open sheet.

Verification includes an isolated Docker-volume check with the actual read-only
Node container and uid 1000. The temporary verification volume was removed;
existing services and production report data were not touched.

### U1: book identity, social assets and footer

`frankenstein-presentation.json` separates presentation assets and catalog/link
settings from the frozen truth-reviewed character data. The server merges it at
startup. The cover comes from the same 1831 Standard Ebooks input used by the
review: its SVG is rendered directly, with no generated artwork or story prose.
The manifest records the source SVG's SHA-256.

Three content-hashed WebP sizes support the header (48×72 for a 24×36 slot),
desktop masthead/shelf (192×288), and the future mobile about block (144×216).
The mobile masthead remains text-only. A content-hashed 1200×630 JPEG social card
is about 44 KB, below the 300 KB budget. Essential text and cover stay in its
center square. This public-domain exception uses `og-public-domain-<hash>.jpg`
and “Guia sem spoiler,” with no official or author-approval claim. Every guide
page and position references the same absolute production image URL and supplies
OG dimensions/type/alt plus Twitter large-image metadata. Image responses are
immutable; raw cover source files and build intermediates are not served.

Regenerate these assets explicitly with local `rsvg-convert` and ImageMagick:

```sh
node scripts/web-guide/build-frankenstein-assets.mjs \
  ~/projects/skin-maker/input/v-frankenstein/assets/cover.svg
```

The builder preserves existing catalog/link settings while replacing derived
assets. Checked-in outputs run without image tools or new runtime dependencies.
Current OG text uses the declared Playfair/Georgia and Inter/Arial fallback stacks
available to the SVG renderer; custom-font embedding remains a later refinement.

The footer now groups the author and source-edition link, trust/reporting, and
sharing/maker lines in that order. The desktop frame uses U1's 680px width and
aligns the header with the content. Eligible author links add EnrichReader guide
attribution, preserving other query values/fragments and existing UTMs; social
links and explicit opt-outs are untouched. The app link and linked maker line
require `app_published: true` in an eligible guide state. Frankenstein remains
false until catalog publication is confirmed. The author acquisition link and
bottom tabs wait for their corresponding routes; no placeholder destinations
are introduced.

This example slice does not complete U0–U4. Still pending: measurement,
the rest of the shared navigation and cover-derived accent proposal,
the full panel/app bridge, and world, mystery, timeline and author units. Those
tabs/flows are not displayed until implemented. Cross-build map permanence
validation is needed before importing another edition or rebuilding a shipped guide.

## Simplify review of the accumulated changes

Ran `~/.agents/skills/simplify/SKILL.md` with three sub-agents covering server
modules, browser code/CSS, and importer/service wiring; the lead reviewed tests
and integrated the changes. Both the Agents and Codex skill paths already point
to the same installed source, so no installation replacement was needed.

- Reuse: shared completed-reading cut calculation, plain-click handling, sheet
  CSS and browser-test server/browser lifecycle.
- Simplification: sorted the picker’s local matches directly and bound importer
  version updates/removals once.
- Efficiency: reused the sentence segmenter and slug lookup; counted search
  results in one pass; hoisted numeric conversions and the importer role-field set.
- Altitude: separated browser-test lifecycle from the individual scenarios.

No reviewed story data, routes, or service behavior was changed. A temporary
reimport preserved chapter maps and entity histories. Its provenance differs
because the upstream truth record has changed since the imported snapshot;
the frozen guide data was deliberately not regenerated during this quality pass.
No separate correctness concerns were reported by the reviewers.

## U3 panel progression increment

The positioned panel now has an accessible, hidden `Painel · Frankenstein` H1
and leads visually with `Onde você parou`, the focus destination after a commit.
The first-stop state keeps the empty card without an empty character section.
For included content, the directory explicitly says `Personagens até sua posição`.
A `Já terminei…` action opens the existing picker with the following ordinal
preselected (Carta 4 → Cap. 1; Cap. 24 → fim). Opening or cancelling does not
change the URL or memory; only the normal picker commit does. No next-stop action
renders at `fim`. First entry from the gate teaches tapping a name in a four-second
toast when the panel has names; subsequent moves keep the shorter toast.

This is a progression increment, not the complete U3 no-layer cast layout:
reviewed chapter-local mention counts are still needed to rank that cast honestly.
The existing cumulative directory remains available. Scene recaps, arc names,
threads and timeline doors wait for reviewed data and implemented destinations.

## Context and connected reader surfaces

`frankenstein-context.json` supplements, without regenerating, the frozen reviewed
people. The importer asserts the original package SHA-256 and hashes the 28 raw
chapter ledgers. Mention ranking uses block-level extraction attribution plus
presence-only reviewed profile snapshots for additions missing from NER, without
inventing occurrence counts. Geographic profiles are package-sourced (not part of
October 10's people field review); metaphorical Paradise, demographic/concept
noise and non-story Introduction versions are excluded.

107 story scenes are cut on the server; summaries below 50 source words are
omitted. One summary misattributes Walton's narration to Margaret and is withheld.
Four questionable threads are excluded with reasons in the context data. The sole
packaged arc starts in the excluded Introduction and uses its working title, so
no novel arc is presented. The timeline honestly says arcs are unavailable while
providing source-tagged chapter recaps and debut names. We do not fabricate an arc.

`audit-context.mjs` writes an operator-only later-name list under `tmp/`.
Its four hits are Switzerland (generic geographic context around Geneva), Europe
(generic continental geography in Safie's journey), and two occurrences of
Frankenstein (source text uses the surname in Chapter III and Chapter V, ahead of
the alias delta). These are data-attribution gaps, not later-identity reveals;
source summaries remain unchanged. The scanner output is preserved for operator
review rather than silently rewriting prose.

The app's positional story reveal functions are vendored unchanged in
`story-codec.mjs`. Original file SHA-256:
`438e2fa6b42522f4f97f508923787a282a24bd0d5b29cb6cf260c87d546488a5`.
Importance comes from per-chapter ledger snapshots, never final packed `imp`.
Questions link to an entity only through aliases known at the raised-in item;
the accumulated thread `entities` list is not used. All chapter and question
routes have safe clean heads and absent states. Search uses only displayed names,
printed aliases and the current description sentence, with shared prefix matching
for browser and no-JS/server requests. Old character paths receive 301s.

U4 now omits objectives and personality lists. English enum states map through
a per-guide table. Appearance data scales to included chapters. Corrections
reconstruct the visible card on the server before accepting the report.
The latest connected reader milestone passes 44 tests (including 6 browser flows).

## Private preview and operator workflow

Private access uses ≥128-bit URL-safe tokens, retaining only SHA-256 allow/revoke
hashes in an operator file outside source. Set `WEB_GUIDE_ACCESS_CONFIG` locally;
Docker reads `/reports/data/access.json` from the persistent volume. Missing files
mean no live tokens, so private access fails closed. Configure guide state/tour
through presentation data and restart/redeploy after state or token changes.
`bin/web-guide token create <series>` prints a private link; `token revoke <series>`
reads the token from stdin. Tokens are not stored as plaintext. Operator commands
are implemented; none was run against production.

Private UI includes the static tour, a normal-link `Ver tudo`, `resumos=0`, the
sales footer and approval sheet. All internal links/forms keep access context;
sharing and card/preview correction triggers are absent. Approval writes once,
returns the first receipt on retry, and never changes guide state. A reload shows
pending variants. The local operator inbox receives durable approval and open
notices, without keys or IPs; open notices are deduplicated for six hours and skip
link previews and `er_ops=1`. Read it with `bin/web-guide inbox`; read approvals
with `bin/web-guide approvals`. At this earlier milestone external delivery and contact were not configured;
the confirmed contact and approval-only outbox described below supersede that state.
No external message has been sent.

`/_ops/nao-contar` marks only the requesting browser and excludes operator traffic.
`node scripts/web-guide/build-review.mjs` generates the 15-section offline review
under `tmp/web-guide-audit/`, never within the site's served directories. Optional
`WEB_GUIDE_REVIEW_TOKEN` adds access context to local report deep links. Files are
private to the operator. Guide config validation covers public blurb requirements
(with the explicitly authorized public-domain exception), hidden/frozen entities,
approved intros, safe links, guide states and the private tour's page-one safety
and demonstrable forward/back cuts.

## Catalog, marketing and source evidence refinements

Publisher showcases require recorded consent and valid guide ownership. The
public shelf reads the catalog; private and unlisted titles never enter its
markup. Author acquisition uses exact public referrals and a real configured
WhatsApp number. Public-domain examples carry no claim of author approval.

World search shares prefix matching and original-text highlights between server
and browser. Queries flatten the debut/known groups; clearing restores groups.
Result announcements wait one second. At this milestone tracking was not activated; the later measurement integration
below supersedes that state and sanitizes URLs and referrers, including showcase paths.

Rebuild supplemental Frankenstein data with:

```sh
python3 scripts/web-guide/import-frankenstein-context.py \
  --package /home/roriz/projects/enrichreader-lfs/skins/skin-frankenstein.ers \
  --ledger-root /home/roriz/projects/skin-maker/cache/v-frankenstein \
  --source-root /home/roriz/projects/skin-maker/input/v-frankenstein
```

The importer checks quote text verbatim against its original chapter (whitespace
normalization only), validates chapter identities against the package, and saves
source hashes. Fourteen of 234 candidate quotes are withheld and recorded in the
server-only review exclusions. Their prose is never repaired or represented as
an exact quote. Frozen reviewed character histories are not regenerated.

## Confirmed contact and approval alerts

The grilling decisions in `docs/web-guide-grilling.md` are confirmed. Public
WhatsApp buttons default to the supplied contact in `site-config.json`.
`WEB_GUIDE_WHATSAPP` overrides it; an explicitly empty value disables contact
activation. The author page, guide footer and sitemap activate together.

Approval alerts use the existing Resend provider, sender
`no-reply@enrichreader.com`, and recipient `lead@enrichreader.com`. Supply the
existing `RESEND_API_KEY` through the runtime environment; no credentials are
stored in source or notification records. The CLI server starts a durable outbox
worker, reconciles interrupted enqueue operations from saved approvals, retries
with the same payload and idempotency key, and records successful receipts.
Ambiguous deliveries older than 23 hours become `needs_review` because Resend's
idempotency keys expire after 24 hours. Inspect with `bin/web-guide notifications`.
Without a configured transport, alerts remain durably pending. Correction reports
and private open notices remain local. No external email was sent in tests.

The agreed initial-pilot promise remains 24 hours for publication and private
corrections; the owner accepted a daily inbox review including weekends. Approval
receipts do not automatically publish a guide.

## Multi-book and measurement integration

Story data uses serial source indices. Public positions and chapter URLs retain
per-book permanent ordinals. Book-one end and book-two first chapter reveal the
same data. Book selection changes a draft; commit alone updates position memory.
Announced books reveal only their number/release metadata and cannot be committed.
Ongoing books have no finished stop. A supplied retired URL retains its boundary
while its stop stays out of picker controls.

Guide and marketing pages now send manual Umami pageviews with a last-send
sanitizer, preserving l/c/UTMs and stripping private keys, display settings and
query text from URLs and referrers. GPC, DNT and operator cookie/local opt-out are
respected. Events use explicit property lists; search sends count/length buckets,
never queries; report details never enter analytics. Browser tests use a fake
tracker and fake mail transport. Production tracker loading is domain-limited.
The installed Umami 3.4.0 collection endpoint associates pageviews and custom
activity with the same sessionId and visitId; no custom user identifier is created.
Source: https://raw.githubusercontent.com/umami-software/umami/v3.4.0/src/app/api/send/route.ts
Tracker setup: https://docs.umami.is/docs/tracker-configuration

Completed arcs in longer books expand through `arco=l.i`; earlier no-layer books
expand through `livro=l`. Unknown/unrevealed arc views leave the safe default.
Rows never pass the included cut. The accepted Frankenstein no-arc state remains.

`bin/build` merges eligible guide URLs into Hugo's primary sitemap without
replacing unrelated pages. Local verification repeated the merge and parsed its
XML. `build-site-assets.mjs` produces a cover-based shelf sharing card only when
at least three public guides exist, otherwise the generic card remains. The build regenerates
that artifact before Hugo copies site assets, including when the public shelf set changes.


## Final verification — 2026-10-14

All 87 checks pass with browser checks enabled and fake mail/tracker delivery.
The final audit fixes book-scoped recaps/priority threads, keyboard book drafts,
announcement notices, cut-valid timeline view parameters, retired-chapter redirects,
chapter arc/POV/launch details, dense per-book appearance runs, and exact rendered
correction snapshots. Footer and public author-referral measurement are connected.
Approval/report rate limits share the trusted client-IP boundary.

Hugo builds, primary sitemap merging is repeatable, development/production Caddy
configurations validate, Compose validates, and an isolated unprivileged read-only
Node24 service preserves report storage across restart. Operator CLI container/host
selection and token-reload behavior were verified with fake commands. QR rasterization
and decoding preserve the exact clean campaign URL. Source-name audit resolves all
hits: two original-text surname matches are recorded; two premature place summaries
were withheld in addition to the existing narrator exclusion. The original reviewed
character artifact remains unchanged. IndexNow supports dry plans, ownership proof,
eligible URL/removal notifications and retained state on failures; no live ping ran.

Simplify cleanup reused source lookups, removed unused renderers/imports and duplicate
validation, and reduced repeated browser work. Correctness/security fixes were reviewed
separately. Production publication, actual mail delivery, app publication and genuine
author/publisher onboarding were not performed.
