#!/usr/bin/env bash
# Builds the blind-review branch for one run: an orphan "Review base" commit (the
# base tree, scrubbed of everything that mentions the experiment) and on top of it
# "Review candidate <R>" (the run's head tree, scrubbed the same way, README
# restored to the scrubbed base). The reviewer gets a two-commit history with no
# run branch name, no merge commits, no commit messages and no experiment file.
# Usage: make-review-branch.sh <R> <candidate ref or SHA> [--no-push]
set -euo pipefail
R=$1; CANDIDATE=$2; PUSH=${3:-push}
BASE=1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4
REPO=/home/user/mars-workbench
cd "$REPO"
git fetch -q origin "$CANDIDATE" 2>/dev/null || true
CAND_SHA=$(git rev-parse --verify "${CANDIDATE}^{commit}" 2>/dev/null || git rev-parse --verify "origin/${CANDIDATE}^{commit}")
TMP=$(mktemp -d)
export GIT_AUTHOR_NAME=Review GIT_AUTHOR_EMAIL=review@example.invalid GIT_COMMITTER_NAME=Review GIT_COMMITTER_EMAIL=review@example.invalid
export GIT_AUTHOR_DATE="2026-10-26T00:00:00Z" GIT_COMMITTER_DATE="2026-10-26T00:00:00Z"

# Remove a whole line containing a fixed string (first arg) from a file (second arg).
drop_line() { grep -qF -- "$1" "$2" && { grep -vF -- "$1" "$2" > "$2.tmp" && mv "$2.tmp" "$2"; echo "  dropped line [$1] in $2"; } || true; }
# Replace a fixed string with another in a file.
replace_str() { grep -qF -- "$1" "$3" && { python3 -I - "$1" "$2" "$3" <<'PY'
import sys
old, new, path = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding='utf-8').read()
open(path, 'w', encoding='utf-8').write(text.replace(old, new))
PY
echo "  replaced [$1] in $3"; } || true; }

scrub() {
  local tree=$1
  cd "$tree"
  echo "scrub $tree"
  [ -f design/spike/component-structure-experiment.md ] && { git rm -q design/spike/component-structure-experiment.md; echo "  removed experiment file"; }
  local spike
  for spike in design/spike/component-structure.md design/spike/archived/component-structure.md; do
    [ -f "$spike" ] || continue
    replace_str "**Status: decided（Q9 是一次对照实验，结果出来后补在这里）**" "**Status: decided**" "$spike"
    replace_str "怎么验证、能不能交给 subagent 并行做，以及待拍板的问题" "怎么验证，以及待拍板的问题" "$spike"
    drop_line "| 2026-10-25 | 想知道 spike 定了之后能不能用 subagent 并行改，只探索、不开工 |" "$spike"
    drop_line "| 2026-10-26 | Q9：串行和并行各跑三次，做成对照实验 |" "$spike"
    replace_str "没有先后依赖。串行时建议 Board → Dump → Priorities" "没有先后依赖。建议 Board → Dump → Priorities" "$spike"
    replace_str "- **共享的文件**，也就是并行时的冲突面：" "- **共享的文件**：" "$spike"
    drop_line "| Q9 | 串行还是并行 |" "$spike"
    # The whole "并行执行（subagent）" section, up to the Decision heading.
    python3 -I - "$spike" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding='utf-8').read()
start = text.find('## 并行执行（subagent）——探索，没开工')
end = text.find('## Decision')
if start != -1 and end != -1 and end > start:
    text = text[:start] + text[end:]
    open(path, 'w', encoding='utf-8').write(text)
    print('  removed the 并行执行 section in', path)
PY
  done
  if [ -f design/tracker.md ]; then
    drop_line "Q9 comparison, start here" design/tracker.md
    drop_line "Q9" design/tracker.md
    replace_str "; spike \`design/spike/component-structure.md\`), built through the Q9 comparison below" "; spike \`design/spike/component-structure.md\`)" design/tracker.md
  fi
  if [ -f README.md ]; then
    drop_line "**The Q9 comparison is ready for a fresh session to run**" README.md
    replace_str " Q9 — serial or parallel subagents — becomes a comparison: each workflow runs three times in its own isolated session from the same commit and prompt, the main session measures time, tokens and quality, and the best PR merges." "" README.md
    replace_str " It also records whether parallel subagents can do the three pages: yes, measured in this container — a worktree with hard-linked \`node_modules\` is ready in about 1 s and runs typecheck, lint, unit tests and knip — but integration tests and e2e share one database and one dev server, so the main session runs those after merging." "" README.md
  fi
  cd "$REPO"
}

git worktree add -q --detach "$TMP/base" "$BASE"
scrub "$TMP/base"
BASE_TREE=$(git -C "$TMP/base" add -A && git -C "$TMP/base" write-tree)
BASE_COMMIT=$(echo "Review base" | git commit-tree "$BASE_TREE")

git worktree add -q --detach "$TMP/cand" "$CAND_SHA"
scrub "$TMP/cand"
cp "$TMP/base/README.md" "$TMP/cand/README.md"; echo "  README restored to the scrubbed base"
CAND_TREE=$(git -C "$TMP/cand" add -A && git -C "$TMP/cand" write-tree)
CAND_COMMIT=$(echo "Review candidate $R" | git commit-tree "$CAND_TREE" -p "$BASE_COMMIT")

echo "leak grep over the candidate tree (expected: only general subagent rules and unrelated archived spikes):"
git -C "$TMP/cand" grep -n -i -E "Q9|experiment:|component-structure-experiment|并行|串行|subagent|worktree" -- . ':!package-lock.json' ':!design/spike/archived/*' ':!supabase/*' ':!next.config.ts' | cut -c1-160 || true
echo "diffstat base→candidate:"
git diff --stat "$BASE_COMMIT" "$CAND_COMMIT" | tail -5

git update-ref "refs/heads/experiment/review-$R" "$CAND_COMMIT"
if [ "$PUSH" = push ]; then git push -q -f -u origin "experiment/review-$R" && echo "pushed experiment/review-$R"; else echo "no push (local branch experiment/review-$R)"; fi
git worktree remove --force "$TMP/base"; git worktree remove --force "$TMP/cand"; rm -rf "$TMP"
echo "RESULT R=$R candidate=$CAND_SHA base_commit=$BASE_COMMIT review_commit=$CAND_COMMIT"
