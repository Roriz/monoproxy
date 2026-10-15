# Production deployment — 2026-10-14

Owner explicitly requested `bin/deploy`. Deployment completed to
`https://enrichreader.com/guia/frankenstein` using that script. The release was
rebuilt in staging, swapped to `/apps/monoproxy`, the persistent guide service
became healthy, Caddy restarted with `Caddyfile.production`, and the old release
was cleaned up. No author outreach or mail test was performed.

Live verification passed:

- Health, clean and positioned Frankenstein, authors and guide CSS return 200.
- The live CSS includes the desktop layout; HTML includes the reader shell.
- Browser checks at 360 and 1440px verify navigation, picker placement, Escape,
  positioned world navigation and live search, with no horizontal overflow or
  JavaScript errors. Operator exclusion cookie prevents analytics contamination.
- Live captures: `tmp/web-guide-ui/live-deploy/`.

IndexNow was not submitted because its ownership key is unconfigured.

## Build/runtime remediation

The first staging build failed deterministically with `node: command not found`;
production remained unchanged. The server is a Docker/Hugo host, unlike the local
Node/image-tool development environment. New guide build steps had assumed those
host dependencies. Build and startup validation now have Docker fallbacks.

The build image explicitly installs the SVG conversion executable, JPEG support
and fonts, and performs a conversion smoke check. A library-only package did not
supply the executable; the corrected image was verified on the actual server.
Archive extraction no longer retains workstation UID ownership. Asset generation
runs as the manifest owner, preserving the container's dropped capabilities.

A subsequent run built correctly but exited before activation: an interactive
Docker fallback consumed commands from SSH's script stdin. The noninteractive
wrapper now leaves stdin closed. A real-Docker reproducer returned exit 9 with
input forwarding and exit 0 after removing it. The successful retry explicitly
logged the atomic swap, healthy service, Caddy restart and final serving marker;
public HTTP/browser checks then verified activation independently.

Reproduce the runtime safeguard with:

```sh
scripts/web-guide/test-deploy-runtime.sh
```

This checks that Docker Node cannot consume deployment input and validates the
catalog without host Node. Shell syntax and diff whitespace checks also pass.
No runtime package installation on the host was required. Docker build layers
are cached for subsequent deployments.

## CSS-responsive update

Re-deployed with `bin/deploy` after the owner's Frankenstein responsiveness report.
The service became healthy and Caddy restarted successfully. Live browser checks
passed at nine viewport widths (320–1920px) on the same document with JavaScript
disabled, plus picker placement at 375/768/1280px with interactions enabled.
Production serves the new JS without viewport-resize/layout sizing code. Twelve
live cases pass; screenshots/results: `tmp/web-guide-ui/css-responsive-live/`.
All 88 local tests also pass. Tablet media queries now cover 768–1023px explicitly.
