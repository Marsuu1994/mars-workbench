# Blind-review setup — page-structure-parallel try2

How the ten candidates of try2 were put in front of a reviewer, so the `code-reviewer` agent (`design/spike/code-reviewer-agent.md`) can review the same ten branches the same way. Everything here is as run on 2026-10-27; the prompts and scripts in this folder and in `experiments/page-structure-parallel/try2/prompts/` are the exact files.

## The ten branches

Lab repository `Marsuu1994/mars-workbench-lab-try2`, one orphan branch per candidate, two commits each: `Review base` (the starting point, scrubbed) and `Review candidate R<n>` (the candidate's tree, scrubbed the same way, README restored to the base's). No run branch name, no merge commits, no commit messages beyond those two, no experiment file anywhere in the tree.

| Branch | Head | Branch | Head |
| --- | --- | --- | --- |
| `experiment/review-R1` | `8f38cf93` | `experiment/review-R6` | `3140f345` |
| `experiment/review-R2` | `718ffb45` | `experiment/review-R7` | `a497d0d4` |
| `experiment/review-R3` | `b568b552` | `experiment/review-R8` | `86fdb928` |
| `experiment/review-R4` | `ccb493ce` | `experiment/review-R9` | `c89aa4f9` |
| `experiment/review-R5` | `0e87ae81` | `experiment/review-R10` | `43ba5d57` |

The review base commit is `c9784f40` on every branch (the scrubbed tree of `experiment/base-try2` = `83ae5a4`, which is `main` at `1ae70f7f` plus the four fixes the try2 instruction lists). Which run is behind which label is the blind map: `data/blind-map.json` on the lab repository's `controller/try2` branch. Don't open it before scoring if the review is meant to stay blind; the controller resolves it in the report.

## How a branch is built

`make-review-branch.sh <R> <candidate SHA>` with `BASE=<base SHA>`, `SCRUB=<rule file>`, `REMOTE=<lab remote>`, `REPO=<checkout>`: it checks out the base tree and the candidate tree into temporary directories, runs `scrub.py` on both with the try's rule file (`try2/prompts/scrub.txt`: delete `experiments/` and the experiment spike, cut the parallel-execution section and the Q9 lines from the component-structure spike, drop the Q9 sentences in the tracker and README), copies the base README over the candidate's, greps both trees for a leak pattern (`Q9|experiment|并行|串行|subagent|worktree`; the `.gitignore` line for `.claude/worktrees/` is in both trees and is the only expected hit), commits the two trees as an orphan history and pushes the branch. A defect every candidate shares is a scrub artifact, not a finding; README and the Update Log are out of the review's scope for that reason.

## What a reviewer gets

- Checkout: the branch, nothing else (`source_revision` on `create_session`; or `git worktree add <dir> experiment/review-R<n>` for an in-session agent).
- Prompt: `try2/prompts/review-template.txt` with `{R}` filled in (`review-R1.txt` … `review-R10.txt`). Scope: `git diff HEAD~1 HEAD`, the code it touches, AGENTS.md, and the spike at `git show HEAD~1:design/spike/component-structure.md` (a candidate may have moved its copy to `design/spike/archived/`). Out of scope: README and the Update Log, other branches, pull requests, GitHub tools, history beyond the two commits, any other candidate.
- Output: six criteria scored 1–5 with one or two sentences of evidence (correctness, spec conformance, consistency, conventions, scope, readability), a defect list (blocker / major / minor / nit, `file:line`, one sentence), and one closing JSON block: `{"label": "R<n>", "scores": {...}, "defects": [{"severity", "where", "what"}]}`.
- Effort: the review branches carry the base's `.claude/settings.json` (`"effortLevel": "high"`), so a session on them runs at high; an in-session agent inherits its session's effort.

## The sessions as run on 2026-10-27

`create_session`: `source_url` the lab repository, `source_revision` `experiment/review-R<n>`, `model` `claude-fable-5-1`, `environment_id` the existing environment, `title` `[try2 R<n>] Blind review — page structure`, `tags` `experiment:page-structure-try2` and `try2-review:R<n>`, `prompt` the filled template. All ten started together at 05:54 UTC; nine were cut off by the account's usage window at 05:58–06:05 after $2.7–4.2 each, R4 finished. The next run of the review is planned on `claude-opus-5-5` (one reviewer per candidate, started alone right after a usage reset), or through the `code-reviewer` agent on the same branches — the instruction's 预算和角色 section.

Reference from try1 (six candidates, the same prompt minus the README exemption, Fable at the default effort): 21–29 tool calls, 4–8 min and $3.9–4.2 per review; scores 26–27 of 30 with no blocker; every reviewer ran `git log --oneline -3` and nothing else out of scope.

## Collecting and auditing

One subagent collects the ten results and audits each session: `prompts/controller-briefs.md` › Review collection. It reads each session's last assistant message for the JSON block, lists every tool call to flag GitHub tools and git commands that look beyond the two commits, and writes `reviews-summary.json` (per label: scores, defects by severity, audit, usage). The controller resolves the blind map only when writing the report.
