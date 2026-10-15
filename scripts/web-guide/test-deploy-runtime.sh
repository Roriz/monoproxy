#!/bin/bash
# Real Docker regression: noninteractive build tools must not consume SSH's script.
set -euo pipefail
cd "$(dirname "$0")/../.."
printf 'remaining deployment commands\n' | WEB_GUIDE_DOCKER_NODE=1 ./bin/web-guide-node -e '
process.stdin.on("data", () => { process.exitCode = 9; });
process.stdin.resume();
'
WEB_GUIDE_DOCKER_NODE=1 ./bin/web-guide-node scripts/web-guide/validate-map.mjs
