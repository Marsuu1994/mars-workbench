# Experiments

Controlled comparisons of ways of working — agent workflows, prompts, tooling, verification — measured on a real task from this repository. A design question about the product goes to `design/spike/`; an experiment answers "which way of working is faster, cheaper or better" with numbers. Each experiment is a folder named for its question; each execution of it is a numbered `tryN/` (a replication, or a variant that changes one thing); a try never edits an earlier try.

## Layout

This repository keeps only what a reader needs to know what each try found: one report per try. Everything else a try uses or produces — its instruction, prompts, scripts, controller tools, run branches, review branches, measurements and the controller's log — lives in the try's lab repository (Controller notes), which the owner archives rather than deletes once the report lands.

```text
experiments/
├── README.md                  # these conventions, the two templates, the controller notes
└── <experiment>/              # kebab-case, named for the question
    └── tryN/
        └── report.md          # conclusion first, the method in short, the data and the analysis; links its lab repository
```

try1 of `page-structure-parallel` ran in this repository before the convention existed; its material is archived on the `archive/try1` branch of `mars-workbench-lab-try2`.

## Lifecycle

1. **Instruction first.** Write the try's instruction from the template below, in its lab repository, and get the owner's approval; it plays the role a spike's Decision plays for product work. Nothing runs before that.
2. **Run and measure.** The controller session follows the instruction, keeps its log on the lab repository's controller branch, and never changes a run's code. Runs produce their own branches and PRs there.
3. **Report.** Write `tryN/report.md` with the conclusion first and a short method section, so it stands without the instruction. Everything a reader needs to re-judge the conclusion is in the report; the appendix links the lab repository for the rest.
4. **One PR per try** carries the report and the tracker line it closes; its description says what the try found. A conclusion that changes how we work lands in AGENTS.md or the README it indexes in the same PR; code the experiment produced merges through its own PRs.

## Conventions

- **Language**: this README and the folder names in English; instructions and reports follow the spike convention — Chinese narrative with English product nouns, metric names and identifiers (`design/spike/README.md` › Shape).
- **Tooling**: nothing here is code (Prettier ignores Markdown). The controller tools live in the latest lab repository (`tools/` on its controller branch); a new try starts from a copy of them, and a tool worth keeping for the product graduates to `scripts/` or a skill.
- **Blindness**: whatever a run or a reviewer must not see is named in the instruction, with how it was kept out of reach.

## Template · instruction.md

```markdown
# <experiment> · tryN — <the question in one line>

**Status: planned | running | executed <date>** · 来源：<spike、tracker 条目>

## 问题        一句话说清想知道什么，以及答案会改变什么决定
## 任务        每组都做的真实任务；起点 commit；任务的 spec 在哪
## 做法        每组一节；组与组之间唯一不同的那段文字，逐字贴出
## 组数、隔离、启动   每组几次；run 怎么隔离、共享什么；启动顺序和时间
## 预算和角色     每个角色（controller、run、评审、subagent）的模型和 effort；各阶段放在哪个用量窗口；预计花费
## 前置条件     启动前必须成立的事：合并了什么、主 session 机器准备、脚本验证过、prompt 冻结
## 测量        表格：维度 · 指标 · 来源
## 流程        主 session 的步骤，按顺序，注明哪些交给 subagent
## 质量判定     清单、行为检查、盲审（prompt、评分、scrub 掉什么）
## 和上一轮的差异   try2 起：改了哪一件事、为什么（try1：和来源 spike 的差异）
```

## Template · report.md

```markdown
# <experiment> · tryN — 报告

## 结论        答案先行：3–6 条，每条带支撑它的数字；最后是建议
## 数据        表格：每个 run 一行，每组的均值和范围
## 分析        数字为什么是这样；哪些是做法本身的，哪些是噪声
## 方法上的教训   下一轮协议要改什么
## 附录        lab 仓库的链接，每个数字来自那里的哪个文件；session id、PR、实验本身的花费
```

## Controller notes (cloud sessions)

Lessons try1 paid for; the next controller starts from them.

- Run in a throwaway lab repository (`<repo>-lab-<try>`, created by the owner with the Claude GitHub App installed, attached with `add_repo`): runs, review branches and the controller's state branch go there, because a cloud session cannot delete remote branches. The instruction, prompts, tools and controller log go on its controller branch. When the try is done the owner archives the repository (read-only) instead of deleting it: the report links to it, and nothing is exported into this repository (try2 exported ten runs' patches and they were four fifths of the archive PR). The archive PR and the recommended merge candidate go to the main repository.
- `create_session` sets the model, the permission mode and the checkout, not the effort. Pin effort with the environment's `CLAUDE_CODE_EFFORT_LEVEL` or the repo's `.claude/settings.json` at the base commit.
- Tokens: `get_session` › `usage` is the figure to report (it matches the transcript's `result` events); on assistant events `output_tokens` is a streaming placeholder. The main / subagent split comes from `list_events` (`parent_tool_use_id`); a subagent's `<usage>` block arrives in a later task-notification, and its `subagent_tokens` is about its largest single request, not a total.
- Keep the controller's own context small: one subagent per transcript, per checklist audit and for collecting the reviews; the controller reads their tables. Give sibling subagents their own working directories — they share the scratchpad.
- Scheduled tasks fire at most hourly. For a usage-limit pause, arm a one-shot at `rate_limit_info.resetsAt` and keep the hourly task as the fallback; mirror the controller's log to a branch so a lost container costs nothing.
- A clean blind review is an orphan two-commit branch per candidate: a scrubbed base, the scrubbed candidate on top, README restored to the base (`make-review-branch.sh` in the lab repository's `tools/`). Reviewers still ran `git log -3`, so leave nothing in the history. A defect every candidate shares is an artifact of the scrub, not a finding.
- Behavior checks on the controller machine: warm the dev server before Playwright touches it (a cold Turbopack server reaches `networkidle` before React attaches its handlers) and probe the local stack before each branch — a dockerd started from a tool call can die with the call.
- Every session the controller starts — runs, reviewers, subagents — draws on the controller's own five-hour usage window unless `rate_limit_info.rateLimitType` says otherwise (try1's child sessions were on a promotional allowance, try2's on `five_hour`). A window held try2's ten runs plus the controller and nothing more. Budget every try before it starts, in the instruction's 预算和角色 section: phases per window (runs in one; reviews first and alone at the start of the next, then collection), the controller on Opus at high effort (its subagents inherit both: two or three at a time, scripts for anything mechanical such as transcript sums), reviewers on one model for every candidate, started together right after a reset. Fable only where the question needs it (try2's takeaways: `protocol/takeaways.md` on `controller/try2` of `mars-workbench-lab-try2`).
