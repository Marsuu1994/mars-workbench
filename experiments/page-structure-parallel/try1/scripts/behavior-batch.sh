#!/usr/bin/env bash
# Usage: behavior-batch.sh RUN SHA [RUN SHA ...] — serial; returns the checkout to the controller branch at the end.
set -u
S=/tmp/claude-0/-home-user-mars-workbench/7c7d59f5-f511-573c-905b-07a25aedac75/scratchpad
while [ $# -ge 2 ]; do
  "$S/scripts/run-branch-checks.sh" "$1" "$2"; shift 2
done
cd /home/user/mars-workbench && git checkout -q --detach 1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4 && echo "back on main (detached)"
