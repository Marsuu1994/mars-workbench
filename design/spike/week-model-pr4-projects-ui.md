# Spike: Week model Phase 1 · PR 4 — Projects UI 的组件设计

**Status: awaiting owner review** · 2026-10-10 · 回答 tracker 条目 *Week model Phase 1 › PR 4*（Plan › Medium）· 上游：`design/spike/week-model-restructure.md`（approved）、`design/flows/projects.md`、`design/spike/board-prop-drilling.md`（Option C3）· Mockups：`design/mockup/future-work/mockup-projects-v2.html`（Projects 页和 4 个 modal）、`mockup-week-model-phase1-v2.html`（step 卡片、plan form）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（project / step / backlog / this week、`instanceIndex`、`toBoardCards` …），和代码、mockup、tracker 一一对应。

## Trigger · 起因

PR 4 是 Phase 1 里 UI 最重的一步。画面已经在两份 mockup 里批准了，但 mockup 是拼 HTML 字符串画出来的，回答不了实现要回答的问题：

- 每块画面落到哪个组件、哪一层（`ui/` · `application/` · `domain/`），哪些复用现有零件，哪些是新的；
- 数据怎么走：server 给什么 inputs，container 留什么 state，adapter 推导出什么 view model（AGENTS › Layers：*Server shapes inputs, the client derives the view*）；
- 写入怎么做：哪些是乐观更新、失败怎么回滚、写完选中谁、跳到哪；
- mockup 没画到的状态（两周之间、很长的 path、archived project 的 detail …）怎么处理；
- Design Console 怎么覆盖（one tab, one state；no console-only props）；
- 怎么拆 PR，每一步的 Done when。

这份 spike 不重开已批准的设计（做什么、放在哪，见 week-model spike 和 `flows/projects.md`），只把它翻译成组件和执行计划。需要 owner 拍板的有 4 件事，集中在「待拍板」；mockup 没画到、我按默认做法处理的 16 处，列在「默认做法」，可以逐条否决。

## 出发点 · What's already there

| 来自 | 已有 | PR 4 怎么用 |
| --- | --- | --- |
| PR 3（#50） | `projectActions` 的 10 个 action（project：create / update / archive / unarchive；step：add / update / delete / reorder / schedule / unschedule）、`getProjectsWithSteps`、plan 的 `projectStepIds` | UI 直接调用；只加一个页面读取入口和两个 DAL 读取 |
| PR 2 + #53 | Kind-first 卡片、`BoardCard` union（`ProjectStepCard` 目前只有 `{kind, task}`）、`toBoardCards`、C3 composition | step face 只改 `toBoardCards` 的 PROJECT 分支和两个 face |
| `ui/` | `OverlayShell`、`OverlayHeader`、`FieldRow`、`ChoicePills`、`SubmitButton`、`FormErrorAlert`、`ConfirmButton`、`TabBar`、`EmptyState`、`ProgressBar`、`Pill`、`SectionLabel` | 大部分直接复用；新增 4 个、扩展 3 个（见组件清单） |
| `useOptimisticTasks` | 单个 task 的乐观更新，失败按 task 回滚 | schedule / × 直接用；reorder 要一次改多个 task |

读代码时发现 3 件事，影响 PR 的顺序和范围：

1. **Plan form 建 plan 时会把上周没做完的 step 全部退回 project。** `createPlanInTx` 把 `projectStepIds ?? []` 当成「带上哪些」，而 plan form 还不传这个字段。线上现在没有 step，所以无害；但 UI 一旦能排 step，下一次跨周建 plan 就会触发。所以 plan form 的 Project Steps 区块要在 Projects 页之前落地（见 Q3）。
2. **`TaskModal.tsx` 一个文件导出两个组件**（`TaskModalPanel` + `TaskModal`），违反 *One file → one component*。抽共用零件时顺手拆开。
3. **Plan 导航的 active 判断和 href 各写了两遍**（`AppSidebar`、`BottomTabBar`）。加 `/kanban/projects` 时收进一个地方。

---

## Component tree · 从 route 到组件

### Projects 页

```text
/kanban/projects       page.tsx (server)  fetchProjectsPageAction() → ProjectsScreen selectedProjectId=null
/kanban/projects/[id]  page.tsx (server)  同上 → ProjectsScreen selectedProjectId=id
                                          （不存在或不是本人的 → 404；archived → redirect 到列表）
└ ProjectsScreen (server)                 h-full 外框，把 server inputs 交给 container
  └ ProjectsContainer (client)            localSteps · selectedProjectId · openModal → toProjectsView()
    ├ PlanHubHeader                       periodKey · activeTab=PROJECTS · thisWeekHref · action=[+ New project]
    │ └ LinkTabBar (ui)                   This week · Projects
    ├ EmptyState variant=inline (ui)      一个 project 都没有时，取代下面的 panes
    ├ ProjectsPanes (frame)               list · detail · mobilePane
    │ ├ ProjectList (frame)               children · archived · mobileFooter
    │ │ ├ ProjectListItem ×n              project: ProjectSummary · isSelected · href · onSelect
    │ │ └ ArchivedProjectRow ×n           project: ArchivedProjectSummary · onUnarchive
    │ └ ProjectDetail (frame)             header · notices · children · footer · backHref
    │   ├ ProjectDetailHeader             project: ProjectHeaderModel · onEdit
    │   ├ NoActivePlanBanner              没有 ACTIVE plan 时
    │   ├ AllStepsDoneBanner              isAllStepsDone 时 · onArchive
    │   └ DragDropContext                 onDragEnd = reorder
    │     └ ProjectStepList (frame)       doneRows · children（Droppable）
    │       ├ ProjectStepRow ×done        step: ProjectStepRowModel（锁定）
    │       └ DraggableStepRow ×open      → ProjectStepRow · onEdit · onSchedule · onTakeBack
    ├ ProjectModal → OverlayShell → ProjectFormPanel   New / Edit Project
    └ StepModal → OverlayShell → StepFormPanel         Add / Edit Step
```

### Board 上的 step 卡片

```text
fetchBoard → {plan, tasks, progress, projects（新）}
└ BoardScreen → KanbanBoard  tasks · plan · projects → toBoardCards(localTasks, {plan, projects})
  └ … TaskCard / MobileBacklogCard（不动）
      ├ TaskCardFace      PROJECT：TaskCardHead(label=project 名, context="3/5") + StepPath(card)
      └ TaskCardMiniFace  PROJECT：TaskCardHead(label=project 名) + StepPath(mini)
```

除了把 server input 传进 `KanbanBoard`，只改 `toBoardCards` 的 PROJECT 分支和两个 face；列、backlog、sheet 都不动，符合 #53 的验收标准：给卡片加输入时只改算它的地方和显示它的 face。

### Plan form

```text
/kanban/plans/new · /kanban/plans/[id]   + getPlanStepsByPlanId（pending plan / 这个 plan 的未完成 step）
└ PlanChrome → PlanHubHeader activeTab=THIS_WEEK（Q1）
  └ PlanForm  + projectSteps · initialProjectStepIds
    ├ One-off Tasks → PlanTaskRow kind=ONE_OFF ×n    现有 inline markup 抽出来
    ├ Project Steps → PlanTaskRow kind=PROJECT ×n    新
    └ ReviewChangesModal → + removedSteps            Project Steps 一节
```

---

## 组件清单 · Component inventory

按 AGENTS › *Component placement*：import 了 domain 类型就是 domain；只渲染一次的 app frame 是 application；其余是 ui。

### `ui/` — 新增 4 个，扩展 3 个

| 组件 | 新 / 改 | Props（要点） | 用在哪 | Mockup |
| --- | --- | --- | --- | --- |
| `LinkTabBar` | 新 | `tabs: {label, href}[]` · `activeHref` · `ariaLabel` | Plan hub 的 This week · Projects。是 `<nav>` 里的 `Link`，active 的那个带 `aria-current="page"`；`TabBar` 是切换面板的 `role="tablist"` 按钮，语义不同 | `.seg.hub` |
| `tabStyles.ts` | 新（常量） | `TAB_RAIL_CLASS` · `TAB_CLASS: Record<'active' \| 'inactive', string>` | `TabBar` 和 `LinkTabBar` 共用，两种 tabs 永远长得一样 | — |
| `Banner` | 新 | `tone: 'secondary' \| 'success' \| 'warning'` · `icon` · `children` · `action?` | New Project 的说明、All steps done、no plan；`TaskModalPanel` 的 adhoc 说明也改用它 | `.mbanner` `.donebar` `.warnbar` |
| `InlineConfirmButton` | 新 | `label` · `confirmLabel` · `hint?` · `onConfirm` | Archive（modal footer、banner）、Delete step | `.btn.danger` → `.btn.danger.solid` + `.confirm-hint` |
| `form/ModalFormFooter` | 新 | `error` · `isSubmitting` · `onCancel` · `cancelLabel` · `submitLabel` · `submitIcon` · `submitDisabled?` · `leading?` | 4 个新 modal；取代 `TaskModalFooter` | `.mfoot` |
| `EmptyState` | 改 | + `variant: 'page' \| 'inline'`（默认 page，现有调用不变）。inline：虚线框、小一号的标题和正文 | 没有 project、project 没有 step | `.empty-proj` |
| `overlay/OverlayHeader` | 改 | + `subtitle?`：标题下一行等宽小字 | Step modal 的「🗺 Biomedical course · becomes step 4」 | `.ctxline` |
| `TabBar` | 改 | props 不变，class 改从 `tabStyles` 取 | — | — |

`InlineConfirmButton` 不做成 `ConfirmButton` 的 variant：`ConfirmButton` 是整行宽的「提示 + Cancel / Confirm」；mockup 要的是同一个按钮原地变成「Archive?」（实心 error）加一行说明，没有 cancel（modal 的 Cancel 或者离开就是取消）。两者只共用两个 `useState`，合成一个组件要靠 union props 区分形状，反而难读。

### `application/` — 改 3 个

| 组件 | 改什么 |
| --- | --- |
| `AppSidebar`、`BottomTabBar` | Plan 的 active 改用 `isPlanHubPath(pathname)`（`/kanban/plans` 或 `/kanban/projects`）；Plan 链接改用 `getThisWeekHref(activePlanId)`。两个 helper 放进 `utils/planUtils.ts`，`PlanHubHeader` 也用 |
| `AppShell` | `SELF_SCROLLING_PREFIXES` 加 `/kanban/projects`：两栏各自滚动，step 列表的 `Droppable` 只能有一个 scroll parent（和 board 同样的约束） |

### `domain/shared/` — 新增 3 个，改 2 个，删 1 个

| 组件 | 新 / 改 | Props | 说明 |
| --- | --- | --- | --- |
| `PlanHubHeader` | 新 | `periodKey` · `activeTab: PlanHubTab` · `thisWeekHref` · `action?` | 标题「Plan」+ `getWeekDateRange`（Week 41 · Oct 5 – Oct 11）+ `LinkTabBar` + 右侧 action（只在 md 以上）。Mobile：标题行下面一行居中的 tabs。不加 `'use client'`、不 async：`PlanChrome`（server）和 `ProjectsContainer`（client）都能渲染它 |
| `task-modal/SizePicker` | 新 | `value` · `onChange` · `splitWarning` | 从 `TaskModalPanel` 抽出来：size pills + effort 提示 + L / XL 拆分提醒。template 和 step 的提醒文案不同（smaller tasks / smaller steps），由调用方传 |
| `task-modal/TaskModalPanel` | 新文件 | 不变 | 从 `TaskModal.tsx` 拆出来；改用 `SizePicker`、`ModalFormFooter`、`Banner` |
| `task-modal/TaskModal` | 改 | 不变 | 只剩外壳 |
| `taskKindStyle.ts` | 改 | + `tint`（行的底色和边框）、`track`（path 的空段） | `Record<TaskKind, …>`，三种 kind 都要加 |
| `task-modal/TaskModalFooter` | 删 | — | `ModalFormFooter` 取代 |

### `domain/projects/` — 新文件夹，17 个组件

| 组件 | 角色 | Props | 渲染什么 |
| --- | --- | --- | --- |
| `ProjectsScreen` | screen | `ProjectsPageData` · `selectedProjectId` · `periodKey` · `thisWeekHref` | `h-full` 的一列，里面只有 container。page 和 scenario 都渲染它，两边不会漂移 |
| `ProjectsContainer` | container（client） | 同上 | 见「Container 和写入」 |
| `ProjectsPanes` | frame | `list` · `detail` · `mobilePane: 'list' \| 'detail'` | md 以上 `grid-cols-[320px_1fr]`，两栏各自 `overflow-y-auto`；mobile 只显示 `mobilePane` 那一栏 |
| `ProjectList` | frame | `children` · `archived?` · `mobileFooter?` | active 卡片；`SectionLabel`「Archived」和 archived 行；mobile 的整宽「+ New project」 |
| `ProjectListItem` | 展示 | `project: ProjectSummary` · `isSelected` · `href` · `onSelect` | Desktop 是卡片：project 色的 kind edge、title + `d/N`、`ProgressBar`、「Next: …」或「✓ All steps done」或「No steps yet」、「n this week」pill。Mobile 是一行：title、`d/N` + Next、›。根元素是 `<Link href>`，desktop 拦下 click 改成 `onSelect`（见「选中」） |
| `ArchivedProjectRow` | 展示 | `project: ArchivedProjectSummary` · `onUnarchive` | `title · d/N` + Unarchive（请求中禁用） |
| `ProjectDetail` | frame | `header` · `notices` · `children` · `footer` · `backHref` | mobile 顶部的「‹ All projects」（`md:hidden`）、header、banner、step 列表、「+ Add step」 |
| `ProjectDetailHeader` | 展示 | `project: ProjectHeaderModel` · `onEdit` | title、goal、`ProgressBar` +「2 of 5 steps」、✎ Edit |
| `AllStepsDoneBanner` | 展示 | `onArchive` | `Banner tone=success` + 文案 + `InlineConfirmButton`（Archive → Archive? · Moves it to Archived） |
| `NoActivePlanBanner` | 展示 | — | `Banner tone=warning`：「No plan for this week yet — + This week needs one.」+ Create plan 链接 |
| `ProjectStepList` | frame | `doneRows` · `children` | done 行在上面，不在 `Droppable` 里；open 行在 `Droppable` 里 |
| `DraggableStepRow` | 包装 | `stepId` · `index` · `children` | `Draggable`；整行是 drag handle（默认做法 #14） |
| `ProjectStepRow` | 展示 | `step: ProjectStepRowModel` · `onEdit?` · `onSchedule?` · `onTakeBack?` | 4 种状态，见下表 |
| `ProjectFormPanel` | 表单（无外壳） | `mode: 'create' \| 'edit'` · `project?` · `onClose` · `onSaved(projectId)` · `onArchived?(projectId)` | header（New Project / Edit Project）、`Banner`（只在 create）、Title（必填）、Goal（可选）、footer（edit 时左边是 Archive） |
| `ProjectModal` | 外壳 | `isOpen` + panel 的 props | `OverlayShell variant=responsive`、`dismissOnBackdrop={false}`，打开时才 mount panel（和 `TaskModal` 一样，每次打开都是新表单） |
| `StepFormPanel` | 表单（无外壳） | `mode: 'add' \| 'edit'` · `project: {id, title}` · `stepNumber` · `step?` · `onClose` · `onSaved` | header（Add Step / Edit Step，subtitle「🗺 {project} · becomes step n」或「step n」）、Title、Description、`SizePicker`、footer（edit 时左边是 Delete step） |
| `StepModal` | 外壳 | 同上 | 同 `ProjectModal` |

`ProjectStepRow` 的 4 种状态（`state` 由 adapter 算好，组件只 `switch`）：

| state | 条件 | 状态圈 | 右侧 | ✎ | 能拖 |
| --- | --- | --- | --- | --- | --- |
| `DONE` | `status = DONE` | 实心 ✓（success） | 完成日期「Mon, Oct 5」 | 无 | 否 |
| `THIS_WEEK` | `planId = active plan` | project 色的圈 + 内点；整行 project 色 tint | pill「This week · todo」（primary）或「This week · backlog」（secondary）；backlog 时多一个 × | 有 | 是 |
| `LAST_WEEK` | `planId` 是另一个 plan（两周之间的 PENDING_UPDATE plan） | 空圈 | pill「Last week · todo / backlog」（muted），没有 × | 有 | 是 |
| `UPCOMING` | `planId = null` | 空圈 | size chip +「+ This week」（mobile「+ Week」；没有 active plan 时禁用） | 有 | 是 |

### `domain/board/` — 新增 1 个，改 5 个

| 组件 | 新 / 改 | 说明 |
| --- | --- | --- |
| `StepPath` | 新 | 和 `HabitSignal` 同构：path 上每个 step 一段（按 `instanceIndex`），DONE 实心，这张卡自己的那段加 ring。`variant: 'card' \| 'mini'`（92px / 52px，mockup 的尺寸）。超过 `STEP_PATH_MAX_SEGMENTS`（24）段时换成一条连续的进度条（`taskCardConstants.ts`） |
| `BoardScreen`、`KanbanBoard` | 改 | 多接一个 server input `projects`，原样交给 `toBoardCards`；渲染部分不动 |
| `TaskCardHead` | 改 | + `label?`：覆盖 kind 标签。step 卡片第一行显示 project 名（mockup：`🗺 Protein 3D viewer   3/4`） |
| `TaskCardFace` | 改 | PROJECT 分支：`label` = project 名、`context` =「{number}/{count}」、signal = `StepPath card` |
| `TaskCardMiniFace` | 改 | PROJECT 分支：`label` = project 名、signal = `StepPath mini` |

### `domain/plan/` — 新增 1 个，改 3 个

| 组件 | 新 / 改 | 说明 |
| --- | --- | --- |
| `PlanTaskRow` | 新 | plan form 里可勾选的一行：kind 色的 checkbox、`[project · ]title`、`SizeChip`、状态 pill（Todo / Backlog）、取消勾选后显示去向（「→ Priorities matrix」/「→ Finance basics, step 1」）。One-off 区块现有的 inline markup 也改用它，同样的行不写两遍 |
| `PlanForm` | 改 | + `projectSteps` · `initialProjectStepIds`；One-off 下面加 Project Steps 区块（有 step 才渲染）；summary 加 step 数；create / update 都带 `projectStepIds`；「至少选一项」的禁用条件算上 step；diff 加 `removedSteps` |
| `ReviewChangesModal`（及 Panel） | 改 | + `removedSteps`：Project Steps 一节，每行「Will return to {project} — still step {n}」。Edit 只能取消勾选，所以只有 removed |
| `PlanChrome` | 改 | header 换成 `PlanHubHeader activeTab=THIS_WEEK`（Q1 选 A 时） |

---

## 数据形状 · Server inputs → adapter → view model

### Projects 页

Server 只给 inputs（DAL 的形状）。Container 把它要改的行（steps）留作 state，adapter 推导出 view：

```ts
// types/projects.ts
export interface ProjectsPageData {
  projects: ProjectItem[];     // archived 也在内，列表最下面单独列
  steps: TaskItem[];           // 这些 project 的全部 step，平铺
  activePlanId: string | null; // + This week 排进哪个 plan；null → no-plan 状态
}
```

- `projectService.fetchProjectsPage(userId)`：`ensureSynced` → `getProjectsWithSteps`（已有，一个查询）→ 平铺成 `projects` + `steps`。
- 为什么平铺：页面上乐观改的是 step（schedule、×、reorder）。平铺后 container 直接用 `useOptimisticTasks(steps)`，和 board、matrix 是同一个 hook。project 行只在 modal 保存后才变，等 revalidate 就够了，不进 state。
- `periodKey` 由 page 用当前 ISO week 算（`ensureSynced` 之后的 ACTIVE plan 一定是这一周）；`thisWeekHref = getThisWeekHref(activePlanId)`。

Adapter `utils/projectViewUtils.ts`（纯函数，client-safe）：

```ts
export function toProjectsView(
  projects: ProjectItem[],
  steps: TaskItem[],
  {activePlanId, selectedProjectId}: ProjectsViewInputs,
): ProjectsView;

export interface ProjectsView {
  activeProjects: ProjectSummary[]; // 新建的在前（DAL 的顺序）
  archivedProjects: ArchivedProjectSummary[];
  /** selectedProjectId 不在 active 列表里时，取第一个 active project；一个都没有时为 null */
  selectedProject: ProjectDetailModel | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
  doneCount: number;
  stepCount: number;
  nextStepTitle: string | null; // 第一个未完成的 step（按 instanceIndex）
  isAllStepsDone: boolean;      // stepCount > 0 且全部 DONE
  thisWeekCount: number;
}
export type ArchivedProjectSummary = Pick<
  ProjectSummary,
  'id' | 'title' | 'doneCount' | 'stepCount'
>;

export interface ProjectDetailModel {
  header: ProjectHeaderModel; // id · title · goal · doneCount · stepCount
  isAllStepsDone: boolean;
  nextStepNumber: number;     // Add Step 的「becomes step n」
  doneSteps: ProjectStepRowModel[]; // doneAt 升序
  openSteps: ProjectStepRowModel[]; // instanceIndex 升序（Q2）
}

export type ProjectStepRowModel =
  | {state: typeof ProjectStepState.DONE; step: TaskItem}
  | {state: typeof ProjectStepState.THIS_WEEK; step: TaskItem; canTakeBack: boolean}
  | {state: typeof ProjectStepState.LAST_WEEK; step: TaskItem}
  | {state: typeof ProjectStepState.UPCOMING; step: TaskItem; canSchedule: boolean};
```

`doneCount`、`isAllStepsDone` 这类 board 和 Projects 页都要的推导放进 `utils/projectUtils.ts`，两个 adapter 共用。

### Board

```ts
// lib/db/projects.ts（新）— select 只取 path 要的字段
getProjectPathsByIds(userId, projectIds): Promise<BoardProject[]>;
// BoardProject = {id, title, steps: {id, status, instanceIndex}[]}

// types/board.ts
export interface BoardData {plan; tasks; progress; projects: BoardProject[]}

// utils/boardCardUtils.ts
export interface ProjectStepCard extends BoardCardBase {
  kind: typeof TaskKind.PROJECT;
  /** Absent when the project isn't in the lookup */
  step?: ProjectStepContext;
}
export interface ProjectStepContext {
  projectTitle: string;
  number: number; // instanceIndex
  count: number;  // project 的 step 总数
  path: boolean[]; // 每个 step 一段，按 instanceIndex；true = DONE
  currentSegment: number;
}
```

- `fetchBoard`：board 上有 step 时，按它们的 `projectId` 多查一次 `getProjectPathsByIds`；没有 step 就不查。
- `toBoardCards` 的 PROJECT 分支：path 每一段的状态先看 `localTasks` 里同 id 的 task，没有再看 lookup。这样把 step 拖到 Done 的那一刻 path 就更新，和 habit 的 dots 一样，必须基于 client 的乐观 state 推导。

### Plan form

```ts
// lib/db/projects.ts（新）
getPlanStepsByPlanId(userId, planId): Promise<PlanStepItem[]>;
// PlanStepItem = {id, title, size, points, status, instanceIndex, projectTitle}
// 一个 plan 上未完成的 step，按 project、instanceIndex 排
```

- `/kanban/plans/new`：pending plan 的未完成 step，默认全选。
- `/kanban/plans/[id]`：这个 plan 的未完成 step，默认全选，只能取消。
- 两个 page 现在直接调 DAL（plan 页还没迁到 *Server shapes inputs*，tracker 已记在 Phase 2），这次沿用同样的写法，不在 PR 4 里迁。

---

## Container 和写入 · Interactions

`ProjectsContainer` 的 state：

| state | 来源 | 说明 |
| --- | --- | --- |
| `localSteps` | `useOptimisticTasks(steps)` | 新 props 到达时整份替换 |
| `selectedProjectId` | `useState(props.selectedProjectId)` | desktop 点卡片只改它，不导航 |
| `openModal` | `useState<OpenModal \| null>` | `{kind: 'newProject'}` · `{kind: 'editProject', projectId}` · `{kind: 'addStep', projectId}` · `{kind: 'editStep', stepId}` |

派生：`useMemo(() => toProjectsView(projects, localSteps, {activePlanId, selectedProjectId}), […])`。派生出来的东西不进 state。

| 交互 | 入口 | Action | 乐观更新 | 之后 |
| --- | --- | --- | --- | --- |
| New project | header（md 以上）、空状态、列表底部（mobile） | `createProjectAction` | 否 | modal 关；desktop 选中新 project；mobile push `/kanban/projects/[id]` |
| Save project | Edit Project | `updateProjectAction` | 否 | modal 关 |
| Archive | Edit Project footer、All steps done banner | `archiveProjectAction` | 否（按钮 pending） | 选中下一个 active project；mobile 回 `/kanban/projects` |
| Unarchive | archived 行 | `unarchiveProjectAction` | 否 | 选中它 |
| Add step | 「+ Add step」/「Add the first step」 | `addProjectStepAction` | 否 | modal 关，step 接在末尾 |
| Save step | Edit Step | `updateProjectStepAction` | 否 | modal 关；board 卡片同步（action 已 revalidate `/kanban`） |
| Delete step | Edit Step footer | `deleteProjectStepAction` | 否 | modal 关，后面的 step 前移一位 |
| + This week | upcoming 行 | `scheduleProjectStepAction` | 是：`planId = activePlanId` | 失败只回滚这个 step |
| × | this week · backlog 行 | `unscheduleProjectStepAction` | 是：`planId = null` | 同上 |
| Reorder | 拖动 open 行 | `reorderProjectStepsAction` | 是：open steps 重新编号 | 失败回滚这几个 step |

- Reorder 必须是乐观的：`@hello-pangea/dnd` 要求在 `onDragEnd` 里同步完成重排，否则行会先弹回原处。
- `useOptimisticTasks` 加 `runOptimisticTasksUpdate(patchById, action, errorLabel)`：一次改多个 task，失败按 task 回滚。现有的单 task 版本改成调用它。
- 重新编号的规则（open steps 接手它们已经占有的编号，升序排）抽成纯函数 `assignStepNumbers(orderedStepIds, currentNumbers)`，放进 `utils/projectUtils.ts`，`projectService.reorderProjectSteps` 和 container 共用，client 的乐观结果和 server 的结果不会对不上。
- Modal 的错误显示和 `TaskModal` 一样，在 footer 的 `FormErrorAlert`。把 action 的 `{error}` 转成文案的那段代码（`TaskModalPanel` 里现有一份）抽成 `utils/formErrors.ts` 的 `toFormErrorMessage`，三个 panel 共用。乐观写入失败只回滚 + `console.error`，和 board 一样；统一的错误语言在 tracker 的 *Design error states* 里。

### 选中 · Selection

- **Desktop**：`/kanban/projects` 选中第一个 active project；`/kanban/projects/[id]` 预选那一个。之后点别的卡片只改 container 的 state，不导航，URL 不变。
- **Mobile**：`/kanban/projects` 只显示列表；点卡片是普通的 `<Link>` 导航到 `/kanban/projects/[id]`，那里只显示 detail 和「‹ All projects」。
- **实现**：`ProjectListItem` 的根元素是 `<Link href>`，`onClick` 在 desktop（`useBreakpoint().isMobile === false`）时 `preventDefault()` 再 `onSelect(id)`。两个断点的 markup 一样，SSR 默认 desktop 也不会闪。
- 这和 `flows/projects.md` Landing 的写法一致：desktop 选中第一个，mobile 每个 project 打开 `/kanban/projects/[id]`。

---

## 默认做法 · Mockup 没画到的地方

Owner 可以逐条否决；没有意见就按这里做。

| # | 情况 | 默认做法 |
| --- | --- | --- |
| 1 | Mobile detail 的 header | 和 desktop 用同一个 `ProjectDetailHeader`（含 goal 和进度条）。phone mockup 只画了 title + Edit；断点不是状态，是同一个组件 |
| 2 | 两周之间（上周的 plan 是 PENDING_UPDATE，新 plan 还没建），上周没做完的 step | 行显示「Last week · todo / backlog」（muted），没有 ×；页面同时显示 no-plan banner。由下一个 plan 决定带上还是退回 |
| 3 | Done 的日期 | 两个断点都是「Mon, Oct 5」。mockup 的 mobile 只写「Mon」，几周前做完的 step 看不出是哪天 |
| 4 | 很长的 path（board 卡片） | 超过 24 段时换成连续进度条（done / total），不标自己那段；和 `HABIT_DOTS_MAX` 一样的退路 |
| 5 | Path 怎么画 | 按 `instanceIndex` 每个 step 一段，DONE 实心，自己那段加 ring。mockup 画的是「前 d 段实心」，按顺序做完时两者一样；乱序做完时，真实画出做完的是哪几步 |
| 6 | 「+ This week」在 mobile | 文案「+ Week」（mockup 的 phone 帧），同一个按钮用响应式文案 |
| 7 | Archived project 的 detail | archived 行不能选中（mockup 里也没有）；`/kanban/projects/[id]` 指向 archived project 时 redirect 到 `/kanban/projects`；不存在或不是本人的 → 404 |
| 8 | Unarchive 之后在哪 | 回到 active 列表里按 createdAt 的位置（新建的在前），并被选中。mockup 的 live page 是放到最后 |
| 9 | 没有 active plan 时 header 显示哪一周 | 当前 ISO week（和 priorities 页一样） |
| 10 | 4 个 modal 的提交按钮 | Title 去掉首尾空格后为空时禁用（flow 只写了 Create project，统一到 4 个）。Esc 关闭，点 backdrop 不关（表单的规则） |
| 11 | Add Step 的默认 size | S（mockup）；Edit Step 用 step 现在的 size |
| 12 | 刚建好的空 project | detail 只有「No steps yet」框和里面的「Add the first step」（primary），下面不再重复「+ Add step」 |
| 13 | Plan form 的 Project Steps 区块 | 没有 step 时不渲染（和 One-off 区块一样）；有 step 时 summary 多一段「n project steps」 |
| 14 | 拖动的手柄 | 两个断点都是整行当 handle：鼠标直接在行上拖，触屏长按（`@hello-pangea/dnd` 自带的 touch sensor）。≡ 图标只在 desktop 显示，作为提示；行里的按钮不会触发拖动（库的默认行为） |
| 15 | All steps done banner 的「Archive?」什么时候复位 | banner 按 project id 加 `key`：切换 project、或任何写入引起重新渲染时 remount，回到 Archive。mockup 的 live page 是点任何别的控件就复位 |
| 16 | 所有 project 都 archive 了 | 列表只剩 Archived 一节；detail 栏显示 inline 空状态「No active projects」+ New project。「No projects yet」空状态只在一个 project 都没有（包括 archived）时出现 |

---

## 待拍板 · Open questions

### Q1 · This week（plan form）上的 hub header

Projects 页的 header 已经批准（mockup：「Plan」+ 周 + This week · Projects + New project）。This week tab 就是现在的 plan form，它的 header 是「Kanban Planner」+ 红色的「Planning mode」pill；两份 Phase 1 mockup 都没画加了 hub 之后的 plan form。

**Option A — 三个 route 用同一个 `PlanHubHeader`（推荐）**

- 设计：`PlanChrome` 的 header 换成 `PlanHubHeader activeTab=THIS_WEEK`，去掉「Kanban Planner」和「Planning mode」pill；表单里的「Create Weekly Plan / Update Weekly Plan」标题照旧。
- Pros：在 This week 和 Projects 之间切换时，header 和 tabs 不动，只换下面的内容；只有一个 header 组件；和 Projects mockup 一致。
- Cons：plan form 的 header 变了。原 spike 说 plan form 主体不动，header 在主体之外，但仍然是看得见的变化；tracker「Uniform page header」里「plan keeps its planning-mode header」那句要改。
- 实现：`PlanChrome` 渲染 `PlanHubHeader`（周 = 当前 ISO week，`thisWeekHref` = 当前 route）；去掉对 `Board.Header` 文案的引用；更新 plan scenario；改 tracker 那一句。

**Option B — 保留 plan form 的 header，在它下面加一行 tabs**

- 设计：`PlanChrome` 原样，header 下面加一行 `LinkTabBar`；Projects 页用 mockup 的 header。
- Pros：plan form 一点不变。
- Cons：同一个 hub 的两个 tab 用两种 header，切换时标题和 tabs 的位置都会跳；要维护两个 header。
- 实现：`PlanChrome` 加一行 tabs；`PlanHubHeader` 只给 Projects 页用。

### Q2 · 未完成的 step 按什么顺序排

`flows/projects.md` 写的是 detail 里「done（按完成顺序）→ this week → upcoming」。mockup 里这周的 step 恰好都是编号最小的，所以看不出差别。但排期不强制顺序：只排了 step 5、没排 step 4 时，两种排法就不一样了。

**Option A — open steps 按 path 顺序（`instanceIndex`），this week 的行原地 tint（推荐）**

- Pros：点「+ This week」只改变行的样子，行不跳；拖动的列表就是 path，拖完的编号和看到的顺序一致；open 区的编号从上到下递增。
- Cons：这周的 step 可能散在列表中间，不一定聚在一起（靠 tint 和 pill 区分）。
- 实现：adapter 按 `instanceIndex` 排 open steps；`flows/projects.md` Landing 第 4 步改成「done steps …, then the open steps in path order, this week's marked with their board status」。

**Option B — this week 在前，upcoming 在后（照 flow 原文）**

- Pros：这周要做的聚在一起。
- Cons：点「+ This week」时那一行会跳上去；拖动跨两组时，service 会按显示顺序给整个 open 区重新编号，拖一个 upcoming 的 step 可能顺带改掉这周 step 的编号。
- 实现：adapter 先按 this week / 其他分组，再按 `instanceIndex` 排；flow 不改。

两种都保留「done 在最上面、按完成顺序」。乱序完成时（先做 3 再做 2），done 区的编号会读成 1、3、2，这是已批准设计本来的样子，这里不改。

### Q3 · 一个 PR，还是拆成三个

原 spike 把 PR 4 估成 M–L。按上面的清单，实际约 80 个文件（含 Design Console 和文档）。

**Option A — 拆成 4a / 4b / 4c（推荐）**

| PR | 内容 | 大小 |
| --- | --- | --- |
| 4a · Steps on the week | step 卡片（`StepPath`、两个 face、`toBoardCards`、`fetchBoard` 的 lookup）；plan form 的 Project Steps 区块（含 `projectStepIds` 的修正）；Review changes 的 Project Steps 一节 | M（约 22 个文件） |
| 4b · Shared parts | `ui/` 的新增和扩展、`SizePicker`、`TaskModal` 拆文件并改用共用零件、`formErrors`、gallery。不改任何行为 | S–M（约 16 个文件） |
| 4c · Projects page | routes、hub header、导航、Projects 页全部组件和 4 个 modal、写入、Projects scenario、文档、删 mockup | L（约 40 个文件） |

- Pros：4a 先填上「plan form 把 step 全部退回」的坑，之后 UI 才能排 step；4b 是纯重构，审的时候只要确认 TaskModal 的 scenario 截图没变；4c 专注于新页面。
- Cons：三轮 review；4b 的新 primitive 在 4c 之前只有 gallery 在用。
- 4c 不再往下拆：没有 modal 就建不了 project，「New project」会是个死按钮；把 modal 拆出去，就得先上一个只能看、不能建的页面。

**Option B — 一个 PR（原计划）**

- Pros：一轮 review，一次合并。
- Cons：约 80 个文件的 diff 难审；任何一处返工都卡住整体；plan form 的修正要等到最后才上线。

### Q4 · 两份 mockup 什么时候删

原计划是 PR 4 的 scenario 接手后删掉两份。但 PR 5 的 Done when 写的是「在 Claude 里跑通 Projects mockup『07 Draft with Claude』的对话」，这个 tab 是 MCP 的内容，不是 PR 4 落地的 UI。

- **Option A（推荐）**：4c 删 `mockup-week-model-phase1-v2.html`；`mockup-projects-v2.html` 留到 PR 5 合并时删。代价是 Projects 页的画面会同时存在于 scenario 和 mockup 一段时间，以 scenario 为准。
- **Option B**：4c 两份都删；PR 5 的验收改成以 `flows/projects.md` 的 *Draft Steps with Claude (MCP) Flow* 为准。代价是 PR 5 少了一个可以照着对的对话样例。

---

## Design Console

### 新的 Projects scenario（`/design/scenarios/projects`）

一个 tab 一个状态。mobile 的样子靠缩窄窗口看（断点不是状态）；但 mobile 的 list 和 detail 是两个 route，所以 `/[id]` 单独一个 tab。

| Tab | display | 内容 | play |
| --- | --- | --- | --- |
| No projects | fill | 空状态 | — |
| Projects | fill | 3 个 active（进行中、刚建好没有 step、All steps done）+ 1 个 archived；desktop 选中 Biomedical course | — |
| Project open (/[id]) | fill | `selectedProjectId` = Protein 3D viewer：this week · todo、this week · backlog（带 ×）、upcoming | — |
| All steps done | fill | 选中 Finance basics：badge + banner | — |
| All steps done · archive armed | fill | 同上 | 点 banner 的 Archive |
| No plan this week | fill | `activePlanId = null`：warning banner，+ This week 禁用 | — |
| Between weeks | fill | 上周 plan 上没做完的 step：Last week pill | — |
| New project | fit · overlay | `ProjectFormPanel mode=create` | — |
| Edit project | fit · overlay | `mode=edit` | — |
| Edit project · archive armed | fit · overlay | 同上 | 点 Archive |
| Add step | fit · overlay | `StepFormPanel mode=add`，becomes step 6 | — |
| Edit step | fit · overlay | `mode=edit`，size S | — |
| Edit step · delete armed | fit · overlay | 同上 | 点 Delete step |

- 拖动中的状态没法 pin（shield 会吞掉 drag start），不做 tab。
- Panel 外面那层 modal 框：`TaskModalScenario` 里手写的 `fx-panel-solid rounded-box md:fx-corners` 抽成 `ModalPanelFrame`，三个 modal scenario 共用。

### 更新现有的 scenario 和 gallery

- **Board**：`MID_WEEK_TASKS` 加 3 个 step（Todo、Backlog、Done 各一个），fixture 加 `projects`；「Board」tab 的 note 写上 step 卡片。
- **Plan**：Create tab 带 2 个上周的 step（一个 Todo、一个 Backlog）；Review changes tab 加一个被取消的 step；Q1 选 A 时，两个表单 tab 的 header 变成 hub header。
- **Gallery · ui**：`LinkTabBar`、`Banner` 的三种 tone、`InlineConfirmButton`（rest / armed，用 `<Play>`）、`EmptyState` inline、带 subtitle 的 `OverlayHeader`、`ModalFormFooter`（有 / 没有 leading）。
- **Gallery · domain**：`StepPath`（短 path、做到一半、超过 24 段）、`TaskCard` 的 project 面（todo / backlog / done / mini）、`ProjectListItem`（进行中 / All steps done / 没有 step / 选中）、`ArchivedProjectRow`、`ProjectStepRow`（4 种状态 + 不能排的 upcoming）、`PlanTaskRow`（one-off / step × 选中 / 取消）、`PlanHubHeader`。
- **Scenario 索引**加一条 Projects。

## i18n

- 新 namespace：`PlanHub`（标题、两个 tab）、`Projects`（列表、detail、行、banner、空状态；`Projects.ProjectModal.*`、`Projects.StepModal.*`）。
- 扩展：`Board.Card.stepContext`（`{number}/{count}`）、`Plan`（Project Steps 标签、带 step 的 summary、去向文案）、`Review`（Project Steps 一节）。
- 按钮和行内动作用 sentence case（New project、Add step、Save changes）；modal 标题是 header，保持 Title Case（New Project、Edit Step），和 mockup 一致。

---

## Executable plan

按 Q3 的推荐。每个 PR 都要：分层按 AGENTS（zod → service → DAL）；copy 进 `en.json`；推送前跑 `npm run format`；`tsc`、`lint`、`format:check`、`check:themes`、`build` 全绿；改写 README Current State，追加 Update Log；tracker 里删掉落地的那一条 sub-bullet。三个 PR 都没有 migration。

### PR 4a — Steps on the week

分支 `claude/week-model-pr4a-steps-on-the-week`。

1. DAL：`getProjectPathsByIds`、`getPlanStepsByPlanId`。
2. Board：`BoardData.projects`，`fetchBoard` 查 lookup；`toBoardCards` 的 PROJECT 分支（`ProjectStepContext`，path 的状态优先读 `localTasks`）；`StepPath`、`TaskCardHead.label`、两个 face；`taskKindStyle` 加 `track`。
3. Plan form：两个 page 读 step；`PlanTaskRow`（One-off 区块也改用它）；Project Steps 区块；create / update 的 payload 带 `projectStepIds`；禁用条件和 summary；`removedSteps` 进 diff 和 `ReviewChangesPanel`。
4. Design Console：board 和 plan 的 fixture、note；gallery 的 `StepPath`、project 卡片、`PlanTaskRow`。
5. 文档：`board.md`、`plan.md` 里 PR 4 的 *pending* 标记去掉；baseline 的「Project step cards」移到已实现。
6. **Done when**：在本地 Postgres 上用 Prisma Studio 或本地脚本建一个 project 和几个 step，挂到 active plan：board 上的 step 卡片显示 project 名、n/N 和 path，拖到 Done 时 path 立刻更新；把这个 plan 的周改成上周、触发 end-of-period sync 后，Create Plan 里 step 默认选中，取消一个，它回到 project，编号不变。

### PR 4b — Shared parts（纯重构）

分支 `claude/week-model-pr4b-shared-modal-parts`。

1. `ui/`：`tabStyles` + `LinkTabBar`（`TabBar` 改用 `tabStyles`）、`Banner`、`InlineConfirmButton`、`form/ModalFormFooter`、`EmptyState.variant`、`OverlayHeader.subtitle`。
2. `domain/shared/task-modal/`：`SizePicker`；`TaskModalPanel` 拆到自己的文件，改用 `SizePicker`、`ModalFormFooter`、`Banner`；删掉 `TaskModalFooter`；`utils/formErrors.ts`。
3. Design Console：ui gallery 的新条目；`ModalPanelFrame`。
4. **Done when**：Task modal 三种 mode 的 scenario（plan 的 New / Edit template、priorities 的 Add task）前后截图一致；gallery 的新条目在三个主题下检查过。

### PR 4c — Projects page

分支 `claude/week-model-pr4c-projects-page`。

1. Server：`fetchProjectsPage` + `fetchProjectsPageAction`；`utils/projectUtils.ts`（`assignStepNumbers` 等，`reorderProjectSteps` 改用它）；`useOptimisticTasks` 加多 task 的版本。
2. Routes：`/kanban/projects`、`/kanban/projects/[id]`、`loading.tsx`；`utils/planUtils.ts` 的两个 route helper；sidebar、dock、`AppShell`。
3. Hub：`PlanHubHeader`；`PlanChrome`（Q1）。
4. `utils/projectViewUtils.ts`；`domain/projects/` 的全部组件和 4 个 modal。
5. Design Console：Projects scenario、scenario 索引、domain gallery；plan scenario 的 header（Q1）。
6. 文档：`flows/projects.md` 的 status 行（Q2 选 A 时改 Landing 第 4 步）；baseline 的 Projects 移到已实现；`reference.md` 加新的 service 和 DAL；`design/README.md` 的 flows 列表；tracker（Q1 选 A 时改 Uniform page header 那一句）；按 Q4 删 mockup。
7. **Done when**：手动跑通原 spike 的路径——建 project → 加 step → 排进这周 → 在 board 上做完 → 下周 carry-over（用 4a 的办法切到下一周）；再跑一遍 edit / delete / reorder / archive / unarchive；在 mobile 宽度下走一遍 list → detail → back。

## 风险

- **`Droppable` 只能有一个 scroll parent**：detail 栏必须是唯一的滚动容器，`<main>` 必须是 `overflow-hidden`（`SELF_SCROLLING_PREFIXES`），mobile 的 detail 也一样。漏掉的话，拖动时的自动滚动会失灵。
- **Edit Plan 提交的是完整的 step 选择**：Edit Plan 打开期间在 Projects 页排进来的 step 不在表单里，提交时会被退回 project。One-off 现在也有同样的 race，这次不修。
- **Board 多一个查询**：只在 board 上有 step 时发生，按 id 查，只 select 四个字段。
- **Desktop 的选中不进 URL**：刷新后回到第一个 project（或 URL 里的那个）；浏览器后退不会逐个回到之前选过的 project。
- **4c 仍然偏大**：大部分是新组件和 scenario，逻辑集中在 adapter 和 container 两个文件里。

## Considered, not proposed · 考虑过但不提议

- **给 TaskModal 再加 4 个 mode**：`TaskModalPanel` 现在按 3 个 mode 分支 header、字段、action 和 footer；加到 7 个，goal、description、quadrant、delete、archive 全挤在一个 switch 里。抽出零件后，每个 panel 都是直的。
- **Desktop 的选中走 route 导航**：每点一次卡片就是一次 server render，要么等，要么闪 skeleton。也考虑过用 `history.replaceState` 只改 URL：之后的 revalidation 会按新 URL 渲染另一个 page segment，container 会 remount。
- **Projects 的 Zustand store**：和 board spike 的 Option B 一样，状态只有一个 owner，写入点都在它的子树里。
- **用 dnd-kit 做排序**：多一个依赖；`@hello-pangea/dnd` 已经支持竖向列表、handle 和触屏长按。
- **在 server 上算 view model**：schedule 和 reorder 是乐观的，view 必须基于 client 的 state 推导（和 board 一样）。
- **用 `ConfirmButton` 的整行样式做 Archive / Delete**：放不进 modal footer 的左侧，也不是 mockup 的样子。

## 批准之后

1. 按 Q1–Q4 的结论更新 tracker：Q3 选 A 时，PR 4 那一条 sub-bullet 换成 4a / 4b / 4c 三条；链接这份 spike。
2. 依次开 4a → 4b → 4c。4a 和 4b 互不依赖，可以并行；4c 依赖两者。
3. 这份 spike 之后不再更新；决定记在 tracker 和 Update Log。
