#!/usr/bin/env bash
# Behavior checks for one run: checkout its head (detached), restart the dev server
# on a clean .next, reseed the e2e user, run the three click-through scripts.
# Usage: run-branch-checks.sh <RUN> <SHA>
set -u
RUN=$1; SHA=$2
S=/tmp/claude-0/-home-user-mars-workbench/7c7d59f5-f511-573c-905b-07a25aedac75/scratchpad
cd /home/user/mars-workbench
export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh >/dev/null 2>&1; nvm use 24 >/dev/null
if [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:54321/auth/v1/health)" != "200" ]; then echo "stack down → npm run db:setup"; npm run --silent db:setup > "$S/db-setup-$RUN.log" 2>&1 || echo "db:setup failed"; fi
pkill -f "next de[v]" >/dev/null 2>&1 || true; sleep 2
git checkout -q --detach "$SHA" || { echo "checkout failed for $RUN"; exit 1; }
rm -rf .next
(nohup npm run dev > "$S/dev-$RUN.log" 2>&1 &)
for i in $(seq 1 90); do code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/auth/login); [ "$code" = "200" ] && break; sleep 2; done
echo "dev up for $RUN after ${i}x2s (http $code) at $(date -u +%T)"
npm run --silent e2e:session -- .auth/e2e-session.json 2>&1 | tail -1
"$S/scripts/run-checks.sh" "$RUN"
