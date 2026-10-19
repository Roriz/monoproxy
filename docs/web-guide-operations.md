# Web-guide operations

Implementation verified locally on 2026-10-14. The owner subsequently authorized
`bin/deploy`; production is now live. Deployment evidence and build-runtime fixes
are recorded in [web-guide-deployment.md](web-guide-deployment.md). External
author outreach remains outside this task. Frankenstein is the
configured public-domain example, without an author-approval claim. No real author,
private guide or publisher consent has been invented.

## Build and verify

Runtime: Node 24 (Compose pins `node:24-alpine`). Build: Node, the repository's
`bin/hugo`, `rsvg-convert` and ImageMagick 7 `magick`. QR generation additionally
uses `qrencode`; QR verification uses `zbarimg`. If host Node/image tools are absent,
`bin/build` uses the included Docker build image; `bin/web-guide-node` provides
noninteractive Node24 for sitemap, ownership-file and startup-validation scripts. Optional phone captures and browser
checks require an installed Playwright module and its Chromium browser.

```sh
node scripts/web-guide/validate-map.mjs
node scripts/web-guide/audit-context.mjs
WEB_GUIDE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node --test src/enrichreader.com/lib/web-guide/*.test.mjs
bin/build
docker compose -p monoproxy-web-guide -f compose.web-guide.yml config --quiet
bin/web-guide dev
```

Open `http://127.0.0.1:3003/guia/frankenstein`. `bin/web-guide up` runs the isolated
service; `bin/up` starts it with Caddy. A deployment rebuilds static output in
staging, swaps the release, then recreates the guide container against the final
read-only site directory. The named report volume survives releases and restarts.
The service port binds to host loopback. Compose explicitly trusts the proxy's
client-IP header; Caddy replaces that header with the actual remote client IP.
Keep the service behind that proxy. Direct native runs trust only loopback headers.

The build regenerates content-hashed site sharing cards from the public catalog
before Hugo copies them, and merges eligible guide paths into the primary sitemap.
Private/unlisted guides, positioned pages, mystery/timeline/chapter pages, entities
without approved intros, and shelves/world hubs below their three-item threshold
stay out. Never copy `data/` or `lib/` into Hugo's served `static/` directory.

## Inbox, access and approval delivery

```sh
bin/web-guide reports
bin/web-guide inbox
bin/web-guide approvals
bin/web-guide notifications
bin/web-guide token create SERIES
bin/web-guide token revoke SERIES < /private/path/token.txt
```

Revocation reads only the token from stdin; keep it out of shell arguments. Token commands select the
running container's persistent storage and restart it to reload access hashes;
without a running container they use the native runtime storage. Treat printed
access URLs as private. Keep access/showcase configurations in the report volume,
not in source. Correction records and open notices remain local.

The configured contact is WhatsApp +5511953664050. `WEB_GUIDE_WHATSAPP` overrides
it; an explicitly empty value disables author acquisition and its links/sitemap.
Approval-only alerts target `lead@enrichreader.com`, from
`no-reply@enrichreader.com`. Supply the existing `RESEND_API_KEY` at runtime.
Without it, alerts remain pending in the durable outbox. Retry state and successful
receipts persist. Ambiguous sends stop before the provider's 24-hour idempotency
window and become `needs_review`; reconcile those with provider receipts before
manually resending. Never delete an outbox merely to clear a failed delivery.
Approval receipts do not publish a guide. The owner accepted daily inbox checks,
including weekends, to uphold the pilot's 24-hour promises.

## Publication notifications

```sh
node scripts/web-guide/indexnow.mjs plan
# Before building an authorized release:
export INDEXNOW_KEY='YOUR_REAL_OWNERSHIP_KEY'
node scripts/web-guide/indexnow.mjs key
# After the key file and release are actually public:
node scripts/web-guide/indexnow.mjs submit
```

The key command prepares the root ownership file for Hugo. `submit` verifies that
published file before notifying IndexNow. Deployment calls it only when the key is
configured. Public reader landing pages and series reports are included alongside eligible guide URLs and prior eligible removals; failures
retain the prior manifest for retry. State defaults to
`~/.local/state/enrichreader/indexnow.json`; override with
`WEB_GUIDE_INDEXNOW_STATE` when needed. Preserve that state across releases.
Neither a submission nor acceptance guarantees indexing. No live submission was
made during implementation. Protocol: [IndexNow documentation](https://www.indexnow.org/documentation).

## Source review and media

The frozen October 10 ERS and reviewed character histories remain the authority.
The supplemental importer requires the matching original chapter inputs and hashed
local ledgers. Its exact invocation is in `web-guide-implementation.md`. Repeated
imports must leave the artifacts unchanged. The current audit has no unresolved
later-name hits; two surname matches were independently verified against their
original chapters. Three scene summaries, four question threads and fourteen
non-verbatim quotations are withheld. No novel-only arc exists in the package;
that explicitly accepted limitation stays visible. App publication remains false.

Generate the private 15-section source/config report with
`node scripts/web-guide/build-review.mjs`; output stays under `tmp/web-guide-audit/`,
never a served directory. Future retired chapters must provide a live same-book
`replacement_ordinal`; their reading-position boundaries remain immutable.

Publisher showcases require real consent and runtime configuration. The phone
still builder accepts only configured third-party unlisted demos and captures the
clean gate with its banner. Videos need actual Portuguese captions at a local
content-hashed `/web-guide/assets/captions-HASH8.vtt` path. Public QR targets may
carry campaign attribution, never access keys, positions, view settings or fragments.
No genuine publisher showcase or video was configured for this first example.

## Measurement reading rules

Use Umami `visitId` for a logical visit when joining pageviews and custom events.
`sessionId` identifies the longer-lived anonymous session identity and must not be
used to collapse separate visits into a single funnel. No custom user identifier
is generated. Source: [installed 3.4.0 collector](https://raw.githubusercontent.com/umami-software/umami/v3.4.0/src/app/api/send/route.ts).

Exclude operator traffic, private guides, third-party demonstrations and showcase
landings (`utm_medium=vitrine`) from public reader conversion rates. Attribute a
visit from its landing campaigns. A true zero commit is Book 1's first permanent
stop; zero percent in a later book is not the series zero state. Compare engaged
and untouched prefills, cancellation and successful commits separately. Query
metrics contain buckets, not search text; report prose and access keys never enter
analytics. The hand-made author visits report can rank first-appearance entity names
by distinct visits, omitting entities below ten visits. Offer fulfillment and actual
publication remain owner operations.
