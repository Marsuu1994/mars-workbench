# try2 · controller 给 subagent 的 brief 模板

每条 brief 都是只读的：不改仓库、不 push、不给任何 session 发消息；中间文件只写在 scratchpad 里自己的目录（`data/work-<label>/`），因为并行的 subagent 共享 scratchpad，会互相覆盖同名文件。

## Transcript metrics（每个 run 一个 general-purpose subagent）

```text
You are collecting metrics from the transcript of another Claude Code cloud session, for an experiment report. Read-only. Keep every intermediate file under <scratchpad>/data/work-<LABEL>/.

Session: <SESSION_ID> (label <LABEL>). Use `mcp__claude-code-remote__list_events` with `kinds: ["assistant", "user"]`, `limit: 100`; the first call (no cursor) returns the newest page; while `has_more` is true, call again with `before_id` = the page's `first_id`; stop at an empty page. Also read the `result` kind events (`kinds: ["result"]`, newest page): they carry the true cumulative usage per turn. Subagents' events are interleaved with a `parent_tool_use_id`.

Write JSON to <scratchpad>/data/transcript-<LABEL>.json:
1. usage: sums over assistant messages (each distinct message.id once) of input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, requests; context_max; given for all messages, main only, and per subagent (named by the Agent call's description). Mark output_tokens on assistant events as unreliable (streaming placeholders); take true usage from the result events as usage_from_result_events.
2. timeline (ISO): first_event, last_event; setup_nodb_end (the tool_result of `npm run setup -- --no-db`); db_setup_start; agents_spawned_at and per-agent spawn / hand-back (B only); page_commits (the three page commits: Bash with `git commit` and the page name, or for B the cherry-pick of each); pages_done (A: third page commit; B: third cherry-pick done); tests_start, e2e_start/end, check_clicks_start/end, ui_verifier_spawn/handback, docs_commit, first_git_push, pr_created, ci_green_confirmed, last_assistant_text.
3. process: tool_calls_total and by name, bash_calls, pushes, commits, tool_errors (with a one-line reason each), merge_conflicts (also detect `diff --cc` and `cherry-pick --continue`), stop_hook_turns, worktree_guard_refusals, wrote_own_playwright (true if the session wrote a Playwright script of its own), agent_calls (subagent_type, description, isolation, subagent_tokens / tool_uses / duration_ms from the `<usage>` block of its task-notification) — for the whole transcript and for the main session only.
4. failure_annotation: every problem the session hit, one line each, tagged with one of the four classes of arXiv 2610.10263 — shared state & merge; execution governance (start/join/timing, early termination, failure propagation); task orchestration (load imbalance, pseudo-concurrency); global context (incomplete briefs, missing interface contracts, repeated work) — or "none".
5. final_summary: the last assistant text, truncated to 2000 characters.
6. notes.

Never print whole pages; save each page to your work directory and parse with a script. Reply with a compact summary: usage (all / main / per agent), the timeline, the process counts, the failure annotation, the first 300 characters of the final summary.
```

## Checklist audit（每个 diff 一个 general-purpose subagent）

```text
You are auditing one implementation of a planned refactor against a fixed 20-item checklist. Read-only: never `git checkout`, never modify files in the repository, never push, never use GitHub tools. Read only through git plumbing on these refs: base = <BASE_SHA>, candidate = <HEAD_SHA> (branch <BRANCH>, label <LABEL>): `git diff <base> <candidate> -- <path>`, `git diff --stat`, `git show <candidate>:<path>`, `git log --oneline <base>..<candidate>`, `git grep <pattern> <candidate> -- <path>`. Scratch files only under <scratchpad>/data/work-<LABEL>-checklist/.

The plan is Part 1 of `git show <base>:design/spike/component-structure.md` (标准结构, 前提, 规则 1–7, 每页的改动计划 Board / Priorities / Dump, 执行和验证, Decision Q1–Q8). Reference implementation: `src/components/domain/projects/` at the base and the inert context in `src/app/design/constants.ts`. Console rules: `git show <base>:src/app/design/README.md`.

Checklist (✓ met / ~ partly / ✗ not met, with evidence file:line or a short quote): <paste the 20 items from experiments/page-structure-parallel/try1/instruction.md › 质量判定, in English as in try1's briefs: Board 1–5, Priorities 6–12, Dump 13–15, Overall 16–20; item 20: one commit per page plus one docs commit, merge commits are a note not a failure>.

Write <scratchpad>/data/checklist-<LABEL>.md: a table (#, item, verdict, evidence), then "Props observed" (QuadrantCell, MatrixTaskCard, MoveToPopover, MoveToRows, MobileMoveToSheet, MobileMoveToPanel, DumpComposer, DumpFeed, MobileBacklogCard), "Files outside the plan", "Possible bugs" (or "none seen"). Reply with the 20-row table and at most 6 lines of notes.
```

## Review collection（一个 general-purpose subagent，十个评审 session）

```text
Collect the results of ten blind-review sessions. Read-only; scratch files only under <scratchpad>/data/work-reviews/. Sessions: <R1 → id, …, R10 → id>.

For each: `get_session` (status, updated_at, post_turn_summary, usage incl. cost_usd); if still running, record as pending and move on. `list_events` with `kinds: ["assistant"]`, `limit: 100` (newest page; page back once with `before_id` if the final message is cut): take the last assistant text, save it to <scratchpad>/data/review-<R>.md and its trailing JSON block ({"label", "scores", "defects"}) to review-<R>.json. Audit the whole transcript: (a) any `mcp__github__*`, gh, curl/wget to GitHub, WebFetch/WebSearch; (b) any git command beyond HEAD~1/HEAD (fetch, checkout, switch, pull, branch -r, ls-remote, reflog, show/diff of another ref, log deeper than the two commits); (c) tool and Bash call counts.

Write <scratchpad>/data/reviews-summary.json (per label: status, scores, defects, defect counts by severity, audit a/b/c, usage) and reply with a table: label | status | six scores | defects by severity | GitHub tools? | out-of-scope git? | cost, plus a one-line gist of each label's major/blocker defects.
```

## 评审 session（`create_session`）

- `source_url` `https://github.com/Marsuu1994/mars-workbench-lab-try2`，`source_revision` `experiment/review-R<n>`，`model` `claude-fable-5-1`，title `[try2 R<n>] Blind review — page structure`，tags `experiment:page-structure-try2`、`try2-review:R<n>`，prompt 见 instruction › 质量判定（填 `{R}`）。
- 十个同时起；盲审映射 `data/blind-map.json` 用 `SystemRandom`，报告写完前不公开。
