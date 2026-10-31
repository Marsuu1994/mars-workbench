# page-structure-parallel · try2 — 同一个三页重构，去掉 try1 的两个干扰再比一次串行和并行，每组五次

**Status: paused 2026-10-28** · 来源：try1 的报告、tracker › Harness engineering › 1a · Lab 仓库：[`mars-workbench-lab-try2`](https://github.com/Marsuu1994/mars-workbench-lab-try2/tree/controller/try2)（完整协议、prompt 模板和填充规则、controller briefs、工具、数据在 `controller/try2` 的 `protocol/`、`tools/`、`data/`）

> 十个 run 2026-10-27 跑完，数据完整；收数据阶段两次把账号的用量窗口耗尽，盲审没做完（9/10 被打断）。额度重置后由一个 Opus 的 controller 按"预算和角色"补完收数据、盲审和报告；page structure 到此收口，不再开新 try。

## 问题

去掉 try1 协议自带的两项混杂（setup 压在并行组的关键路径上、每个 run 自写验证脚本）之后，并行在"三页写完"这一段还剩多少固定成本；验证尾巴脚本化之后到 PR 开出两组差多少；成本比和质量差是否和 try1 一致。

**预注册的假设和判定规则**（跑之前定，跑完不改）：

- H1：T_pages（创建 → 三页都在 run 分支上）B 组均值 ≤ A 组均值。
- H2：T_pr（创建 → PR 开出）B ≤ A 的 0.85 倍。
- H3：成本 B 是 A 的 1.3–1.5 倍。
- H4：质量持平（CI、行为检查、清单、盲审），B 的 consistency 低 0–1 分。
- 判定：H2 和 H4 同时成立 → "3 个以上独立块"的任务默认并行；H1 成立但 H2 不成立 → 整合和验证尾巴是瓶颈，并行只在要省主 context 时用；H1 不成立 → 这个规模的任务不再测并行，下一个实验换大块任务。Mann–Whitney 的 p 值只作参考。

## 任务

和 try1 相同。起点是 lab 仓库的 `experiment/base-try2` = `83ae5a4`：try1 的起点 `1ae70f7f` 加四个修正 commit——仓库点击脚本 `npm run check:clicks`（try1 的 16 项合成一个）、`.gitignore` 忽略 `.claude/worktrees/`（去掉 stop hook 拦截）、`.claude/settings.json` 把 effort 钉在 high、Design Console 同名控件按可见性取舍（修掉 try1 里被 `ui-verifier` 误判的 pre-existing 问题）。十个 PR 开在 lab 仓库里，base 是这个分支。

## 做法

十份 prompt 只差分支名、run 编号和最后一段 workflow；共用部分和 try1 相同，另外点击检查改成直接跑 `npm run check:clicks`，并说明不要打开评估文件。

**A（串行）**

```text
Do the three pages yourself in this session, one after another: Board, then Dump, then Priorities (the spike's serial order). Don't delegate the implementation to subagents; the only subagent you may use is `ui-verifier`, for the Board browser check.
```

**B（并行）**

```text
As soon as `npm run setup -- --no-db` has finished, spawn three general-purpose subagents at once, one per page (Board, Priorities, Dump), each with `isolation: "worktree"`; don't wait for the database. Brief each one with its page's section of the spike, AGENTS.md › Layers › Page structure and the Projects page as the reference. Each subagent: prepares its worktree by hard-linking node_modules and copying .env.local and src/generated from the main checkout; changes only its page's code and the Design Console; uses simple single-directory commands and the Write tool for edits (the worktree guard rejects compound `cd … &&` commands and heredocs); runs format, lint, typecheck, knip and test:unit; commits once on its own branch; and reports which shared files it touched. While they run, end your turn and wait — don't implement a page yourself. Then bring each agent's commit onto your branch with cherry-pick (one commit per page), resolve the conflicts, and run npm test, the e2e suite, `npm run check:clicks` and the Board `ui-verifier` check yourself. Write the docs and push. Besides these three, the only subagent you may use is `ui-verifier`.
```

## 组数和隔离

- 每组 5 次：A1–A5、B1–B5。每个 run 一个独立 session（lab 仓库、起点 SHA、现有环境），十个一次批量创建（A1、B1、A2、B2、…）；主 session 只观察。
- CI 队列十个 PR 共用，CI 等待只记录、不进判定（H1、H2 都在 PR 开出之前截止）。

## 预算和角色

- 所有 session 共用账号的五小时用量窗口。一个窗口装得下十个 run 加 controller，装不下紧接着的收数据和盲审：run 一个窗口；下一个窗口开头先起评审，期间不起 subagent；再串行收数据；报告另算。（这一节 2026-10-29 补；10-27 没有它，两次耗尽窗口。）
- controller：`claude-opus-5-5`，effort high；subagent 继承，一次 2–3 个；transcript 的 usage、timeline、process 用脚本算。
- run：`claude-opus-5-5`，effort high（仓库 settings 文件），已跑完。
- 盲审：每个候选一份，同一个模型、同一份 prompt、同一个 effort，十个在窗口刚重置时单独起；原计划 `claude-fable-5-1`，补完时改用 Opus 或 code-reviewer agent，分数不和 try1 合并。
- 预计花费：十个 run 实际 $78；补完 $40–60。

## 测量

| 维度 | 指标 | 来源 |
| --- | --- | --- |
| 时间（主指标） | T_pages：创建 → 三页都在 run 分支上；T_pr：创建 → PR 开出；T_green 只记录。B 另记 setup 结束、agent 派出、每个 agent 交回、合并完成 | transcript 时间戳、GitHub |
| 分段 | setup、写代码、整合（B）、验证、文档、CI 等待 | transcript |
| Token / 成本 | `get_session` 的 `usage` 和 `cost_usd`；main / subagent 拆分；context 峰值 | `get_session`、transcript |
| 过程 | 工具调用、push、commit、工具错误、合并冲突、stop hook 拦截、worktree 守卫拒绝 | transcript |
| 失败分类 | 每个 run 的问题按 arXiv 2610.10263 的四类标注 | 每个 run 一个 subagent |

## 质量判定

- **CI**：第一次 push 是否全绿。
- **清单**：try1 的 20 条原文，不改。
- **行为**：`npm run check:clicks` 16 项，0 console error。
- **盲审**：同 try1 的 6 项打分加缺陷列表；prompt 另外豁免 README 和 Update Log（try1 的 scrub 产物）。隔离同 try1：孤儿两 commit 分支，scrub 掉 `experiments/`、评估文件和 spike 里关于并行和 Q9 的段落，候选的 README 换成起点的；评审不能用 GitHub 工具、不能看别的分支、历史和其他候选。

## 和上一轮的差异

| 项 | try1 | try2 | 为什么 |
| --- | --- | --- | --- |
| 组数 | 3 + 3 | 5 + 5 | 组内波动大于组间差异 |
| B 的 setup | 等 setup 跑完再派 agent | `setup --no-db` 后立刻派 | setup 离开关键路径（try1 多花 2.2–5.6 min） |
| 验证 | 每个 run 自己写 Playwright | 仓库脚本 `npm run check:clicks` | try1 组内波动的来源（5–22 min） |
| 合并方式 | merge 三个分支 | cherry-pick，一页一个 commit | 统一做法 |
| effort | 默认 | high | 对标日常开发 |
| 噪声 | stop hook、`ui-verifier` 误判、盲审把 README 当缺陷 | 起点修掉，prompt 豁免 README | 去噪 |
| 假设 | 事后描述 | 预注册 H1–H4 和判定规则 | 结果直接变成默认流程 |
| 仓库 | 主仓库 | lab 仓库 | 云 session 删不了远端分支 |
| 预算 | 无 | 按用量窗口排阶段 | 10-27 两次耗尽窗口 |
