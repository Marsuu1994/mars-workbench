# Spike: Component structure — 全站的组件怎么拆

**Status: draft** · 2026-10-25 · 回答 tracker 条目 Milestone — Quality gate › Step 10 › PR 1（component structure）· 相关：`archived/board-prop-drilling.md`（Board 的 view model + composition）、`archived/projects-page-refactor.md`（Projects 试点和它的六条原则）、`archived/scenario-states-without-production-props.md`（不为 console 加 prop）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog、`KanbanBoard`、`activePlanId` …），和代码、mockup、tracker 里的叫法一一对应。

**这一稿只整理现状**（owner 的要求）：每个 feature 的组件树、数据和 state 在哪、prop drilling、已知的问题，以及跨 feature 的差异。**不给方案和建议**；结尾列出这份 spike 最终要回答的问题，也不预设答案。

---

## Trigger · 起因

- Step 10 要在 Phase 2 之前定下新页面（Habits、Plan week）的组件写法。
- AGENTS.md 里有两处等它裁决：UI Workflow 的 *Screen components*（标着 pending），和 Layers 的 *Server shapes inputs* 里还没定的「layout frame 怎么接内容」。`baseline.md` › Architecture Decision 也写着 still open。
- Projects 页是试点例外（tracker 的 Step 10 下面）：没有 screen 层，feature component 直接吃 domain 行。其余页面还是试点之前的写法。
- PR 2（config-driven modals）建在这一步的规则上，所以 modal 的 open state、registry 不在本稿范围，只记录和结构有关的事实（modal 放在哪个组件里、shell 和 panel 怎么拆）。

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

## 这份 spike 要回答的问题

只列问题，不预设答案；方案在 owner 想过之后再写。

1. 页面要不要有 screen 层？如果有，它是什么（server 拼装、layout frame、还是别的）；如果没有，route 和 scenario 渲染什么？
2. Container 的边界：页面的 chrome（header、title bar、空状态）写在 container 里，还是外面？
3. 派生放在哪：container 用 adapter 一次算出 view model（Board），还是 feature component 吃 domain 行自己算（Projects）？两种要不要并存，按什么分？
4. Frames 通过 `children` 接内容，算规则、例外还是不允许？带行为的 frame（`BoardColumn`）和纯 layout frame（`PlanChrome`）是不是一回事？
5. Prop drilling 到什么程度算要处理（例如 Priorities 的 4 层 callback、Projects 原来的 11 个 prop，已改用 page context）？
6. Shell / panel 的拆分：哪些理由算 production 的需要，哪些算为 console 拆？（open state 和 registry 留给 PR 2。）
7. Design Console 渲染页面时渲染哪一层：screen、container，还是别的？
8. 页面 header 放在哪一层，要不要所有页面同一个？
9. 页面之上的 client state（Zustand、URL、context）什么时候用？
10. 定下来之后，现有页面改不改、改哪些（Plan form 在 Phase 2 会被替换）？规则写进 AGENTS.md 的哪一条？
