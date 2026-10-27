# page-structure-parallel · try2 — 同一个三页重构，搭好实验再比一次串行和并行，每组五次

**Status: approved 2026-10-27**（owner 认可做法并建好了 lab 仓库；本 session 已推 `main`；compact 后新 session 从 Fresh start 执行） · 来源：try1（`experiments/page-structure-parallel/try1/`）、tracker › Milestone — Quality gate › Step 10

> 叙述用中文；run 编号、指标名、代码标识保留英文。Prompt 用英文。这份文件和它引用的 try1 文件、`experiments/README.md`、`prompts/controller-briefs.md` 一起，足够一个全新的 session 从零跑完整个实验（见"Fresh start"）。

## TL;DR（给 owner 的 context）

- **上次的意外**：预期三个 subagent 并行改三页会比一个 session 串行快，结果反而慢。三页写完 10.1 对 7.9 分钟，到 PR 开出 31 对 17 分钟，多花 36% 的钱，质量一样。
- **慢的原因大部分不是并行本身，是实验没搭好**：给并行组的指令让它等整个 setup（含数据库）跑完才派 agent，白等 2 到 6 分钟；要求做点击检查却没给脚本，每个 run 自己写 Playwright，顺的 5 分钟、不顺的 20 分钟，这段噪声比组间差异还大；每组只有 3 次，噪声盖过信号。还有一个真实因素：每页只有 2 到 4 分钟的活，派发、agent 冷启动、合并这些固定成本本来就难摊掉。
- **这次改什么**：同一个任务、同一个起点，把实验搭好再比一次。Setup 不再挡在并行的路上；点击检查脚本进仓库，两组直接用；effort 固定为 high 对标日常开发；去掉几处已知噪声（stop hook、`ui-verifier` 的一个老问题、盲审里 README 的假缺陷）；每组跑 5 次；事先写好什么结果算并行赢。
- **这次在一个一次性仓库里跑**：十个 run、盲审分支、controller 的状态分支都放在 `Marsuu1994/mars-workbench-lab-try2`，主仓库只收最后的归档 PR 和推荐合并的那个分支。云 session 删不了远端分支，跑完你删掉 lab 仓库就是全部清理。
- **预期**：三页写完这一段两组打平或并行略快，总时间差距缩小，钱仍是 1.3 到 1.5 倍。要是这样并行还不快，这个规模的任务就定串行，不再测。

## 问题

去掉 try1 协议自带的两项混杂（setup 压关键路径、自写验证脚本）之后：

1. 并行在"三页写完"这一段还剩多少固定成本，和串行相比是快是慢。
2. 验证尾巴脚本化之后，到 PR 开出的总时间两组差多少，组内波动降到多少。
3. 成本比和质量差是否和 try1 一致（1.36 倍；consistency 低一分）。

**预注册的假设和判定规则**（跑之前定，跑完不改）：

- H1：T_pages（创建 → 三页都在 run 分支上）B 组均值 ≤ A 组均值。try1 是 10.1 对 7.9 min；修正后按 try1 的分解外推 B ≈ install 1.5 + 派发 0.8 + 最慢 agent 4.8–6.2 + 合并 0.2–1.2 ≈ 7.3–9.7 min。
- H2：T_pr（创建 → PR 开出）B ≤ A 的 0.85 倍。
- H3：成本 B 是 A 的 1.3–1.5 倍。
- H4：质量持平（CI、行为检查、清单、盲审），B 的 consistency 低 0–1 分。
- 判定：H2 和 H4 同时成立 → "3 个以上独立块"的任务默认并行；H1 成立但 H2 不成立 → 整合和验证尾巴是瓶颈，并行只在要省主 context 时用；H1 不成立 → 这个规模的任务不再测并行，下一个实验换大块任务。
- 每组时间另给中位数、范围和 Mann–Whitney 的 p 值作参考（每组五次，最小 p ≈ 0.008）；判定按规则，不按 p 值。

## 任务

和 try1 相同：按 `design/spike/component-structure.md` Part 1 把 Board、Priorities、Dump 搬到页面结构，一页一个 commit 加一个文档 commit，Design Console 全部 tab 可渲染，仓库规则要求的文档，push 前的检查、e2e、点击检查、Board 的 `ui-verifier`，一个 ready-for-review 的 PR 带 "Judgment calls"。

起点：lab 仓库 `Marsuu1994/mars-workbench-lab-try2` 的分支 `experiment/base-try2`，从 try1 的起点 `1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4` 建，只多四个修正 commit（见前置条件），三页仍未实现。起点 SHA 在开工时取定并写进十份 prompt。十个 PR 都开在 lab 仓库里，base 是这个分支。

## 做法

十份 prompt 逐字相同，只有分支名、PR 标题里的 run 编号和 `{WORKFLOW}` 不同。

**Run prompt（全文）**：

```text
You are working on the repository Marsuu1994/mars-workbench-lab-try2, starting from the branch experiment/base-try2 at commit {SHA}.

Task: implement the next PR that the decided spike `design/spike/component-structure.md` plans — move the Board, Priorities and Dump pages onto the page structure, exactly as its Part 1 describes (the premise, rules 1–7, the per-page plans for Board, Priorities and Dump, and the decisions Q1–Q8). Plan stays as it is (Q5); auth, settings and the app shell are out of scope (Q6). Read AGENTS.md and the spike first; the Projects page (`src/components/domain/projects/`) is the reference implementation. Don't open anything under `experiments/`: it describes how this work is evaluated, and reading it would skew it.

Deliverables:
- One branch, `claude/page-structure-try2-{run-lowercase}`, based on experiment/base-try2, with one commit per page plus a commit for the docs.
- The Design Console updated so every scenario and gallery tab renders (src/app/design/README.md).
- The docs the repo's rules require for a PR that implements a decided spike (AGENTS.md › Version Control, design/spike/README.md, the tracker's Conventions).
- The checks AGENTS.md asks for before a push, the e2e suite, the click-through checks (below) and the Board browser check through `ui-verifier`.
- A pull request in this repository against the branch experiment/base-try2, titled "[try2 {RUN}] Page structure: Board, Priorities and Dump", ready for review, with a "Judgment calls" section.

Setup and verification, the same for every run:
- Run `npm run setup -- --no-db` first (.env.local, npm install, the generated Prisma client). Then start the local stack in the background (`npm run db:setup > /tmp/db-setup.log 2>&1 &`) and don't wait for it until you need the database (npm test's integration tests, the e2e suite, the click-through checks).
- The click-through checks are the repo's `npm run check:clicks`: start `npm run dev` in the background, run `npm run e2e:session -- .auth/e2e-session.json`, then the script; it prints PASS/FAIL per check. Run it on your finished branch and quote its summary in the PR. Don't write Playwright scripts of your own.

Rules for this run:
- Nobody will answer questions while you work. Make reasonable calls, and list each one under "Judgment calls" in the PR description.
- Never merge, never push to main or to experiment/base-try2, and never touch another branch or pull request.
- Your work ends when the PR is open and CI is green on its head. Fix red CI as AGENTS.md says, don't wait for reviews, and don't schedule check-ins.
- Nothing you write into the repository — code, comments, tests, docs, commit messages — may describe how this work was organized (who did which page, in what order, serial or parallel, with or without subagents). Say that only in your final summary and under "Judgment calls" in the PR description.
- End with a short summary: what changed per page, which checks ran, and the judgment calls.

Workflow:
{WORKFLOW}
```

**A（串行）** — `{WORKFLOW}`：

```text
Do the three pages yourself in this session, one after another: Board, then Dump, then Priorities (the spike's serial order). Don't delegate the implementation to subagents; the only subagent you may use is `ui-verifier`, for the Board browser check.
```

**B（并行）** — `{WORKFLOW}`：

```text
As soon as `npm run setup -- --no-db` has finished, spawn three general-purpose subagents at once, one per page (Board, Priorities, Dump), each with `isolation: "worktree"`; don't wait for the database. Brief each one with its page's section of the spike, AGENTS.md › Layers › Page structure and the Projects page as the reference. Each subagent: prepares its worktree by hard-linking node_modules and copying .env.local and src/generated from the main checkout; changes only its page's code and the Design Console; uses simple single-directory commands and the Write tool for edits (the worktree guard rejects compound `cd … &&` commands and heredocs); runs format, lint, typecheck, knip and test:unit; commits once on its own branch; and reports which shared files it touched. While they run, end your turn and wait — don't implement a page yourself. Then bring each agent's commit onto your branch with cherry-pick (one commit per page), resolve the conflicts, and run npm test, the e2e suite, `npm run check:clicks` and the Board `ui-verifier` check yourself. Write the docs and push. Besides these three, the only subagent you may use is `ui-verifier`.
```

## 组数、隔离、启动

- 每组 5 次：A1–A5、B1–B5，十个 run。
- 每个 run 一个 `create_session`（claude-code-remote MCP）：`source_url` `https://github.com/Marsuu1994/mars-workbench-lab-try2`，`source_revision` 起点 SHA，`model` `claude-opus-5-5`，`environment_id` 是现有环境 `env_011scbxKVRAPcJTTmy6VqZcA`（owner 决定不新建；effort 来自仓库的 settings 文件，前置条件 3），permission mode 继承（auto），title `[try2 A1] Page structure experiment`，tags `experiment:page-structure-try2`、`try2-run:A1`。
- 十个 run 一次批量创建，顺序 A1、B1、A2、B2、…、A5、B5。
- CI 队列：十个 PR 同时开，约 70 个 job 排队，先 push 的先跑；CI 等待只记录、不进判定（H1、H2 都在 PR 开出之前截止）。
- 主 session 只观察，不碰任何 run 的分支。额度：try1 六个 run 加六份评审都在 `ccr_promotional` 内，十加十按 1.7 倍估。

## 前置条件

0. **Lab 仓库**（2026-10-27 已做：仓库已建、App 装在 All repositories、`main` 已推到 `96d9c63`、本机 remote `lab` 已加）：owner 在 GitHub 建空仓库 `Marsuu1994/mars-workbench-lab-try2`（公开，和主仓库一致；不初始化 README），给它装 Claude GitHub App。controller 用 `add_repo`（owner `Marsuu1994`、repo `mars-workbench-lab-try2`、access `push`）把它挂进 session，本机 `git remote add lab https://github.com/Marsuu1994/mars-workbench-lab-try2`，把主仓库的 `main` 推过去作默认分支（`git push lab origin/main:refs/heads/main`）。CI 原样可用：`ci.yml` 没有 secrets，`pull_request` 触发不限 base；lab 仓库没有 Vercel，绿 = 七个 Actions job。run 分支、评审分支、controller 状态分支都只在 lab 仓库；主仓库只收归档 PR 和推荐合并的分支。

起点分支 `experiment/base-try2` 上的四个 commit（推到 lab 仓库；同样的 commit 另开一个 PR 进主仓库的 `main`，不属于实验）：

1. **`scripts/click-through.mjs` 加 `npm run check:clicks`**：try1 的 16 项（`experiments/page-structure-parallel/try1/scripts/board.mjs`、`priorities.mjs`、`dump.mjs`、`_preamble.mjs`）合成一个脚本，base URL 和 storage state 路径从环境变量或参数读（默认 `http://localhost:3000`、`.auth/e2e-session.json`），先预热三页，输出每项 PASS / FAIL 和 console error 数，有失败则非零退出。在起点树上跑通，作为基线。
2. **`.gitignore` 加 `.claude/worktrees/`**：去掉 B 组等 agent 时 stop hook 的拦截。
3. **effort 固定为 high**：仓库 `.claude/settings.json` 写 `"effortLevel": "high"`，这是 run 和评审 session 唯一的 effort 来源（owner 决定用现有环境，不加环境变量；评审分支保留这个文件，评审也在 high 跑）。第一次检查时从 run 的 init 事件核对实际 effort；核对不了就在报告里写"按配置应为 high，未能验证"。
4. **修掉 Design Console 的 pre-existing play-step 问题**（desktop-only 的 "backlog open" tab 在 390 px 下找到两个 "Open backlog"）：play step 选可见的那个控件。try1 里同一个问题被 `ui-verifier` 判成四次 FAIL、两次 PASS。

主 session 侧：

5. controller 脚本参数化进主仓库的 `experiments/_tools/`（remote 名作参数，本轮是 `lab`）：`make-review-branch.sh`（scrub 规则读 per-try 文件 `scrub.txt`，基于 try1 的脚本）、行为检查 runner（checkout → 重启 dev → 重置 e2e 用户 → `npm run check:clicks`）；transcript 统计、清单审计、评审收集的 subagent brief 用 `prompts/controller-briefs.md`。
6. 十份 run prompt、十份评审 prompt 冻结在 `prompts/`；R1–R10 到 run 的映射用 `SystemRandom`，只存 controller 分支。
7. 主 session 机器：Node 24（`export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh; nvm install 24`，每条 Bash 都要重新 source）、`npm run setup`、`npm run check:clicks` 在起点树上的基线；controller 状态分支 `controller/try2`，只推到 lab 仓库，随仓库一起删；每小时心跳任务（平台最小间隔一小时）加一次性检查。

## 测量

| 维度 | 指标 | 来源 |
| --- | --- | --- |
| 时间（主指标） | T_pages：创建 → 三页都在 run 分支上（A：第三页 commit；B：第三次 cherry-pick 完成）；T_pr：创建 → PR 开出；T_green：创建 → CI 全绿（只记录）。B 另记 `setup --no-db` 结束、三个 agent 派出、每个 agent 交回、合并完成 | transcript 时间戳、GitHub |
| 分段 | setup、写代码、整合（B）、验证（checks、e2e、check:clicks、ui-verifier）、文档、CI 等待 | transcript |
| Token / 成本 | `get_session` 的 `usage` 和 `cost_usd`（主数据）；transcript 的 main / subagent 拆分；每个 agent 的 cache read；context 峰值 | `get_session`、`list_events`、`result` 事件 |
| 过程 | 工具调用、Bash、push、commit、工具错误、合并冲突、stop hook 拦截、worktree 守卫拒绝、是否自写了脚本（协议偏差） | transcript |
| 失败分类 | 每个 run 的问题按 arXiv 2610.10263 的四类标注（shared state & merge、execution governance、task orchestration、global context） | transcript，一个 subagent 一个 run |
| 质量 · CI | 第一次 push 绿否、红了几次 | check runs |
| 质量 · 清单 | try1 的 20 条，一字不改（`try1/instruction.md` › 质量判定） | 每个 diff 一个只读 agent |
| 质量 · 行为 | `npm run check:clicks` 的 16 项，主 session 按分支跑 | 日志 |
| 质量 · 盲审 | 6 项 1–5 分加缺陷列表 | 十个评审 session（`claude-fable-5-1`，effort high，来自同一个 settings 文件） |

汇总：每组均值、中位数、范围；和 try1 同指标并排；Mann–Whitney 的 p 值作参考。

## 流程（controller runbook）

0. **Fresh start**：新 session 从合并了 PR #91 的 `main` 起（否则从分支 `claude/experiments-page-structure-parallel-try1` 起）；lab 仓库没挂在 session 上就先 `add_repo`（owner `Marsuu1994`、repo `mars-workbench-lab-try2`、access `push`），本机 `git remote add lab https://github.com/Marsuu1994/mars-workbench-lab-try2`；只读本文件、`prompts/controller-briefs.md`、`experiments/README.md` 的 Controller notes 和 try1 的 `report.md`；不读 try1 的 transcript 细节。Scratchpad 里建 `experiment.md`（run 表、事故、阶段），每个里程碑镜像到 lab 仓库的 `controller/try2` 分支。
1. **前置**：建 `experiment/base-try2`，提交四个修正，推到 lab 仓库（`git push lab experiment/base-try2`）；本机在它上面跑 `format:check`、`lint`、`typecheck`、`knip`、`npm test`、`check:clicks` 基线；`experiments/_tools/` 就位；取 SHA，填十份 run prompt 和十份评审 prompt 到 `prompts/`。
2. **起 run**：十个 `create_session`，记 session id 和创建时间；`send_later` 20 分钟后第一次检查（看 B 是否在 `--no-db` 之后立刻派 agent；没有的话记为协议偏差，不干预），之后每 30 分钟；建每小时心跳；状态镜像。
3. **结束条件**：PR 开好、head 的 CI 全绿（`get_session` 的 `status_bucket` 加 GitHub check runs）。卡住或基础设施故障的 run 记录并重跑一次。
4. **收数据**：每个 run 一个 transcript subagent（`prompts/controller-briefs.md` › Transcript metrics，含失败标注）；每个 diff 一个清单 subagent（› Checklist audit，20 条原文）；行为检查十个分支串行（冷服务器预热；失败的页面热重跑一次，两次都记）；`get_session` 的 `usage` 作成本主数据。
5. **盲审**：`make-review-branch.sh` 为每个 run 建 `experiment/review-R<n>`（孤儿两 commit，README 换成 base 的，scrub 规则见 `prompts/scrub.txt`，只推到 lab 仓库）；十个评审 session 同时起（`claude-fable-5-1`，`source_revision` 各自的 review 分支，prompt 见 `prompts/review-template.txt`）；一个 subagent 收齐 JSON 并审计（有没有用 GitHub 工具、看别的 ref）。
6. **导出和报告**：先导出，删 lab 仓库才不丢东西：每个 run 的 patch（`git format-patch lab/experiment/base-try2..lab/claude/page-structure-try2-<run>` 到 `data/patches/<run>/`）、PR 描述（`data/pr-<run>.md`）、CI 结果进 run 表；报告推荐合并的那个 run，把分支同名推到主仓库并对 `main` 开 PR，作为合并候选。再写报告：结论先行，和 try1 并排的表，固定成本分解，判定规则的结果；写进 `experiments/page-structure-parallel/try2/report.md`，一个 PR 进主仓库的 `main`。
7. **收尾**：二十个 session 归档；心跳任务停掉；owner 定合并候选 PR 的去留（和 try1 的六个一起看），然后删掉 lab 仓库，run、评审、起点、controller 分支随之消失，不用逐个删。

## 质量判定

- 清单：try1 的 20 条原文，不改。
- 行为：`npm run check:clicks` 16 项，0 console error。
- 盲审 prompt（全文，`prompts/review-template.txt`）：

```text
You are reviewing one implementation of a planned refactor in Marsuu1994/mars-workbench-lab-try2, labelled {R}. Your checkout is that implementation; the commit before HEAD is the starting point it was built from. Review only the combined diff `git diff HEAD~1 HEAD`, the code it touches, AGENTS.md, and the spike that says what the change should do: `git show HEAD~1:design/spike/component-structure.md` (the implementation may have moved its copy to design/spike/archived/). README.md and the Update Log are out of scope: don't report their absence or staleness. Don't look at anything else about this work: no other branches, no pull requests, no GitHub tools, no history beyond these two commits, no other implementation of the same plan.

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

- Scrub 规则（`prompts/scrub.txt`，base 和 candidate 两棵树都做；candidate 的 README 换成 base 的）：删 `experiments/` 整个目录；spike 里的"并行执行"一节、Q9 决定行、owner 决定表里提到 subagent / 对照实验的行、"串行时建议"和"并行时的冲突面"两处措辞；tracker 和 README 里提到 Q9 / 并行 subagent / experiments 的句子；生成后全树 grep `Q9|并行|串行|subagent|worktree|experiment` 确认只剩无关内容（起点 `.gitignore` 的 `.claude/worktrees/` 行两组都有，不算）。

## 和上一轮的差异

| 项 | try1 | try2 | 为什么 |
| --- | --- | --- | --- |
| 组数 | 3 + 3 | 5 + 5 | 组内波动大于组间差异 |
| 起点 | `main` 的 `1ae70f7f` | `experiment/base-try2` = `1ae70f7f` 加四个修正 | 同一个任务，修正不进任务 |
| B 的 setup | 等 setup 跑完再派 agent | `setup --no-db` 后立刻派，数据库后台起 | setup 离开关键路径（try1 多花 2.2–5.6 min） |
| 验证 | 每个 run 自己写 Playwright 脚本 | 仓库脚本 `npm run check:clicks` | try1 组内波动的来源（5–22 min） |
| 合并方式 | "merge the three branches" | 明说 cherry-pick、一页一个 commit | B1 为此改过一次策略 |
| agent 的命令 | 无说明 | 简单命令加 Write | worktree 守卫每个 run 拒绝 3–5 次 |
| effort | 默认值 | high（仓库 settings 文件，run 和评审都是） | 对标日常开发 |
| stop hook | B 组被拦 1–4 次 | `.gitignore` 排除 `.claude/worktrees/` | 去噪 |
| ui-verifier | pre-existing 问题判成 FAIL 或 PASS | 先修掉 | 去噪 |
| 盲审 | README 缺失被当缺陷 | prompt 豁免 README | scrub 产物 |
| PR base | `main` | `experiment/base-try2` | `main` 会合并 try1 的 PR |
| 仓库 | 主仓库 | 一次性 lab 仓库 `mars-workbench-lab-try2` | 云 session 删不了远端分支；跑完删仓库即清理 |
| 失败分类 | 无 | 2610.10263 的四类 | 可与文献对照 |
| 假设 | 事后描述 | 预注册 H1–H4 和判定规则 | 结果直接变成默认流程 |
| 时间主指标 | 总时长 | T_pages 和 T_pr，CI 排除 | 十个 PR 同时开，CI 排队是共用噪声 |

## 预估

- 时间：搭 lab 仓库 10–20 min（owner 建仓库装 App，controller 推分支）；run 阶段 25–45 min；收数据、清单、行为检查（十个分支约 50 min 串行）、盲审、报告约 3 h；整体一个下午。
- 成本：try1 每个 run $6.3–9.2（默认 effort）；high 按 1.1–1.3 倍估，A 约 $8、B 约 $11，十个 run 约 $95；十份评审约 $40；合计约 $135–160，不含主 session。
