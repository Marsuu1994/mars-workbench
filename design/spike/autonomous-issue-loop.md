# Spike: Autonomous issue loop — issue 进、PR 出，owner 只管 design phase

**Status: awaiting owner review** · 2026-11-02 · 回答 tracker 条目 *Harness engineering › Autonomous issue loop* · 基于 main `d779127`（#102）· 相关：PR #104（`ui-feature` skill、带 tag 的 `test.fail` contract）、PR #105（e2e data isolation spike）、PR #82（`code-reviewer` spike）、`reviews/`（owner 的 review log）、`design/spike/README.md`（什么时候写 spike）

> 语言说明：正文中文；GitHub 的功能名、label、文件名和代码标识保留英文（issue type / sub-issue / label / milestone / auto-merge / `ready` / `check:risk`），和 GitHub 界面、仓库里的叫法一一对应。

## TL;DR

- **目标**：一个每天自己跑的 Routine 从 GitHub issue 里领一个 `ready` 的任务，开 PR、跑检查和 reviewer、低风险的自己合并；需要 owner 决定的停下来打 `needs-decision`。owner 只做 design phase：需求、mockup、user flow、数据和契约，最后批准 contract。
- **这份 spike 不管的**：e2e 隔离（#105）和 code reviewer 本身（#82）。它们是 loop 的依赖，各自的 PR 定。
- **Part 1 · Issue 入口**：tracker 全部迁到 issue，`tracker.md` 退休。分类用 GitHub 内置的三个 issue type（Feature / Bug / Task，仓库里已经启用了），再加两组 label：`area:*` 和 `priority:*`；loop 的状态只用 `ready` 和 `needs-decision` 两个 label。Jira 的 Epic 对应带 sub-issue 的父 issue，Fix version 对应 milestone。Sprint、story point、自定义 workflow 都不需要。
- **Part 2 · Reviewer 的 golden set**：直接用现有的 review log。第 0 阶段每个实现 PR 由 reviewer 先审，owner 再审；owner 在实现 PR 上留的 `bug` / `rule` / `docs` 评论，就是 reviewer 看过同一份 diff 却漏掉的，自动成为 golden case。log 只需要多两样东西：一个 `## Agent review` 小节，以及 owner 评论上的一行 `Reviewer: missed / rejected`。
- **Part 3 · Design phase、升级规则和 spike 标准**：
  - spike 的判断标准从"任务大不大"改成一条：**开工前能不能写出验收标准，且不留需要 owner 决定的问题**。能写出来，issue 直接 `ready`；写不出来，就要 design PR（UI 改动有 mockup 就够，其余写 spike）。另外列出 5 种最常产生开放问题的情况（数据形状、对外契约、新依赖或基础设施、跨页面的模式、多 PR），作为检查清单。
  - 升级规则分两层：机器能查的（改了 design phase 定下的东西：`prisma/`、MCP 契约、contract 断言、auth、依赖）由 CI 的 `check:risk` 拦住，等 owner 加 `owner-approved`；只能判断的（需求有歧义、做着做着撞上清单里的情况、CI 修 3 次仍红）由 agent 停下来打 `needs-decision`。
- **推出**：先跑第 0 阶段（影子模式：loop 开 PR，一律由 owner 合，同时攒 reviewer 的数据），达到 Q8 的门槛后进入第 1 阶段（低风险 PR 由 GitHub auto-merge 合并）。
- **开放问题**：Q1–Q11，在文末。

## 起因

owner 想发布 app，也想提高开发速度。最近的 PR 大部分花在 workflow 本身上，而且每建一层 harness 就暴露下一层的地基问题（#102 的 design flow 引出了 e2e 的共享 seed 问题，也就是 #105）。owner 想要的 harness 是一个具体的闭环：

1. owner 定需求：mockup、user flow、数据，复杂的写 spike；
2. 一个每天跑的 Routine 自己看 issue、自己开 PR、自己 review、自己 merge；
3. 只有非要 owner 决定的事才停下来问。

现在离这个闭环差的是：没有 issue（仓库里 0 个，待办都在 `design/tracker.md`），没有"可以交给 agent"的定义，没有合并闸门，也没有稳定的"什么时候写 spike"的标准。

## 闭环长什么样

```text
owner                                  Routine（每天一次，fresh session）
─────                                  ─────────────────────────────────
写 issue（form）
  │ 有开放问题？
  ├─ 是 → design PR：spike / mockup / flow /
  │        数据 / contract（test.fail）→ owner 批准、合并
  │        → 实现 issue（sub-issue）打 ready
  └─ 否 → 直接打 ready
                                       1. 领最高优先级、没有 blocker 的 ready issue
                                       2. 分支 claude/<slug>，PR 写 Fixes #N
                                       3. 本地检查 → reviewer subagent → 修
                                       4. push，跟到 CI 绿
                                       5. check:risk 绿 → 开 auto-merge（第 1 阶段起）
                                          check:risk 红 → 等 owner-approved
                                       遇到升级条件 → issue 打 needs-decision，
                                       评论写清楚问题，推送通知
回答 needs-decision（issue 评论）
  → 重新打 ready
```

owner 的决定全部发生在两个地方：design PR 的 review，以及 `needs-decision` issue 下的评论。实现 PR 在第 1 阶段之后不再需要 owner 看。

## Part 1 · Issue 入口

### GitHub 提供了什么（2026-11-02 在本仓库上核实）

| 功能 | 是什么 | 本仓库现状 |
| --- | --- | --- |
| Issue type | 每个 issue 一个类型，可以按类型筛选 | 已启用 `Task` / `Bug` / `Feature`（`list_issue_types` 返回这三个） |
| Label | 自由标签，可多选，可按 label 搜索、筛选 | 只有默认 label |
| Sub-issue | 父子 issue，可多层；父 issue 显示子 issue 的完成进度 | 可用 |
| Issue dependency | `blocked by` / `blocking` 关系 | 可用 |
| Milestone | 一组 issue 和 PR 的目标，可设截止日期，显示完成百分比 | 无 |
| Issue form | `.github/ISSUE_TEMPLATE/*.yml`，带必填字段的表单 | 无 |
| Issue field | 组织级自定义字段（优先级、日期等） | 没有（`list_issue_fields` 为空；仓库在个人账户下） |
| Projects | 跨仓库的 board / table 视图，自定义字段（Status、Priority、Size），内置自动化（新 issue 自动加入、关闭后移到 Done） | 未使用 |
| Closing keyword | PR 描述里写 `Fixes #N`，PR 合并时关闭 issue | — |

### 对照 Jira

| Jira | GitHub 里的对应 | 这里用不用 |
| --- | --- | --- |
| Epic | 父 issue + sub-issue | 用：tracker 里的多 PR 项目（Quality gate、Phase 2）就是这个形状 |
| Story / Task / Bug | Issue type `Feature` / `Task` / `Bug` | 用，内置三个就够 |
| Sub-task | Sub-issue | 用 |
| Priority | `priority:*` label（或 Projects 的字段） | 用 label |
| Component | `area:*` label | 用 |
| Fix version | Milestone | 只给发布目标用（例如 Public launch） |
| Status workflow | Projects 的 Status 字段，或 label | loop 只需要 `ready` / `needs-decision`；"进行中"由打开的 PR 表示，"完成"由关闭表示 |
| Sprint、story point、board | Projects 的 iteration、number 字段、board 视图 | 不用。loop 不按 sprint 节奏，也不需要估算 |

Jira 重在两样：一套带权限的状态机，以及给多人协作的报表。个人项目加一个 agent，两样都用不上。真正需要的是：

- agent 能可靠地查出"下一个该做什么"，比如 `label:ready` 按优先级排序；
- owner 能一眼看出"有什么在等我"，比如 `label:needs-decision`。

### 建议的分类

**Issue type**：三个内置类型，每种的 Definition of Ready（够 `ready` 的条件）由 issue form 的必填字段保证。

| Type | 什么时候用 | 打 `ready` 前必须有 |
| --- | --- | --- |
| `Feature` | 用户能看到的新行为或改动 | 验收标准；UI 改动要有已合并的 design PR（mockup + contract），或者 owner 写明"按描述做，不需要 mockup" |
| `Bug` | 已有行为和预期不符 | 在哪（页面、视口、设备）、怎么复现、预期和实际；已知的话写上引入它的 PR |
| `Task` | 用户看不到的工作：重构、依赖、文档、harness | "做完是什么样"一句话 |

**Label**：一共三组。

| 组 | Label | 来源 |
| --- | --- | --- |
| 区域 | `area:board` · `area:plan` · `area:priorities` · `area:projects` · `area:dump` · `area:auth` · `area:mcp` · `area:harness` | tracker 的 `##` 小节；Cross-cutting 的条目按实际涉及的区域打，或者不打 |
| 优先级 | `priority:high` · `priority:medium` · `priority:low` | tracker 的 High / Medium / Future |
| Loop 状态 | `ready` · `needs-decision`（issue 和 PR 都用）· `owner-approved`（只用在 PR 上，见 Part 3） | 新增 |

不建议加的：`in-progress`（打开的 PR 已经说明了，而且 loop 是串行的）、`size:*`（还没有用途）、`wontfix` / `duplicate`（用 GitHub 关闭时的 "not planned" 原因代替）。

**Milestone**：一开始只建一个 `Public launch`，用来定"做到哪里算发布"（PR #84 的 spike）。Quality gate、Phase 2 这类是父 issue，不是 milestone。

**Projects**：v1 不用。label 加 issue 列表已经能完成 loop 的两个查询。如果 owner 想要 Jira 那样的看板，再加一个 Project，它不影响 loop（Q3）。

### 迁移 tracker

tracker 现在有 37 个顶层条目、42 个带复选框的子条目。如果 issue 和 tracker 同时存在，就有了两个 source of truth，loop 迟早会读到过期的那一份。所以建议**全部迁移，`tracker.md` 退休**（Q1）：

- 顶层条目变成 issue；带复选框的子条目变成 sub-issue；不带复选框的上下文子条目写进 issue 正文。
- 所在小节变成 `area:*`，High / Medium / Future 变成 `priority:*`。
- 链接到 spike 或 mockup 的，链接放进正文。spike 的 "linked from the tracker item it answers" 改成链接到 issue。
- 迁移由 agent 用 GitHub MCP（`issue_write`、`sub_issue_write`）一次做完，不经过 git。PR 描述里附一张"tracker 行 → issue 编号"的对照表，供 owner 抽查。
- 迁移本身不打 `ready`。哪些 `ready` 由 owner 决定（Q4）。

随之要改的文档：
- AGENTS.md › Version Control › Before every push 的第 1 步（"`design/tracker.md`: delete finished items"），改成"PR 描述写 `Fixes #N`"；
- AGENTS.md 的 Project Structure 和 Where the rules live 里关于 tracker 的行；
- `design/README.md` 的 What Lives Where；
- `design/spike/README.md` 的 Lifecycle 第 1 步；
- `ui-feature` skill 里写 tracker 条目的步骤；
- `test/README.md` 里提到 tracker 的地方；
- README。

## Part 2 · Reviewer 的 golden set 和 review log

### 现在的 review log 能提供什么

`reviews/pr-<NNN>.md` 已经逐条记下 owner 的评论，包括它的 kind（`bug` / `rule` / `docs` / `design` / `scope` / `question`）和结局，并且由 CI 保证每条都有记录（`check:review-log`）。README 里也写了它是 reviewer 的 ground truth。目前三份 log（#97、#102、#104）几乎都是 design PR 上的评论：design 11 条、docs 3 条、scope 3 条、question 2 条，还没有实现 PR 上的 `bug` / `rule`。原因是到目前为止，owner 主要在审 spike 和 mockup。

### 第 0 阶段怎么接上

关键在于把 log 里的评论按"reviewer 本该不该抓到"分开：

- **design PR 上的评论**（`design` / `question` / `scope`）是在做决定，不是 reviewer 的考题。它们照旧记录，不计入统计。
- **实现 PR 上的 `bug` / `rule` / `docs`**：reviewer 和 owner 看的是同一份 diff。owner 找到而 reviewer 没报的，就是一次漏报（miss），天然就是一个 golden case，而且带着 base SHA 和 diff，可以重放。

只看 owner 的评论还不够，因为 reviewer 报过、session 已经修掉的问题，owner 根本看不到。所以 log 还需要记下 reviewer 自己报了什么。具体改动：

1. 每份 log 的开头加 `**PR kind** design | implementation`。
2. 实现 PR 的 log 多一个 `## Agent review` 小节，由 session 在第一次 push 前写。reviewer 的每条 finding 写一行：所在位置、kind，以及结局（`fixed in <sha>` 或者 `rejected: <理由>`）。
3. owner 的每条 `bug` / `rule` / `docs` 评论多一行 `**Reviewer:**`，取值三选一：
   - `missed`：reviewer 没报；
   - `rejected`：reviewer 报了，但 session 驳回了；
   - `n/a`：与 reviewer 无关，例如这条评论指向的是 PR 之外的旧问题。

   这一行由处理这轮 review 的 session 填，owner 可以改。
4. `reviews/AGENTS.md` 的第 3 条（"Only the owner's reviews go here"）改成：owner 的 review，加上实现 PR 的 `## Agent review` 小节。
5. 合并后才发现的问题（escape）记成 `Bug` issue，在 form 的 "Introduced by" 字段写上 PR 编号。这是 golden set 的第二个来源。

由此可以算出：

| 指标 | 算法 | 说明 |
| --- | --- | --- |
| Precision | `fixed` 的 finding ÷ 全部 finding | owner 可以抽查 `rejected` 的那些；被 owner 推翻的，算作真问题 |
| 漏报 | owner 的 `missed` + escape 的 `Bug` | 按 kind 分开看：`bug` 的漏报才影响能不能进入第 1 阶段 |
| 近似 recall | `fixed` ÷ (`fixed` + `missed` + `rejected` 但 owner 认为是真问题的 + escape) | 是近似值：owner 也会漏，后面的 sweep 和 escape 会补上一部分 |

PR #82 里的 G1–G10 可以留作初始种子，但不再需要单独维护一个 golden set：每次 review 都在往里加数据。统计脚本（把所有 `reviews/pr-*.md` 汇总成上面这张表）等攒到 10 个实现 PR 再写，在那之前手数就够了。

## Part 3 · Design phase、升级规则和 spike 标准

### Design phase 定下什么

owner 设想的流程是：先定 spec（mockup、user flow、数据），这一步通常伴随一个 spike，schema 和契约也在这一步定下。这正好把一个 feature 分成两段：

- **design PR**（owner 参与）：视情况包含 spike、mockup、`design/flows/` 的改动、数据模型的决定（写在 spike 里，或 `baseline.md` 的改动），以及 contract（#104 的带 tag 的 `test.fail`）。合并时开出实现用的 sub-issue，并打上 `ready`。
- **实现 PR**（loop 负责）：从 `main` 开分支，把 contract 跑绿。只要不碰 design PR 定下的东西，就不需要 owner。

这其实是把 AGENTS.md › UI Workflow 里"新 UI 走两个 PR"的例外推广到所有需要 design 的任务。同时也要改 *One task, one branch, one PR*，以及 spike README 里"写 spike 的 session 和实现放在同一个 PR"这一条（Q9）。

### 什么任务需要 spike

`design/spike/README.md` 现在的标准是"多个 PR、数据模型改动、新的 tool surface，或者有真实 tradeoff 的选择"。前三条可以客观判断；最后一条全凭判断，也恰恰是最常用的那条。

在 loop 里，问题可以换一种问法：**这个 issue 能不能直接打 `ready`？** `ready` 意味着验收标准写得出来，而且没有需要 owner 决定的问题。于是：

> **定义**：开工前写不出验收标准，或者写验收标准的过程中冒出了需要 owner 决定的问题，就需要 design PR。UI 层面的问题（布局、交互、状态）用 mockup 和它在 PR 上的问题来回答，不单独写 spike；其余问题写 spike。

下面五种情况最常产生开放问题。issue form 里把它们列成复选框；勾了任何一项，默认先走 design PR，除非 owner 在 issue 里写明不需要（例如只是给 MCP tool 加一个可选参数）：

| # | 情况 | 例子 |
| --- | --- | --- |
| S1 | 改持久化数据的形状：Prisma schema、migration、回填 | week model restructure |
| S2 | 改对外契约的语义：MCP tool 的名字、schema、行为，OAuth 和 auth 流程，别人会存的 URL | MCP one-offs、MCP projects |
| S3 | 引入新依赖或基础设施：新服务、secret、cron、CI job、本地 stack | dev environment、test baseline |
| S4 | 改跨页面的模式或规则：AGENTS.md 里的规则，或 ≥2 个页面共用的结构 | board prop drilling、component structure、mutation layer |
| S5 | 预计要 ≥2 个实现 PR | week model Phase 1 |

用历史校准：归档区的 16 份文档里，除了一份实验记录（`component-structure-experiment.md`）和 `priorities-complete-one-off.md`（Complete 的 UI 方案选择，按新定义有 mockup 就够），其余 14 份都至少命中一项。没写 spike 的 PR 也对得上：#103 的 Archived 折叠只是 UI 改动，有 mockup 就够了；#92 给 MCP 加了一个可选参数 `addOneOffTaskIds`，命中 S2，但它是只增不改，属于上面说的"owner 写明不需要"。

### 升级规则

分两层：一层机器查，一层 agent 判断。

**机器查：`check:risk`（CI job）。** PR 只要改了下面这些路径，就判红，直到 owner 给 PR 加上 `owner-approved`。它们正是 design phase 定下、实现时不该悄悄改的东西：

| 路径 | 为什么 |
| --- | --- |
| `prisma/`（schema 和 migration） | S1。另外 `db:deploy:prod` 只能 owner 手动跑：带 migration 的 PR 如果自动合并，Vercel 部署的代码会先于 schema 上线 |
| `src/mcp/tools/`、`src/mcp/prompts/` | S2，Claude 侧的契约 |
| `src/lib/auth/`、`src/lib/supabase/`、`src/proxy.ts`、OAuth 路由 | S2，安全 |
| `package.json` 的 `dependencies` / `devDependencies` | S3 |
| `.github/`、`AGENTS.md` 及其索引的 README、`.claude/` | harness 本身：loop 不应该改写自己的规则 |
| `e2e/` 里改了已有测试的断言（不是新增测试） | contract 是 owner 批准过的 spec。改 locator 和 helper 不算 |

最后一行很难精确地用路径判断。v1 先按"改了 `e2e/` 下已存在的文件"判红，误报靠 owner 加 label 放行，等有数据了再收窄（Q10）。

这里有一个 GitHub 层面的事实：loop 开的 PR 显示的作者是 owner 的账号，而 GitHub 不允许作者 approve 自己的 PR。所以"高风险 PR 需要 owner approve"没法用 branch protection 的 required review 实现，只能用 label 加 CI job 这种闸门。

**agent 判断：停下来，打 `needs-decision`。** 在 issue 上评论：卡在哪、有哪些选项、各自的代价，然后发推送通知。

1. 验收标准有歧义，或者和代码的现状矛盾；
2. 实现过程中发现必须碰 S1–S4，而 design PR 没有覆盖到；
3. contract 照现在这样写过不了，必须改断言才能过；
4. 同一个 CI 失败修了 3 次仍然是红的；
5. 预计 diff 远超 issue 的规模，比如一个 `Task` 改了十几个文件，说明 issue 该拆了。

一个 issue 被打上 `needs-decision` 后，loop 就跳过它去做下一个，不会一直等着。

## Loop 本身

- **触发**：一个 Routine，每天一次，每次开新 session，prompt 只有一句"调用 `issue-runner` skill"。流程写在 skill 里，跟着仓库走版本，可以 review，owner 也能手动调用。
- **每次做多少**：v1 每次只做一个 issue，做到 PR 合并、进入等待或者升级为止。串行可以避免合并冲突，也和 try1、try2 的结论一致（这个规模下串行更快）。吞吐量不够时再考虑一次做多个（Q7）。
- **选哪个**：在 `ready` 里，先按 `priority:*`，再按创建时间；跳过有未关闭 `blocked by` 的，以及已经有打开 PR 的。
- **合并**：第 1 阶段起，`check:risk` 是绿的就由 agent 开启 GitHub auto-merge，等 required checks 全绿后由 GitHub 合并。这意味着闸门在 GitHub 和 CI 手里，不靠 agent 自觉。owner 需要在仓库设置里做两件事：打开 "Allow auto-merge"；给 `main` 配一个 ruleset，把 CI 的各个 job 和 `check:risk` 设为 required status checks。auto-merge 只会等 ruleset 要求的东西，没有 required checks 的话它会立刻合并。
- **合并的授权**：Claude Code 云端 session 有一条平台规则，不会因为 GitHub 上的内容（评论、PR 描述）去 approve 或 merge。合并的授权必须写在 owner 自己写的 Routine prompt 和 skill 里。
- **生产环境**：Vercel 会把 `main` 自动部署到生产。发布前只有 owner 一个用户，第 1 阶段可以先跑起来；对外发布前，需要先有生产错误追踪（tracker 里的 *Spike: tracking production errors*），不然 escape 只能靠 owner 自己撞上。
- **依赖**：#104（contract 的形态）、#105（e2e 隔离，否则 loop 写的测试会互相踩共享的 seed）、#82（reviewer）。

## 推出阶段

| 阶段 | loop 做什么 | owner 做什么 | 进入下一阶段的条件 |
| --- | --- | --- | --- |
| 0 · 影子模式 | 全流程，到 PR 绿为止；不开 auto-merge | review 每个实现 PR、合并，评论照常记进 log | Q8：例如 ≥10 个实现 PR，最近 5 个里 owner 没有 `bug` 类的 `missed` |
| 1 · 低风险自动合 | `check:risk` 绿的 PR 开 auto-merge | 只处理 `needs-decision` 和 `owner-approved`；抽查合并后的 PR | 按 log 和 escape 的数据决定是否放宽 `check:risk` 的路径 |
| 2 · 放宽 | 例如 `e2e/` 的规则收窄、一次做多个 issue | design phase | — |

`rule` / `docs` 类的漏报不卡第 1 阶段：它们属于"可以攒着、以后批量修"的问题，交给 quality sweep（#94）在第 1 阶段之后接手。

## 实施计划

决定之后，按 AGENTS.md 的 *One task, one PR*，全部放在这个 PR 里：

1. **Issue 入口**：
   - `.github/ISSUE_TEMPLATE/` 下建 `feature.yml`、`bug.yml`、`task.yml`（按上面的 Definition of Ready 设必填字段；`feature` 带 S1–S5 复选框，`bug` 带 "Introduced by" 字段），再加 `config.yml` 关掉空白 issue；
   - label 由 owner 在 GitHub 界面建（14 个，几分钟），或者由一个 `workflow_dispatch` workflow 从 `.github/labels.yml` 同步（Q2）；
   - 迁移 tracker（Part 1），PR 里附对照表。
2. **文档**：Part 1 列出的 tracker 引用；`design/spike/README.md` 换成 Part 3 的定义和 S1–S5；AGENTS.md › Version Control（Before every push、One task one PR）；`reviews/AGENTS.md` 和 `reviews/README.md`（Part 2）。
3. **闸门**：`scripts/check-risk.mjs` 加一个 CI job（用 `githubApi.mjs` 读 PR 的 label，和 `check:review-log` 同一套），以及单元测试。
4. **Loop**：`.claude/skills/issue-runner/`（选 issue、分支、实现、检查、reviewer、PR、升级、合并），以及 Routine（开新 session，频率见 Q7），从第 0 阶段开始跑。
5. **owner 在 GitHub 上做的**：auto-merge 开关、`main` 的 ruleset 和 required checks，对哪些 issue 打 `ready`（Q4）。

## 开放问题

1. **迁移范围**：tracker 全部迁到 issue、`tracker.md` 删除（建议），还是只迁 High 和 Medium，Future 留在 tracker 当想法池？后者的代价是两个来源。
2. **Label**：上面三组 14 个够不够？`area:*` 要不要再细分或合并？label 是 owner 手建，还是用 workflow 同步？
3. **Projects 看板**：v1 不用（建议），还是现在就建一个 Jira 风格的 board？
4. **第一批 `ready`**：迁移后由 owner 挑，还是让 loop 先做一轮 triage，在评论里列出每个 issue 缺什么，owner 再勾？
5. **谁能打 `ready`**：只有 owner（建议），还是复现步骤完整的 `Bug` 可以由 loop 自己打？
6. **Agent review 记在哪**：放进 `reviews/pr-<NNN>.md` 的 `## Agent review` 小节（建议，同一个 case 在一个文件里），还是只写在 PR 描述里？
7. **频率和吞吐量**：每天一次、每次一个 issue，可以吗？时间定在什么时候？
8. **第 0 阶段的出口**：≥10 个实现 PR、最近 5 个没有 `bug` 类的 `missed`，这个门槛行不行？
9. **两段式**：design PR 加实现 PR 推广到所有需要 design 的任务，相应改掉 *One task, one PR* 和 spike README 里"spike 和实现在同一个 PR"，可以吗？
10. **`check:risk` 的路径**：上表有没有多或漏？`e2e/` 先粗后细，可以吗？
11. **harness 系列**：迁移后，tracker 里 Harness engineering 下的实验条目（1b、2、4、5、6、evals 仓库等）以 `priority:low` 迁过去，还是以 "not planned" 关掉、需要时再开？
