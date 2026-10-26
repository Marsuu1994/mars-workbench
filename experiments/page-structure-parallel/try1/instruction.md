# page-structure-parallel · try1 — 同一个三页重构，主 session 串行做和开三个 worktree subagent 并行做，时间、token 和质量差多少

**Status: executed 2026-10-26** · 来源：`design/spike/component-structure.md` 的 Q9，协议原文 `design/spike/component-structure-experiment.md`，tracker › Milestone — Quality gate › Step 10 › Page structure for the other pages

> 叙述用中文；run 编号、指标名、代码标识保留英文。给 run 和评审 session 的 prompt 用英文，逐字见 `prompts/`。

## 问题

同一件 well-defined 的工作（按已决定的 spike 把 Board、Priorities、Dump 三页改成标准页面结构，一个 PR），主 session 自己一页一页做（A，串行），和主 session 开三个 worktree subagent 各做一页再合并（B，并行），在 wall time、token / 成本和完成质量上差多少。答案决定 Phase 2 的新页面以及以后类似的多块任务默认用哪种流程。

## 任务

实现 `design/spike/component-structure.md` Part 1 计划的下一个 PR：Board、Priorities、Dump 三页搬到页面结构（前提、规则 1–7、每页的改动计划、Q1–Q8 的决定）；Plan 不动（Q5），auth、settings、app shell 不在范围（Q6）；Projects 页是参考实现。交付物：一个分支，一页一个 commit 加一个文档 commit；Design Console 全部 tab 可渲染；仓库规则要求的文档；push 前的检查、e2e、每页的点击检查、Board 的 `ui-verifier`；一个 ready-for-review 的 PR，带 "Judgment calls"。

起点：PR #83 合并后的 `main`，commit `1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4`。

## 做法

六份 prompt 逐字相同（`prompts/run-template.txt`），只有分支名、PR 标题里的 run 编号和最后的 `{WORKFLOW}` 一段不同。

**A（串行）** — `prompts/workflow-A.txt`：

```text
Do the three pages yourself in this session, one after another: Board, then Dump, then Priorities (the spike's serial order). Don't delegate the implementation to subagents; the only subagent you may use is `ui-verifier`, for the Board browser check.
```

**B（并行）** — `prompts/workflow-B.txt`：

```text
Follow the spike's parallel procedure (Part 1 › 并行执行 › 如果并行，流程是). Spawn three general-purpose subagents at once, one per page (Board, Priorities, Dump), each with `isolation: "worktree"`. Brief each one with its page's section of the spike, AGENTS.md › Layers › Page structure and the Projects page as the reference. Each subagent: prepares its worktree by hard-linking node_modules and copying .env.local and src/generated from the main checkout; changes only code and the Design Console; runs format, lint, typecheck, knip and test:unit; commits on its own branch; and reports which shared files it touched. Then merge the three branches into your branch, resolve the conflicts, and run npm test, the e2e suite, the click-through checks and the Board `ui-verifier` check yourself. Write the docs and push. Besides these three, the only subagent you may use is `ui-verifier`.
```

Run prompt 的其余部分（两组共用）：

```text
You are working on the repository Marsuu1994/mars-workbench, starting from main at commit 1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4.

Task: implement the next PR that the decided spike `design/spike/component-structure.md` plans — move the Board, Priorities and Dump pages onto the page structure, exactly as its Part 1 describes (the premise, rules 1–7, the per-page plans for Board, Priorities and Dump, and the decisions Q1–Q8). Plan stays as it is (Q5); auth, settings and the app shell are out of scope (Q6). Read AGENTS.md and the spike first; the Projects page (`src/components/domain/projects/`) is the reference implementation. Don't open `design/spike/component-structure-experiment.md`: it describes how this work is evaluated, and reading it would skew it.

Deliverables:
- One branch, `claude/page-structure-{run-lowercase}`, with one commit per page plus a commit for the docs.
- The Design Console updated so every scenario and gallery tab renders (src/app/design/README.md).
- The docs the repo's rules require for a PR that implements a decided spike (AGENTS.md › Version Control, design/spike/README.md, the tracker's Conventions).
- The checks AGENTS.md asks for before a push, the e2e suite, the per-page click-through checks the spike's "执行和验证" lists, and the Board browser check through `ui-verifier`.
- A pull request titled "[{RUN}] Page structure: Board, Priorities and Dump", ready for review, with a "Judgment calls" section.

Rules for this run:
- Nobody will answer questions while you work. Make reasonable calls, and list each one under "Judgment calls" in the PR description.
- Never merge, never push to main, and never touch another branch or pull request.
- Your work ends when the PR is open and CI is green on its head. Fix red CI as AGENTS.md says, don't wait for reviews, and don't schedule check-ins.
- Nothing you write into the repository — code, comments, tests, docs, commit messages — may describe how this work was organized (who did which page, in what order, serial or parallel, with or without subagents). Say that only in your final summary and under "Judgment calls" in the PR description.
- End with a short summary: what changed per page, which checks ran, and the judgment calls.

Workflow:
{WORKFLOW}
```

## 组数、隔离、启动

- 每组 3 次：A1–A3、B1–B3，六个 run。
- 每个 run 是主 session 用 `create_session`（claude-code-remote MCP）起的新 session，一台新机器（自己的容器、Docker、本地 Supabase、端口）；共享的只有 GitHub 仓库（各用各的分支和 PR）、GitHub Actions 队列、Vercel preview 和模型服务。
- 参数：`source_revision` 固定为起点 commit；`model` `claude-opus-5-5`；effort 是 CLI 默认值（`create_session` 没有 effort 参数，探测过的 session 配置里没有 effort 字段）；permission mode auto（继承）；title `[A1] Page structure experiment`，tag `experiment:page-structure-q9`、`q9-run:A1`。
- 启动顺序 A1、B1、A2、B2、A3、B3，一次 tool 调用批量发出，05:25:32–05:25:36 UTC 四秒内全部创建。
- 主 session 只观察：不碰任何 run 的分支，只读 transcript、PR 和 check runs。CI 只在 PR 上跑，所以每个 run 都开 PR；实验期间仓库里同时有六个 PR。

## 前置条件

- PR #83 已合并（spike decided，Projects 页是标准结构，协议写好）。
- 主 session 的机器：Node 24（nvm）、`npm run setup`（Docker、本地 Supabase、seed）、`npm run dev` 和 e2e 用户的登录态；三页的 Playwright 点击脚本（`scripts/board.mjs`、`priorities.mjs`、`dump.mjs`，16 项）先在 `main` 上跑通作为基线。
- 盲审分支生成脚本（`scripts/make-review-branch.sh`）在一个模拟的 candidate 上验证过 scrub 规则。
- 六份 run prompt 和评审 prompt 冻结在 `prompts/`；R1–R6 到 run 的映射用 `SystemRandom` 打乱，只存在主 session 的 scratchpad 和 controller 分支（`data/blind-map.json`），报告写完前不公开。
- 主 session 的状态（run 表、事故、数据）镜像到分支 `claude/page-structure-q9-controller`，容器丢了也能恢复；每小时一次的心跳任务作为额度耗尽后的兜底（平台最小间隔一小时），主路径是在 `rate_limit_info.resetsAt` 加 5 分钟设一次性唤醒。

## 测量

| 维度 | 指标 | 来源 |
| --- | --- | --- |
| 时间 | 创建 → 三页 commit 写完 → 第一次 push → PR 开出 → CI 全绿 → session idle；setup 时长、CI 等待单独记 | transcript 事件时间戳（`list_events`）、GitHub commit / PR / check run 时间、`get_session` |
| Token / 成本 | input、cache write、cache read、output、`cost_usd`；请求次数；context 峰值；B 的每个 subagent 单独列 | `get_session` 的 `usage`（主数据）；transcript 按 `message.id` 去重求和（交叉核对和 main / subagent 拆分）；`result` 事件 |
| 过程 | 工具调用次数、Bash 次数、push、commit、工具错误、合并冲突、stop hook 拦截、`ui-verifier` 的判定 | transcript |
| 质量 · CI | 第一次 push 是否全绿、最后是否全绿、红了几次 | PR 的 check runs |
| 质量 · 清单 | 20 条逐条判定 ✓ / ~ / ✗ | 每个 diff 一个只读 agent，按 `git diff base..head` 判定，写 `data/checklist-<run>.md` |
| 质量 · 行为 | 三页 16 项点击检查，每个分支串行跑 | `scripts/run-branch-checks.sh`，日志 `data/behavior/` |
| 质量 · 盲审 | 6 项 1–5 分和缺陷列表（blocker / major / minor / nit） | 六个评审 session 的 JSON，`data/review-R<n>.json` |

## 流程

1. 准备主 session 机器，验证脚本（上面的前置条件）。
2. 起六个 run，记 session id 和创建时间；`send_later` 25 分钟后第一次检查，之后每 30–60 分钟一次；心跳任务兜底。
3. 一个 run 在 PR 开好、head 的 CI 全绿时算结束（`get_session` 看 `status_bucket`，GitHub 看 check runs）。卡在要人确认或基础设施故障的 run 记下原因重跑一次（这次没有发生）。
4. 收数据：每个 run 一个 subagent 分页读完 transcript（`kinds: ["assistant","user"]` 加 `result`），写 `data/transcript-<run>.json`；主 session 只读它的汇总表。
5. 清单：每个 diff 一个 subagent，20 条逐条判定，只用 `git diff` / `git show`，不 checkout。
6. 行为检查：每个分支 checkout → 重启 dev server（清 `.next`，先预热三页）→ 重置 e2e 用户 → 跑三个脚本；失败的页面在热服务器上重跑一次。
7. 盲审分支：对每个 run 用 `make-review-branch.sh` 生成 `experiment/review-R<n>`：孤儿历史两个 commit，"Review base"（起点树 scrub 过）和 "Review candidate R<n>"（run 的 head 树同样 scrub，README 换成 base 的）。Scrub 删掉 experiment 文件、spike 里的"并行执行"一节和 Q9 决定行、owner 决定表里提到 subagent / 对照实验的行、tracker 和 README 里提到 Q9 / 并行 subagent 的句子；生成后全树 grep `Q9|并行|串行|subagent|worktree` 确认只剩无关内容。
8. 六个评审 session 同时起（`claude-fable-5-1`，默认 effort），`source_revision` 是各自的 review 分支，prompt 见下；一个 subagent 收齐六份 JSON，并审计每个评审有没有调用 GitHub 工具或看别的分支。
9. 报告：按组汇总，列每个 run 的明细，结论先行，建议合并哪个 PR。

## 质量判定

**清单（20 条，主 session 对每个 diff 逐条判定）**

Board：1. `KanbanBoard` 改名 `BoardPage`，吸收 `BoardScreen`；`BoardScreen` 删掉 · 2. Route 渲染 `<BoardPage …/>`；没有 plan 时仍渲染 `EmptyBoard` · 3. `BoardPageContext` 提供 `pullToTodo`；`MobileBacklogCard` 不再收 `onPull` · 4. `toBoardCards` 和三个 frame 不变 · 5. Console：两个 board tab 渲染 `BoardPage`；`MobileBacklogSheetFrame` 和 gallery 的 `MobileBacklogCard` 包了 inert context。

Priorities：6. `PriorityMatrixPage` 改名 `PrioritiesPage`，吸收 `PrioritiesScreen`；`PrioritiesScreen` 删掉 · 7. `periodKey` 的退回挪进 `utils/` 的 adapter，route 调它；有 unit test；`matrixService` 不变 · 8. `groupTasksByQuadrant`、`isTrackedTask` 在 `utils/oneOffUtils.ts`，有 unit test；`isTracked` 只算一处 · 9. `PrioritiesPageContext` 字段齐全（activePlanId、popover、sheet、add、track、complete） · 10. props：`QuadrantCell` 2、`MatrixTaskCard` 2、`MoveToPopover` 1、`MoveToRows` 2、`MobileMoveToSheet` 2、`MobileMoveToPanel` 1 · 11. Overlay（`MatrixUndoToast`、`Toast`、`TaskModal`）的 props 不变；click-away 层还在 container · 12. Console：7 个 tab 渲染 `PrioritiesPage`；`MobileMoveToPanelScenario` 和 gallery 的 `MatrixTaskCard` 包了 inert context。

Dump：13. `DumpScreen` 改名 `DumpPage`；`DumpPageContext` 提供 capture、captureError、loadMore · 14. Route 的解包和 `periodKey` 挪进 `utils/` 的 adapter，有 unit test；没有新增 action 或 service · 15. Console：两个 dump tab 渲染 `DumpPage`。

整体：16. 页面范围内的 feature component 都不收 callback prop（overlay 和自带行为的 frame 除外） · 17. 三页的 context 文件、hook 命名和 inert context helper 用同一种写法，并且和 Projects 一致 · 18. 没有改到计划之外的东西（Plan、auth、app shell、service、action、DAL） · 19. 文档：spike 归档并修好链接；tracker 删掉三个子项；AGENTS.md 里"还没改的页面"那句更新；README Update Log；baseline 的 Board 部分 · 20. 一页一个 commit，加一个文档 commit。

**行为检查（16 项）**：Board 桌面拖到 Done、手机 backlog sheet pull；Priorities 桌面 popover 的 Todo、Done、Undo、象限键盘拖动、象限 Add，手机 sheet 的 Done 加 Undo、Todo、标题栏 + 加 picker 添加；Dump Ctrl+Enter 捕获、按钮连续捕获 17 条、滚动加载下一页。每项都断言乐观更新和 reload 之后的状态，收集 console error。

**盲审 prompt**（`prompts/review-template.txt`）：

```text
You are reviewing one implementation of a planned refactor in Marsuu1994/mars-workbench, labelled {R}. Your checkout is that implementation; the commit before HEAD is the starting point it was built from. Review only the combined diff `git diff HEAD~1 HEAD`, the code it touches, AGENTS.md, and the spike that says what the change should do: `git show HEAD~1:design/spike/component-structure.md` (the implementation may have moved its copy to design/spike/archived/). Don't look at anything else about this work: no other branches, no pull requests, no GitHub tools, no history beyond these two commits, no other implementation of the same plan.

Score each criterion from 1 (poor) to 5 (excellent), with one or two sentences of evidence:
1. Correctness — behavior unchanged for the user; no bugs, broken handlers or regressions.
2. Spec conformance — matches the spike's premise, rules and per-page plan (renames, context fields, props, adapters, console, docs).
3. Consistency — the three pages are built the same way (naming, context shape, adapters, tests), and match the Projects page.
4. Conventions — AGENTS.md rules (layers, naming, DRY, i18n, no magic literals, file layout).
5. Scope — nothing unrelated changed; nothing planned left out.
6. Readability — a maintainer can follow each page from route to leaf.

Then list every defect you found: severity (blocker / major / minor / nit), file:line, and one sentence.
Do not change any file, push, comment on GitHub or open a PR. End your reply with one JSON block:
{"label": "{R}", "scores": {"correctness": n, "spec": n, "consistency": n, "conventions": n, "scope": n, "readability": n}, "defects": [{"severity": "...", "where": "...", "what": "..."}]}
```

## 和来源协议的差异

- Run prompt 多一条规则：仓库里任何地方不得描述工作怎么组织（保护盲审）。
- 盲审不看 `git diff {SHA} {HEAD}`，而看 scrub 过的孤儿分支；run 写的 README Update Log 因此对评审不可见（代价：评审会把"没有 Update Log"当缺陷，六份都有，报告里剔除）。
- 模型：run 用 `claude-opus-5-5`（日常工作 session 的模型），评审用 `claude-fable-5-1`；effort 两边都是默认值，不是日常的 xhigh / max。
- 检查节奏：`send_later` 一次性检查加每小时心跳，而不是协议里的每 30–60 分钟一次定时任务（平台最小间隔一小时）。
- Controller 分支作为主 session 的持久状态（协议没有）。

## 下一轮可以改的变量

- 让 B 的 agent 在 `npm install` 一结束就派出去（它们只跑不碰数据库的检查），数据库在后台起：setup 从 B 的关键路径上移走。
- 把三页的点击脚本放进仓库，作为交付物的一部分直接调用，而不是让每个 run 自己写：验证尾巴从 5–22 min 收敛到约 5 min，组内波动随之消失。
- 固定 effort（环境变量或 `.claude/settings.json`），和日常 session 一致。
- 换一个每块 10–15 min 以上的任务，看并行的固定成本摊薄之后结论是否反转。
