#!/usr/bin/env bash
# Runs run-branch-checks.sh for several runs, one after another.
# Usage: behavior-batch.sh <label> <SHA> [<label> <SHA> ...]
# Environment: as run-branch-checks.sh (WORKTREE, REMOTE, OUT).
set -u
TOOLS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
while [ $# -ge 2 ]; do
  "$TOOLS/run-branch-checks.sh" "$1" "$2"; shift 2
done
