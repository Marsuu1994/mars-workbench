#!/usr/bin/env bash
# Runs the three click-through scripts against the dev server on :3000, from the
# repo dir so `@playwright/test` resolves. Usage: run-checks.sh <label> [board|priorities|dump ...]
set -u
S=/tmp/claude-0/-home-user-mars-workbench/7c7d59f5-f511-573c-905b-07a25aedac75/scratchpad
label=$1; shift
pages=${*:-"board priorities dump"}
cd /home/user/mars-workbench
export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh >/dev/null 2>&1; nvm use 24 >/dev/null
mkdir -p $S/data/behavior
for page in $pages; do
  out=$S/data/behavior/$label-$page.log
  cat $S/scripts/_preamble.mjs $S/scripts/$page.mjs | node --input-type=module > $out 2>&1
  echo "== $page: $(grep SUMMARY $out || echo 'no summary (crash)')"
done
