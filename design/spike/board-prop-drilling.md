# Spike: Simplify board prop drilling

**Status: awaiting owner review** · 2026-10-09 · 回答 tracker 条目 *Simplify board prop drilling*（Cross-cutting › Medium）· 相关：`design/flows/projects.md`（PR 4 加 project step 的卡片 face）、`design/spike/scenario-states-without-production-props.md`（no console-only props）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog、`KanbanBoard`、`habitWeeks` …），和代码、mockup、tracker 里的叫法一一对应。

## Trigger · 起因

board 每张卡片要用的输入，现在要穿过整棵组件树。有三个值在 `KanbanBoard` 里生成，一路往下传，直到 card face 才真正读：

| 值 | 在哪生成 | 只转手、不读的组件 | 在哪读 |
| --- | --- | --- | --- |
| `today` | `KanbanBoard`（`useMemo(getTodayDate)`） | `BoardColumn`、`DesktopBacklog`、`MobileBacklog`、`MobileBacklogContent`、`TaskCard`、`MobileBacklogCard` | `TaskCardFace`、`TaskCardMiniFace`（`isRolloverTask`） |
| `habitWeeks`（一个 `Map`） | `KanbanBoard`（`computeHabitWeeks`） | `MobileBacklog` | `BoardColumn`、`DesktopBacklog`、`MobileBacklogContent` 各自重复一遍 `habitWeeks.get(task.templateId)`，再把 `habitWeek` 经 `TaskCard` / `MobileBacklogCard` 传给 face |
| `onPull` | `KanbanBoard`（`handlePullToTodo`） | `MobileBacklog`、`MobileBacklogContent` | `MobileBacklogCard` |

board 的 14 个组件文件里，有 9 个带着这三个值中的至少一个，其中 6 个只是转手、自己从不读。Design Console 在 `MobileBacklogPanel` 和 4 个 gallery specimen 里又把同样的接线写了一遍。

而且这个问题会变大。已规划的工作还会给卡片加输入，走的是同一条路：

- **PR 4，project step 卡片**：project 名、step n of N、path 作为 signal（`baseline.md` › Phase 1）。这些都不在 `TaskItem` 上（它只有 `projectId` 和 `instanceIndex`），所以要从 server 带一个 `projects` lookup 下来，走 `habitWeeks` 现在走的路。
- **Per-kind risk rules**（Board › Future）：habit 的进度要 `today` 和剩余天数，step 要 carry 次数，one-off 要 due date。
- **Backlog stacking**（Board › Medium）：在列表层把重复的 habit 实例分组。

## 为什么会这样

被层层传递的这些值不是共享的可变状态，而是**卡片要用、但它的 `TaskItem` 上没有的输入**：几张 lookup 表和一个时钟，由每个叶子组件自己换算成该 kind 的 context 和 signal。换算散落在叶子里：

- `getTaskKind(task.type)` 在 `TaskCard`、`MobileBacklogCard`、`TaskCardFace`、`TaskCardMiniFace` 里各调一次。
- `isRolloverTask(task, today)` 在两个 face 里都跑一遍。
- `habitWeek` 在 4 个组件上都是可选 prop，因为只有一种 kind 有它。PR 4 会再给 step 加第二个可选 prop。

唯一的可变状态是 task 的 status。它只有一个 owner（`KanbanBoard`），两个写入点（拖拽结束、手机端 pull），都在这个 owner 的子树里。board 外面没有任何东西会写它。`ProgressDashboard` 和它是兄弟组件，但读的是 server 算好的指标，不读 tasks。

通读代码时另外发现两点：

- **`today` 有两个来源。** server 为了算指标在 `fetchBoard` 里算一次，`KanbanBoard` 在 client 上又算一次。因为它在 `KanbanBoard` 内部生成，board scenario 没法固定它：只有 mobile backlog panel 能接 `SCENARIO_TODAY`，fixture 只好让「今天」的 daily 实例用 `forDate: null` 来绕开。
- **board 的回滚还在用整张列表的快照。** `handleDragEnd` 和 `handlePullToTodo` 都先复制一份 `localTasks`，改一个 task，action 失败时整份恢复。这样恢复会把请求进行期间的其他移动也撤销掉。matrix 已经在 `runOptimisticTaskUpdate` 里修过这个问题（只回滚出错的那个 task），board 有两份同样的写法，bug 还在。

## Acceptance bar · 验收标准

- 没有组件转手它不读的 prop。中间层（列、backlog、sheet body）对 kind、habit、project、日期一无所知。
- 给卡片加一个输入（PR 4 的 project context、以后的某条 risk rule）时，只改算它的地方和显示它的 face，中间什么都不动。
- 卡片和 face 在 gallery 和 scenario 里仍然能直接用 fixture 渲染，没有 console-only props（scenario-states spike 定下的规则）。
- board scenario 能固定 `today`。
- 拖拽和 pull 的乐观更新照常工作，移动失败时只回滚那一个 task。

---

## Option A — 用 React context 传卡片输入

**Design**

- 新增一个 `BoardContext` provider（`domain/board/BoardContext.tsx`），由 `KanbanBoard` 挂载，里面放 `{today, habitWeeks, pullToTodo}`。PR 4 再加 `projects`。
- 叶子组件用 `useBoard()` 和一个小的 `useHabitWeek(task)` 读取，中间层去掉这三个 prop。
- 没挂 provider 时 `useBoard()` 直接 throw。如果给默认值静默兜底，habit 卡片会悄悄少了 dots，没人会发现。

```tsx
// domain/board/BoardContext.tsx
interface BoardContextValue {
  today: Date;
  habitWeeks: Map<string, HabitWeek>;
  pullToTodo: (taskId: string) => void;
}
const BoardContext = createContext<BoardContextValue | null>(null);
export const BoardProvider = ({value, children}: BoardProviderProps) => (
  <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
);
export const useBoard = () => {
  const board = useContext(BoardContext);
  if (!board) throw new Error('useBoard must be used inside BoardProvider');
  return board;
};

// TaskCardFace — reads instead of receiving
const {today} = useBoard();
const habitWeek = useHabitWeek(task);
```

**Pros**

- 改动最小，几乎都是删除。不加依赖，用的是 `BreakpointProvider` 已经在用的模式。
- 中间层变成纯 layout。

**Cons**

- **face 的输入被藏起来了。** `TaskCardFace` / `TaskCardMiniFace` / `MobileBacklogCard` 是 board 复用最多的组件（desktop board、两个 backlog、gallery、scenario）。每个复用的地方都要包 provider；gallery 里每个卡片 specimen 都得按 fixture 的 template 拼一个 `habitWeeks` map。
- **换算还留在原处。** face 仍然自己查 habit、判断 rollover、按 kind 分支。PR 4 会往 context 里加 `projects` map，再给 face 加一处查找。
- `habitWeek` 在 face 上仍是可选的，step 或 one-off 的 face 照样能被塞一个进去。

**Implementation plan**

1. 新增 `BoardContext.tsx`（provider、`useBoard`、`useHabitWeek`），`KanbanBoard` 用 provider 包住自己的树。
2. 从 `BoardColumn`、`DesktopBacklog`、`MobileBacklog`、`MobileBacklogContent`、`TaskCard`、`MobileBacklogCard` 去掉 `today` / `habitWeeks` / `onPull`，两个 face 改为读 context。
3. `today` 改由 server 提供：`fetchBoard` 把它已经算好的 `today` 一起返回，`BoardScreen` 往下传，scenario 传 `SCENARIO_TODAY`。
4. Design Console：`MobileBacklogPanel` 以及 TaskCard / mini face / MobileBacklogCard / BoardColumn 的 specimen 都包一个用 fixture 搭的 `BoardProvider`。
5. Size：**S**。约 15 个文件，大部分是删除；大约半天。

---

## Option B — Zustand board store，从 server hydrate

这是「server 端 fetch，hydrate 到 client store，之后 board 完全由 client 管理状态」的方向。

**Design**

- store 必须**每个请求新建一个，再通过 provider 往下传**。像 `sidebarStore` 那样的模块级 `create()` store 做不到这一点：
  - Next 也会在 server 上渲染 client 组件，而模块级 store 被这台 server 上的所有请求共用。如果在 render 时把一个用户的 tasks 写进去，可能会漏到另一个用户的 server 渲染 HTML 里。
  - 改成在 `useEffect` 里灌数据的话，server HTML 和 client 首屏都会是一个空 board。
  - Zustand 官方的 Next.js 写法是：用 `zustand/vanilla` 的 `createStore`，包在一个 client provider 里（`useState(() => createBoardStore(initial))`），再用 `useStore(store, selector)` 读。
- **State**：`{tasks, plan, today}`（PR 4 加 `projects`）。派生出来的 `habitWeeks` 在 store 的 setter 里重算，这样 selector 返回的引用是稳定的。**Actions**：`sync(tasks)`、`patchTask(id, patch)` / `revertTask(id, previous)`。
- **server action 不进 store**（AGENTS.md › State Management：store 里不做 DB 或 fetch 调用）。由 `src/hooks/` 里的 `useBoardMoves()` 负责：先乐观 patch，再调 `updateTaskStatusAction`，出错时 revert。
- **server 仍然是 source of truth。** dashboard 的指标来自一条 SQL 聚合，覆盖了 board 从不加载的 tasks（过期的、过去的实例），所以 client 算不出来。每次移动后 `revalidatePath('/kanban')` 会重新渲染页面，新 props 到达时 provider 必须调用 `sync(tasks)`。这和 board 现在的 `useEffect(() => setLocalTasks(tasks))` 是同一件事，只是搬进了 provider。所以「完全 client side」实际上是挡在 server 前面的一层乐观缓存，不是由 client 拥有的 board。

```tsx
// store/boardStore.ts
export const createBoardStore = (init: BoardInit) =>
  createStore<BoardState>()(set => ({
    ...init,
    habitWeeks: computeHabitWeeks(init.tasks, init.plan),
    sync: tasks => set(({plan}) => ({tasks, habitWeeks: computeHabitWeeks(tasks, plan)})),
    patchTask: (id, patch) => set(/* … */),
  }));

// domain/board/BoardStoreProvider.tsx ('use client')
const [store] = useState(() => createBoardStore({tasks, plan, today}));
useEffect(() => store.getState().sync(tasks), [store, tasks]);

// a face
const habitWeek = useBoardStore(s => (task.templateId ? s.habitWeeks.get(task.templateId) : undefined));
```

**Pros**

- 组件按 slice 订阅。一次拖拽可以只重渲染 selected slice 变了的卡片，而不是像现在这样整棵树都重渲染。不过目前没有任何测量说明这里慢，board 上只有几十张卡片。
- 状态和它的变化都集中在一个可测试的模块里，`KanbanBoard` 缩成 layout 加 DnD 接线。
- 给以后留了扩展空间：如果后续需要多个相距较远的组件写 board 状态，比如乐观更新的 dashboard，或者从卡片的 sheet 编辑 task。

**Cons**

- **解决的是 board 没有的问题。** 状态只有一个 owner，写入点都在 owner 的子树里，所以 store 主要是多了几层间接：provider、store 模块、bridge hook、selector。
- **引入第二种 store 模式。** 现在 `src/store/` 里的 store 都是全局的 UI 状态单例。这会是第一个从 server 数据 hydrate、每个实例一份的 store，需要在 AGENTS.md 里加规则，说明什么时候用哪种。
- **tasks 有两份副本。** server props 和 store 要手动保持同步。一次还在进行中的乐观 patch，可能被更早一次 revalidation 触发的 `sync` 覆盖掉，这和现在的 `useEffect` 是同一个 race。
- **Zustand v5 的 selector 陷阱。** 如果 selector 每次调用都返回新的数组或对象（`s.tasks.filter(…)`），会触发无限重渲染警告，除非包 `useShallow`，或者在 store 里预先算好。
- **per-kind 的换算问题没解决。** 和 Option A 一样，face 仍然自己查找、自己换算 context，只是从 props 换成了 selector。
- gallery 或 scenario 里每个卡片 / 列的 specimen 都要用 fixture 搭一个 store。

**Implementation plan**

1. `src/store/boardStore.ts`（`createBoardStore`，state 加派生的 `habitWeeks`，`sync` / `patchTask` / `revertTask`），以及 `domain/board/BoardStoreProvider.tsx`（每实例一个 store，新 props 到达时 `sync`）。
2. `src/hooks/useBoardMoves.ts`：乐观移动、调用 action、按 task 回滚。取代 `handleDragEnd` 的写入部分和 `handlePullToTodo`。
3. `BoardScreen` 用 `tasks` / `plan` / `today` 挂载 provider（`today` 来自 server，同 A）。`KanbanBoard`、列、backlog、卡片都改用 selector 读，去掉数据 props。
4. Design Console：加一个 fixture store 的 helper，包住 board scenario 的 panel 和卡片 / 列的 specimen。
5. AGENTS.md › State Management：说明什么时候用每实例（server hydrate）的 store、什么时候用全局 store，附 bad / good 示例。
6. Size：**M**。约 20 个文件，外加一条新规范；大约 1–1.5 天，包括验证 sync race 和 DnD 卡片回弹的时间。

---

## Option C — 卡片 view model：算一次，传一张 card

**Design**

- 用一个纯函数把 tasks 和 board 的输入换算成 **card model**，并且已经按 status 分好组、排好序。每个 model 是一个按 kind 区分的 union，正好带着该 kind 的 face 要显示的东西。`toBoardCards` 取代现在的 `groupAndSortTasks` 调用，并吸收 `computeHabitWeeks` 和叶子组件里的 `isRolloverTask` / `getTaskKind`。
- 列表接收 `cards`。卡片和 face 只接收一个 `card`，然后 `switch (card.kind)`：TypeScript 会收窄到 habit 的 `habitWeek` / `rolloverFrom`，PR 4 再给 project step 加 `step`。不再有按 kind 区分的可选 prop。
- `KanbanBoard` 基于乐观的 `localTasks` 用 `useMemo` 换算，这样 habit 卡片拖到 Done 的那一刻 dots 就会更新。也正因为这一点，换算必须在 client 上跑。server 负责提供输入：`today`（单一来源，scenario 可以固定它），以及 PR 4 的 project lookup。

```ts
// utils/boardCardUtils.ts (client-safe)
export type BoardCard =
  | {kind: typeof TaskKind.HABIT; task: TaskItem; habitWeek: HabitWeek | null; rolloverFrom: Date | null}
  | {kind: typeof TaskKind.PROJECT; task: TaskItem} // PR 4: + step: {projectName, number, count, path}
  | {kind: typeof TaskKind.ONE_OFF; task: TaskItem};

export function toBoardCards(
  tasks: TaskItem[],
  {plan, today}: BoardCardInputs, // PR 4: + projects
): Record<BoardStatus, BoardCard[]> { /* group + sort + derive per kind */ }
```

```tsx
// KanbanBoard
const columns = useMemo(() => toBoardCards(localTasks, {plan, today}), [localTasks, plan, today]);
<BoardColumn status={TaskStatus.TODO} cards={columns[TaskStatus.TODO]} isDragActive={isDragging} />
<DesktopBacklog cards={columns[TaskStatus.BACKLOG]} />
<MobileBacklog cards={columns[TaskStatus.BACKLOG]} onPull={pullToTodo} />

// BoardColumn / DesktopBacklog
{cards.map((card, index) => <TaskCard key={card.task.id} card={card} index={index} />)}

// TaskCardFace
const renderContext = () => {
  switch (card.kind) {
    case TaskKind.HABIT:
      return card.rolloverFrom ? <>↩ {formatShortDate(card.rolloverFrom)}</> : card.habitWeek && renderPlanLine(card.habitWeek);
    case TaskKind.ONE_OFF:
      return card.task.quadrant ? tCard(`Quadrant.${card.task.quadrant}`) : null;
    default:
      return null;
  }
};
```

改完之后，每个 prop 都在它被传到的那一层被读。唯一的例外是 `onPull`：`MobileBacklogContent` 还要转手一次（sheet → body → card）。

**Pros**

- **治的是原因，不只是换一种传法。** 换算只在一个纯函数里做一次，face 只负责渲染。`getTaskKind` 和 `isRolloverTask` 从组件里消失。
- **PR 4 和 risk rules 只落在两处**：`toBoardCards` 里加一个分支，加上显示它的 face。列、backlog、sheet 都不用动。
- **显式且有类型。** 每个调用处都看得到输入；kind union 让 step 的 face 不可能拿到 `habitWeek`。
- **哪里都不需要 provider。** gallery 和 scenario 的 fixture 直接声明 card model（`TASK_CARD_FIXTURES` 本来就是 task 配 `habitWeek`），`MobileBacklogPanel` 传 `cards` 即可。
- **`toBoardCards` 是纯函数**，仓库以后加测试时可以直接做单元测试。backlog stacking 分组重复 habit 实例也正好放在这里。
- 不加依赖、不加新模式，延续现有 `taskUtils` 的做法。

**Cons**

- 本质上还是 props。每层一个 `cards` / `card`，取代原来的 `tasks + today + habitWeeks`；`onPull` 还留一层转手。
- 多了一个要维护的类型（`BoardCard`），和 `TaskItem` 平行。给 card face 加字段时，可能要改两处（model 和 face）。
- 每次乐观更新都会重新换算。工作量和现在的 `groupAndSortTasks` + `computeHabitWeeks` 一样是 O(n)，只是合进了一个 memo。

**Implementation plan**

1. `src/utils/boardCardUtils.ts`：`BoardCard` union 和 `toBoardCards`，由 `sortTasks`、`computeHabitWeeks` 和 rollover 判断组成。`groupAndSortTasks` 并进去；`isRolloverTask` 从组件里拿掉，只在别处还需要时才保留 export。
2. `fetchBoard` 返回 `today`，`BoardScreen` → `KanbanBoard` 作为 prop 接收（scenario 传 `SCENARIO_TODAY`）。
3. `KanbanBoard` 用 `useMemo` 算出 `columns`。`BoardColumn` / `DesktopBacklog` / `MobileBacklog` / `MobileBacklogContent` 接收 `cards`；`TaskCard` / `MobileBacklogCard` / `TaskCardFace` / `TaskCardMiniFace` 接收 `card`，按 `card.kind` 分支。
4. Design Console：fixture 改成 card model（加一个小的 `habitCard()` / `oneOffCard()` helper），`MobileBacklogPanel` 接收 `cards`。
5. Size：**S–M**。约 17 个文件，大部分是签名改动；大约半天到一天。之后 PR 4 在此基础上加 project 分支。

---

## Along the way · 顺手可做（与选哪个方案无关）

通读代码时发现的清理项。每一项都很小，可以放进最终落地的任一方案：

1. **一个乐观写入入口，按 task 回滚。** 把 `handleDragEnd` 的写入部分和 `handlePullToTodo` 合成一个 `moveTask(taskId, status)`，回滚只恢复那一个 task，也就是 matrix 已经做过的修复。matrix 的 `runOptimisticTaskUpdate` 和 board 的版本可以合成一个共享的 `useOptimisticTasks(tasks)` hook（`src/hooks/`），返回 `[localTasks, patchTask]`。
   - React 19 自带的 `useOptimistic` 是另一个选择，还能去掉 `useEffect` 同步。需要先验证一点：`@hello-pangea/dnd` 要求在 `onDragEnd` 里同步完成重排，在 transition 里 dispatch 的乐观更新必须在卡片回弹之前生效。
2. **`today` 由 server 提供**（三个方案的计划里都包含了）。指标和卡片用同一个时钟，board scenario 也能固定它。
3. **让 `fetchBoard` 直接给出页面要的 props 结构。** 返回 `{plan, tasks, today, progress}`，`page.tsx` 就不用再手动列 9 个进度字段。
4. **缩小传给 client 的 plan。** `BoardScreen` 的类型是 `BoardPlan`，但页面实际传的是完整的 `PlanWithTemplates`（user id、每个 template 的 title 和 description），全部被序列化进 client payload。在 server 上映射成 `BoardPlan`，就只会发送 `periodKey`、`mode` 和 plan lines。

## Considered, not proposed · 考虑过但不提议

- **全局 `create()` store，在 effect 里灌数据。** 首次渲染是空 board（server HTML 和 client 首屏都是）；如果改在 render 时写入，又会让所有 server 请求共用一个 store。每请求一份的写法见 Option B。
- **用 TanStack Query / SWR 做 client 缓存。** 和 app 全局在用的 server action + `revalidatePath` 模式重复，只为一个页面加一个依赖。
- **Jotai 或其他 atom 库。** 取舍和 Option B 一样，还多一个新依赖。
- **face 自己调用 `getTodayDate()`。** 能少一个 prop，但 scenario 就没法固定日期了，而且午夜前后 server 渲染的卡片可能和 hydrate 后的不一致。
- **在 server 上算 card model。** habit 卡片拖到 Done 时 dots 要立刻更新，所以换算必须基于 client 的乐观 tasks 重新跑。server 只负责提供输入。
- **Composition（列和 backlog 接收 `children`）。** 这是 React 在建议用 context 之前的第一选择：`KanbanBoard` 渲染卡片，中间层只负责排版。它能连 `cards` prop 和 `onPull` 那一层转手都去掉，但会把列表渲染（key、`Draggable` 的 index、空状态、计数）都搬进 `KanbanBoard`，而它已经是 board 最大的文件。如果以后确实要去掉那一层转手，可以叠加在 Option C 之上。

## Comparison · 对比

| | A · Context | B · Zustand store | C · Card view model |
| --- | --- | --- | --- |
| 剩下的转手 prop | 无 | 无 | `onPull` 一层 |
| per-kind 换算在哪 | 仍在 face 里 | 仍在 face 里（通过 selector） | 一个纯函数 |
| PR 4 的 project context 要改 | context value + 各 face | store state + selector + 各 face | `toBoardCards` + step face |
| face 能否直接用 fixture 渲染 | 要包 provider | 要搭 fixture store | 直接传 props |
| 调用处能否看到输入 | 不能 | 不能 | 能 |
| 一次拖拽的重渲染 | 整棵树，同现在 | 只有 slice 变了的卡片 | 整棵树，同现在 |
| 新模式 / 新依赖 | 无 | 每实例 store + AGENTS 规则 | 无 |
| Size | S（~15 个文件，~½ 天） | M（~20 个文件，~1–1.5 天） | S–M（~17 个文件，~½–1 天） |

## Decision framing · 怎么选

关键在于怎么看这些被层层传递的值：是**叶子组件该自己去拿的环境值**（A、B），还是**board 应该一次算好的每张卡片的事实**（C）。

- 选 **A**：最快缓解、改动最少。代价是 face 的输入被藏起来，换算仍然分散在叶子里。
- 选 **B**：如果预计 board 会出现多个相距较远、要写 task 状态的组件（乐观更新的 dashboard、从卡片编辑 task）。目前只有一个 owner，写入点都在它的子树里，B 的大部分机制会闲置。
- 选 **C**：把要传的东西本身去掉，从而消除 drilling。卡片拿到的是算好的 model，中间层对 kind 一无所知，PR 4 和 risk rules 都只有一个地方加 context。

**Recommendation: C**，加上 *Along the way* 的第 1、2 项。在 PR 4 之前落地，这样 project 卡片一开始就是 `BoardCard` 的一个分支，而不是第四个被层层传递的 prop。

**什么时候回头考虑 B**：当 `KanbanBoard` 子树以外的组件需要读或写乐观 task 状态时（dashboard 在拖拽时更新、卡片 sheet 编辑 task），再把状态提升到每请求一份的 store。届时 C 的 `toBoardCards` 可以原样变成这个 store 的派生 selector。

## After the decision · 拍板之后

1. 实现选定方案的计划和同意的 *Along the way* 项，同一个 PR 里更新 board scenario 和 gallery 的 fixture。
2. 如果这个决定形成了一条规范（比如「每张卡片的 context 在 view model 里算一次；卡片只接收一个 model」），把它加到 AGENTS.md › Coding Conventions › JSX & components 的末尾，附 bad / good 示例。
3. 关闭 tracker 条目，在 README Update Log 里记录结果。
