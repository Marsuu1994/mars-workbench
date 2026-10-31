#!/usr/bin/env bash
# Builds the blind-review branch for one run: an orphan "Review base" commit (the
# base tree, scrubbed of everything that mentions the experiment) and on top of it
# "Review candidate <R>" (the run's head tree, scrubbed the same way, README
# restored to the scrubbed base). The reviewer gets a two-commit history with no
# run branch name, no merge commits, no commit messages and no experiment file.
#
# Usage: make-review-branch.sh <R> <candidate ref or SHA> [--no-push]
# Environment: REPO (default: the current git toplevel), REMOTE (default origin;
# the candidate is fetched from it and the branch pushed to it), BASE (the base
# commit, required), SCRUB (the rule file for scrub.py, required), LEAK_GREP
# (the pattern the leak check greps the candidate tree for).
set -euo pipefail
R=$1; CANDIDATE=$2; PUSH=${3:-push}
REPO=${REPO:-$(git rev-parse --show-toplevel)}
REMOTE=${REMOTE:-origin}
: "${BASE:?set BASE to the base commit}"
: "${SCRUB:?set SCRUB to the scrub rule file}"
LEAK_GREP=${LEAK_GREP:-"Q9|experiment|并行|串行|subagent|worktree"}
TOOLS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRUB=$(cd "$(dirname "$SCRUB")" && pwd)/$(basename "$SCRUB")
cd "$REPO"
git fetch -q "$REMOTE" "$CANDIDATE" 2>/dev/null || true
CAND_SHA=$(git rev-parse --verify "${CANDIDATE}^{commit}" 2>/dev/null || git rev-parse --verify "${REMOTE}/${CANDIDATE}^{commit}")
TMP=$(mktemp -d)
export GIT_AUTHOR_NAME=Review GIT_AUTHOR_EMAIL=review@example.invalid GIT_COMMITTER_NAME=Review GIT_COMMITTER_EMAIL=review@example.invalid
export GIT_AUTHOR_DATE="2026-01-01T00:00:00Z" GIT_COMMITTER_DATE="2026-01-01T00:00:00Z"

scrub_tree() {
  echo "scrub $1"
  python3 -I "$TOOLS/scrub.py" "$SCRUB" "$1"
}

git worktree add -q --detach "$TMP/base" "$BASE"
scrub_tree "$TMP/base"
BASE_TREE=$(git -C "$TMP/base" add -A && git -C "$TMP/base" write-tree)
BASE_COMMIT=$(echo "Review base" | git commit-tree "$BASE_TREE")

git worktree add -q --detach "$TMP/cand" "$CAND_SHA"
scrub_tree "$TMP/cand"
cp "$TMP/base/README.md" "$TMP/cand/README.md"; echo "  README restored to the scrubbed base"
CAND_TREE=$(git -C "$TMP/cand" add -A && git -C "$TMP/cand" write-tree)
CAND_COMMIT=$(echo "Review candidate $R" | git commit-tree "$CAND_TREE" -p "$BASE_COMMIT")

echo "leak grep over the candidate tree (expected: only unrelated matches):"
git -C "$TMP/cand" grep -n -i -E "$LEAK_GREP" -- . ':!package-lock.json' ':!design/spike/archived/*' ':!supabase/*' ':!next.config.ts' | cut -c1-160 || true
echo "diffstat base→candidate:"
git diff --stat "$BASE_COMMIT" "$CAND_COMMIT" | tail -3

git update-ref "refs/heads/experiment/review-$R" "$CAND_COMMIT"
if [ "$PUSH" = push ]; then git push -q -f "$REMOTE" "refs/heads/experiment/review-$R:refs/heads/experiment/review-$R" && echo "pushed experiment/review-$R to $REMOTE"; else echo "no push (local branch experiment/review-$R)"; fi
git worktree remove --force "$TMP/base"; git worktree remove --force "$TMP/cand"; rm -rf "$TMP"
echo "RESULT R=$R candidate=$CAND_SHA base_commit=$BASE_COMMIT review_commit=$CAND_COMMIT"
