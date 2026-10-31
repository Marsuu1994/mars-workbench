# Experiments — rules for agents

Rules for writing, running and reporting a try. `README.md` here is the overview for people.

## Rules

1. One folder per question (kebab-case), one `tryN/` per execution. A try that has run is not edited: a variant is a new `tryN`.
2. A try holds two files, `instruction.md` and `report.md`. Nothing else from a try enters this repository.
3. Everything else lives in the try's lab repository (`<repo>-lab-<try>`): run and review branches, and a controller branch with the prompts, tools, measurements and the controller's log. Runs push their branches and open no pull requests; reviews and checks read the branches. The owner archives the repository once the report lands; nothing is exported from it.
4. The instruction follows the template below and is approved by the owner before anything runs. A try's measurement tools are built with it and land on `main` before the run, each in its own PR: checks of existing behavior in CI, acceptance tests for behavior not built yet as `it.fails` (the base branch flips them to plain tests, so the runs see them as spec). What only the evaluators may see — the checklist, the review prompt — stays off the base.
5. The report follows the template below, conclusion first; its appendix says where each number lives in the lab repository.
6. When the report is written, decide whether the try's implementations become a case in the evals repository (`mars-workbench-evals`): only when they caught real problems, meaning defects CI missed that adjudication confirms. A case holds the task, the base ref, each implementation with how it was produced, the adjudicated ground truth and the checks. The lab repository stays the source and is archived as usual.

Running a try as its controller: the controller notes are on the lab repository's controller branch (`protocol/controller-notes.md`) until they become a skill (tracker › Harness engineering › Setup).

## Template · instruction.md

The protocol at the altitude a reader needs to judge the result; step-by-step controller work and full prompt templates go on the lab repository's controller branch. Chinese narrative with English identifiers, as in a spike.

```markdown
# <question> · tryN — <the question in one line>

**Status: planned | running | paused | executed <date>** · 来源：<spike、tracker 条目> · Lab 仓库：<link>

## 问题        想知道什么，答案会改变什么决定；预注册的假设和判定规则
## 任务        每组都做的真实任务；起点 commit；任务的 spec 在哪
## 做法        每组一节；组与组之间唯一不同的那段 prompt，逐字贴出
## 组数和隔离    每组几次；run 怎么隔离、共享什么
## 预算和角色     每个角色（controller、run、评审、subagent）的模型和 effort；各阶段放在哪个用量窗口；预计花费
## 测量        表格：维度 · 指标 · 来源
## 质量判定     清单、行为检查、盲审：评分维度，以及对 run 和评审隔离了什么、怎么隔离
## 和上一轮的差异   改了哪一件事、为什么
```

## Template · report.md

Chinese narrative with English identifiers, as in a spike.

```markdown
# <question> · tryN — 报告

**执行 <date>** · 协议：`instruction.md` · Lab 仓库：<link>

## 结论        答案先行：3–6 条，每条带支撑它的数字；最后是建议
## 数据        表格：每个 run 一行，每组的均值和范围
## 分析        数字为什么是这样；哪些是做法本身的，哪些是噪声
## 方法上的教训   下一轮协议要改什么
## 附录        每个数字来自 lab 仓库的哪个文件；session id、PR、实验本身的花费
```
