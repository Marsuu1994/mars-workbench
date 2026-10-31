# Spike: 下一次实验之前 — 工具放哪、仓库怎么分、按什么顺序做

**Status: awaiting owner review** · 2026-10-31 · 回答 tracker 条目 *Harness engineering › Setup* · 相关：`experiments/AGENTS.md`（实验的规则）、`experiments/page-structure-parallel/try2/report.md`（这一轮的教训和单位成本）、PR #82 的 `code-reviewer-agent.md`（Eval strategy）

> 语言说明：正文中文；仓库名、分支名、脚本名、代码标识保留英文（lab repository / controller branch / `check:clicks` / `make-review-branch.sh`），和仓库里的叫法一一对应。

## TL;DR

- **问题**：page-structure 两轮下来，实验用到的东西散在三个地方——主仓库的 `experiments/`、lab 仓库的起点分支（`check:clicks`、`.claude/settings.json`）、lab 仓库的 controller 分支（协议、工具、数据）——其中大部分工具每一轮都是从上一个 lab 仓库手工拷过来改的。下一个实验之前要把它们分清楚：哪些跨 try 复用、放主仓库；哪些只属于一个 try、放它的 lab 仓库；哪些是要反复跑的数据集、放 evals 仓库。
- **建议的分法**（详见"东西放哪"）：
  - 主仓库：`experiments/`（instruction、report、规则）和 `.claude/skills/experiment-controller/`（controller 的 SOP 和所有通用脚本）；对日常开发也有用的检查进 `e2e/` 或 `scripts/`。
  - lab 仓库（一个 try 一个）：起点分支、run 分支、review 分支、controller 分支（这一轮填好的协议、log、数据、所用 skill 的快照）。
  - evals 仓库（一个，跨 try）：每个任务一个 case——起点、实现、裁决过的答案、检查。
- **`check:clicks` 的答案**：它不是 controller 的工具，是 run 在起点上必须用的测量工具（三页 16 项点击检查），所以放在了起点分支。它覆盖了 e2e 没有的流程（popover 的 Done / Undo、键盘拖动、象限 Add、手机 sheet、Dump 的连续捕获和翻页），改写成 e2e spec 进主仓库的 CI（Q1，已定）。
- **实验专用的测量工具在写 instruction 时就定下、做好，开跑前进 `main`**（owner，2026-10-31）：测已有行为的检查直接进 CI；测还没做的行为的验收测试以 `it.fails` 进 `main`，实验开始时起点分支把它们翻成普通测试，run 看到的红 CI 就是 spec 的一部分。这样 controller 只做编排，起点就是 `main` 的快照加一个实验专用的 commit。
- **run 不开 PR**（owner，2026-10-31）：run 只 push 分支，CI 在 push 上跑；评审和检查都在分支上做，lab 仓库不再出现一批与主仓库无关的 PR。
- **执行顺序**（详见"顺序"）：这份 spike → skill 和通用脚本 → evals 仓库和 page-structure case → reviewer model（3）→ implementer model（2）→ 规则落地 → 规则管不管用（4）→ error framework（1b）→ sweep model（5）。
- **要 owner 回答**：Q2–Q7（Q1、Q8 已答）。

## 起因

- owner 问：`check:clicks` 不是实验的工具吗，为什么在 try 的仓库里而不是主仓库？lab 仓库里到底有什么？
- 现状是 tracker 的 Setup 只写了"controller 的 skill 和脚本"，没有写清楚哪些工具属于 controller、哪些属于 run、哪些属于数据集，也没有一个下一次实验前要做完的清单。
- 这一轮的代价：收数据时每个 subagent 自己设计 JSON 结构（十份 transcript 汇总的键名各不相同），review 分支、scrub、行为检查的脚本是从 try1 拷来再改，单位成本和窗口规则只写在 lab 仓库的 `controller-notes.md` 里。

## 现状：lab 仓库里有什么

`Marsuu1994/mars-workbench-lab-try2`：

| 分支 | 内容 | 谁用 |
| --- | --- | --- |
| `main` | 建仓时主仓库的 `main`（`96d9c63`） | 只是默认分支 |
| `experiment/base-try2` | try1 的起点 `1ae70f7` 加四个修正：`check:clicks`（`scripts/click-through.mjs`）、`.gitignore` 的 worktree 行、`.claude/settings.json` 的 `effortLevel: high`、PlayRunner 的修正 | 十个 run 的起点 |
| `claude/page-structure-try2-a1`…`b5` | 十个实现（PR #1–#10 的 head） | 清单、行为检查、合并候选 |
| `experiment/review-R1`…`R10` | scrub 过的孤儿两 commit 分支 | 十个评审 |
| `controller/try2` | `experiment.md`（controller 的 log）；`protocol/`（完整协议、prompt 模板、controller briefs、scrub 规则、review setup、takeaways、controller notes）；`tools/`（`make-review-branch.sh`、`scrub.py`、`behavior-batch.sh`、`run-branch-checks.sh`、`retry-failed.sh`）；`data/`（session、transcript、清单、评审、盲审映射） | controller |
| `archive/try1` | try1 的协议、prompt、脚本、数据 | 只读存档 |

问题在于：`tools/` 和 `protocol/prompts/controller-briefs.md` 是跨 try 的东西，却只在一个会被归档的仓库里；`check:clicks` 是 run 侧的测量工具，下一个任务用不上（它只点 Board、Priorities、Dump 三页），但它测的流程日常 CI 也没覆盖。

## 东西放哪

按"谁用、活多久"分五类：

| 类 | 例子 | 放哪 | 为什么 |
| --- | --- | --- | --- |
| 1 · 实验的结论和规则 | 每个 try 的 instruction 和 report；`experiments/AGENTS.md`、README | 主仓库 `experiments/` | 给人看的结论要和代码放在一起；体积小 |
| 2 · controller 的 SOP 和通用工具 | 预算规则、阶段排法、brief 模板；建 review 分支、scrub、行为检查批跑、session 用量、transcript 指标、清单的机械部分、评审收集、窗口预算 | 主仓库 `.claude/skills/experiment-controller/`（`SKILL.md` + `scripts/` + `templates/`） | 每一轮都用，要版本化；只在 owner 点名时加载（`disable-model-invocation`），平时不占 context；起点分支删掉它，run 和评审看不到 |
| 3 · 实验的测量工具：测已有行为 | `check:clicks` 覆盖的流程（回归保护） | 写 instruction 时定下、做好，开跑前单独进主仓库 `e2e/` 或单测，进 CI | 你和 instruction 一起审过才开跑；进了 CI，每个 PR 都受益；实验直接用 `npm run test:e2e` |
| 3′ · 实验的测量工具：测还没做的行为 | error framework 的错误路径测试（验收） | 写 instruction 时写好，以 `it.fails` 进主仓库（CI 记为预期失败，保持绿）；实验开始时起点分支把它们翻成普通测试 | CI 就是基准：做之前是已知失败，做完是通过；run 看到的红 CI 就是 spec；跑完后同一批测试就是 evals case 的检查 |
| 3″ · 只给评估者看的东西 | 20 条清单、评审 prompt | 写 instruction 时定下，放 skill 的模板或 controller 分支 | 绝不进起点：run 看见了就成了 spec，量的就不是能不能照 spike 做对 |
| 4 · 只属于一个 try 的东西 | 起点分支（`main` 的快照加一个实验专用的 commit：删 `experiments/` 和 skill、加 `effortLevel`、把验收测试从 `it.fails` 翻成普通测试、让 CI 在 run 分支的 push 上跑）、run 分支、review 分支、填好的协议、controller log、原始数据、所用 skill 的快照 | 这个 try 的 lab 仓库 | 一个 try 一个仓库，别的 try 的材料不会进 context；跑完归档，原始测量留在那里 |
| 5 · 要反复跑的数据集 | 一个任务的起点、实现、裁决过的答案、任务专属的检查 | evals 仓库 `mars-workbench-evals` | 比单个 try 活得久，被后来的实验（reviewer model、implementer model、规则管不管用）反复用 |

- **skill 的快照**：controller 开工时把当时的 skill 原样拷进 controller 分支的 `skill/`，记录这一轮用的是哪个版本；之后改 skill 只改主仓库。起点分支永远不带 skill。
- **实验专用的设置**（`effortLevel`、CI 的 push 触发）只在起点分支上；对主仓库有用的修正（PlayRunner、`.gitignore` 的 worktree 行）和测量工具一样，开跑前单独开 PR 进 `main`，不随实验走。
- **controller 不写代码**：准备阶段只建仓库和分支、做那一个实验专用的 commit、填 prompt。这一轮准备花了 16 min，一半在调 PlayRunner 的修正；工具提前进 `main` 之后，这段时间和风险都移到写 instruction 时，由 owner 一起审。

## 通用工具清单

skill 的 `scripts/` 第一版。前五个从 lab 仓库的 `tools/` 搬来、参数化（仓库、分支前缀、scrub 规则文件作参数）；后面的是这一轮靠 subagent 手工做、应该变成脚本的：

| 脚本 | 做什么 | 输入 → 输出 | 来源 |
| --- | --- | --- | --- |
| `make-review-branch.sh` + `scrub.py` | 每个候选建一个孤儿两 commit 的评审分支，scrub 掉实验痕迹，README 换成起点的 | 起点、候选、scrub 规则 → `experiment/review-R<n>` | lab `tools/` |
| `behavior-batch.sh`、`run-branch-checks.sh`、`retry-failed.sh` | 逐个分支 checkout、重启 dev、预热、重置 e2e 用户、跑检查，失败的热重跑一次 | 分支列表 → 每个分支的日志 | lab `tools/` |
| `session-usage` | 拉每个 session 的 usage、成本、状态、`rate_limit_info` | session id 列表 → JSON | 新 |
| `transcript-metrics` | 分页读 transcript，算 usage（按 `message.id` 去重）、时间线、工具和 Bash 计数、push / commit、冲突、守卫拒绝 | session id → 固定结构的 JSON | 新（这一轮是十个 subagent 各写各的） |
| `checklist-mechanical` | 清单里 git 能判定的条目：改名和删除、props 数量、callback prop、commit 结构、改到计划外的目录 | 起点、候选、清单定义 → 每条的判定和证据 | 新 |
| `review-collect` | 收齐评审的最后一条消息和 JSON，审计有没有用 GitHub 工具、看别的 ref | session id 列表 → 汇总 JSON | 新（这一轮是一个 subagent） |
| `window-budget` | 这个窗口已经花了多少（窗口开始后 controller 和每个子 session 的 `cost_usd` 增量），加上计划中的一批按单位成本的估算，和窗口预算比 | session id、计划 → 放得下 / 等到 `resetsAt` | 新 |
| `fill-prompts` | 按填充规则生成每个 run 和评审的 prompt 文件 | 模板、run 表 → prompt 文件 | 新 |

模型只做判断：失败标注、清单里要读代码判断的条目、缺陷裁决、写报告。

## 实验流程（定稿）

把这一轮学到的写成固定流程，进 skill 的 `SKILL.md`：

1. **写 instruction**（主仓库 `experiments/<question>/tryN/instruction.md`，按模板，含"预算和角色"），同时定下并做好这个实验专用的测量工具：测已有行为的进 CI，测还没做的行为的以 `it.fails` 进 `main`，只给评估者看的放模板；它们各自开 PR 进 `main`，owner 和 instruction 一起批准。
2. **准备**：owner 建 lab 仓库 `mars-workbench-lab-<try>` 并装 App；controller 只做编排——`add_repo`；从 `main`（或 evals case 的起点）建起点分支，加一个实验专用的 commit（删掉 `experiments/` 和 skill、加 `effortLevel`、把验收测试从 `it.fails` 翻成普通测试、CI 加上 run 分支的 push 触发）；`fill-prompts`；把 skill 快照放进 controller 分支。不写新工具。
3. **跑**：owner 在满窗口时开始；所有 run 一次全起。run 只 push 自己的分支、不开 PR，结束条件是分支 head 上 CI 全绿；时间指标从"PR 开出"改成"最后一次 push"。
4. **等窗口**：run 全部结束后，controller 的 context 超过约 200k 就 compact，在 `resetsAt` 后两分钟设一次性唤醒。
5. **评审**：重置后先看 `rate_limit_info`，所有评审一次全起（每个候选一个，最多十个），这时不起别的。
6. **收数据**：脚本先跑完所有机械的部分；判断类的 subagent 按 `window-budget` 分批，每批前再看一次状态。
7. **报告**（主仓库 `report.md`）：结论先行；附录指向 lab 仓库的文件。
8. **数据集**：按 `experiments/AGENTS.md` 第 6 条决定这一轮的实现要不要进 evals 仓库（抓到了 CI 漏掉、经裁决确认的真问题才进）。
9. **收尾**：session 归档；owner 把 lab 仓库归档。

## evals 仓库的构想

```text
mars-workbench-evals/
├── README.md                       # 有哪些 case、每个 case 上次跑是什么时候、处在什么频率
└── cases/
    └── <case>/                     # 第一个：page-structure
        ├── case.md                 # 任务、起点、spec 在哪、run prompt、用哪些检查
        ├── implementations.json    # 每个实现：分支、head、怎么产出的（model、effort、串行 / 并行、哪个 try）
        ├── ground-truth.json       # 已知缺陷：类别、位置、严重度、谁报的、裁决
        ├── checklist.md            # 清单定义；机械的部分由 skill 的 checklist-mechanical 读
        └── runs/                   # 每次在这个 case 上跑的结果摘要（日期、谁、用了什么、指标），一行一次
```

- 分支也放这个仓库：`case/<case>/base`、`case/<case>/impl/<label>`、`case/<case>/review/<label>`。page-structure 的 16 个实现从主仓库（try1 的 #85–#90）和 lab 仓库（try2 的十个）拷过来。
- **答案怎么来**：第一次建 case 时，把已有的评审和清单报过的缺陷合并成候选清单，由一个 Opus subagent 逐条裁决、owner 复核；之后每次有新的 reviewer 报出不在答案里的问题，裁决为真就补进去（避免答案只反映某一个模型的盲点）。
- **频率**（`experiments/AGENTS.md` 第 7 条）：case 测的规则、模型或 agent 定义一变就重跑；某类缺陷基本不再出现（约 1 / 100）后改成每月一次；所有类别都不再出现就归档。
- **和 lab 仓库的关系**：一个新实验要用某个 case 时，lab 仓库的起点从 `case/<case>/base` 建；实验产出的新实现如果有价值，按第 6 条补回这个 case。

## 顺序

| # | 做什么 | 谁 | 依赖 | 产出 |
| --- | --- | --- | --- | --- |
| 1 | 这份 spike 定下来 | owner 回答 Q1–Q7 | — | Decision |
| 2 | `experiment-controller` skill：`SKILL.md`（上面的流程）、`scripts/`（通用工具清单）、`templates/`（brief、评审 prompt、instruction 骨架）；`experiments/AGENTS.md` 改成指向 skill | 一个 PR（和 3 一起） | 1 | skill 进主仓库 |
| 3 | `check:clicks` 的流程按 Q1 处理，和 2 放在同一个 PR | 同 2 | 1 | e2e 覆盖三页的写入流程 |
| 4 | evals 仓库：owner 建仓装 App；controller 建 page-structure case（16 个实现、裁决过的答案、清单） | owner + 一个 session | 2 | case v1 |
| 5 | reviewer model（Harness › 3 的测量）：十个 try2 diff 用 Opus、Sonnet 审（站得住再加 Haiku），和已有的 Fable 比；同时是 PR #82 的 Round 1 | 一个实验 | 4 | 选定 reviewer；code review agent 的去留 |
| 6 | implementer model 和 effort（Harness › 2）：Opus low / medium、Sonnet、Haiku 各 3–5 个 run，对照是 try2 的五个 A；质量用 5 选出的 reviewer 判 | 一个实验 | 5 | 实现阶段的默认 model 和 effort |
| 7 | 规则落地（tracker *Rules the page-structure runs were missing*） | 几个小 PR | — | AGENTS.md 规则、检查脚本、lint |
| 8 | 规则管不管用（Harness › 4） | 一个实验 | 4、7 | 哪些缺陷类别可以改成每月跑 |
| 9 | error framework（Harness › 1b）：串行对并行，跑出真问题就成为第二个 case | 一个实验 | error handling spike（PR #32）通过；8 在前 | 第二个 case |
| 10 | sweep model（Harness › 5）：Fable 和 Opus 各 sweep 同一个 `main` 快照 | 一个实验 | Step 13 的 sweep 定义（PR #94） | sweep 的默认 model |

5 排在 6 前面：6 的质量要靠 reviewer 判，得先知道哪个 reviewer 可信、用它要花多少。7 不依赖前面的步骤，可以随时插进来，但必须在 8 之前；它要是在 9 之前进了 `main`，9 的起点就带着新规则，instruction 里要写明。

## 开放问题

1. ✓ **`check:clicks` 的流程**（owner，2026-10-31：(a)，而且推广成规则——实验的测量工具能进 CI 就进 CI）：(a) 改写成 e2e spec 进主仓库（日常 CI 也覆盖 popover 的 Done / Undo、键盘拖动、象限 Add、手机 sheet、Dump 的连续捕获和翻页，e2e 大约多 1 分钟）；(b) 原样作为 `scripts/` 里的检查进主仓库，不进 CI；(c) 只作为 page-structure case 的任务专属检查留在 evals 仓库。
2. **skill 的形状**：一个 `experiment-controller` skill 带 `scripts/`（推荐），还是把脚本放主仓库 `scripts/experiments/`、skill 只放 SOP？前者整体随 skill 加载和拷贝；后者脚本对 knip、lint 可见，需要排除规则。
3. **evals 仓库的可见性**：和 lab 仓库一样公开，还是私有？
4. **答案的裁决**：Opus subagent 裁决、owner 复核（推荐），还是 owner 亲自过一遍候选清单？page-structure 的候选大约 30–40 条。
5. **顺序**：上表的 1–10 行不行？特别是 5 在 6 前面、7 可以随时插进来。
6. **controller 的 model**：固定 Opus high（这一轮实测够用），还是每个实验在 instruction 里定？
7. **lab 仓库的默认分支**：B4 的三个 worktree 建在 lab 仓库的 `main` 而不是起点上。下一次把 lab 仓库的默认分支设成起点分支，还是在 workflow prompt 里写明 worktree 要从当前 HEAD 建？
8. ✓ **验收测试让不让 run 看见**（owner，2026-10-31）：看见。它们以 `it.fails` 留在 `main`，实验开始时起点分支把它们翻成普通测试，红 CI 就是 spec 的一部分；只给评估者看的清单和评审 prompt 照旧对 run 隐藏。每个实验的 instruction 写明哪些测试是验收测试。
