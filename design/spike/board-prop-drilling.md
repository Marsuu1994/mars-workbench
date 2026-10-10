# Spike: Simplify board prop drilling

**Status: awaiting owner review** · 2026-10-10 · 回答 tracker 条目 *Simplify board prop drilling*（Cross-cutting › Medium）· 相关：`design/flows/projects.md`（PR 4 加 project step 的卡片 face）、`design/spike/scenario-states-without-production-props.md`（no console-only props）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog、`KanbanBoard`、`habitWeeks` …），和代码、mockup、tracker 里的叫法一一对应。

这份 spike 分两部分。第一部分是 prop drilling 本身：起因、诊断，以及三个方案（每个方案用同一组 example 对比）。第二部分是从 route 到卡片的 component tree 检视。tree 里多余的 wrapper 和重复渲染，**跟 drilling 不是同一个问题**（wrapper div 不传 props），只是和方案 C 改的是同一批文件，所以放在一起看。

---

## Trigger · 起因

board 上的 props 一层层往下传，读起来累，也不好改。#52 去掉 rollover 之后，`today` 已经不在卡片链路上了（原来经过 6 个组件）。现在还有两个值从 `KanbanBoard` 一路传到卡片：

| 值 | 在哪生成 | 只转手、不读的组件 | 在哪读 |
| --- | --- | --- | --- |
| `habitWeeks`（`Map<templateId, HabitWeek>`） | `KanbanBoard`（`computeHabitWeeks`） | `MobileBacklog` | `BoardColumn`、`DesktopBacklog`、`MobileBacklogContent` 各自重复一遍 `habitWeeks.get(task.templateId)`，再把 `habitWeek` 经 `TaskCard` / `MobileBacklogCard` 转给 face；face 又用 `habitWeek.slotByTaskId.get(task.id)` 找自己那颗 ringed dot |
| `onPull` | `KanbanBoard`（`handlePullToTodo`） | `MobileBacklog`、`MobileBacklogContent` | `MobileBacklogCard` |

board 的 14 个组件文件里，有 10 个带着这两个值中的至少一个，其中 4 个只是转手。Design Console 在 scenario 的 `MobileBacklogPanel`、gallery 的 4 个 specimen 和 `BOARD_COLUMN_HABIT_WEEKS` fixture 里又把同样的接线写了一遍。

已规划的工作还会给卡片加输入，按现在的结构都会走同一条路：

- **PR 4，project step 卡片**：project 名、step n of N、path 作为 signal（`baseline.md` › Phase 1）。`TaskItem` 上只有 `projectId` 和 `instanceIndex`，所以要从 server 带一个 `projects` lookup 下来，沿 `habitWeeks` 的路径传。
- **Per-kind risk rules**（Board › Future）：habit pace 要用 `today` 和剩余天数，step 要 carry 次数，one-off 要 due date。`today` 会沿着 #52 刚拆掉的那条路回来。
- **Backlog stacking**（Board › Medium）：在列表层把同一个 habit 的重复实例叠起来。

## Component tree · 从 route 到一张卡片

桌面端、Todo 列里的一张 habit 卡。右边标的是该组件接收的、和卡片有关的 props；★ 是第二部分的检视发现。

```text
RootLayout (server)                    getUser · getActivePlan · theme cookie            ★9
└ <html data-theme><body>
  └ NextIntlClientProvider
    ├ ServiceWorkerRegistrar           → null
    └ BreakpointProvider               context：isMobile（SSR 默认 desktop）
      └ AppShell (client)              usePathname · sidebarStore · settingsStore
        └ div.fx-shell-bg
          ├ AppSidebar · BottomTabBar · SettingsSheet
          └ main.overflow-hidden
            └ Suspense ← loading.tsx                                                     ★8
              └ KanbanPage (server)    fetchBoard → ensureSynced …
                └ BoardScreen (server) plan · progress · tasks
                  └ div.flex-col.h-full
                    ├ BoardHeader (client)                                               ★3 ★5
                    ├ ProgressDashboard (client)                                         ★5
                    └ div.flex-1.min-h-0                                                 ★4
                      └ KanbanBoard (client)   tasks · plan → localTasks · habitWeeks · columns
                        └ DragDropContext
                          ├ div.flex.h-full                                              ★4
                          │ ├ div（横向滚动容器）
                          │ │ └ BoardColumn ×2         tasks · habitWeeks · isDragActive
                          │ │   └ Droppable → div（列外框）
                          │ │     ├ div header › div(led + h2) + badge
                          │ │     └ div（droppable list）
                          │ │       └ TaskCard          task · index · habitWeek
                          │ │         └ Draggable → div.card
                          │ │           ├ div.md:hidden                                  ★1 ★7
                          │ │           │ └ TaskCardMiniFace   task · habitWeek
                          │ │           │   └ TaskCardHead · h3 · HabitSignal · SizeChip
                          │ │           └ div.hidden.md:flex                             ★1 ★7
                          │ │             └ TaskCardFace       task · habitWeek
                          │ │               └ TaskCardHead · h3 · p · HabitSignal · SizeChip
                          │ └ DesktopBacklog          tasks · habitWeeks                 ★6
                          │   └ … Droppable › TaskCard（同上）
                          └ MobileBacklog             tasks · habitWeeks · onPull
                            └ OverlayShell › OverlayHeader + hint                        ★2
                              └ MobileBacklogContent   tasks · habitWeeks · onPull
                                └ MobileBacklogCard    task · habitWeek · onPull
                                  └ TaskCardFace（同上）
```

drilling 的深度取决于数据要经过几层**组件**（`KanbanBoard` → 列 / backlog（→ `MobileBacklogContent`）→ 卡片 → face），和中间包了几个 div 无关。

## 为什么会这样

被层层传递的值不是共享的可变状态，而是**卡片要用、但它的 `TaskItem` 上没有的输入**：一张 lookup 表，由每个叶子组件自己换算成该 kind 的 context 和 signal。换算散落在叶子里：

- `getTaskKind(task.type)`：`TaskCard`、`MobileBacklogCard`、`TaskCardFace`、`TaskCardMiniFace`，4 处。
- `habitWeeks.get(task.templateId)`：`BoardColumn`、`DesktopBacklog`、`MobileBacklogContent`，3 处。
- `habitWeek.slotByTaskId.get(task.id)`：两个 face，2 处。
- `habitWeek?` 在 4 个组件上都是可选 prop，因为只有一种 kind 有它。PR 4 会再给 step 加第二个可选 prop。

唯一的可变状态是 task 的 status。它只有一个 owner（`KanbanBoard`），两个写入点（拖拽结束、手机端 pull），都在这个 owner 的子树里。board 外面没有任何东西会写它。`ProgressDashboard` 读的是 server 算好的指标，不读 tasks。

还有一个和方案无关的发现：**board 的回滚用的是整张列表的快照。** `handleDragEnd` 和 `handlePullToTodo` 都先复制一份 `localTasks`，改一个 task，action 失败时整份恢复。这会把请求进行期间的其他移动也撤销掉。matrix 已经在 `runOptimisticTaskUpdate` 里改成只回滚出错的那个 task，board 有两份同样的写法，bug 还在（见 *Along the way*）。

## Acceptance bar · 验收标准

- 没有组件转手它不读的 prop。中间层（列、backlog、sheet）对 kind、habit、project 一无所知。
- 给卡片加一个输入（PR 4 的 project context、某条 risk rule）时，只改算它的地方和显示它的 face，中间不动。
- 卡片和 face 在 gallery 和 scenario 里仍能直接用 fixture 渲染，没有 console-only props。
- 拖拽和 pull 的乐观更新照常工作，移动失败时只回滚那一个 task。

---

# Part 1 · Prop drilling 的方案

每个方案都用同一组 example，方便横向对比：

- **例 1**：habit 卡片拿到自己的 dots 和 ringed dot
- **例 2**：PR 4，给 project step 加 context（project 名、step n/N、path）
- **例 3**：手机 backlog 的 pull（`onPull`）
- **例 4**：Design Console，gallery 里渲染一张 `TaskCard` 和一个 `BoardColumn`
- **例 5**：per-kind risk rule 让 `today` 回来（habit pace）

## Option A — React context 传卡片输入

**Design**

`KanbanBoard` 挂一个 `BoardContext` provider（`domain/board/BoardContext.tsx`），里面放 `{habitWeeks, pullToTodo}`。叶子组件用 `useBoard()` 读，中间层去掉这两个 prop。没挂 provider 时 `useBoard()` 直接 throw，避免 habit 卡片悄悄少了 dots。

```tsx
// domain/board/BoardContext.tsx
interface BoardContextValue {
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

// KanbanBoard
<BoardProvider value={{habitWeeks, pullToTodo}}>
  <BoardColumn status={TaskStatus.TODO} tasks={columns[TaskStatus.TODO]} isDragActive={isDragging} />
  …
</BoardProvider>
```

**Examples**

例 1 · habit dots：face 自己查 lookup，再找自己的 slot。

```tsx
// TaskCardFace / TaskCardMiniFace
const {habitWeeks} = useBoard();
const habitWeek = task.templateId ? habitWeeks.get(task.templateId) : undefined;
<HabitSignal habitWeek={habitWeek} currentSlot={habitWeek?.slotByTaskId.get(task.id)} variant="card" />
```

例 2 · PR 4：context 加一张 `projects` 表，两个 face 各加一处查找和换算。

```tsx
// KanbanBoard
<BoardProvider value={{habitWeeks, projects, pullToTodo}}>
// TaskCardFace（TaskCardMiniFace 同样再写一遍）
const {projects} = useBoard();
const project = task.projectId ? projects.get(task.projectId) : undefined;
const stepCount = project?.steps.length ?? 0; // step n/N、path 都在 face 里算
```

例 3 · pull：`MobileBacklogCard` 从 context 拿 `pullToTodo`，`MobileBacklog` 和 `MobileBacklogContent` 不再转手。

```tsx
// MobileBacklogCard
const {pullToTodo} = useBoard();
<button onClick={() => pullToTodo(task.id)}>…</button>
```

例 4 · gallery：每个 specimen 都要包一个 provider，并按 fixture 的 template 拼 `habitWeeks`。

```tsx
<BoardProvider value={{habitWeeks: GALLERY_HABIT_WEEKS, pullToTodo: () => undefined}}>
  <TaskCard task={fixture.task} index={index} />
</BoardProvider>
```

例 5 · risk：context 加 `today`，face 自己算 pace。

```tsx
const {today} = useBoard();
const paceRisk = habitWeek && getHabitPaceRisk(habitWeek, today); // 假设的 helper，risk rules 时再定
```

**Pros**

- 改动最小，几乎都是删除。不加依赖，用的是 `BreakpointProvider` 已经在用的模式。
- 中间层变成纯 layout，`onPull` 的转手也没了。

**Cons**

- **face 的输入被藏起来了。** `TaskCardFace` / `TaskCardMiniFace` / `MobileBacklogCard` 是复用最多的组件（desktop board、两个 backlog、gallery、scenario），每个复用的地方都要包 provider（例 4）。
- **换算还留在原处，而且会越来越多。** face 仍然自己查 lookup、找 slot、按 kind 分支。PR 4 和 risk rules 都要两个 face 各写一遍（例 2、例 5）。
- 按 kind 区分仍是运行时判断（`task.templateId`、`kind === TaskKind.HABIT`），没有类型保护。

**Implementation plan**

1. 新增 `BoardContext.tsx`（provider、`useBoard`），`KanbanBoard` 用 provider 包住自己的树。
2. 从 `BoardColumn`、`DesktopBacklog`、`MobileBacklog`、`MobileBacklogContent`、`TaskCard`、`MobileBacklogCard` 去掉 `habitWeeks` / `habitWeek` / `onPull`；两个 face 和 `MobileBacklogCard` 改读 context。
3. Design Console：scenario 的 `MobileBacklogPanel` 和 TaskCard / mini face / MobileBacklogCard / BoardColumn 的 specimen 都包 `BoardProvider`；`BOARD_COLUMN_HABIT_WEEKS` 改成 provider 的 value。
4. Size：**S**。约 14 个文件，大部分是删除；大约半天。

---

## Option B — Zustand board store，从 server hydrate

这是「server fetch，hydrate 到 client store，之后 board 完全由 client 管理状态」的方向。

**Design**

- store 必须**每个请求新建一个，再通过 provider 往下传**。像 `sidebarStore` 那样的模块级 `create()` store 不行：
  - Next 也会在 server 上渲染 client 组件，模块级 store 被这台 server 上的所有请求共用。在 render 时写入一个用户的 tasks，可能漏到另一个用户的 server 渲染 HTML 里。
  - 改成在 `useEffect` 里灌数据，server HTML 和 client 首屏都会是空 board。
  - Zustand 官方的 Next.js 写法：用 `zustand/vanilla` 的 `createStore`，包在 client provider 里（`useState(() => createBoardStore(initial))`），用 `useStore(store, selector)` 读。
- **State**：`{tasks, plan}`（PR 4 加 `projects`）。派生的 `habitWeeks` 在 setter 里重算，selector 返回的引用才稳定。**Actions**：`sync(tasks)`、`patchTask(id, patch)`、`revertTask(id, previous)`。
- **server action 不进 store**（AGENTS.md › State Management）。由 `src/hooks/useBoardMoves.ts` 负责：乐观 patch → 调 `updateTaskStatusAction` → 出错时按 task revert。
- **server 仍然是 source of truth。** dashboard 的指标来自 SQL 聚合，覆盖了 board 不加载的 tasks（过期的、过去的实例），client 算不出来。每次移动后 `revalidatePath('/kanban')` 会重新渲染页面，新 props 到达时 provider 要 `sync(tasks)`，也就是现在的 `useEffect(() => setLocalTasks(tasks))` 搬了个家。所以「完全 client side」实际上是挡在 server 前面的一层乐观缓存。

```tsx
// store/boardStore.ts
export const createBoardStore = ({tasks, plan}: BoardInit) =>
  createStore<BoardState>()(set => ({
    tasks,
    plan,
    habitWeeks: computeHabitWeeks(tasks, plan),
    sync: nextTasks => set(({plan}) => ({tasks: nextTasks, habitWeeks: computeHabitWeeks(nextTasks, plan)})),
    patchTask: (id, patch) => set(/* … 同时重算 habitWeeks */),
    revertTask: (id, previous) => set(/* … */),
  }));

// domain/board/BoardStoreProvider.tsx ('use client')
const [store] = useState(() => createBoardStore({tasks, plan}));
useEffect(() => store.getState().sync(tasks), [store, tasks]);

// hooks/useBoardMoves.ts
const moveTask = (taskId: string, status: TaskStatus) => {
  const previous = store.getState().tasks.find(task => task.id === taskId);
  store.getState().patchTask(taskId, {status});
  updateTaskStatusAction(taskId, {status}).then(result => {
    if (result.error && previous) store.getState().revertTask(taskId, previous);
  });
};
```

**Examples**

例 1 · habit dots：face 用 selector 读自己那条 habit。

```tsx
const habitWeek = useBoardStore(state =>
  task.templateId ? state.habitWeeks.get(task.templateId) : undefined,
);
<HabitSignal habitWeek={habitWeek} currentSlot={habitWeek?.slotByTaskId.get(task.id)} variant="card" />
```

例 2 · PR 4：store 加 `projects`，face 加 selector，换算仍在 face 里。

```tsx
const project = useBoardStore(state =>
  task.projectId ? state.projects.get(task.projectId) : undefined,
);
```

例 3 · pull：`MobileBacklogCard` 调 hook。卡片不再是纯展示组件。

```tsx
const {moveTask} = useBoardMoves();
<button onClick={() => moveTask(task.id, TaskStatus.TODO)}>…</button>
```

例 4 · gallery：每个 specimen 都要一个用 fixture 搭的 store；想展示某个 dots 状态，得先造出能算出它的 tasks + plan。

```tsx
<BoardStoreProvider tasks={GALLERY_TASKS} plan={GALLERY_PLAN}>
  <TaskCard task={fixture.task} index={index} />
</BoardStoreProvider>
```

例 5 · risk：store 加 `today`（server 提供），selector 里算 pace。注意 selector 不能每次返回新对象（见 Cons）。

```tsx
const paceRisk = useBoardStore(state => getHabitPaceRisk(state.habitWeeks.get(templateId), state.today));
```

**Pros**

- 组件按 slice 订阅：一次拖拽可以只重渲染 slice 变了的卡片（现在是整棵树）。不过没有任何测量说明这里慢，board 上只有几十张卡片。
- 状态和变化集中在一个可测试的模块里，`KanbanBoard` 缩成 layout 加 DnD 接线。
- 给以后留了空间：如果需要多个相距较远的组件写 board 状态（乐观更新的 dashboard、从卡片 sheet 编辑 task）。

**Cons**

- **解决的是 board 没有的问题。** 状态只有一个 owner，写入点都在它的子树里，store 主要是多了几层间接：provider、store 模块、bridge hook、selector。
- **引入第二种 store 模式。** `src/store/` 现在都是全局的 UI 状态单例。这会是第一个从 server 数据 hydrate、每实例一份的 store，需要在 AGENTS.md 加规则说明什么时候用哪种。
- **tasks 有两份副本。** server props 和 store 要手动同步，进行中的乐观 patch 可能被更早一次 revalidation 触发的 `sync` 覆盖，和现在的 `useEffect` 是同一个 race。
- **Zustand v5 的 selector 陷阱。** selector 每次返回新数组或对象（`state.tasks.filter(…)`）会触发无限重渲染警告，除非包 `useShallow` 或在 store 里预先算好。
- **换算问题没解决。** 和 A 一样，face 仍然自己查找、自己换算（例 2、例 5），只是从 props 换成了 selector。
- 卡片读 hook 之后（例 3）不再是纯展示组件，gallery 每个 specimen 都要搭 store（例 4）。

**Implementation plan**

1. `src/store/boardStore.ts`（`createBoardStore`、派生 `habitWeeks`、`sync` / `patchTask` / `revertTask`）和 `domain/board/BoardStoreProvider.tsx`（每实例一个 store，新 props 到达时 `sync`）。
2. `src/hooks/useBoardMoves.ts`：取代 `handleDragEnd` 的写入部分和 `handlePullToTodo`。
3. `BoardScreen` 挂载 provider。`KanbanBoard`、列、backlog、卡片改用 selector，去掉数据 props。
4. Design Console：fixture store helper，包住 scenario panel 和各 specimen。
5. AGENTS.md › State Management：每实例 store 和全局 store 各自的适用场景，附 bad / good 示例。
6. Size：**M**。约 18 个文件加一条新规范；大约 1–1.5 天，包括验证 sync race 和 DnD 卡片回弹。

---

## Option C — 卡片 view model：算一次，传一张 card

**Design（三种传递方式共用）**

- 一个纯函数把 tasks 和 board 的输入换算成 **card model**，并且已经按 status 分组、排好序。每个 model 是按 kind 区分的 union，正好带着该 kind 的 face 要显示的东西。`toBoardCards` 取代 `groupAndSortTasks` 的调用，吸收 `computeHabitWeeks`，以及叶子组件里的 `getTaskKind` 和 slot 查找。
- 卡片和 face 只接收一个 `card`，`switch (card.kind)`，TypeScript 自动收窄。不再有按 kind 区分的可选 prop。
- `KanbanBoard` 基于乐观的 `localTasks` 用 `useMemo` 换算，所以 habit 卡片拖到 Done 的那一刻 dots 就会更新。也因为这一点，换算必须在 client 上跑；server 只提供输入（`plan`，PR 4 的 `projects`，risk rules 的 `today`）。
- 卡片的 `currentSlot` 由 `toBoardCards` 直接给出，`HabitWeek.slotByTaskId` 就只是换算过程里的中间结果，可以从类型里拿掉。

```ts
// utils/boardCardUtils.ts（client-safe）
export type BoardCard =
  | {kind: typeof TaskKind.HABIT; task: TaskItem; habitWeek: HabitWeek | null; currentSlot: number | null}
  | {kind: typeof TaskKind.PROJECT; task: TaskItem} // PR 4：+ step
  | {kind: typeof TaskKind.ONE_OFF; task: TaskItem};

export function toBoardCards(
  tasks: TaskItem[],
  {plan}: BoardCardInputs, // PR 4：+ projects · risk rules：+ today
): Record<BoardStatus, BoardCard[]> {
  const habitWeeks = computeHabitWeeks(tasks, plan);
  const toCard = (task: TaskItem): BoardCard => {
    const kind = getTaskKind(task.type);
    switch (kind) {
      case TaskKind.HABIT: {
        const habitWeek = (task.templateId && habitWeeks.get(task.templateId)) || null;
        return {kind, task, habitWeek, currentSlot: habitWeek?.slotByTaskId.get(task.id) ?? null};
      }
      default:
        return {kind, task};
    }
  };
  // group by status + sortTasks（原 groupAndSortTasks），再 map(toCard)
}

// KanbanBoard
const columns = useMemo(() => toBoardCards(localTasks, {plan}), [localTasks, plan]);
```

数据怎么从 `KanbanBoard` 交到卡片，有三种方式。中间层总得知道「这一列渲染哪些卡、什么顺序」，所以区别不在于接不接数据，而在于接什么：

| | C1 · Props | C2 · Context + container | C3 · Composition |
| --- | --- | --- | --- |
| 中间层接什么 | `cards`（自己要渲染的列表） | `taskIds` | `count` + `children` |
| 中间层 import 卡片组件 | 是 | 是（container） | 否 |
| 谁渲染列表（key、`Draggable` index、空状态） | 列 / backlog 自己 | 列 / backlog 自己 | `KanbanBoard` |

**C1 · Props**：列接收 `cards`，自己 map。这不算 drilling：列会用它来 map 和计数。

```tsx
<BoardColumn status={TaskStatus.TODO} cards={columns[TaskStatus.TODO]} isDragActive={isDragging} />
// BoardColumn
{cards.map((card, index) => <TaskCard key={card.task.id} card={card} index={index} />)}
```

**C2 · Context + container**：card model 放进 context，每张卡外面包一层 container，按 id 取数据交给纯展示的 `TaskCard`。

```tsx
// KanbanBoard
<BoardCardsProvider value={{cardsById, pullToTodo}}>
  <BoardColumn status={TaskStatus.TODO} taskIds={columnIds[TaskStatus.TODO]} isDragActive={isDragging} />
</BoardCardsProvider>
// BoardColumn
{taskIds.map((id, index) => <TaskCardContainer key={id} taskId={id} index={index} />)}
// TaskCardContainer
const card = useBoardCard(taskId);
return <TaskCard card={card} index={index} />;
```

中间层仍要接一个列表（id 换掉了 card），还多了 context / provider 和两个 container（`TaskCard`、`MobileBacklogCard` 各一个）。普通 context 的 value 一变，所有 container 都会重渲染，所以也拿不到按卡片更新的好处。它真正的优势是能在子树任意位置按 id 渲染一张卡，那时候更适合直接上 Option B 的 store 加 selector。**Owner 已在讨论中排除 C2。**

**C3 · Composition**：`KanbanBoard` 渲染卡片，作为 `children` 交给列；列只负责外框和 `Droppable`。

```tsx
// KanbanBoard
const renderBoardCards = (cards: BoardCard[]) =>
  cards.map((card, index) => <TaskCard key={card.task.id} card={card} index={index} />);

<BoardColumn status={TaskStatus.TODO} count={todoCards.length} isDragActive={isDragging}>
  {renderBoardCards(todoCards)}
</BoardColumn>
// BoardColumn
<div ref={provided.innerRef} {...provided.droppableProps}>
  {children}
  {provided.placeholder}
</div>
```

**Examples**

例 1 · habit dots：换算在 `toBoardCards` 里做完，face 只渲染。

```tsx
// TaskCardFace
switch (card.kind) {
  case TaskKind.HABIT:
    return card.habitWeek && (
      <HabitSignal habitWeek={card.habitWeek} currentSlot={card.currentSlot ?? undefined} variant="card" />
    );
  …
}
```

例 2 · PR 4：`toBoardCards` 加一个分支，step face 加一个 case。列、backlog、sheet 都不动，三种传递方式都一样。

```ts
// BoardCard union
| {kind: typeof TaskKind.PROJECT; task: TaskItem; step: ProjectStepContext | null}
// toBoardCards — projects 由 server 经 BoardScreen → KanbanBoard 传入
case TaskKind.PROJECT:
  return {kind, task, step: toProjectStepContext(task, projects)}; // {projectName, number, count, path}
```

例 3 · pull：三种传递方式不同。

```tsx
// C1：KanbanBoard → MobileBacklog → MobileBacklogPanel → MobileBacklogCard，转手一层
<MobileBacklog cards={columns[TaskStatus.BACKLOG]} onPull={pullToTodo} />
// C2：container 从 context 拿 pullToTodo
const {pullToTodo} = useBoardCards();
// C3：KanbanBoard 直接交给卡片，没有转手
<MobileBacklog count={backlogCards.length}>
  {backlogCards.map(card => <MobileBacklogCard key={card.task.id} card={card} onPull={pullToTodo} />)}
</MobileBacklog>
```

例 4 · gallery：三种方式下 `TaskCard` 和 face 都直接吃 fixture card；区别在 `BoardColumn`。

```tsx
// fixture 直接是 card model（constants.ts）
const LEETCODE_CARD: BoardCard = {kind: TaskKind.HABIT, task: leetcodeTask, habitWeek: LEETCODE_WEEK, currentSlot: 0};
<TaskCard card={LEETCODE_CARD} index={0} />

// C1
<BoardColumn status={TaskStatus.TODO} cards={BOARD_COLUMN_CARDS} />
// C2：要包 provider
<BoardCardsProvider value={{cardsById: GALLERY_CARDS_BY_ID, pullToTodo: () => undefined}}>
  <BoardColumn status={TaskStatus.TODO} taskIds={BOARD_COLUMN_IDS} />
</BoardCardsProvider>
// C3
<BoardColumn status={TaskStatus.TODO} count={BOARD_COLUMN_CARDS.length}>
  {BOARD_COLUMN_CARDS.map((card, index) => <TaskCard key={card.task.id} card={card} index={index} />)}
</BoardColumn>
```

例 5 · risk：`today` 作为 `toBoardCards` 的输入，由 server 提供（`fetchBoard` 本来就算了 `today`），只经过 page → `BoardScreen` → `KanbanBoard` 一条短路径。卡片拿到的是结果，scenario 传一个固定日期就能把状态钉住。

```ts
// toBoardCards(tasks, {plan, projects, today})
case TaskKind.HABIT:
  return {kind, task, habitWeek, currentSlot, risk: getHabitPaceRisk(habitWeek, today)};
// face：card.risk 决定 signal line 的颜色
```

**Pros（三种方式共有）**

- **治的是原因，不只是换一种传法。** 换算只在一个纯函数里做一次，face 只负责渲染。`getTaskKind` 和 slot 查找从组件里消失。
- **PR 4 和 risk rules 只落在两处**：`toBoardCards` 的一个分支，加上显示它的 face（例 2、例 5）。
- **有类型保护。** kind union 让 step 的 face 不可能拿到 `habitWeek`。
- `toBoardCards` 是纯函数，仓库以后加测试时可以直接做单元测试；backlog stacking 分组重复 habit 也正好放在这里。
- 不加依赖、不加新模式，延续 `taskUtils` 的做法。

**C1 vs C3**

- **C1** 更直接：列自己渲染自己的列表，`count` 就是 `cards.length`，`KanbanBoard` 只做编排。剩一处转手：`onPull` 经过 `MobileBacklog`（和 ★2 抽出来的 panel）。
- **C3** 让列和 backlog 变成纯外框，不 import 卡片组件，`onPull` 也不用转手。代价是列表渲染（key、index、空状态）搬进 `KanbanBoard`（约多 10 行），且 `count` 和 `children` 要靠调用方保持一致。

**Cons（三种方式共有）**

- 多了一个要维护的类型 `BoardCard`，和 `TaskItem` 平行；给 card face 加字段时可能改两处（model 和 face）。
- 每次乐观更新都会重新换算一遍，工作量和现在的 `groupAndSortTasks` + `computeHabitWeeks` 一样是 O(n)，只是合进了一个 memo。

**Implementation plan（C1）**

1. `src/utils/boardCardUtils.ts`：`BoardCard` union 和 `toBoardCards`（由 `sortTasks`、`computeHabitWeeks` 组成），`groupAndSortTasks` 并进去；`HabitWeek.slotByTaskId` 改为换算内部使用。
2. `KanbanBoard` 用 `useMemo` 算出 `columns`；`BoardColumn` / `DesktopBacklog` / `MobileBacklog` 接收 `cards`；`TaskCard` / `MobileBacklogCard` / `TaskCardFace` / `TaskCardMiniFace` 接收 `card`，按 `card.kind` 分支。
3. 顺手做 ★1、★2（同一批文件）：face 自带 layout，`MobileBacklogContent` 并进 production 的 `MobileBacklogPanel`。
4. Design Console：gallery fixture 改成 card model（加一个 `habitCard()` / `oneOffCard()` helper），`BOARD_COLUMN_HABIT_WEEKS` 删掉；scenario 改用 production 的 `MobileBacklogPanel`。
5. Size：**S–M**。约 16 个文件，大部分是签名改动；大约半天到一天。选 C3 的话文件相同，第 2 步改成 `count` + `children`。PR 4 再在此基础上加 project 分支。

---

## Comparison · 对比

| | A · Context | B · Zustand store | C1 · View model + props | C2 · + context / container | C3 · + composition |
| --- | --- | --- | --- | --- | --- |
| 剩下的转手 | 无 | 无 | `onPull` 一层 | 无 | 无 |
| per-kind 换算在哪 | face 里 | face 里（selector） | 一个纯函数 | 一个纯函数 | 一个纯函数 |
| PR 4 要改 | context + 两个 face | store + selector + 两个 face | `toBoardCards` + step face | 同 C1 | 同 C1 |
| gallery：`TaskCard` / face | 要包 provider | 要搭 store | 直接用 fixture | 直接用 fixture | 直接用 fixture |
| gallery：`BoardColumn` | 要包 provider | 要搭 store | 传 fixture cards | 要包 provider | 传 fixture children |
| 调用处看得到输入 | 否 | 否 | 是 | 部分 | 是 |
| 一次拖拽的重渲染 | 整棵树，同现在 | 只有 slice 变了的卡片 | 整棵树，同现在 | 整棵树，同现在 | 整棵树，同现在 |
| 新模式 / 依赖 | 无 | 每实例 store + AGENTS 规则 | 无 | context + 2 个 container | 无 |
| Size | S（~14 文件，~½ 天） | M（~18 文件，~1–1.5 天） | S–M（~16 文件，~½–1 天） | M | S–M |

## Decision framing · 怎么选

关键在于怎么看这些被层层传递的值：是**叶子该自己去拿的环境值**（A、B、C2），还是 **board 应该一次算好的每张卡片的事实**（C）。

- 选 **A**：最快缓解。代价是 face 的输入被藏起来，换算继续散在叶子里，PR 4 和 risk rules 各要改两个 face。
- 选 **B**：如果预计 board 会出现多个相距较远、要写 task 状态的组件。目前只有一个 owner，B 的大部分机制会闲置。
- 选 **C**：把要传的东西本身去掉。卡片拿到的是算好的 model，中间层对 kind 一无所知，PR 4 和 risk rules 都只有一个地方加。

**Recommendation：C1**，加上 *Along the way* 第 1 项，在 PR 4 之前落地，这样 project 卡片一开始就是 `BoardCard` 的一个分支。C1 和 C3 的差别只剩 `onPull` 一层转手，不值得把列表渲染搬进 `KanbanBoard`；如果想让列和 backlog 成为纯外框，C3 也成立。

**什么时候回头考虑 B（或 C2）**：当 `KanbanBoard` 子树以外的组件需要读或写乐观的 task 状态，或者同一张卡要出现在离列表很远的地方（任务详情 sheet、dashboard 高亮）。那时把状态提升到每请求一份的 store，`toBoardCards` 可以原样变成它的派生 selector。

---

# Part 2 · Component tree 检视

上面 tree 里标 ★ 的地方。这些都**不影响 drilling**；★1、★2 和 Option C 改的是同一批文件，可以顺路做。

| | 现状 | 建议 |
| --- | --- | --- |
| ★1 Face 没有自己的 layout | 两个 face 返回 fragment，padding / gap 由外层 wrapper div 提供。同一份 layout 写了三遍：`TaskCard` 两个 wrapper，`MobileBacklogCard` 又写一次 `flex flex-col gap-1.5 px-3 py-2.5`，gallery 的 mini face specimen 抄了 `TaskCard` 的 mini 外壳 class | **做**。face 根元素自带 layout，接 `className` 传 `md:hidden` / `hidden md:flex`（经 `cn` 合并，后者覆盖 `flex`） |
| ★2 Mobile backlog 只抽出了 list | production 只有 `MobileBacklogContent`；scenario 的 `MobileBacklogPanel` 把 header 和 hint 从 `MobileBacklog` 抄了一份（class 一样，顺序不同）。这和 `SettingsPanel` / `SettingsSheet` 的做法不一致，也违背「screen components, not copied chrome」 | **做**。production 新建 `MobileBacklogPanel`（header + hint + list），`MobileBacklog` = pill + `OverlayShell(panel)`，`MobileBacklogContent` 并进 panel；scenario 只保留手机宽度外框 |
| ★3 BoardHeader 两层 div | 外层只包一个子元素，里层负责布局；合成一层视觉不变 | 小，和 tracker 的「Uniform page header」一起做 |
| ★4 两层高度盒子 | `BoardScreen` 的 `div.flex-1.min-h-0` 和 `KanbanBoard` 的 `div.flex.h-full` 都在给 board 一个确定高度 | **保留**。合并后 `KanbanBoard` 得依赖父级是 flex column；现在 `BoardScreen` 管页面、`KanbanBoard` 管 board，边界清楚 |
| ★5 不必要的 `'use client'` | `BoardHeader`、`ProgressDashboard` 没有 state / effect / 事件，只用 `useTranslations`（next-intl 在 server component 里也能用），却打进 client bundle 并 hydrate。卡片下面的 `TaskCardHead` 等也有，但只被 client 组件引用，多余但无害 | 小，去掉两处指令（AGENTS：「Add 'use client' only when required」）；gallery 是 client 组件，照常能用 |
| ★6 手机上 backlog 卡片渲染三份 | `DesktopBacklog` 在手机上只是 `hidden md:block`，卡片照样渲染（每张两个 face）；sheet 的 `<dialog>` 关着时内容也在 DOM 里 | 可选。`DesktopBacklog` 加 `if (isMobile) return null`，保留 `hidden md:block` 处理 SSR，不会闪 |
| ★7 每张卡渲染两个 face | mini 和 full 同时渲染，用 CSS 切换，约一半 DOM 隐藏 | **保留**。`BreakpointProvider` 在 SSR 时默认 desktop，改用 JS 只渲染一个 face，手机首屏会先闪一下桌面 face |
| ★8 `loading.tsx` skeleton 漂移 | header 右侧画了一个已不存在的按钮；列在手机上也是 `grid-cols-2`（真实页面是上下两行）；没有 backlog rail | 小，和 ★3 一起做 |
| ★9 layout 的 `getActivePlan` 不等 sync | root layout 为 sidebar / dock 读 active plan，不会等 page 的 `ensureSynced`；跨周第一次加载时 Plan 链接可能还指向刚过期的 plan，直到 layout 重新渲染 | 记录，不在本 spike 范围 |

★1 和 ★2 的样子（以 C1 为例）：

```tsx
// ★1 TaskCard：wrapper div 没了
<TaskCardMiniFace card={card} className="md:hidden" />
<TaskCardFace card={card} className="hidden md:flex" />
// TaskCardFace 根元素
<div className={cn('flex flex-col gap-1.5 px-3 py-2.5', className)}>…</div>

// ★2 MobileBacklog
<OverlayShell variant="sheet" isOpen={isOpen} onClose={close} …>
  <MobileBacklogPanel cards={cards} onPull={onPull} onClose={close} />
</OverlayShell>
// scenario
<PhoneFrame><MobileBacklogPanel cards={BACKLOG_CARDS} onPull={NOOP} onClose={NOOP} /></PhoneFrame>
```

---

## Along the way · 顺手可做（与选哪个方案无关）

1. **一个乐观写入入口，按 task 回滚。** 把 `handleDragEnd` 的写入部分和 `handlePullToTodo` 合成一个 `moveTask(taskId, status)`，回滚只恢复那一个 task。matrix 的 `runOptimisticTaskUpdate` 和 board 的版本可以合成一个共享的 `useOptimisticTasks(tasks)` hook（`src/hooks/`），返回 `[localTasks, patchTask]`。
   - React 19 的 `useOptimistic` 是另一个选择，还能去掉 `useEffect` 同步。先要验证：`@hello-pangea/dnd` 要求在 `onDragEnd` 里同步完成重排，transition 里 dispatch 的乐观更新必须在卡片回弹之前生效。
2. **让 `fetchBoard` 直接给出页面要的 props 结构。** 返回 `{plan, tasks, progress}`，`page.tsx` 就不用再手动列 9 个进度字段。
3. **缩小传给 client 的 plan。** `BoardScreen` 的类型是 `BoardPlan`，但页面传的是完整的 `PlanWithTemplates`（user id、每个 template 的 title 和 description），全部被序列化进 client payload。在 server 上映射成 `BoardPlan`，只发 `periodKey`、`mode` 和 plan lines。

## Considered, not proposed · 考虑过但不提议

- **全局 `create()` store，在 effect 里灌数据。** 首屏是空 board；改成 render 时写入，又会让所有 server 请求共用一个 store。每请求一份的写法见 Option B。
- **TanStack Query / SWR 做 client 缓存。** 和 app 全局在用的 server action + `revalidatePath` 模式重复，只为一个页面加一个依赖。
- **Jotai 或其他 atom 库。** 取舍和 Option B 一样，还多一个依赖。
- **在 server 上算 card model。** habit 卡片拖到 Done 时 dots 要立刻更新，换算必须基于 client 的乐观 tasks 重跑。server 只提供输入。
- **risk rules 回来时让 face 自己调用 `getTodayDate()`。** 能少一个输入，但 scenario 就没法固定日期，而且午夜前后 server 渲染的卡片可能和 hydrate 后的不一致。见 Option C 例 5。

## After the decision · 拍板之后

1. 实现选定方案的计划，以及同意的 ★ 项和 *Along the way* 项；同一个 PR 里更新 board scenario 和 gallery 的 fixture。
2. 如果这个决定形成了规范（比如「每张卡片的 context 在 view model 里算一次；卡片只接收一个 model」），加到 AGENTS.md › Coding Conventions › JSX & components 的末尾，附 bad / good 示例。
3. 关闭 tracker 条目，在 README Update Log 里记录结果。
