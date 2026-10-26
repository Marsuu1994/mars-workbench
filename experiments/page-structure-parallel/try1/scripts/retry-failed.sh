#!/usr/bin/env bash
# Reruns, on a warm server, every page script that had a FAIL for a run.
# Usage: retry-failed.sh <RUN> <SHA>  → logs data/behavior/<RUN>-retry-<page>.log
set -u
RUN=$1; SHA=$2
S=/tmp/claude-0/-home-user-mars-workbench/7c7d59f5-f511-573c-905b-07a25aedac75/scratchpad
failed=$(grep -l "^FAIL" $S/data/behavior/$RUN-{board,priorities,dump}.log 2>/dev/null | sed -E 's#.*/'"$RUN"'-([a-z]+)\.log#\1#' | tr '\n' ' ')
[ -z "$failed" ] && { echo "$RUN: nothing to retry"; exit 0; }
echo "$RUN: retrying $failed"
cd /home/user/mars-workbench
export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh >/dev/null 2>&1; nvm use 24 >/dev/null
if [ "$(git rev-parse HEAD)" != "$SHA" ]; then "$S/scripts/run-branch-checks.sh" "$RUN-warm" "$SHA" >/dev/null 2>&1; fi
npm run --silent e2e:session -- .auth/e2e-session.json 2>&1 | tail -1
"$S/scripts/run-checks.sh" "$RUN-retry" $failed
