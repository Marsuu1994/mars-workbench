#!/usr/bin/env bash
# Reruns the checks for one run on a warm server when its log has a FAIL.
# Usage: retry-failed.sh <label> <SHA>  → <OUT>/<label>-retry.log
# Environment: as run-branch-checks.sh (WORKTREE, REMOTE, OUT).
set -u
LABEL=$1; SHA=$2
WORKTREE=${WORKTREE:-$PWD}
: "${OUT:?set OUT to the log directory}"
TOOLS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
grep -q "^FAIL" "$OUT/$LABEL.log" 2>/dev/null || { echo "$LABEL: nothing to retry"; exit 0; }
cd "$WORKTREE"
export NVM_DIR=/opt/nvm; [ -s "$NVM_DIR/nvm.sh" ] && { . "$NVM_DIR/nvm.sh" >/dev/null 2>&1; nvm use 24 >/dev/null; }
if [ "$(git rev-parse HEAD)" != "$SHA" ] || [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/auth/login)" != "200" ]; then
  "$TOOLS/run-branch-checks.sh" "$LABEL-warm" "$SHA" >/dev/null 2>&1
fi
npm run --silent e2e:session -- .auth/e2e-session.json 2>&1 | tail -1
npm run --silent check:clicks > "$OUT/$LABEL-retry.log" 2>&1
echo "== $LABEL retry: $(grep SUMMARY "$OUT/$LABEL-retry.log" || echo 'no summary (crash)')"
