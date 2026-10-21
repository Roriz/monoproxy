# Deploying monoproxy

Run `./bin/deploy` from any directory. The script builds Hugo and sharing assets
locally, prepares the dependency-free Node guide runtime, and uploads only the
ready files. Production does not run Hugo, generate assets, or install packages.

`./bin/deploy --build-only` prepares `tmp/deploy-build/release` without connecting
to production. Local builds need the existing Hugo binary and Node/image tools;
the existing Docker fallbacks remain available. The build cache includes source
contents, build scripts, Node version, public build settings, and an output
checksum, so missing or modified static output triggers a rebuild.

The default deployment target is `root@135.181.249.165:/apps/monoproxy`. Override
`REMOTE_HOST`, `REMOTE_USER`, `REMOTE_DIR`, `RELEASES_DIR`, or `SHARED_DIR` as
needed; remote paths should be absolute. Production still uses Docker and the host
Caddy binary. Runtime environment settings stay on the server in
`/apps/shared/.env.production` (mode 600). Each release links to that one file, so
rotating a secret survives rollbacks and old releases hold no copies. The first
deploy with this layout copies the current release's `.env.production` there; edit
the shared file directly (`sed -i` on the release link would replace the link with
a copy). Only the WhatsApp and IndexNow build settings are retrieved into a
temporary local file.

The release contains `public/`, the guide's runtime libraries/data/assets, Caddy
and Compose configurations, and the guide operator tools. It excludes the Hugo
binary, templates, tests, build tools, environment files, certificates, and VCS.
The guide static directory links to the complete built public output, which is
also mounted read-only in its container. This shares translation scripts, covers,
and sharing cards without copying media twice. Declared guide/site assets are
checked for existence before activation.

Before activation, the packaged Node server boots and passes a health check, and
Caddy validates the new configuration. A symlink switches the static release,
Compose recreates the guide once, and Caddy reloads without stopping. When Caddy
is not running (for example after a reboot), the deploy starts it instead, so a
deploy also recovers a stopped Caddy. The guide health check runs every second
during its 60-second start period and every 30 seconds afterwards. Absolute
static roots allow Caddy to keep its original process and working directory.
The reports/access configuration volume remains `monoproxy-web-guide_reports`.
The latest five successful releases plus the original legacy directory remain on
the server; a release that fails validation or activation is deleted.

If service startup or Caddy reload fails, the script restores the previous
release and runtime; a failed first deploy removes its link instead. A failed
IndexNow submission is reported but does not fail a live release. A final remote completion marker prevents a truncated SSH
script from reporting success. Container commands do not inherit SSH's script
input. Guide startup failures print container logs before rollback.

Run the deployment checks without network access:

```sh
python3 -B -m unittest discover -s scripts/tests -v
```

Run the application suite, including browser checks when Playwright is available:

```sh
WEB_GUIDE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node --test src/enrichreader.com/lib/web-guide/*.test.mjs
```

## Measured on 2026-10-21

| Metric | Before | After |
| --- | ---: | ---: |
| Deployment archive | 35,626,020 bytes | 7,816,101 bytes |
| Production build | 3.557 seconds | Eliminated |
| Local build / cached release preparation | 0.680 seconds | 0.432 seconds |
| Caddy process restarts per deployment | 1 | 0 |

The original archive was measured using the previous script's exclusions. The
production build baseline ran in a temporary copy without changing the live site.
The successful new full deployment took 36.015 seconds; the original full deploy
was not timed. The cache measurement includes validation and runtime packaging.

This deployment used committed application version `d233622` with the deployment
changes, preserving unrelated guide work in the main working tree. All 96
application/browser tests and all 10 deployment tests passed. HTTP smoke checks
also covered the landing page, guide, authors page, reader app, and API.
