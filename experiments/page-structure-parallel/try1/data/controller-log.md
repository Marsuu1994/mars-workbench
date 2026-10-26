# Q9 experiment — controller log

- Base SHA (main after PR #83): 1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4 (merged 2026-10-26T04:35:14Z)
- Controller session: session_01GSYWxGWAXwUkMv85gPJyfV (claude-fable-5-1, effort max, permission auto, env env_011scbxKVRAPcJTTmy6VqZcA)
- Tag for runs/reviews: experiment:page-structure-q9

## Runs

| Run | Session id | Created (UTC) | Branch | PR | First push | PR opened | CI green on last head | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | session_012M8H43y3oj7psRRLHhj21U | 2026-10-26T05:25:32Z | claude/page-structure-a1 | | | | | launched |
| B1 | session_01KFYnghdA1N25sHNzYPX42D | 2026-10-26T05:25:33Z | claude/page-structure-b1 | | | | | launched |
| A2 | session_01WGKCxBYSSCFXDxnASUdCK9 | 2026-10-26T05:25:34Z | claude/page-structure-a2 | | | | | launched |
| B2 | session_01X9Nswd3S1vzCmEWcahELgF | 2026-10-26T05:25:35Z | claude/page-structure-b2 | | | | | launched |
| A3 | session_01N2yA3imymopPM8JWdiChJE | 2026-10-26T05:25:36Z | claude/page-structure-a3 | | | | | launched |
| B3 | session_01RFFR1nMwZYViRNMpkjJcbo | 2026-10-26T05:25:36Z | claude/page-structure-b3 | | | | | launched |

## Reviews (blind map lives in blind-map.json; do not publish before the report)

| Label | Session id | Created | JSON received |
| --- | --- | --- | --- |

## Phase: 1 → 2 (runs launched 2026-10-26 05:25:32–36 UTC, model claude-opus-5-5, default effort, permission auto)

- Heartbeat: cron trigger trig_013gZbh9WPVkVwttCiLnyHcP, hourly at :25 (10-minute cron rejected: platform minimum is 1 hour). Primary resume path: one-shot send_later at the runs' rate_limit_info.resetsAt + 5 min, re-armed at every check-in; the hourly cron is the fallback. Disable the cron at phase 6.
- Controller branch: claude/page-structure-q9-controller (commit ed005f6), folder q9-controller/; mirror at every milestone.

## Notes / incidents

## Prep (2026-10-26 ~05:05 UTC)

- Node 24.22.1 via nvm (`. /opt/nvm/nvm.sh; nvm use 24` in every Bash), `npm run setup` done, local stack up, package-lock.json restored.
- Dev server: `npm run dev` in background (log scratchpad/dev.log); e2e user signed in at `.auth/e2e-session.json`.
- Behavior scripts in scripts/ (board.mjs 2 checks, priorities.mjs 8 checks, dump.mjs 3 checks), runner `scripts/run-checks.sh <label>`; per branch: reseed with `npm run e2e:session -- .auth/e2e-session.json` first.
- Baseline on main (1ae70f7f): 13/13 PASS, 0 console errors (data/behavior/baseline-main-*.log). Gotcha: `getByTitle('Open backlog')` matches the desktop button too → `.filter({visible: true})`.

## Decisions (owner, 2026-10-26 ~05:07 UTC)

- Runs: model claude-opus-5-5, effort like the daily work sessions (xhigh) — effort is NOT settable through create_session (probe session_01H3nV2Ff4Hdkeo3t6Uf5TJb had no effort_level at all); see the guide answer / owner decision below.
- Reviews: model claude-fable-5-1, effort = controller's (max).
- Blind review must be fully clean: reviewers get an orphan two-commit branch `experiment/review-<R>` built by scripts/make-review-branch.sh (base and candidate scrubbed of every experiment mention; README restored to the scrubbed base, so the runs' Update Log never reaches a reviewer); run prompt v2 forbids describing the workflow anywhere in the repo. Runs still write the Update Log (part of the real task); only the reviewer's view drops it.
- Prompts in use: prompts/run-A1..B3.txt (from run-template-v2 + workflow-A/B), prompts/review-template-v2.txt.

## Runbook · usage exhaustion, interruption, resume

Phases: 0 prep ✓ → 1 launch six runs → 2 runs finish (PR open + CI green) → 3 data (time, tokens, process), checklist, behavior checks → 4 review branches + six blind reviews → 5 report → 6 owner picks the PR; report + experiment doc archived onto that branch; the other five PRs closed, branches deleted; sessions archived.

- **State lives in files, not in my context**: this file (phase, per-run table, incidents), blind-map.json, prompts/, scripts/, data/. Mirrored to the branch `claude/page-structure-q9-controller` (no PR) at every milestone; if this container is reclaimed, the first step after resume is `git fetch origin claude/page-structure-q9-controller` and restore the scratchpad from it.
- **Detection**: a `<child-session-event>` saying a run's turn failed; `get_session` → `rate_limit_info.status` != allowed (with `resetsAt`); my own calls failing. Also `status_bucket` failed/blocked on a run with no PR yet.
- **Pause**: launch nothing new; log the time and `resetsAt` per affected session here; `send_later` at resetsAt + 5 min with "RESUME Q9: read experiment.md § Runbook, then check every run".
- **Resume a run**: `get_session`; if idle/failed with the task unfinished → `send_message`: "Usage limits have reset. Continue the task from exactly where you stopped — same branch, same files; your deliverables and rules are unchanged." If the session reports its files or branch are gone (container reclaimed) → mark `rerun` here, delete its partial remote branch if any, start a fresh session with the same prompt and label; the report says which runs were reruns and why.
- **Time accounting**: record each pause window (start, end) per run; the report shows raw wall time and pause-adjusted wall time for affected runs; tokens are unaffected.
- **Reviews**: same pause/resume; a reviewer that produced no JSON is re-run from scratch (cheap, blind preserved).
- **Owner's side**: if I go quiet past a scheduled check-in, the session is rate-limited; a message from the owner after the reset, or the pending `send_later`, resumes me.
- Effort (docs check, for the report): effort is set by `CLAUDE_CODE_EFFORT_LEVEL` (an environment variable; a cloud environment can carry it), `--effort`, `/effort <level>` mid-session, or `effortLevel` in `.claude/settings.json` (read in single-repo cloud sessions; `max` not allowed there; `maxEffortLevel` caps). Nothing documented for `create_session`, so the six runs and the reviewers run at the model default (unset). Next time: put `effortLevel` in the repo's `.claude/settings.json` at the base commit, or set the env var on a dedicated environment.

## Check-in 1 (05:53 UTC) — four runs finished, CI green on first push; B1 and B3 still working

| Run | PR | Head | Commits (committer time, UTC) | PR opened | CI green | Session idle | cost_usd so far | Diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | #85 | 15452f1 | 05:27:31 Board · 05:29:13 Dump · 05:32:57 Priorities · 05:38:23 docs | 05:38:59 | 05:41:57 | 05:42:30 | 6.34 | 51 files +678 −551 |
| A2 | #88 | 6960f21 | 05:27:44 · 05:29:22 · 05:33:04 · 05:46:56 | 05:47:25 | 05:50:25 | 05:51:00 | 7.16 | 52 files +738 −610 |
| A3 | #86 | 721fec2 | 05:28:28 · 05:29:59 · 05:34:15 · 05:41:38 | 05:42:13 | 05:45:21 | 05:45:59 | 6.47 | 48 files +715 −604 |
| B2 | #87 | e7eeade | 05:30:40 Dump · 05:31:29 Board · 05:33:47 Priorities · 05:41:42 docs (linear, no merge commits) | 05:42:15 | 05:45:18 | 05:45:52 | 8.96 | 49 files +719 −593 |
| B1 | — | — | still working at 05:52 ("resolved merge conflicts; reviewing Priorities diff, then full checks") | | | | 5.02 | |
| B3 | — | — | still working at 05:53 ("click-through: Dump checks pass; fixing card locator in script") | | | | 5.16 | |

- All check runs on each head: 8/8 success (7 CI jobs + Vercel), one CI run per PR so far. e2e job ≈ 3 min.
- Rate limits: every session is on `ccr_promotional`, resetsAt 1793865600 (2026-11-05), status allowed → no five-hour window to pre-arm; the hourly heartbeat stays as the fallback.
- Blind map generated (blind-map.json, SystemRandom). Phase 3 started for the four finished runs: transcript agents, checklist agents, behavior checks (background, serial), review branches built.

## Phase 3 data (as reports arrive)

- A1 transcript (data/transcript-A1.json): 16.9 min (05:25:32 → 05:42:27); setup 05:25:50 → 05:27:44 (background); first push 05:38:18; PR #85 05:38:59; CI wait ≈ 3.5 min; 84 requests (71 main + 13 ui-verifier); input 172 · cache_write 270.5k · cache_read 14.56M (main 14.17M, ui-verifier 0.38M); transcript output_tokens unreliable (first block only) → use the session aggregate output 65,720; context_max 281.5k; tool calls 87 (Bash 75), 1 push, 4 commits, 2 tool errors (harmless); ui-verifier 7/8 PASS, FAIL on the desktop-only "backlog open" tab at phone width judged pre-existing and disclosed in the PR. Checks and npm test ran in the background while writing docs; e2e 26/26 foreground.
- Incident 06:01–06:12 UTC (controller machine only, no run affected): dockerd had exited at some point after the 05:05 baseline, so the first behavior batch timed out on every page load (auth at :54321 unreachable). `npm run db:setup` restarted the daemon and the stack (data kept); run-branch-checks.sh now checks the auth health URL and re-runs db:setup when it is down; the page scripts' top-level page opens are now checks (no more crashes). Batch rerun started 06:12.
- A2 transcript (data/transcript-A2.json): 25.4 min (05:25:34 → 05:50:56); setup backgrounded, seed done 05:32:57; e2e 05:33:42 → 05:35:52 (26/26); first push 05:46:54; PR #88 05:47:25 (21.8 min after the prompt); CI green confirmed 05:50:39; 99 requests (88 main + 11 ui-verifier); cache_write 277.6k · cache_read 17.66M (main 17.33M); context_max 287.4k; tool calls 100 (Bash 88), 1 push, 4 commits, 3 tool errors (benign: its own click script selector, two `ls`); ui-verifier 6/7 PASS (same pre-existing "backlog open" tab at phone width), 51.5k tokens; own real-page click-through in parallel with the subagent; pre-push checks in one 54 s command; NOTE: a scripted link rewrite at 05:45:10 edited design/spike/component-structure-experiment.md (disclosed as a judgment call) — scrubbed from the reviewer's view anyway.
- A3 transcript (data/transcript-A3.json): 20.4 min (05:25:36 → 05:45:57; the work turn ended 05:42:23 at 16.7 min, then two short wake-ups for Vercel/CI events); setup launched detached 05:26:05, exit 0 observed by 05:27:59; first push 05:41:42; PR #86 05:42:12; CI green 05:45:29 (check_suite); 84 requests (70 main + 14 ui-verifier); cache_write 269.5k · cache_read 14.75M (main 14.33M); `result` events give the true cumulative usage: input 678, cache_write 269.5k, cache_read 15.04M, output 67,156 (12.5k thinking), $6.39 — matches the session aggregate; context_max 289.8k; tool calls 88 (Bash 76), 1 push, 4 commits, 2 tool errors (benign); ui-verifier 5/6 PASS (same pre-existing FAIL), 46.2k tokens; ran test:coverage too; npm EBADENGINE warning (run container on Node 22).
- Token method for the report: per-session aggregates from get_session (`usage`: input, cache_write, cache_read, output, cost_usd) are the primary figures (they match the `result` events); transcript sums are the cross-check and give the main/subagent split; transcript `output_tokens` on assistant events are streaming placeholders and are not used.
- A1 checklist (data/checklist-A1.md): 19 ✓ / 1 ~ / 0 ✗ — item 19 partial: the spike was NOT archived (kept at design/spike/component-structure.md on purpose, with a new tracker bullet "Close the component-structure spike … then move it to archived/" because its Decision says Q9's results get appended there); everything else met, props 2/2/1/2/2/1, DumpComposer 0, DumpFeed 3, MobileBacklogCard 1; no callback props beyond overlays; no bugs seen; extras: route default exports renamed, FALLBACK_QUADRANT moved to utils/oneOffUtils.ts, new types/priorities.ts + types/dump.ts.
- A2 checklist (data/checklist-A2.md): 20 ✓ / 0 ~ / 0 ✗ — every spike prop target hit exactly; spike archived with links fixed (the experiment doc got 4 link-only edits); tracker: the three sub-bullets AND the parent bullet AND the Q9 controller bullet deleted (the parent's deletion is premature while Q9 is pending — report note); docs nit: AGENTS.md:115 still names `PriorityMatrixPage` in the "Production first" Bad example; no bugs seen.
- A3 checklist (data/checklist-A3.md): 19 ✓ / 1 ~ / 0 ✗ — item 19 partial: spike not archived and its links not updated (no tracker bullet about it either); tracker over-removal (parent item + Q9 bullet deleted); props all on target; no bugs seen; git sees DumpScreen→DumpPage as delete+add.
- B2 checklist (data/checklist-B2.md): 20 ✓ — spike `git mv`'d with links fixed; tracker Q9 bullet deleted (judgment call); commit order Dump → Board → Priorities; props all on target; no bugs seen.
- B2 transcript (data/transcript-B2.json): 20.3 min (05:25:35 → 05:45:49); setup 05:25:54 → 05:27:47 (1m54s, foreground); three worktree page agents spawned 05:28:10–37, hand-backs Dump 05:30:54 (2m14s, 94k tokens, 12 tool uses), Board 05:31:19 (2m37s, 102k, 17), Priorities 05:33:31 (4m50s, 157k, 32); merge: Dump ff 05:31:06, Board cherry-pick 05:31:29, Priorities cherry-pick 05:33:32 with 1 CONFLICT (design/constants.ts + DomainTab.tsx, both sides kept, resolved by 05:33:44); npm test 05:34:32; e2e 05:34:51 → 05:36:43 (26/26); ui-verifier 05:37:06 → 05:39:19 PASS (noted the same pre-existing play-step issue); first push 05:41:41; PR #87 05:42:15; CI green confirmed 05:45:31 (3m17s); 139 requests total (main 71; subagents Board 16, Priorities 27, Dump 11, ui-verifier 14); cache_write 560k total (main 169k); cache_read 17.84M total (main 12.14M; Board 1.28M, Priorities 3.19M, Dump 0.80M, ui-verifier 0.43M); context_max 228.9k; tool calls 141 (main 65), Bash 113 (main 50), 1 push, 4 commits (3 by agents + docs), 7 tool errors (3 = the worktree guard refusing compound `cd … &&` commands, 1 cherry-pick conflict, 3 benign), 1 merge conflict; 4 stop-hook turns while waiting for the background agents (untracked .claude/worktrees/); nothing merged; own click-through scripts had two selector-caused failures re-checked by hand.

## Check-in 2 (06:27 UTC, at the hourly heartbeat) — all six runs finished; phase 4 started

| Run | PR | Head | Commits (committer time, UTC) | PR opened | CI green | Session idle | cost_usd (final) | Diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | #89 | 7d0b6c0 | 05:31:42 Board · 05:32:11 Dump · 05:34:23 Priorities · 06:01:41 docs (linear, 0 merges) | 06:02:22 | 06:05:31 | 06:06:02 | 9.16 | 50 files +717 −586 |
| B3 | #90 | d6b5ce3 | 05:34:34 Board · 05:35:20 Dump · 05:38:46 Priorities · 06:04:51 docs (linear, 0 merges; messages prefixed "[B3]") | 06:05:28 | 06:08:04 | 06:08:54 | 9.09 | 52 files +772 −591 |

- Final cost_usd per run (get_session): A1 6.34 · A2 7.16 · A3 6.47 · B1 9.16 · B2 8.96 · B3 9.09.
- All six PRs: CI 8/8 success on the first and only push. CI runs: e2e 2.5–3 min.
- Behavior checks (batch 2, warm-up added mid-batch): A2, A3, B2 → board 2/2, priorities 10/10, dump 4/4, 0 console errors; A1 → priorities 10/10, dump 4/4, board 1/2 (desktop drag failed on a cold server: `expect(locator).toContainText` on the dnd announcement; the same journey passes in A1's CI e2e) → retry on a warm server queued in batch 3 with B1 and B3.
- Review branches: R1 a92e82e (A3), R2 2514892 (A1), R3 5c284f3 (B2), R5 c1f9e8c (A2), R4 47b6c7d (B1), R6 622410f (B3); base 6765018 for all; leak grep clean. Six blind reviewers launched at 06:30 UTC on claude-fable-5-1 (default effort), source_revision = experiment/review-R<n>.
- B1 checklist (data/checklist-B1.md): 19 ✓ / 1 ~ / 0 ✗ — item 19 partial: spike deliberately NOT archived (tracker defers the move until the Q9 report, "the spike carrying Q9's results"), links unchanged; everything else met, props all on target; no bugs seen; linear history, no merges (commit order Board → Dump → Priorities like the A runs).
- Behavior checks complete (batches 2 and 3, data/behavior/): every run passes all 16 checks (board 2, priorities 10, dump 4; 0 console errors) — A1, A2, A3, B1, B2, B3. The single failure (A1 board desktop drag, batch 2, cold dev server: the dnd keyboard announcement never appeared) passed on the warm retry (A1-retry-board.log 2/2); after that batch every page script warms the server first. Controller-machine quirk: dockerd started from a tool call died twice; run-branch-checks.sh now restarts the stack when the auth health URL is down.
- B3 checklist (data/checklist-B3.md): 20 ✓ — spike archived (R100) with links fixed in tracker + experiment doc; tracker Q9 bullet deleted; props all on target; no bugs seen; the Priorities commit also carries the TaskModalPanel import repoint, the useDumpFeed comment and types/priorities.ts.
- Checklist totals: A1 19, A2 20, A3 19, B1 19, B2 20, B3 20 → A mean 19.3, B mean 19.7; the only misses are item 19's spike archiving (A1, A3, B1 left it in place; A2, B2, B3 archived it).
- B1 transcript (data/transcript-B1.json): 40.4 min (05:25:33 → 06:05:59); setup 05:25:56 → 05:28:15 (139 s, foreground); page agents spawned 05:28:37 / 05:28:52 / 05:29:02, hand-backs Board 05:31:27 (2m50s, 91k tokens, 16 tool uses), Dump 05:32:09 (3m07s, 103k, 26), Priorities 05:34:09 (5m18s, 145k, 33); merge: first `git merge --no-ff` of Board, then reset + cherry-picks to keep one commit per page; one real conflict in the Priorities cherry-pick (design/constants.ts + DomainTab.tsx, both sides kept, resolved 05:34:22; "CONFLICT" hidden by `tail -5`); checks 05:34:34 → 05:36:00 (430 pass + 2 expected fail); e2e 05:36:04 → 05:38:05 (26/26); then 05:38:08 → 05:57:46 ≈ 19.6 min hand-writing and debugging its own Playwright click-through script (FAILs were script races, confirmed against an unchanged `main` worktree on :3001 as a control); ui-verifier 05:57:59 → 06:00:42 (6/6 PASS); first push 06:01:40; PR #89 06:02:21; CI green confirmed 06:05:44; 155 requests (main 81; Board 13, Priorities 30, Dump 19, ui-verifier 12); cache_write 447k (main 179k); cache_read 20.34M (main 14.12M; Board 0.97M, Priorities 3.30M, Dump 1.63M, ui-verifier 0.31M — lower bounds); `result` events: output 101,130 (17.5k thinking), $9.16; context_max 238.7k; tool calls 163 (main 74), Bash 131 (main 60), 1 push, 4 commits, 7 tool errors (4 worktree-guard refusals, 2 `pkill` exit 144, 1 `ls`), 3 stop-hook turns (added .claude/worktrees to .git/info/exclude on the third); no questions, no fallback.
- B3 transcript (data/transcript-B3.json): 43.2 min (05:25:37 → 06:08:51); setup 05:25:54 → 05:31:14 (5m20s, backgrounded then waited on with pgrep — the slowest setup of the six); page agents spawned 05:31:39 / 05:31:55 / 05:32:08, hand-backs Board 05:34:33 (2m54s, 92k tokens, 19 tool uses), Dump 05:35:20 (3m12s, 102k, 27), Priorities 05:38:04 (6m09s, 153k, 36); merge by cherry-pick (Board 05:34:33, Dump 05:35:20, Priorities 05:38:04 → CONFLICT in design/constants.ts + DomainTab.tsx, both kept, continued 05:39:14; the Priorities type moved into src/types during the fix); checks 05:39:19 → 05:39:28 (436 pass + 2 expected fail); e2e 05:39:32 → 05:40:48 (26/26); ui-verifier 05:41:09 → 05:43:02 FAIL (1/10, the same pre-existing desktop-only tab at 390 px, left unfixed, stated); 05:40:53 → 06:03:28 ≈ 22 min writing/debugging its own Playwright click-through script (largest block); first push 06:04:40 (with the docs commit); PR #90 06:05:28; CI green confirmed 06:08:21; 155 requests (main 74; Board 16, Priorities 33, Dump 22, ui-verifier 10); cache_write 447k (main 176k); cache_read 19.59M (main 12.43M; Board 1.24M, Priorities 3.81M, Dump 1.83M, ui-verifier 0.27M); `result` events: output 111,393 (18.7k thinking; main 45.4k, subagents ≈ 66k), $9.08; context_max 235.6k; tool calls 165 (main 72), Bash 135 (main 60), 1 push, 4 commits, 9 tool errors (5 worktree-guard refusals of heredoc/python edits → agents switched to Write; chromium path for its own script; 2 `ls`; `pkill` 144), 1 merge conflict, 1 stop-hook turn (.git/info/exclude); note: `subagent_tokens` in the harness `<usage>` ≈ the agent's largest single request, not a cumulative total.
- Phase 3 complete for all six runs (transcripts, checklists, behavior). Remaining: six blind reviews (phase 4), then the report.

## Phase 4 — blind reviews (launched 06:30 UTC)

- R1 session_01BEPAauLv6vb5jfYRuekQfx · R2 session_01WhePkdWGb7jFAtHov43R6o · R3 session_01PVnfGxf7yyz98kDioAua1W · R4 session_01RaeRFc9RfM3dFUfYMaYG9q · R5 session_01DRkmMX3SvecErgbFcfCC6g · R6 session_01PNQRFwqSDXrGTLVVcVwJQ5.
- R1 done 06:34 ($3.93), R6 done 06:36 ($3.90); both flag "missing 2026-10-26 README Update Log entry" (major) and "a stale README line" — these are artifacts of the scrub (every candidate's README is the base README, so the entry each run wrote is invisible to reviewers; the stale Current State line is in the base). Treat README.md defects as uniform scrub artifacts: exclude them from the per-run defect counts and note that spec/scope scores may be uniformly depressed by them.
- Collector agent launched 06:43 to pull the six JSON blocks, audit for GitHub tool use / out-of-scope git commands, and summarize.

## Phase 5 — report written (06:52 UTC): scratchpad/report.md (= q9-controller/report.md)

- Blind map resolved: R1=A3, R2=A1, R3=B2, R4=B1, R5=A2, R6=B3. Scores 27/27/27 (A), 26/27/27 (B); no blockers; README defects are scrub artifacts, excluded. Reviewer audit clean (no GitHub tools, no other refs; all ran `git log --oneline -3`). Review cost $24.31 total.
- Recommendation: merge B2 (#87); A2 (#88) the near-equivalent alternative. Waiting on the owner's pick (phase 6): append the report to the chosen branch's archived spike, git mv the experiment doc, fix links, tracker + README Update Log, push; close the other five PRs and delete their branches, the experiment/review-* branches and (after the owner reads it) the controller branch; archive the 12 sessions; the heartbeat is disabled now (nothing left to poll).
