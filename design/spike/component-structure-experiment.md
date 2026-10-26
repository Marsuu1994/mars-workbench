# Experiment: 串行 vs 并行改三页（component-structure spike 的 Q9）

**Status: decided，待执行** · 2026-10-26 · 是 `component-structure.md` 的延伸，回答它的 Q9 · tracker：Milestone — Quality gate › Step 10 › Page structure for the other pages

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文。给子 session 的 prompt 用英文。

**给 run session 的话**：如果你是被派来改 Board、Priorities、Dump 的那六个 run 之一，不要读这个文件，它写的是 run 之间怎么比较。读了会让你这一次的结果失真。

Owner 想知道：同一件事（按 component-structure spike 把 Board、Priorities、Dump 改成标准页面结构，一个 PR），主 session 自己串行做，和主 session 开三个 worktree subagent 并行做，在时间、token 和完成质量上差多少。做法：两种流程各跑三次，六个互相隔离的 session 从同一个 commit、同一份 prompt 出发；每个 PR 再由一个随机编号的盲审 session 评审；最后按组汇总成描述性的对比报告，不做显著性检验（owner 的决定）。

---

## 1. 设计

- **两组 × 3 次 = 6 个 run**：A1–A3 串行，B1–B3 并行。
- **起点**：PR #83 合并之后的 `main`。开工时取 `git rev-parse origin/main`，固定这一个 commit SHA，填进所有 prompt。
- **隔离**：每个 run 是主 session 用 `create_session`（claude-code-remote MCP）起的一个新 session，跑在自己的一台新机器上（自己的容器、Docker、本地 Supabase、数据库和端口）。run 之间、run 和主 session 之间不共享状态。共享的只有外部服务：GitHub 仓库（各用各的分支和 PR）、GitHub Actions 的 CI 队列、Vercel preview 和模型服务。
- **相同的条件**：模型、环境、权限都继承主 session；6 份 prompt 逐字相同，只有两处不同：§3 的 `{WORKFLOW}` 一段，和 run 编号（分支名、PR 标题前缀）。
- **启动**：按 A1、B1、A2、B2、A3、B3 的顺序同时启动。
- **主 session 只观察**：不碰任何一个 run 的分支，只读 transcript、PR 和 CI。
- **CI 只在 PR 上跑**（`.github/workflows/ci.yml`：push 到 `main` 或 `pull_request`），所以每个 run 都要开 PR。实验期间仓库里会同时有六个 PR。

## 2. 测量

| 维度 | 指标 | 来源 |
| --- | --- | --- |
| 时间 | 开始 → 第一次 push、开 PR、最后一个 head 的 CI 全绿；setup（`npm run setup`）和等 CI 的时间单独记 | transcript 时间戳、PR、check runs |
| Token | input、cache write、cache read、output 分别求和；按价格加权的总量（cache read 约为 input 的 1/10，output 约为 input 的 5 倍）；B 的 subagent 单独列 | transcript 每条 assistant 消息的 `usage` |
| 过程 | 工具调用次数、push 次数、CI 红了几次、修了几轮；B 的合并冲突数 | transcript、PR |
| 质量 · CI | 第一次 push 是否全绿、最后是否全绿 | check runs |
| 质量 · 清单 | §5 的 20 条，逐条判定符合或不符合 | diff |
| 质量 · 行为 | 三页的点击脚本（每个 context handler 一条），主 session 按分支逐个串行跑 | Playwright（§6） |
| 质量 · 盲审 | §4 的 6 项评分和缺陷列表 | 评审 session |

结果按组汇总：每组的均值和最小到最大的范围；同组三次之间的差异，当作这个任务上的随机波动。

## 3. Run 的 prompt

````text
You are working on the repository Marsuu1994/mars-workbench, starting from main at commit {SHA}.

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
- End with a short summary: what changed per page, which checks ran, and the judgment calls.

Workflow:
{WORKFLOW}
````

**`{WORKFLOW}`，A（串行）：**

````text
Do the three pages yourself in this session, one after another: Board, then Dump, then Priorities (the spike's serial order). Don't delegate the implementation to subagents; the only subagent you may use is `ui-verifier`, for the Board browser check.
````

**`{WORKFLOW}`，B（并行）：**

````text
Follow the spike's parallel procedure (Part 1 › 并行执行 › 如果并行，流程是). Spawn three general-purpose subagents at once, one per page (Board, Priorities, Dump), each with `isolation: "worktree"`. Brief each one with its page's section of the spike, AGENTS.md › Layers › Page structure and the Projects page as the reference. Each subagent: prepares its worktree by hard-linking node_modules and copying .env.local and src/generated from the main checkout; changes only code and the Design Console; runs format, lint, typecheck, knip and test:unit; commits on its own branch; and reports which shared files it touched. Then merge the three branches into your branch, resolve the conflicts, and run npm test, the e2e suite, the click-through checks and the Board `ui-verifier` check yourself. Write the docs and push. Besides these three, the only subagent you may use is `ui-verifier`.
````

## 4. 盲审

- 每个 PR 一个评审 session，六个同时起。先用一个随机排列把 R1–R6 映射到 A1–B3，映射只记在主 session 的 scratchpad 里，报告写完之前不公开。
- 评审只看 `git diff {SHA} {HEAD}`，不看 commit message、分支名和 PR，因为 B 的 merge commit 和 PR 描述会暴露它是哪一组。

**评审 session 的 prompt：**

````text
You are reviewing one implementation of a planned refactor in Marsuu1994/mars-workbench, labelled {R}. Review only the combined diff `git diff {SHA} {HEAD}` (fetch the commit {HEAD} if needed). Don't read commit messages, branch names, pull requests, `design/spike/component-structure-experiment.md` or any other implementation — only this diff, the code it touches, AGENTS.md and the spike `design/spike/component-structure.md` (as of {SHA}), which says what the change should do.

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
````

## 5. 清单（主 session 对每个 diff 逐条判定）

**Board**

1. `KanbanBoard` 改名 `BoardPage`，吸收 `BoardScreen`；`BoardScreen` 删掉
2. Route 渲染 `<BoardPage …/>`；没有 plan 时仍渲染 `EmptyBoard`
3. `BoardPageContext` 提供 `pullToTodo`；`MobileBacklogCard` 不再收 `onPull`
4. `toBoardCards` 和三个 frame 不变
5. Console：两个 board tab 渲染 `BoardPage`；`MobileBacklogSheetFrame` 和 gallery 的 `MobileBacklogCard` 包了 inert context

**Priorities**

6. `PriorityMatrixPage` 改名 `PrioritiesPage`，吸收 `PrioritiesScreen`；`PrioritiesScreen` 删掉
7. `periodKey` 的退回挪进 `utils/` 的 adapter，route 调它；有 unit test；`matrixService` 不变
8. `groupTasksByQuadrant`、`isTrackedTask` 在 `utils/oneOffUtils.ts`，有 unit test；`isTracked` 只算一处
9. `PrioritiesPageContext` 字段齐全（activePlanId、popover、sheet、add、track、complete）
10. props：`QuadrantCell` 2、`MatrixTaskCard` 2、`MoveToPopover` 1、`MoveToRows` 2、`MobileMoveToSheet` 2、`MobileMoveToPanel` 1
11. Overlay（`MatrixUndoToast`、`Toast`、`TaskModal`）的 props 不变；click-away 层还在 container
12. Console：7 个 tab 渲染 `PrioritiesPage`；`MobileMoveToPanelScenario` 和 gallery 的 `MatrixTaskCard` 包了 inert context

**Dump**

13. `DumpScreen` 改名 `DumpPage`；`DumpPageContext` 提供 capture、captureError、loadMore
14. Route 的解包和 `periodKey` 挪进 `utils/` 的 adapter，有 unit test；没有新增 action 或 service
15. Console：两个 dump tab 渲染 `DumpPage`

**整体**

16. 页面范围内的 feature component 都不收 callback prop（grep 检查）
17. 三页的 context 文件、hook 命名和 inert context helper 用同一种写法，并且和 Projects 一致
18. 没有改到计划之外的东西（Plan、auth、app shell）
19. 文档：spike 归档（`git mv` 到 `archived/` 并修好链接）；tracker 删掉三个子项；AGENTS.md 里「还没改的页面」那句更新；README Update Log；baseline 的 Board 部分
20. 一页一个 commit，加一个文档 commit

## 6. 主 session 的开工步骤

下一个 session 就是主 session：它只组织实验、收集数据、写报告，不改任何一个 run 的代码。

1. **读**：本文件、`component-structure.md`、AGENTS.md。确认 PR #83 已合并。
2. **准备本机**（行为检查要用）：
   - 用 nvm 切到 Node 24（`export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh; nvm install 24`）。每条 Bash 命令都要重新 source 一次，因为 shell 状态不保留。
   - 跑 `npm run setup`，会启动 Docker 和本地 Supabase，第一次拉镜像要几分钟。
   - `npm install` 可能会改动 `package-lock.json`，不要提交，用 `git checkout package-lock.json` 还原。
3. **起六个 run**：
   - 取 SHA。用 `create_session` 起 A1、B1、A2、B2、A3、B3：`source_url` 是仓库，`source_revision` 是 SHA，`title` 用 `[A1] Page structure experiment` 这种格式，`tags` 用 `["experiment:page-structure-q9"]`，`prompt` 用 §3 填好的版本，其余参数都继承。
   - 把每个 run 的 session id 和创建时间记进 scratchpad 的一张表。
4. **跟进**：
   - 用 `send_later` 每 30–60 分钟查一次：`get_session` 看 `status_bucket`，GitHub MCP 看 PR 和 check runs。
   - 一个 run 在 PR 开好、head 的 CI 全绿时算结束。
   - 卡在要人确认的地方，或者遇到基础设施故障（setup 起不来、容器丢失）的 run，记下原因，重跑一次，在报告里写明。
5. **收数据**：
   - 用 `list_events` 分页读完整个 transcript。每条 assistant 消息带 `usage`（`input_tokens`、`cache_creation_input_tokens`、`cache_read_input_tokens`、`output_tokens`）和时间戳。
   - subagent 的消息看 `parent_tool_use_id` 能否区分；不能的话，用 Agent 工具结果里回报的 token 数。
   - 同一个 assistant 回合会被拆成好几条 event，它们带同一个 `message.id` 和相同的 `usage`，求和前先按 `message.id` 去重。
6. **清单**：对每个 PR 的 `git diff {SHA}...{head}` 按 §5 逐条判定。
7. **行为检查**：
   - 每页写一个 Playwright 脚本，逐个点 context 里的 handler（Board：拖到 Done、手机 pull；Priorities：拖象限、popover 的 track 和 Done、undo、手机 sheet、add；Dump：capture、load more）。
   - 每个分支跑一遍：checkout 该分支 → `npm run e2e:session -- .auth/e2e-session.json` 重置 e2e 用户 → `npm run dev` → 跑脚本 → 停掉 dev server。
   - Projects 那次踩过的坑：
     - 脚本放在 scratchpad，从仓库目录用 `node --input-type=module < script.mjs` 跑，这样才能 import 到仓库里的 `@playwright/test`；`chromium.launch({executablePath: '/opt/pw-browsers/chromium'})`。
     - `@hello-pangea/dnd` 会给可拖的行加 `role="button"`，行里的按钮因此不在无障碍树里，`getByRole('button', …)` 找不到它们，要用 `getByTitle` 或 `button[aria-label=…]`。
     - 判断 modal 开没开用 `dialog[open]`，别用 `getByRole('dialog')`：关闭动画期间旧的 dialog 还算可见，会触发 strict mode 冲突。用 Escape 关闭，然后等 `dialog[open]` detach。
8. **盲审**：生成随机排列 → 起六个评审 session（§4）→ 收 JSON。
9. **报告**：
   - 按组汇总 §2 的指标，列出每个 run 的明细，写出结论，并建议合并质量最好的那个 PR。
   - Owner 选定之后，把报告作为「Q9 实验结果」加在那个 PR 里已归档的 spike 末尾（push 到那个 PR 的分支），再把本文件 `git mv` 到 `archived/`。
   - 其余五个 PR 关闭、删掉分支；六个 run 和六个评审 session 都归档。
