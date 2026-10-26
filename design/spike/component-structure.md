# Spike: Component structure — 全站的组件怎么拆

**Status: awaiting owner review（Q1–Q8 已定，Q9 待定）** · 2026-10-26 · 回答 tracker 条目 Milestone — Quality gate › Step 10 › PR 1（component structure）· 相关：`archived/board-prop-drilling.md`（Board 的 view model + composition）、`archived/projects-page-refactor.md`（Projects 试点和它的六条原则）、`archived/scenario-states-without-production-props.md`（不为 console 加 prop）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog、`KanbanBoard`、`activePlanId` …），和代码、mockup、tracker 里的叫法一一对应。

两部分。**Part 1 是计划**：owner 定了以 Projects 页为标准结构，这里写标准是什么、其余每页怎么改、怎么验证、能不能交给 subagent 并行做，以及待拍板的问题。**Part 2 是现状调查**：写计划之前的 draft 原文（每页的组件树、数据和 state、prop drilling、跨页面的差异）。

---

## Trigger · 起因

- Step 10 要在 Phase 2 之前定下新页面（Habits、Plan week）的组件写法。
- AGENTS.md 里有两处等它裁决：UI Workflow 的 *Screen components*（标着 pending），和 Layers 的 *Server shapes inputs* 里还没定的「layout frame 怎么接内容」。`baseline.md` › Architecture Decision 也写着 still open。
- Projects 页是试点例外（tracker 的 Step 10 下面）：没有 screen 层，feature component 直接吃 domain 行。其余页面还是试点之前的写法。
- PR 2（config-driven modals）建在这一步的规则上，所以 modal 的 open state、registry 不在本稿范围，只记录和结构有关的事实（modal 放在哪个组件里、shell 和 panel 怎么拆）。

## Owner 的决定（到目前为止）

| 日期 | 决定 | 落在哪 |
| --- | --- | --- |
| 2026-10-25 | Step 10 拆成两个 PR：先 component structure，再 config-driven modals | tracker |
| 2026-10-25 | Projects 页改用 page context：写入、导航和 `activePlanId` 从 `ProjectsPageContext` 取，数据仍走 props | 本 PR，已落地 |
| 2026-10-25 | **Projects 页就是标准结构**，其余页面都改成这样；先把改动和计划写进 spike、不动手；结构写进 AGENTS.md | AGENTS.md › Layers › *Page structure*（本 PR）；计划见下文 |
| 2026-10-25 | 想知道 spike 定了之后能不能用 subagent 并行改，只探索、不开工 | 「并行执行」一节 |
| 2026-10-26 | AGENTS.md 的 *Page structure* 只写核心，细节放 `baseline.md` | 本 PR |
| 2026-10-26 | 派生放在哪一层定成一条前提，放在标准结构最前面；route 是 adapter（取代「route 只传数据」） | 下文「前提」和规则 1 |
| 2026-10-26 | Q1–Q7 按建议，Q4 改成 route adapter；Q8：本 PR 只做 spike 和 Projects 定稿，Board、Priorities、Dump 另开一个 PR，config-driven modals 的范围待定；Q9 待定（对照实验怎么做还在讨论） | 「Decision」 |

# Part 1 · 计划

## 标准结构（以 Projects 页为准）

```text
KanbanProjectsPage (server)        fetchProjectsPageAction → <ProjectsPage {...projectsPage} />
└ ProjectsPage (client) ◆          rows（props）→ useOptimisticTasks；URL；openModal；所有写入
  └ <ProjectsPageContext value>    activePlanId + 写入 / 导航 / 打开 modal
    ├ renderHeader、空状态           页面自己的 chrome，写成 render 函数
    ├ ProjectList                  projects · stepsByProjectId · selectedProjectId   → openNewProject
    │ ├ ProjectCard                project · steps · isSelected       → activePlanId · showProject
    │ └ ArchivedProjectRow         project · steps                    → unarchiveProject
    ├ ProjectDetail                project · steps                    → activePlanId · showProjectList · openEditProject · openAddStep · moveStep · archiveProject
    │ └ ProjectStep                step                               → activePlanId · scheduleStep · takeStepBack · openEditStep
    ├ ProjectModal › ProjectFormPanel   overlay：callback 走 props
    └ StepModal › StepFormPanel
```

`→` 后面是组件从 context 取的东西。

### 前提：派生放在哪一层

派生（从 rows 算出来、只用来显示的数据）**放在拥有它全部输入、并且在最后一个会改动这些输入的东西下游的那一层；每次 render 算一次，不存进 state**。按输入分三档：

| 输入 | 放在哪 | 例子 |
| --- | --- | --- |
| 只有 server 数据，乐观更新和 client state 都碰不到 | route，调 `src/utils/` 的纯 adapter | 没有 plan 时 header 显示哪一周（Priorities、Dump）；plan 表单的初始选择（Plan） |
| 乐观 rows 或 client state（URL、打开的 modal、拖动），要扫整页、结果喂给多个组件 | container | Board 的 `toBoardCards`：habit 的一周 dots 要把同一 template 的所有实例排进格子，step 的 path 要把 board 上的乐观状态叠到整个 project 上；Projects 按 project 分组 steps、算出选中项 |
| 只用到组件自己收到的那组 rows | 组件自己 | `ProjectCard` 的 `summarizeProject(steps)`、`ProjectStep` 的 `getStepState(step)` |

为什么乐观 rows 决定了大部分派生的位置：`useOptimisticTasks` 只改 rows，界面上跟着变的东西（一行变成 THIS_WEEK、卡片上「2 this week」加一、兄弟卡片的 dots）都是 render 时从改过的 rows 重算出来的。放在 route 算，乐观更新之后这些数字要等 revalidate 才变；存进 state，就得在每次写入时手动去 patch（`baseline.md` 里 Rejected 的那条）。

### 规则

前提和规则 1 是 owner 2026-10-26 定的；2–4、6、7 来自 Projects；5 是推广到其他页面时补的（Q1、Q2）。

1. **Route 是 adapter**：调页面的 read action，需要时用 `src/utils/` 的纯 adapter 把 raw data 转成页面的 props（只做前提里第一档的派生），然后渲染 container；没有 screen 层。Service 只返回 raw inputs，不知道页面要怎么显示。
2. **一个 container**：`<Feature>Page`（client，`domain/<feature>/`），名字跟 route 和文件夹一致。它拥有页面的 client state——rows 的乐观层、URL state、打开的 modal、popover / sheet / toast 这类页面级 UI state——和所有写入，做前提里第二档的派生，并且自己渲染页面的 chrome（header、title bar、空状态）。
3. **一个 page context**：`<Feature>PageContext`（`<Feature>PageContext.ts`），由 container 提供。里面放写入、导航、打开 overlay 的函数，以及全页共用的值（`activePlanId`、哪个 popover 开着）。组件用 `use<Feature>PageContext()` 读，在 provider 外直接 throw。
4. **Feature component 只收数据**：rows（DAL 形状）或 container 算好的结果当 props；写入和全页共用的值从 context 取，不收 callback prop；前提里第三档的派生自己用纯函数算。
5. **只收 props 的组件**：presentational 组件（纯展示，在几处或几种 kind 之间复用：`TaskCard`、`TaskCardFace`、`PlanTaskRow`、`SizeChip`）、`domain/shared/` 和 `ui/` 不读任何 page context；container 自己渲染的 overlay（modal、sheet、toast）收 callback props，等 config-driven modals 定写法。
6. **不写只有插槽的 frame**：组件只有在自带行为（`Droppable`、开关 state）时才用 `children` 接内容。
7. **Design Console**：scenario 渲染 container 本身，context 由它提供；route 有 adapter 的页面，scenario 用同一个 adapter 把 raw fixture 转一遍。feature component 的 gallery specimen 包在一个 handler 全为空操作的 context 里（`inertProjectsPageContext`，放在 console 的 constants）；transient state 用 play step 点出来。

AGENTS.md › Layers › *Page structure* 只写核心（route → container → context、不传 callback）；前提和 7 条规则的完整版在 `baseline.md` › Architecture Decision › *Page structure*。

## 每页的改动计划

规模按 Projects 这次的量来比：S 和 Projects 差不多（一个 container、六七个文件、几处 console），M 是它的两倍左右，L 是一个 700 行的 container 加提交流程。

### Board（S）

现在：route → `BoardScreen`（server，header + dashboard + `KanbanBoard`）→ `KanbanBoard`（container）。PR #53 之后没有转手的 prop，唯一往下传的写入是给 `MobileBacklogCard` 的 `onPull`（一层）。

```text
KanbanPage (server)             fetchBoardAction → <BoardPage {...board} />；没有 plan 时 <EmptyBoard>（不变）
└ BoardPage (client) ◆          tasks · plan · progress · projects → useOptimisticTasks → toBoardCards
  └ <BoardPageContext value>    pullToTodo
    ├ BoardHeader               periodKey（domain/shared，props）
    ├ ProgressDashboard         progress（presentational，props）
    └ DragDropContext
      ├ BoardColumn ×2          status · count · isDragActive · children（带 Droppable 的 frame，保留）
      │ └ TaskCard              card · index（presentational，保留）
      ├ DesktopBacklog          count · children
      └ MobileBacklog › MobileBacklogPanel
        └ MobileBacklogCard     card                      → pullToTodo
```

- `KanbanBoard` 改名 `BoardPage`，吸收 `BoardScreen` 的两层布局（`flex-col h-full` 和 `flex-1 min-h-0`），删掉 `BoardScreen`；route 渲染 `<BoardPage {...board} />`。
- 新增 `board/BoardPageContext.ts`：`{pullToTodo}`。`MobileBacklogCard` 去掉 `onPull`，从 context 取。
- `toBoardCards` 和三个 frame 不动（前提、规则 6）；`isDragging` 继续当 `BoardColumn` 的 prop（frame 收 props）。
- Console：两个 `BoardScreen` tab 改渲染 `BoardPage`；`MobileBacklogSheetFrame` 和 gallery 的 `MobileBacklogCard` specimen 包 `inertBoardPageContext()`。
- 文档：`baseline.md` › Architecture Decision 里的 `BoardScreen` / `KanbanBoard` 跟着改名。tracker *Uniform page header* 里「去掉 `BoardHeader` / `ProgressDashboard` 多余的 `'use client'`」那半句随之失效：它们会渲染在 client container 里。
- 布局 wrapper 换了位置，按 AGENTS.md 算 layout 变动，要一次 `ui-verifier`（board 的 5 个 tab，桌面和手机）。

### Priorities（M）

现在：route 算 `periodKey` → `PrioritiesScreen`（三个 prop 原样转手）→ `PriorityMatrixPage`（376 行）→ `QuadrantCell`（9 个 prop，6 个转手）→ `MatrixTaskCard`（9）→ `MoveToPopover`（4，全部转手）→ `MoveToRows`（5）。`isTracked` 算了两处。

```text
PrioritiesPage route (server)   fetchPriorityMatrixAction → toPrioritiesPageProps(matrix, today) → <PrioritiesPage …/>
└ PrioritiesPage (client) ◆     useOptimisticTasks；popover / sheet / add modal / 两个 toast 的 state；四个写入
  └ <PrioritiesPageContext value>   activePlanId · openPopoverTaskId · togglePopover · openMoveToSheet
    │                               · openAddTask · trackTask · completeTask
    ├ BoardHeader、renderTitleBar、renderHintBar、两条轴
    ├ QuadrantCell ×4           quadrant · tasks          → openAddTask
    │ └ MatrixTaskCard          task · index              → activePlanId · openPopoverTaskId · togglePopover · openMoveToSheet
    │   └ MoveToPopover         task
    │     └ MoveToRows          task · variant            → activePlanId · trackTask · completeTask
    ├ MatrixUndoToast、Toast     overlay，props 不变
    ├ MobileMoveToSheet         task · onClose（overlay）
    │ └ MobileMoveToPanel       task
    │   └ MoveToRows …
    └ TaskModal                 domain/shared，props 不变
```

- `PriorityMatrixPage` 改名 `PrioritiesPage`，吸收 `PrioritiesScreen`（`BoardHeader`），删掉 `PrioritiesScreen`。
- Route 里现在 inline 的 `periodKey` 退回（`activePlan?.periodKey ?? 当前 ISO 周`）抽成 adapter `toPrioritiesPageProps(matrix, today)`，放在 `utils/oneOffUtils.ts`，route 调它，scenario 也用它（Q4）；加 unit test。`matrixService` 不变。
- `utils/oneOffUtils.ts` 加 `groupTasksByQuadrant(tasks)`、`isTrackedTask(task, activePlanId)`，替掉 container 里的 `useMemo` 分组和两处 `isTracked`，加 unit test。
- 新增 `priorities/PrioritiesPageContext.ts`。props：`QuadrantCell` 9 → 2，`MatrixTaskCard` 9 → 2，`MoveToPopover` 4 → 1，`MoveToRows` 5 → 2，`MobileMoveToSheet` 6 → 2，`MobileMoveToPanel` 5 → 1。
- 不变：popover 的 click-away 层留在 container（整张卡是 drag handle）；`MatrixUndoToast`、`Toast`、`TaskModal` 的 props。
- Console：7 个 `PrioritiesScreen` tab 改渲染 `PrioritiesPage`（fixture 加 `periodKey`）；`MobileMoveToPanelScenario` 和 gallery 的 `MatrixTaskCard` specimen 包 `inertPrioritiesPageContext(activePlanId)`，fixture 的 `isTracked` 改成 task 的 `planId` 等于 `activePlanId`；Done toast 的两个 tab 照旧组合。

### Dump（S）

现在：route 调两个 action、从 `{data}` 里解出 entries、算 `periodKey` → `DumpScreen`（client，screen 和 container 合在一起）。最深两层，没有转手。

```text
DumpPage route (server)         两个读 action → toDumpPageProps(feed, totalCount, today) → <DumpPage …/>
└ DumpPage (client) ◆           useDumpFeed
  └ <DumpPageContext value>     capture · captureError · loadMore
    ├ BoardHeader、DumpTitleBar
    ├ DumpComposer              （无 props）              → capture · captureError
    └ DumpFeed                  entries · hasMore · isAppending   → loadMore
      └ DumpEntryCard           entry
```

- `DumpScreen` 改名 `DumpPage`；新增 `dump/DumpPageContext.ts`。props：`DumpComposer` 2 → 0，`DumpFeed` 4 → 3。
- Route 里 `{data}` 解包和 `periodKey` 那段抽成 adapter `toDumpPageProps(feed, totalCount, today)`，放在 `utils/dump.ts`，route 调它，scenario 也用它（Q4）；加 unit test。不新增 action，也不新增 service。
- Console：两个 tab 改渲染 `DumpPage`；gallery 的 `DumpEntryCard` 不变。
- 这页的 context 只省掉两个 prop（Q3）。

### Plan（L，建议推迟：Q5）

现在：`plans/layout.tsx` → `PlanChrome`（header 加一个插槽）→ route 把 plan 行映射成 `initial*` props → `PlanForm`（707 行、11 个 `useState`、约 95 行的 `computeDiff`、提交流程和 `awaitPlanWrite` workaround）。`ReviewChangesModal` 收 13 个 prop。

完整的改法：

- 两个 plan route 里把 plan 行映射成 `initialPlanTemplates` 和 `initial*` id 的那段抽成 adapter `toPlanFormProps`（`utils/`），route 调它，再渲染 `PlanPage`。
- 删掉 `PlanChrome` 和 `plans/layout.tsx`，planning-mode header 由 `PlanPage` 渲染（`plans/loading.tsx` 保留）。
- `computeDiff` 挪到 `utils/planFormUtils.ts`，改名 `diffPlanForm`，加 unit test；`AdhocTaskItem` 挪到 `types/plan.ts`。
- `PlanPageContext`：`toggleTemplate`、`setTemplateConfig`、`openNewTemplate`、`openEditTemplate`、`toggleOneOff`、`toggleStep`。`TemplateItem` 6 → 3；`PlanTaskRow` 是两种 kind 共用的 presentational row，保留 props（规则 5）。
- `ReviewChangesModal` 收一个 `diff` 对象，13 → 6；它是 overlay，callback 仍走 props。
- Console：两个 plan tab 改渲染 `PlanPage`；gallery 的 `TemplateItem` specimen 现在能点选，要一个接到本地 state 的 context。
- 风险：提交流程（create / update / Review changes / redirect workaround），以及 `planService.int.test.ts` 里用 `it.fails` 钉住的 Edit Plan bug，都在这一块。

为什么建议推迟：tracker 的 Week model Phase 2 会用三步的 Plan week 替换 plan form，Review changes 也要重做，「Plan 页按 Board 的数据拆分」已经排在 Plan week 一起做。现在改，代码几个月后就删掉；Plan week 直接按标准结构建。推迟期间 Plan 是唯一的例外，AGENTS.md 指向 tracker。

### 不在范围内（Q6）

- **Auth（Login、Consent）**：app shell 外的独立页面；`LoginScreen` 1 个 prop、`ConsentScreen` 2 个，auth 流程本来就在 route 里；没有 drilling。
- **Settings · App shell**：application 层，不是页面；`AppShell` 把路由和 store state 当 props 传给 sidebar 和 dock，gallery 用 fixture 渲染它们。

## 执行和验证

- **顺序**：三页互相独立（各自的 `domain/<feature>/`、route 和 scenario），没有先后依赖。串行时建议 Board → Dump → Priorities，由小到大。
- **共享的文件**，也就是并行时的冲突面：`src/app/design/constants.ts`（inert context 和 fixture）、`src/app/design/tabs/DomainTab.tsx`（specimen）、`design/baseline.md`、tracker、README Update Log、AGENTS.md 里「还没改的页面」那一句。`utils/oneOffUtils.ts` 只有 Priorities 动。
- **每页的验证**：
  1. `format`、`lint`、`typecheck`、`knip`、`npm test`；
  2. `npm run test:e2e`：每个 Design Console tab 的 smoke 和四条 journey；
  3. 像 Projects 那样在真实页面上把 context 里的 handler 逐个点一遍：Board 拖到 Done、手机 pull；Priorities 拖象限、popover 的 track 和 Done、undo、手机 sheet、add（桌面象限和手机 picker）；Dump capture、load more；
  4. Board 搬了布局 wrapper，要一次 `ui-verifier`。
- **PR**（Q8，owner）：本 PR 只做 spike 和 Projects 定稿；Board、Priorities、Dump 在下一个 PR 里，一页一个 commit；config-driven modals 的范围待定，可能不止一个 PR。

## 并行执行（subagent）——探索，没开工

问题：spike 定下之后，能不能让几个 subagent 同时各改一页？

### 能用的工具

- `Agent` tool 可以同时在后台开多个 subagent；`isolation: "worktree"` 给每个一个独立的 git worktree（同一个 repo，各自的工作目录和分支）。
- 改代码用 general-purpose agent。`.claude/agents/` 的三个都不合适：`ui-verifier` 不改 repo，`test-writer` 只改 test，`ci-fixer` 只修红 CI。

### 在这个容器里实测（2026-10-25）

| 项 | 结果 |
| --- | --- |
| 容器 | 4 CPU、15 GB 内存 |
| 新 worktree 的准备 | `node_modules` 用硬链接复制（`cp -al`，1.1 GB，不占新空间），再复制 `.env.local` 和生成的 Prisma client：**约 1 秒**，不用 `npm install` |
| 在 worktree 里跑检查 | `typecheck` 19 s、`lint` 17 s、`test:unit` 6 s（238 条）、`knip` 5 s，全部通过 |
| 两个 `npm test` 同时跑（主目录和 worktree，相差 3 秒开始） | 这一次两边都过了（各约 20–23 s），**但设计上不安全**：integration 的 `globalSetup` 每次开跑都对共用的 `mars_test` 做 `TRUNCATE … CASCADE`，库名写死，没法按 worktree 分开；后开的那次可能清掉先开那次测试中途写的行 |
| e2e | 只能串行：共用 3000 端口上的 dev server，`e2e:session` 每次重置同一个 e2e 用户 |

### 限制和对策

1. **测试库**：subagent 只跑 `format`、`lint`、`typecheck`、`knip`、`test:unit`；`npm test`（含 integration）、e2e 和点击检查由主 session 在合并之后串行跑。新的 adapter 都是纯函数，unit test 在 subagent 里就能跑。（让 `globalSetup` 的库名可配置就能去掉这条限制，不在本 PR 范围。）
2. **共享文件**：subagent 不碰文档（tracker、README、baseline、reference、AGENTS.md），由主 session 合并后统一写；console 的 constants 和 DomainTab 会有小冲突（各改各的段落），主 session 合并时解决。
3. **隐含决定互相冲突**：subagent pilot 引用过 Cognition 的结论：并行写代码的 agent 会各自做出互相冲突的隐含决定。这里靠三样东西压住：AGENTS.md 的 *Page structure*、Projects 这个现成的参考实现、本 spike 里每页细到文件和 props 的计划。剩下的（命名、helper 放哪）由主 session 合并时统一。
4. **成本**：subagent pilot 量过单次委派：处理过的 token 是自己做的 1.0–1.3 倍（注册过的 agent）到 2.5–3.4 倍（general-purpose 加长 brief），wall time 是 1.35–2.0 倍；并行的收益三轮都没测到（pilot 把它列为 subagent 的第三个价值）。这次三页是 S、M、S，主 session 的合并和串行验证（`npm test` 约 25 s、e2e 约 2 分钟、三页的点击检查、一次 `ui-verifier`）是固定成本。所以 wall time 从「三页之和」变成「最慢一页 × 1.35–2.0，加合并和验证」，token 估计多 1.5–3 倍。

### 如果并行，流程是

1. Spike 拍板（含 Q9），本 PR 合并。
2. 主 session 同时开三个 general-purpose subagent（Board、Priorities、Dump），各自 `isolation: "worktree"`。Brief：本 spike 对应的一节、AGENTS.md › *Page structure*、Projects 的四个文件作参考；第一步用硬链接准备 `node_modules`；只改代码和 console；跑 `format`、`lint`、`typecheck`、`knip`、`test:unit`；在自己的分支上 commit；报告里列出改了哪些共享文件。
3. 主 session 把三个分支合进那个 PR 的分支，解决 console 的冲突，跑 `npm test`、e2e、三页的点击检查和 Board 的 `ui-verifier`，写文档，push 一次。
4. 像 pilot 那样记下 wall time、处理过的 token 和合并冲突，补进本 spike，作为并行的第一次实测。

结论：**能并行**，限制都有对策。值不值得看 owner 更在乎什么：wall time 能省下大约一到两页的时间，代价是更多 token，以及一次合并（Q9）。

## Decision

| | 问题 | 定了什么 |
| --- | --- | --- |
| Q1 | 推广到其他页面时补的规则 | **按建议**：presentational、`domain/shared/`、`ui/` 和 container 自己渲染的 overlay 只收 props（规则 5）；扫整页 rows 的派生由 container 算一次，并入「前提」 |
| Q2 | Overlay 的 callback 留在 props | **按建议**：留到 config-driven modals |
| Q3 | 薄页面也要 page context 吗 | **按建议**：一律要，一页一个写法 |
| Q4 | Route 做什么 | **Owner**：route 是 adapter（规则 1）。Priorities、Dump、Plan 现在 route 里 inline 的整形抽成 `src/utils/` 的纯 adapter，由 route 调用；service 不变，不新增 Dump 的 action 和 service |
| Q5 | Plan | **按建议**：推迟到 Phase 2 的 Plan week |
| Q6 | Auth、Settings、App shell | **按建议**：不改 |
| Q7 | 改名 | **按建议**：`BoardPage`、`PrioritiesPage`、`DumpPage` |
| Q8 | 打包 | **Owner**：本 PR 只做 spike 和 Projects 定稿；Board、Priorities、Dump 另开一个 PR；config-driven modals 的范围待定 |
| Q9 | 串行还是并行 | **待定**：owner 想把串行和并行做成对照实验（同样的起点、同样的 context，比较时间、token 和完成质量），实验怎么做还在讨论 |

---

# Part 2 · 现状调查（写计划之前的 draft）

下面是 owner 定下标准结构之前的调查原文，Projects 一节末尾有 page context 的更新。

## 现在管组件结构的规则

| 规则 | 在哪 | 说了什么 | 和别的规则的关系 |
| --- | --- | --- | --- |
| *Screen components*（pending） | AGENTS.md › UI Workflow | 每个页面的 presentational layout 是 `domain/<feature>/` 里的一个 screen 组件，route 和 scenario 渲染同一个；Projects 例外 | 和 *Production first* 方向相反：screen 层存在的理由之一是 scenario 要渲染它 |
| *Production first, the console adapts* | AGENTS.md › UI Workflow | 不为 console 加 prop、分支或注释，也不为 console 拆组件、改结构 | Design Console README 的「modal 通过拆出来的 `*Panel` 内联渲染」是一处为 console 的拆分 |
| *Server shapes inputs, the client derives the view* | AGENTS.md › Layers、`baseline.md` | service 返回 inputs；`src/utils/` 的纯 adapter 推导 UI 形状；container 吃 rows、叠乐观写入。**Pending：frames 怎么接内容** | Board 的 frames 通过 `children` 接卡片；Projects 试点的原则 4 是「不写只接收 `ReactNode` 插槽的 frame」 |
| *Component placement* | AGENTS.md › Layers | `ui/` · `application/` · `domain/` 按 import 决定 | 本稿不改这一条 |
| *Keep the return statement an outline* | AGENTS.md › JSX & components | 条件或复杂 JSX 写成 render 函数，可复用的拆成子组件 | container 里的 render 函数越来越多（见下文） |
| 一个文件一个组件、kebab-case 分组文件夹 | AGENTS.md › General（ESLint） | — | — |
| Modals render inline | `src/app/design/README.md` | scenario 通过 `*Panel` / `*Content` 内联渲染 modal（`<dialog>` 会跳出 frame） | 7 对 shell / panel 的来由之一 |
| 试点的六条原则 | `archived/projects-page-refactor.md` › 问题 3 | presentational 只给纯展示、跨功能复用的组件；feature component 吃 domain 数据、自己算显示状态；专用 banner 不单做组件；不写 slot-only frame；console 跟 production 走；范围只限 Projects | 只在 Projects 生效 |

## 本稿怎么用这几个词

代码里同一个词指的东西不一样（见「横向看 · 1」），为了读得下去，本稿这样用：

- **route**：`src/app/**/page.tsx` / `layout.tsx`，server component，调 read action。
- **container**：页面里最上层、拥有交互 state 和写入的 client 组件。
- **screen**：代码里名字带 `Screen` / `Chrome` 的组件，含义因页而异。
- **frame**：只给内容提供布局或外壳、内容由上层通过 `children` 传入的组件。
- **feature component**：只在一个 feature 里用、自己带逻辑的组件。
- **shell / panel**：overlay 的外壳（`OverlayShell` 的那一层）和里面真正的内容。

---

## 总览

| Feature | Route 渲染什么 | Screen 层 | Container | Container 行数 | Container 里的 client state | 最深的一条链 | 组件文件 / 行数 | Scenario tabs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Board | `BoardScreen`，无 plan 时 `EmptyBoard` | `BoardScreen`（server） | `KanbanBoard` | 126 | `useOptimisticTasks`、`isDragging` | `KanbanBoard` → `BoardColumn` → `TaskCard` → `TaskCardFace` → `TaskCardHead` | 16 / 1,274 | 5 |
| Priorities | `PrioritiesScreen` | `PrioritiesScreen`（server） | `PriorityMatrixPage` | 376 | `useOptimisticTasks` + 5 个 `useState` | `PriorityMatrixPage` → `QuadrantCell` → `MatrixTaskCard` → `MoveToPopover` → `MoveToRows` | 9 / 1,032 | 12 |
| Projects | `ProjectsPage` | 无（试点） | `ProjectsPage` | 339 | `useOptimisticTasks`、`openModal`、`useWaitForFreshData`、URL `?project=` | `ProjectsPage` → `ProjectDetail` → `ProjectStep` | 10 / 1,459 | 11 |
| Plan | `PlanForm`，外面是 `PlanChrome` layout | `PlanChrome`（server，async，只有 `children`） | `PlanForm` | 707 | 11 个 `useState` | `PlanForm` → `ReviewChangesModal` → `ReviewChangesPanel` → `ChangeSection` → `ChangeRow` | 8 / 1,493 | 5 |
| Dump | `DumpScreen` | `DumpScreen`（client，同时是 container） | `DumpScreen` + `useDumpFeed` | 66（hook 110） | `useDumpFeed` | `DumpScreen` → `DumpFeed` → `DumpEntryCard` | 5 / 358 | 2 |
| Auth · Settings | `LoginScreen`、`ConsentScreen`；`SettingsSheet` 挂在 `AppShell` | `LoginScreen` / `ConsentScreen` 是整页 presentational | login `page.tsx`（client）、consent `page.tsx`（server）；`SettingsSheet` | — | `SettingsSheet`：`theme` + `settingsStore` | `AppShell` → `SettingsSheet` → `SettingsPanel` → `ThemePicker` | 9 / 657 | 6 |

另有 `domain/shared/`（6 个文件，467 行）：`BoardHeader`、`SizeChip`、`taskKindStyle`、`task-modal/`（`TaskModal`、`TaskModalPanel`、`SizePicker`、`QuadrantPicker`）。

---

## 逐个 feature

每节：组件树（右边是该组件收到的 props）、数据和 state 在哪、prop drilling、已知问题、Design Console 怎么渲染它。

### Board

```text
KanbanPage (server)               fetchBoardAction → {plan, progress, tasks, projects} | null
├ EmptyBoard (client)             没有 plan 时；stats?
└ BoardScreen (server)            ← spread 整个 board
  ├ BoardHeader (client)          periodKey
  ├ ProgressDashboard (client)    progress 的 9 个字段 spread
  └ KanbanBoard (client) ◆        tasks · plan · projects → useOptimisticTasks → toBoardCards
    └ DragDropContext
      ├ BoardColumn ×2 (frame)    status · count · isDragActive · children      ← Droppable 在这里
      │ └ TaskCard                card · index                                  ← Draggable 在这里
      │   ├ TaskCardMiniFace      card
      │   └ TaskCardFace          card · action? · className
      ├ DesktopBacklog (frame)    count · children                              自己管 isOpen
      │ └ TaskCard …
      └ MobileBacklog (frame)     count · children                              自己管 isOpen
        └ OverlayShell › MobileBacklogPanel   count · onClose · children
          └ MobileBacklogCard     card · onPull
            └ TaskCardFace …
```

- **数据**：`fetchBoard` 返回 inputs，`KanbanBoard` 在乐观副本上用 `toBoardCards` 一次算出所有卡片的 view model（`BoardCard`）。叶子只收一个 `card`。这是 PR #53（Option C3）的结果，也是 `baseline.md` 里写的「Board 的做法」。
- **prop drilling**：没有转手的 prop。frames 通过 `children` 接卡片，对 kind、habit、project 一无所知。`onPull` 由 container 的 render 函数直接交给 `MobileBacklogCard`。
- **frames 不是纯插槽**：`BoardColumn` 带 `Droppable` 和 header，`DesktopBacklog`、`MobileBacklog` 各自管开关 state。Droppable 在 frame 里，Draggable 在卡片里，二者靠 `TaskStatus` 作为 droppable id 对上。
- **已知问题**（都已在 tracker 的 *Uniform page header* 里）：`BoardHeader`、`ProgressDashboard` 没有 state 却是 `'use client'`；`BoardHeader` 多一层 wrapper；`kanban/loading.tsx` 的 skeleton 和真实页面对不上。
- **`BoardScreen`**：server 组件，把 header、dashboard、board 拼成一列；注释写明它存在是为了让 `/kanban` 和 board scenario 渲染同一个东西。
- **Design Console**：5 个 tab。两个 `EmptyBoard`、两个 `BoardScreen`（fixture），一个 `MobileBacklogSheetFrame`（scenario 侧把 `MobileBacklogPanel` + `MobileBacklogCard` 拼进手机宽度的外框，因为真的 sheet 是 top-layer `<dialog>`）。gallery 有 `TaskCard`、`TaskCardMiniFace`、`MobileBacklogCard`、`BoardColumn`、`ProgressDashboard`、`StepPath` 的 specimen。

### Priorities

```text
PrioritiesPage (server)           fetchPriorityMatrixAction；periodKey 没有 plan 时退回当前 ISO 周
└ PrioritiesScreen (server)       periodKey · tasks · activePlan          ← 三个都只转手
  ├ BoardHeader (client)          periodKey
  └ PriorityMatrixPage (client) ◆ tasks · activePlan
    ├ renderTitleBar / renderHintBar / renderAxisY / renderAxisX
    ├ QuadrantCell ×4             quadrant · tasks · activePlanId · openPopoverTaskId
    │                             · onSendToggle · onTrack · onComplete · onCardTap · onAdd
    │ └ MatrixTaskCard            task · index · isTracked · hasActivePlan · isPopoverOpen
    │                             · onSendToggle · onTrack · onComplete · onTap
    │   └ MoveToPopover           isTracked · hasActivePlan · onTrack · onComplete   ← task.id 在卡片里绑上
    │     └ MoveToRows            variant · isTracked · hasActivePlan · onTrack · onComplete
    ├ click-away 层（fixed div）   在 container，因为整张卡是 drag handle
    ├ MatrixUndoToast / Toast
    ├ MobileMoveToSheet           task · isTracked · hasActivePlan · onClose · onTrack · onComplete
    │ └ OverlayShell › MobileMoveToPanel   task · isTracked · hasActivePlan · onTrack · onComplete
    │   └ MoveToRows …
    └ TaskModal (mode adhoc)      isOpen · freshData · onClose · onSaved · mode · quadrant
```

- **数据**：route 传 `tasks` 和 `activePlan`；按象限分组在 container 里用 `useMemo` 就地做（没有 `src/utils/` 的 adapter）。卡片吃 `TaskItem` 加几个由上层算好的布尔值。
- **container 里的东西**：乐观 tasks，5 个 UI state（打开 popover 的 task、mobile sheet 的 task、add modal、"added" toast 的象限、undo toast），4 个写入（拖象限、track、complete、undo），4 个 chrome render 函数（title bar、hint bar、两条轴）和两个 toast 的 render 函数，以及 sheet 和 modal。共 376 行。
- **prop drilling**：
  - `QuadrantCell` 收 9 个 prop，自己用的是 `quadrant`、`tasks`、`onAdd`；其余 6 个转给卡片，其中两个换了形状（`activePlanId` → `isTracked` / `hasActivePlan`，`openPopoverTaskId` → `isPopoverOpen`）。
  - `onTrack` / `onComplete` 在桌面端经过 4 个组件（container → cell → card → popover → rows），手机端 3 个（container → sheet → panel → rows）。`MoveToPopover` 的 4 个 prop 全部转给 `MoveToRows`。
  - `isTracked`（`planId === activePlanId`）算了两处：container 的 `isTrackedTask`（计数、sheet）和 `QuadrantCell` 里内联。
- **`PrioritiesScreen`**：server 组件，header + matrix；三个 prop 原样转手。注释写明是为了 route 和 scenario 渲染同一个。
- **Design Console**：12 个 tab。7 个渲染 `PrioritiesScreen`（fixture）：popover 的 3 个 tab 靠 play step 点开；Done toast 的 2 个 tab 在 post-completion fixture 上再叠一个 scenario 侧的 `DoneToastScenario`（toast 只在一次写入之后出现，scenario 不能写）。mobile sheet 的 3 个 tab 渲染 `MobileMoveToPanelScenario`，add 的 2 个 tab 渲染 `TaskModalScenario`。gallery 有 `MatrixTaskCard`。

### Projects

下面的树和 prop drilling 是本稿写成时的样子；同一个 PR 里随后改成了 page context，见本节末尾的「更新」。

```text
KanbanProjectsPage (server)       fetchProjectsPageAction → {projects, steps, activePlanId}
└ ProjectsPage (client) ◆         ← spread；route 和 scenario 都渲染它
  ├ renderHeader                  自己写的 header（不是 BoardHeader）
  ├ ProjectList                   projects · stepsByProjectId · activePlanId · selectedProjectId
  │                               · onSelect · onUnarchive · onNewProject
  │ ├ ProjectCard                 project · steps · activePlanId · isSelected · onSelect
  │ └ ArchivedProjectRow          project · steps · onUnarchive              自己管 isPending
  ├ ProjectDetail                 project · steps · activePlanId · onBack · onEdit · onAddStep
  │                               · onEditStep · onSchedule · onTakeBack · onMove · onArchive
  │ └ DragDropContext › Droppable
  │   └ ProjectStep               step · activePlanId · onEdit? · onSchedule? · onTakeBack?   ← step.id 在 detail 里绑上
  ├ ProjectModal › ProjectFormPanel   isOpen · mode · project · freshData · onClose · onSaved · onArchived
  └ StepModal › StepFormPanel         target · freshData · onClose · onSaved
```

- **数据**：route 把 action 的结果整个 spread 给 `ProjectsPage`。feature component 直接吃 domain 行（`ProjectItem`、`TaskItem`）和 `activePlanId`，各自用 `utils/projectUtils.ts` 的纯函数算显示状态（`getStepState`、`summarizeProject`、`countDoneSteps`、`isAllStepsDone`）。没有 view model 树。
- **container 里的东西**：乐观 steps（+ This week、×、拖动排序），`openModal`（4 种 kind 的 union），选中项在 URL（`?project=`，`pushState` / `replaceState`），archive / unarchive 直接用 `useWaitForFreshData` 等新数据，两个 modal，空状态和 header 的 render 函数。共 339 行。
- **prop drilling**：
  - `ProjectDetail` 收 11 个 prop（3 个数据 + 8 个 callback）。其中 `onEditStep`、`onSchedule`、`onTakeBack` 只是绑上 `step.id` 转给 `ProjectStep`；其余它自己用。
  - `activePlanId` 到了 5 个组件（`ProjectsPage`、`ProjectList`、`ProjectCard`、`ProjectDetail`、`ProjectStep`），每处都拿它和 domain 行一起算。
  - `DragDropContext` 在 `ProjectDetail` 里（不在 container）；`onMove` 由 detail 的 `handleDragEnd` 调。
- **和其他页面的差异**：没有 screen 层；header 是页面自己写的；派生在叶子（Board 是在 container 一次算好）。
- **Design Console**：11 个 tab。5 个渲染 `ProjectsPage`（fixture 的顺序决定选中哪个 project），3 个 `StepFormScenario`，3 个 `ProjectFormScenario`。mobile 的 detail 由 URL 决定，pin 不了，所以没有这个 tab。gallery 有 `ProjectStep`。
- **更新（2026-10-25，owner 的决定，同一个 PR）**：写入、导航和 `activePlanId` 改由 `ProjectsPage` 提供的 `ProjectsPageContext` 下发，组件用 `useProjectsPageContext()` 取；数据仍走 props。现在 `ProjectList` 收 `projects · stepsByProjectId · selectedProjectId`，`ProjectCard` 收 `project · steps · isSelected`，`ArchivedProjectRow` 收 `project · steps`，`ProjectDetail` 收 `project · steps`，`ProjectStep` 只收 `step`。handler、乐观层和 modal 的 open state 都还在 `ProjectsPage`，行为不变。gallery 的 `ProjectStep` specimen 包在一个 handler 全为空操作的 context 里；scenario 渲染 `ProjectsPage`，context 由它自己提供。

### Plan

```text
PlansLayout (server)
└ PlanChrome (server, async)      children                  ← 只有 header + 滚动 body + 插槽
  └ NewPlanPage / EditPlanPage (server)   fetch*PlanFormAction → 把 plan 行映射成 initial* props
    └ PlanForm (client) ◆         templates · mode · planId? · initialPlanTemplates · initialDescription
                                  · initialPlanMode · adhocTasks · initialAdhocTaskIds · projectSteps
                                  · initialProjectStepIds · periodKey?
      ├ description、plan mode（FieldRow、ChoicePills）
      ├ TemplateItem ×n           template · isSelected · config · onToggle · onConfigChange · onEdit
      ├ PlanTaskRow ×n            kind · title · context · size · points · status · isSelected · returnsTo · onToggle
      ├ TaskModal › TaskModalPanel          isOpen · freshData · onClose · template
      └ ReviewChangesModal › ReviewChangesPanel   isOpen + 13 个（diff 的 9 个字段各一个，加 counts、提交状态、两个 callback）
        └ ChangeSection › ChangeRow
```

- **数据**：Plan 页还没按 *Server shapes inputs* 拆（`baseline.md` 和 tracker 都记着）。route 把 plan 行映射成 `initial*` props；`PlanForm` 持有选择 state；diff（`computeDiff`，约 95 行）和提交流程（create / update、`countIncompleteByTemplateAction`、Review changes）都在组件里；`AdhocTaskItem` 类型也声明在 `PlanForm.tsx`。
- **container 里的东西**：11 个 `useState`（选中的 templates 和配置、description、plan mode、提交中、错误、template modal 开关和正在编辑的 template、review modal 开关、incomplete counts、选中的 one-off、选中的 step）。提交不走 `useModalSubmit`，自己管 `isSubmitting` / `error`，还有一处 `awaitPlanWrite` workaround。共 707 行。
- **prop drilling**：树只有两三层，但宽：`ReviewChangesModal` 收 13 个 prop（diff 拆成 9 个字段，加 `incompleteCounts`、`isSubmitting`、`onClose`、`onConfirm`），再原样 spread 给 `ReviewChangesPanel`。
- **`PlanChrome`**：只接 `children` 的 layout frame（planning-mode header + 滚动 body），layout 和 scenario 共用。
- **已知问题**（tracker）：Edit Plan 保存时发送整份 template 列表，表单打开期间 Claude 改过的 habit 会被覆盖；Review changes modal 在长列表下 header 被顶出屏幕。
- **Phase 2**：plan form 会被三步的 Plan week 替换，Review changes 也要重做（tracker 的 Week model Phase 2）。
- **Design Console**：5 个 tab。两个 `PlanChrome` + `PlanForm`（new / edit），一个 `ReviewChangesScenario`，两个 `TaskModalScenario`。gallery 有 `TemplateItem`、`PlanTaskRow`。

### Dump

```text
DumpPage (server)                 fetchDumpEntriesAction + countDumpEntriesAction；从 action 结果里解出 data
└ DumpScreen (client) ◆           periodKey · initialEntries · initialNextCursor · initialTotalCount
  ├ BoardHeader                   periodKey
  ├ DumpTitleBar                  totalCount
  ├ DumpComposer                  captureError · onCapture
  └ DumpFeed                      entries · hasMore · isAppending · onLoadMore
    └ DumpEntryCard               entry
```

- **数据**：`useDumpFeed` 用 `initial*` props 起步，把 entries 当 client state 管（capture 往前插，load more 往后接）。这和其他页面「server props + 乐观层」不同，因为 feed 是分页的。
- **结构**：`DumpScreen` 同时是 screen 和 container，所以共用的 `BoardHeader` 在这里渲染在 client 树里（Board、Priorities 的 screen 是 server 组件）。
- **prop drilling**：没有；最深两层。
- **Design Console**：2 个 tab，都渲染 `DumpScreen`（fixture）。gallery 有 `DumpEntryCard`。

### Auth · Settings · App shell

```text
RootLayout (server)               getAppShellAction → {user, activePlanId}；theme cookie
└ BreakpointProvider › AppShell (client)   user · activePlanId · theme · children
  │                               读 usePathname、sidebarStore、settingsStore
  ├ AppSidebar                    user · activePlanId · pathname · collapsed
  ├ main › {children}
  ├ BottomTabBar                  user · activePlanId · pathname · settingsOpen · className
  └ SettingsSheet                 user · initialTheme       open state 在 settingsStore；theme 在自己的 useState
    └ OverlayShell › SettingsPanel   user · theme · onThemeChange · onSignOut · onClose
      └ ThemePicker

LoginPage (client)                auth gate + signInWithOAuth
└ LoginScreen                     onGoogleSignIn
ConsentPage (server)              读 OAuth request，绑好 server actions
└ ConsentScreen (client)          request · onDecision
```

- **`AppShell`**：读路由和两个 store，再把 `pathname`、`collapsed`、`settingsOpen` 当 prop 传给 sidebar 和 dock。注释写明这样做是为了 gallery 能用 fixture 渲染它们。`user` 从 root layout 传到三个子组件，`activePlanId` 传到 sidebar 和 dock。
- **Settings 的 open state 放在 Zustand**：两个入口（dock 的 Settings tab、sidebar 的 user 行）分属两个断点，`AppShell` 以下没有共同的父组件（store 的注释）。
- **`LoginScreen` / `ConsentScreen`**：整页的 presentational 组件，route 管 auth 和 OAuth；两处注释都写着保持 presentational 是为了 scenario 能用 fixture 渲染。
- **Design Console**：auth scenario 6 个 tab（Login、Consent ×2、Consent invalid、Settings ×2）；gallery 的 application tab 渲染 `AppSidebar`、`BottomTabBar`，domain tab 有 `ThemePicker`。

---

## 横向看 · 跨 feature 的现状

### 1. "Screen" 指了五种东西

| 组件 | 是什么 | server / client | 有没有 state |
| --- | --- | --- | --- |
| `BoardScreen`、`PrioritiesScreen` | header + container 拼成一列的 server 组件 | server | 无 |
| `PlanChrome` | 只接 `children` 的 layout frame，挂在 `plans/layout.tsx` | server（async） | 无 |
| `DumpScreen` | screen 和 container 合一 | client | 有（`useDumpFeed`） |
| `LoginScreen`、`ConsentScreen` | 整页的 presentational 组件，handler 由 route 传入 | client | `ConsentScreen` 有 pending |
| Projects | 没有 screen；`ProjectsPage` 就是 container | client | 有 |

### 2. 每个页面都有一个 container，里面装的东西不一样

| Container | 行数 | 写入 | UI state | chrome 写在哪 | 派生在哪 |
| --- | --- | --- | --- | --- | --- |
| `KanbanBoard` | 126 | 2（拖动、pull） | `isDragging` | 外面（`BoardScreen`） | container 一次（`toBoardCards`） |
| `PriorityMatrixPage` | 376 | 4 + add modal | 5 个 | 里面（title bar、hint bar、轴） | container 分组 + cell 里算布尔值 |
| `ProjectsPage` | 339 | 5 + 两个 modal | `openModal`、URL | 里面（header、空状态） | 叶子（纯函数 + `activePlanId`） |
| `PlanForm` | 707 | 2（create / update）+ template modal | 11 个 | 外面（`PlanChrome`） | 组件里（`computeDiff`、内联 map） |
| `DumpScreen` | 66 | 1（capture） | hook 里 | 里面（`BoardHeader`、title bar） | hook |

### 3. Prop drilling

| Feature | 只转手的 prop | 最长的 callback 链 | 在中途绑 id 的地方 |
| --- | --- | --- | --- |
| Board | 0（frames 吃 `children`） | 1 层（container 的 render 函数直接给卡片） | — |
| Priorities | `PrioritiesScreen` 3 个；`QuadrantCell` 6 个（2 个换形状）；`MoveToPopover` 4 个；`MobileMoveToSheet` 3 个（另 2 个绑上 id 再转） | `onTrack` / `onComplete`：桌面 4 层，手机 3 层 | `MatrixTaskCard`、`MobileMoveToSheet` 绑 `task.id` |
| Projects（改用 page context 之前） | `ProjectDetail` 3 个 callback；`ProjectList` 转 `activePlanId`、`onSelect`、`onUnarchive` | 2 层 | `ProjectDetail` 绑 `step.id`；`ProjectList` 绑 `project.id` |
| Projects（之后） | 0 | 0（组件从 context 取） | 各组件自己用 `project.id` / `step.id` 调 |
| Plan | `ReviewChangesModal` 13 个全部转给 panel | 2 层 | `PlanForm` 给 `TemplateItem` 绑 `template.id` |
| Dump | 0 | 1 层 | — |
| App shell | `user` 到三个子组件，`activePlanId` 到两个 | 2 层（`SettingsSheet` → `SettingsPanel` → `ThemePicker`） | — |

当前 plan 这一个值：在 Priorities，`activePlan` / `activePlanId` 经过 3 个组件，再换成 `isTracked` / `hasActivePlan` 两个布尔值往下传 5 个组件；在 Projects，`activePlanId` 原来进了 5 个组件（现在从 context 取）；在 app shell 进了 3 个。Board 不传它：卡片的 model 里已经算好了。

### 4. Frames

| Frame | 接什么 | 自己有什么 |
| --- | --- | --- |
| `BoardColumn` | `children`（卡片） | `Droppable`、header、拖动时的描边 |
| `DesktopBacklog` | `children` | 开关 state、`Droppable` |
| `MobileBacklog` | `children` | 开关 state、pill、sheet |
| `MobileBacklogPanel` | `children` | header、hint |
| `PlanChrome` | `children`（整个页面） | header、滚动 body |
| `OverlayShell`（`ui/`） | `children`（panel） | `<dialog>`、backdrop、关闭 |

Projects 试点删掉的是 6 个插槽的 `ProjectDetail` frame 那一类（读 container 只看到接线，读 frame 看不到内容）。Board 的 frames 每个都带自己的行为或 state。

### 5. 七对 shell / panel

| Shell | Panel | 用在哪 | panel 注释写的理由 |
| --- | --- | --- | --- |
| `TaskModal` | `TaskModalPanel` | Plan（template 新建 / 编辑）、Priorities（one-off） | 每次打开 mount 一个新表单；scenario 内联 |
| `ProjectModal` | `ProjectFormPanel` | Projects | 同上 |
| `StepModal` | `StepFormPanel` | Projects | 同上 |
| `ReviewChangesModal` | `ReviewChangesPanel` | Plan | scenario 内联 |
| `SettingsSheet` | `SettingsPanel` | App shell | scenario 内联（shell-free） |
| `MobileBacklog` | `MobileBacklogPanel` | Board | live sheet 和 scenario 渲染同一个 panel |
| `MobileMoveToSheet` | `MobileMoveToPanel` | Priorities | scenario 内联 |

`TaskModalPanel` 一个组件三种 mode（New / Edit template、Add one-off），调两个 actions 文件的 action。Projects spike 的 Q2 决定过「保持 shell 和表单分开」（理由：每次打开要一个新表单，本来就需要内层组件）。

### 6. Production 代码里以 console 为理由的结构

`scenario-states-without-production-props.md` 去掉了只给 console 用的 prop。剩下的不是 prop，是**拆分**：下面这些组件的注释把「scenario / gallery 要渲染它」写成了存在或拆开的理由（之一）。

- screen 层：`BoardScreen`、`PrioritiesScreen`、`PlanChrome`
- panel：`MobileBacklogPanel`、`MobileMoveToPanel`、`TaskModalPanel`、`ProjectFormPanel`、`StepFormPanel`、`ReviewChangesPanel`、`SettingsPanel`
- 整页 presentational：`LoginScreen`、`ConsentScreen`
- `AppShell` 把 `pathname` 和 store state 当 prop 传给 sidebar 和 dock

### 7. 页面 header 有三种

`BoardHeader`（Board、Priorities、Dump，`domain/shared/`）；Projects 自己写的 header；Plan 的 `PlanChrome` planning-mode header。tracker 的 *Uniform page header* 管视觉统一；它放在哪一层，和 screen 层的去留有关。

### 8. Overlay 和页面级 UI state 放在哪

| State | 放在哪 |
| --- | --- |
| 表单 modal 开关 | 各 container 的 `useState`（`ProjectsPage.openModal`、`PriorityMatrixPage.addModal`、`PlanForm.isModalOpen`） |
| Settings 开关 | `settingsStore`（Zustand） |
| Sidebar 折叠 | `sidebarStore`（Zustand） |
| 选中的 project | URL `?project=` |
| Backlog 开关 | `DesktopBacklog` / `MobileBacklog` 自己的 `useState` |
| Popover、mobile sheet、toast | `PriorityMatrixPage` 的 `useState` |

---

## Phase 2 会用到这些规则的地方

来自 tracker 的 Week model Phase 2（还没开始规划）：Plan › Habits 页；三步的 Plan week 替换 plan form；This week · Habits · Projects 共用一个 Plan hub header；Done 变成按天分组的 log，卡片加 ✓；Review changes 重做；Plan 页按 Board 的数据拆分；UI component tests 推迟到 Phase 2 的页面稳定之后。mockup：`design/mockup/mockup-week-model-phase2.html`。

## 调查时列的十个问题，现在的答案

1. Screen 层：不要。route 调 adapter（需要时）后直接渲染 container（规则 1）。
2. Container 的边界：页面的 chrome 写在 container 里（规则 2）。
3. 派生：放在拥有全部输入、且在乐观更新下游的那一层——route、container 或组件自己（前提）。
4. Frames：只有自带行为的组件用 `children` 接内容，不写只有插槽的 frame（规则 6）；所以 `BoardColumn` 保留，`PlanChrome` 在 Plan 改的时候删掉。
5. Prop drilling：写入一律走 page context，feature component 不收 callback prop（规则 3、4）。
6. Shell / panel：拆分保持；container 自己渲染的 overlay 收 callback props，open state 和 registry 留给 config-driven modals（规则 5，Q2）。
7. Design Console 渲染哪一层：container；gallery specimen 包 inert context（规则 7）。
8. 页面 header：由 container 渲染；`BoardHeader` 仍是 `domain/shared` 的组件。各页 header 统一成一个样子是 tracker 的 *Uniform page header*，不在这里。
9. 页面之上的 client state：不新增。page context 只在一页之内；`settingsStore`、`sidebarStore` 不动。
10. 改哪些：Board、Priorities、Dump，在下一个 PR（Q8）；Plan 推迟到 Phase 2（Q5）；规则写在 AGENTS.md › Layers › *Page structure*。
