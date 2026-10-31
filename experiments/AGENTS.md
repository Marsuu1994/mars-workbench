# Experiments — rules for agents

What an agent follows when it creates, runs or reports a try under `experiments/`. People start from `README.md` in this folder.

## Rules

- One folder per question (kebab-case, named for the question); one `tryN/` per execution. A try that has run is never edited: a variant is a new `tryN`.
- A try holds exactly two files: `instruction.md` and `report.md`. Nothing else goes into this repository — no prompts, scripts, run code, patches, transcripts, checklists, reviews or logs.
- Everything else lives in the try's lab repository (`<repo>-lab-<try>`): runs, review branches, and a controller branch carrying the full prompts, the tools, the raw measurements and the controller's log. The owner archives it when the report lands; nothing is exported from it.
- The instruction is written from the template below and approved by the owner before anything runs. It links its lab repository and has a 预算和角色 section.
- The report is written from the template below, conclusion first, and stands on its own with the instruction; its appendix says where each number lives in the lab repository.
- Whatever a run or a reviewer must not see is named in the instruction, with how it was kept out of reach.
- A try lands through one PR in this repository carrying its two files and the tracker line it changes. A conclusion that changes how we work lands in AGENTS.md or the folder rules it touches in the same PR; code an experiment produced merges through its own PRs.
- Language: these rules and folder names in English; instruction and report follow the spike convention (Chinese narrative, English product nouns, metric names and identifiers).

## Template · instruction.md

The approved protocol at the altitude a reader needs to judge the result. Step-by-step controller work, full prompt templates and fill rules belong on the lab repository's controller branch.

```markdown
# <question> · tryN — <the question in one line>

**Status: planned | running | paused | executed <date>** · 来源：<spike、tracker 条目> · Lab 仓库：<link>

## 问题        想知道什么，答案会改变什么决定；预注册的假设和判定规则
## 任务        每组都做的真实任务；起点 commit；任务的 spec 在哪
## 做法        每组一节；组与组之间唯一不同的那段 prompt，逐字贴出
## 组数和隔离    每组几次；run 怎么隔离、共享什么
## 预算和角色     每个角色（controller、run、评审、subagent）的模型和 effort；各阶段放在哪个用量窗口；预计花费
## 测量        表格：维度 · 指标 · 来源
## 质量判定     清单、行为检查、盲审（评分维度、隔离了什么）
## 和上一轮的差异   改了哪一件事、为什么
```

## Template · report.md

```markdown
# <question> · tryN — 报告

**执行 <date>** · 协议：`instruction.md` · Lab 仓库：<link>

## 结论        答案先行：3–6 条，每条带支撑它的数字；最后是建议
## 数据        表格：每个 run 一行，每组的均值和范围
## 分析        数字为什么是这样；哪些是做法本身的，哪些是噪声
## 方法上的教训   下一轮协议要改什么
## 附录        每个数字来自 lab 仓库的哪个文件；session id、PR、实验本身的花费
```

## Controller notes (cloud sessions)

Lessons earlier tries paid for; the next controller starts from them.

- **Lab repository.** The owner creates `<repo>-lab-<try>` with the Claude GitHub App installed; attach it with `add_repo`. Runs, review branches and the controller branch go there because a cloud session cannot delete remote branches. The controller branch carries `protocol/` (the full instruction, prompt templates with their fill rule, controller briefs), `tools/` (copied from the previous lab repository's `tools/` and adapted) and `data/` (measurements, blind map). Mirror the controller's log there at every milestone so a lost container costs nothing. The recommended merge candidate is pushed to this repository with its own PR.
- **Budget before anything runs.** Every session the controller starts — runs, reviewers, subagents — draws on the controller's own five-hour usage window unless `rate_limit_info.rateLimitType` says otherwise (try1's child sessions were on a promotional allowance, try2's on `five_hour`). One window held try2's ten runs plus the controller and nothing more: two windows drained in minutes when ten reviewers, seventeen subagents and the controller ran at once. Schedule phases per window: runs in one; reviews first and alone at the start of the next, then collection. The controller runs on Opus at high effort; its subagents inherit both, so start two or three at a time. Reviewers use one model for every candidate. Fable only where the question needs it.
- **Effort.** `create_session` sets the model, the permission mode and the checkout, not the effort. Pin effort with the environment's `CLAUDE_CODE_EFFORT_LEVEL` or the repository's `.claude/settings.json` at the base commit.
- **Tokens.** `get_session` › `usage` is the figure to report (it matches the transcript's `result` events); on assistant events `output_tokens` is a streaming placeholder. The main / subagent split comes from `list_events` (`parent_tool_use_id`); a subagent's `<usage>` block arrives in a later task-notification, and its `subagent_tokens` is about its largest single request, not a total.
- **Controller context.** Keep it small: scripts for anything mechanical (transcript usage, timelines, process counts); one subagent per judgment-heavy item (failure annotation, checklist audit, collecting the reviews), reading their tables only. Give sibling subagents their own working directories — they share the scratchpad. Compact before each phase.
- **Check-ins.** Scheduled tasks fire at most hourly. For a usage-limit pause, arm a one-shot at `rate_limit_info.resetsAt` and keep the hourly task as the fallback.
- **Blind review.** One orphan two-commit branch per candidate: a scrubbed base, the scrubbed candidate on top, README restored to the base (`make-review-branch.sh` in `tools/`). Reviewers still run `git log -3`, so leave nothing in the history. A defect every candidate shares is an artifact of the scrub, not a finding.
- **Behavior checks.** On the controller machine, warm the dev server before Playwright touches it (a cold Turbopack server reaches `networkidle` before React attaches its handlers) and probe the local stack before each branch — a dockerd started from a tool call can die with the call.
