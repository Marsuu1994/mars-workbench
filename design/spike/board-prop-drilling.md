# Spike: Simplify board prop drilling

**Status: awaiting owner review** · 2026-10-09 · Answers the tracker item *Spike: simplify prop drilling* (Cross-cutting › Medium) · Related: `design/flows/projects.md` (PR 4 adds the project step face), `design/spike/scenario-states-without-production-props.md` (no console-only props)

## Trigger

The board's per-card inputs travel the whole tree. Today, three values are created in `KanbanBoard` and handed down until a card face finally reads them:

| Value | Created in | Passed through, unread | Read in |
| --- | --- | --- | --- |
| `today` | `KanbanBoard` (`useMemo(getTodayDate)`) | `BoardColumn`, `DesktopBacklog`, `MobileBacklog`, `MobileBacklogContent`, `TaskCard`, `MobileBacklogCard` | `TaskCardFace`, `TaskCardMiniFace` (`isRolloverTask`) |
| `habitWeeks` (a `Map`) | `KanbanBoard` (`computeHabitWeeks`) | `MobileBacklog` | `BoardColumn`, `DesktopBacklog`, `MobileBacklogContent` each repeat `habitWeeks.get(task.templateId)`, then pass `habitWeek` on through `TaskCard` / `MobileBacklogCard` to the faces |
| `onPull` | `KanbanBoard` (`handlePullToTodo`) | `MobileBacklog`, `MobileBacklogContent` | `MobileBacklogCard` |

Nine of the board's 14 component files carry at least one of the three, and six of them forward a prop they never read. The design console repeats the same wiring in `MobileBacklogPanel` and four gallery specimens.

The problem grows. Planned work adds more per-card inputs that would take the same route:

- **PR 4, project step cards**: project name, step n of N, the path as its signal (`baseline.md` › Phase 1). None of it is on `TaskItem` (it has `projectId` and `instanceIndex` only), so a `projects` lookup comes from the server and travels like `habitWeeks` does.
- **Per-kind risk rules** (Board › Future): habit pace needs `today` and the days left, a step needs its carry count, a one-off needs its due date.
- **Backlog stacking** (Board › Medium): grouping habit duplicates at list level.

## Why it happens

The drilled values are not shared, mutable state. They are **inputs a card needs that its `TaskItem` does not carry**: lookup tables and a clock, which each leaf turns into its kind's context and signal. The derivation is spread over the leaves:

- `getTaskKind(task.type)` is called in `TaskCard`, `MobileBacklogCard`, `TaskCardFace` and `TaskCardMiniFace`.
- `isRolloverTask(task, today)` runs in both faces.
- `habitWeek` is an optional prop on four components because only one kind has it. PR 4 would add a second optional prop for steps.

The only mutable state, the tasks' statuses, has one owner (`KanbanBoard`) and two writers (drag end, mobile pull), both inside that owner's subtree. Nothing outside the board writes to it. `ProgressDashboard` is a sibling, but it reads server-computed metrics, not the tasks.

Two smaller findings from the read-through:

- **`today` has two sources.** The server computes it for the metrics (`fetchBoard`), and `KanbanBoard` computes it again on the client. Because it is created inside `KanbanBoard`, the board scenario cannot pin it: only the mobile backlog panel takes `SCENARIO_TODAY`, and the fixtures avoid the problem by giving "today's" daily instances `forDate: null`.
- **The board's rollback still uses a whole-list snapshot.** `handleDragEnd` and `handlePullToTodo` each copy `localTasks`, update one task, and restore the whole copy if the action fails. Restoring the copy undoes any other move made while the request was in flight. The matrix already fixed this in `runOptimisticTaskUpdate` (per-task rollback). The board has the same pattern twice, with the old bug.

## Acceptance bar

- No component forwards a prop it does not read. A middle layer (column, backlog, sheet body) knows nothing about kinds, habits, projects or the date.
- Adding a per-card input (PR 4's project context, a future risk rule) touches the place it is derived and the face that shows it, nothing in between.
- Cards and faces stay renderable from fixtures in the gallery and scenarios with no console-only props (the rule from the scenario-states spike).
- The board scenario can pin `today`.
- Optimistic drag and pull keep working, and a failed move rolls back only that task.

---

## Option A — React context for the board's per-card inputs

**Design**

- A `BoardContext` provider (`domain/board/BoardContext.tsx`), mounted by `KanbanBoard`, carries `{today, habitWeeks, pullToTodo}`. PR 4 adds `projects`.
- Leaves read it with `useBoard()` and a small `useHabitWeek(task)`. Middle layers lose the three props.
- `useBoard()` throws when no provider is mounted. A silent default would render a habit card without its dots and nobody would notice.

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

- Smallest change, almost all deletions. No new dependency, and it uses the pattern `BreakpointProvider` already uses.
- Middle layers become plain layout.

**Cons**

- **Hides the faces' inputs.** `TaskCardFace` / `TaskCardMiniFace` / `MobileBacklogCard` are the most reused board components (desktop board, both backlogs, gallery, scenarios). Every reuse site now needs a provider, and in the gallery each card specimen has to build a `habitWeeks` map keyed by the fixture's template.
- **Leaves the derivation where it is.** The faces still look up the habit, test for rollover and switch on kind. PR 4 adds a `projects` map to the context and another lookup to the faces.
- `habitWeek` stays optional on the faces, so a step or one-off face can still be handed one.

**Implementation plan**

1. Add `BoardContext.tsx` (provider, `useBoard`, `useHabitWeek`). `KanbanBoard` wraps its tree in the provider.
2. Remove `today` / `habitWeeks` / `onPull` from `BoardColumn`, `DesktopBacklog`, `MobileBacklog`, `MobileBacklogContent`, `TaskCard`, `MobileBacklogCard`, and have the two faces read the context.
3. `today` comes from the server: `fetchBoard` returns the `today` it already computes, `BoardScreen` passes it on, and the scenario passes `SCENARIO_TODAY`.
4. Design console: wrap `MobileBacklogPanel` and the TaskCard / mini face / MobileBacklogCard / BoardColumn specimens in a `BoardProvider` built from fixtures.
5. Size: **S**. About 15 files, mostly deletions; roughly half a day.

---

## Option B — Zustand board store, hydrated from the server

This is the "fetch on the server, hydrate a client store, then the board manages its own state" direction.

**Design**

- The store has to be **created per request and handed down through a provider**. A module-level `create()` store like `sidebarStore` cannot do this:
  - Next renders client components on the server too, and a module-level store is shared by every request on that server. Writing one user's tasks into it during render can leak into another user's server-rendered HTML.
  - Filling it in a `useEffect` instead means the server HTML and the first client paint show an empty board.
  - Zustand's documented Next.js setup is `createStore` from `zustand/vanilla`, wrapped in a client provider (`useState(() => createBoardStore(initial))`), and read with `useStore(store, selector)`.
- **State**: `{tasks, plan, today}` (PR 4 adds `projects`). Derived `habitWeeks` is recomputed inside the store's setters, so selectors return stable references. **Actions**: `sync(tasks)` and `patchTask(id, patch)` / `revertTask(id, previous)`.
- **Server actions stay out of the store** (AGENTS.md › State Management: stores make no DB or fetch calls). A `useBoardMoves()` hook in `src/hooks/` does the optimistic patch, calls `updateTaskStatusAction`, and reverts on error.
- **The server stays the source of truth.** The dashboard's metrics come from a SQL aggregate over tasks the board never loads (expired and past instances), so they cannot be computed on the client. After every move, `revalidatePath('/kanban')` re-renders the page, and the provider must call `sync(tasks)` when new props arrive. That is the same `useEffect(() => setLocalTasks(tasks))` the board has today, moved into the provider. "Fully client-side" therefore means an optimistic cache in front of the server, not a client-owned board.

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

- Components subscribe to slices. A drag can re-render only the cards whose selected slice changed, instead of the whole tree as today. Nothing has measured this as slow, though; the board holds tens of cards.
- State and its transitions live in one testable module, and `KanbanBoard` shrinks to layout plus DnD wiring.
- It leaves room to grow if later work needs several distant components writing to the board state, for example a dashboard that updates optimistically, or editing a task from a card's sheet.

**Cons**

- **It solves a problem the board doesn't have.** The state has one owner and its writers sit in that owner's subtree, so a store mostly adds indirection: a provider, a store module, a bridge hook, selectors.
- **It introduces a second store pattern.** Every store in `src/store/` today is a global UI-state singleton. This would be the first per-instance store hydrated from server data, which needs its own AGENTS.md rule saying when to use which.
- **Two copies of the tasks.** Server props and the store have to be kept in sync by hand, and an in-flight optimistic patch can be overwritten by a `sync` from an earlier revalidation, the same race the current `useEffect` has.
- **Selector pitfalls in Zustand v5.** A selector that returns a fresh array or object on each call (`s.tasks.filter(…)`) triggers infinite re-render warnings unless it is wrapped in `useShallow` or the value is precomputed in the store.
- **It doesn't fix the per-kind derivation.** Like Option A, the faces still look up and derive their context; they now read it through selectors instead of props.
- Every gallery or scenario specimen of a card or column needs a store built from fixtures.

**Implementation plan**

1. `src/store/boardStore.ts` (`createBoardStore`, state plus derived `habitWeeks`, `sync` / `patchTask` / `revertTask`) and `domain/board/BoardStoreProvider.tsx` (per-instance store, `sync` on new props).
2. `src/hooks/useBoardMoves.ts`: optimistic move, the action call, and a per-task revert. It replaces `handleDragEnd`'s write path and `handlePullToTodo`.
3. `BoardScreen` mounts the provider with `tasks` / `plan` / `today` (`today` from the server, as in A). `KanbanBoard`, columns, backlogs and cards read through selectors, and their data props go.
4. Design console: a fixture-store helper. Wrap the board scenario's panel and the card / column specimens.
5. AGENTS.md › State Management: when a store is per-instance (server-hydrated) and when it is global, with bad and good examples.
6. Size: **M**. About 20 files plus one new convention; roughly 1–1.5 days, including time to verify the sync race and the DnD snap-back.

---

## Option C — Card view model: derive once, pass one card

**Design**

- One pure function turns the tasks and the board's inputs into **card models**, already grouped by status and sorted. Each model is a union over the kinds, so it carries exactly what that kind's face shows. `toBoardCards` replaces the `groupAndSortTasks` call and absorbs `computeHabitWeeks` and the leaves' `isRolloverTask` / `getTaskKind` calls.
- Lists take `cards`. Cards and faces take one `card` and `switch (card.kind)`: TypeScript narrows to `habitWeek` / `rolloverFrom` for a habit, and PR 4 adds `step` for a project step. No optional per-kind props remain.
- `KanbanBoard` derives with `useMemo` from its optimistic `localTasks`, so a habit's dots still move as soon as it is dropped on Done. The derivation has to run on the client for that reason. The server supplies the inputs: `today` (one source, so scenarios can pin it) and, in PR 4, the project lookup.

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

After the change, every prop is read where it is passed. The one exception is `onPull`, which `MobileBacklogContent` still forwards (sheet → body → card).

**Pros**

- **Fixes the cause, not the delivery.** Derivation happens once, in one pure function, so the faces only render. `getTaskKind` and `isRolloverTask` leave the components.
- **PR 4 and the risk rules land in two places**: a new branch in `toBoardCards` and the face that shows it. Columns, backlogs and the sheet don't change.
- **Explicit and typed.** Inputs are visible at every call site, and the kind union rules out a step face holding a `habitWeek`.
- **No provider anywhere.** Gallery and scenario fixtures declare card models directly (`TASK_CARD_FIXTURES` already pair a task with its `habitWeek`). `MobileBacklogPanel` passes `cards`.
- **`toBoardCards` is a pure function**, so it can be unit-tested if the repo adds tests. It is also where backlog stacking would group habit duplicates.
- No new dependency or pattern. It extends the existing `taskUtils` approach.

**Cons**

- It is still props. One `cards` / `card` per level replaces `tasks + today + habitWeeks`, and `onPull` keeps one pass-through hop.
- It adds a type to maintain (`BoardCard`) that parallels `TaskItem`. A field added to a card face may need a change in two places (the model and the face).
- It re-derives on every optimistic change. That is the same O(n) work as today's `groupAndSortTasks` + `computeHabitWeeks`, now in one memo.

**Implementation plan**

1. `src/utils/boardCardUtils.ts`: the `BoardCard` union and `toBoardCards`, built from `sortTasks`, `computeHabitWeeks` and the rollover test. `groupAndSortTasks` folds into it. `isRolloverTask` leaves the components and stays exported only if something else needs it.
2. `fetchBoard` returns `today`, and `BoardScreen` → `KanbanBoard` takes it as a prop (the scenario passes `SCENARIO_TODAY`).
3. `KanbanBoard` derives `columns` with `useMemo`. `BoardColumn` / `DesktopBacklog` / `MobileBacklog` / `MobileBacklogContent` take `cards`. `TaskCard` / `MobileBacklogCard` / `TaskCardFace` / `TaskCardMiniFace` take `card` and switch on `card.kind`.
4. Design console: fixtures become card models (a small `habitCard()` / `oneOffCard()` helper), and `MobileBacklogPanel` takes `cards`.
5. Size: **S–M**. About 17 files, mostly signature changes; roughly half a day to a day. PR 4 then adds the project variant on top.

---

## Along the way (independent of the option)

These are cleanups the read-through turned up. Each is small and fits into whichever option lands:

1. **One optimistic writer, per-task rollback.** Merge `handleDragEnd`'s write path and `handlePullToTodo` into one `moveTask(taskId, status)`. Rollback restores only that task, the fix the matrix already made. The matrix's `runOptimisticTaskUpdate` and the board's version can become one shared `useOptimisticTasks(tasks)` hook (`src/hooks/`) returning `[localTasks, patchTask]`.
   - React 19's `useOptimistic` is the built-in alternative and would also drop the `useEffect` sync. One thing to check first: `@hello-pangea/dnd` requires the reorder to happen synchronously in `onDragEnd`, and an optimistic update dispatched inside a transition must not let the card snap back before it lands.
2. **`today` from the server** (in every option's plan). One clock for the metrics and the cards, and the board scenario can pin it.
3. **Let `fetchBoard` shape the page's props.** Return `{plan, tasks, today, progress}` so `page.tsx` stops re-listing nine progress fields.
4. **Narrow the plan sent to the client.** `BoardScreen` is typed `BoardPlan`, but the page passes the full `PlanWithTemplates` (user id, every template's title and description), and all of it is serialized into the client payload. Mapping to `BoardPlan` on the server sends only `periodKey`, `mode` and the plan lines.

## Considered, not proposed

- **Global `create()` store filled in an effect.** The first render shows an empty board (both the server HTML and the first client paint), and filling it during render shares one store across all server requests. See Option B for the per-request version.
- **TanStack Query / SWR as a client cache.** This duplicates the server action + `revalidatePath` model the app already uses throughout, and adds a dependency for one page.
- **Jotai or another atom library.** It has the same trade-offs as Option B, plus a new dependency.
- **Faces call `getTodayDate()` themselves.** That drops one prop, but scenarios lose the ability to pin the date, and a server-rendered card can disagree with the hydrated one around midnight.
- **Compute card models on the server.** A habit's dots must move as soon as a card is dropped on Done, so the derivation has to re-run on the client's optimistic tasks. The server supplies the inputs only.
- **Composition (columns and backlogs take `children`).** React's first suggestion before context: `KanbanBoard` renders the cards and the middle layers only lay them out. It would remove even the `cards` prop and the `onPull` hop, but it moves list rendering (keys, `Draggable` index, empty states, counts) up into `KanbanBoard`, the largest board file. If a hop ever needs removing, it fits on top of Option C.

## Comparison

| | A · Context | B · Zustand store | C · Card view model |
| --- | --- | --- | --- |
| Pass-through props left | none | none | `onPull` one hop |
| Where per-kind derivation lives | still in the faces | still in the faces (via selectors) | one pure function |
| PR 4 project context touches | context value + faces | store state + selectors + faces | `toBoardCards` + the step face |
| Faces renderable from fixtures | needs a provider | needs a fixture store | plain props |
| Inputs visible at the call site | no | no | yes |
| Re-render on a drag | whole tree, as today | only cards whose slice changed | whole tree, as today |
| New pattern / dependency | none | per-request store + AGENTS rule | none |
| Size | S (~15 files, ~½ day) | M (~20 files, ~1–1.5 days) | S–M (~17 files, ~½–1 day) |

## Decision framing

The question is what the drilled values are: **ambient values the leaves should reach for** (A, B), or **per-card facts the board should work out once** (C).

- Pick **A** for the quickest relief with the least churn. It hides the faces' inputs and keeps the derivation scattered.
- Pick **B** if the board is expected to grow several distant writers to its task state (an optimistic dashboard, task editing from cards). Today it has one owner and one subtree of writers, so most of B's machinery would sit idle.
- Pick **C** to remove the drilling by removing what was drilled: cards receive a finished model, middle layers know nothing about kinds, and PR 4 and the risk rules have one place to add their context.

**Recommendation: C**, with *Along the way* items 1–2. Land it before PR 4 so the project face starts as a `BoardCard` variant instead of a fourth drilled prop.

**When to revisit B**: if a component outside `KanbanBoard`'s subtree needs to read or write the optimistic task state (the dashboard updating on drop, a card sheet editing a task), lift the state into a per-request store then. C's `toBoardCards` would become that store's derived selector unchanged.

## After the decision

1. Implement the chosen option's plan and the agreed *Along the way* items. Update the board scenario and gallery fixtures in the same PR.
2. If the decision sets a convention (for example, "derive per-card context once in a view model; cards take one model"), add it to the end of AGENTS.md › Coding Conventions › JSX & components with a bad/good example.
3. Close the tracker item and record the outcome in the README Update Log.
