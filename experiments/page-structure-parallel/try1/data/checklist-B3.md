# Checklist — B3 (`origin/claude/page-structure-b3`, `d6b5ce3`) vs base `1ae70f7`

Read-only audit through git plumbing. Line numbers are in the candidate unless marked "base".

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | Board: `KanbanBoard` → `BoardPage`, absorbs `BoardScreen` | ✓ | `KanbanBoard.tsx → BoardPage.tsx` (git R074); `BoardPage.tsx:132-139` renders `flex flex-col h-full` › `BoardHeader` + `ProgressDashboard` + `<div className="flex-1 min-h-0">{renderBoard()}</div>`; `BoardScreen.tsx` deleted |
| 2 | Route renders `BoardPage`; `EmptyBoard` with no plan | ✓ | `src/app/kanban/page.tsx:11-17` `if (!board) … <EmptyBoard …/>`; `:20` `return <BoardPage {...board} />` |
| 3 | `BoardPageContext` › `pullToTodo`; `MobileBacklogCard` drops `onPull` | ✓ | `BoardPageContext.ts:8-11` `{pullToTodo}`; `MobileBacklogCard.tsx:10-12` props = `{card}` only, `:20` `const {pullToTodo} = useBoardPageContext()` |
| 4 | `toBoardCards` + three frames unchanged | ✓ | diffs to `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx`, `MobileBacklogPanel.tsx`, `utils/boardCardUtils.ts` are doc-comment-only (`KanbanBoard` → `BoardPage`); no code lines changed |
| 5 | Console: board tabs render `BoardPage`; sheet frame + gallery card in inert context | ✓ | `scenarios/board/page.tsx:44,57` `<BoardPage …/>` (2 tabs); `MobileBacklogSheetFrame.tsx:26` `<BoardPageContext value={inertBoardPageContext()}>`; `tabs/DomainTab.tsx` MobileBacklogCard section wrapped in `BoardPageContext` + `inertBoardPageContext()`; helper in `design/constants.ts` |
| 6 | Priorities: `PriorityMatrixPage` → `PrioritiesPage`, absorbs `PrioritiesScreen` | ✓ | `PriorityMatrixPage.tsx → PrioritiesPage.tsx` (git R076); `PrioritiesPage.tsx:362-364` `flex flex-col h-full` + `<BoardHeader periodKey={periodKey} />`; `PrioritiesScreen.tsx` deleted |
| 7 | `periodKey` fallback → pure adapter `toPrioritiesPageProps(matrix, today)` in `utils/oneOffUtils.ts`, route calls it, unit test, `matrixService` unchanged | ✓ | `utils/oneOffUtils.ts` `toPrioritiesPageProps` (`{...matrix, periodKey: matrix.activePlan?.periodKey ?? getISOWeekKey(today)}`); `src/app/kanban/priorities/page.tsx:9` `<PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />`; `oneOffUtils.test.ts:71-93`; `src/services/matrixService.ts` not in the diff |
| 8 | `groupTasksByQuadrant` + `isTrackedTask` in `oneOffUtils.ts` with tests; `isTracked` in one place | ✓ | `utils/oneOffUtils.ts` `isTrackedTask`, `groupTasksByQuadrant` (+ `FALLBACK_QUADRANT` moved there from `priorities/constants.ts`); `oneOffUtils.test.ts:10-69`; `QuadrantCell.tsx` has no `isTracked` (base `QuadrantCell.tsx:120-121` had the inline duplicate); one definition, called from `PrioritiesPage.tsx:90`, `MatrixTaskCard.tsx:36`, `MoveToRows.tsx:70` |
| 9 | `PrioritiesPageContext` contents | ✓ | `PrioritiesPageContext.ts:12-26`: `activePlanId`, `openPopoverTaskId`, `togglePopover`, `openMoveToSheet`, `openAddTask`, `trackTask`, `completeTask` |
| 10 | Props counts 2 / 2 / 1 / 2 / 2 / 1 | ✓ | `QuadrantCell.tsx:12-15` (quadrant, tasks); `MatrixTaskCard.tsx:17-21` (task, index); `MoveToPopover.tsx:7-9` (task); `MoveToRows.tsx:19-24` (task, variant); `MobileMoveToSheet.tsx:9-13` (task, onClose); `MobileMoveToPanel.tsx:7-9` (task) |
| 11 | Overlays keep props; click-away layer in container | ✓ | `MatrixUndoToast.tsx`, `ui/Toast.tsx`, `task-modal/TaskModal.tsx` absent from the diff; `PrioritiesPage.tsx:370-375` `fixed inset-0 z-40` click-away rendered by the container, outside every Draggable |
| 12 | Console: 7 tabs render `PrioritiesPage` with `periodKey`; panel scenario + gallery card in inert context | ✓ | `scenarios/priorities/page.tsx:27,33,47,61,67,83,94` `<PrioritiesPage {...MATRIX_PAGE…} />` (7 tabs); `fixtures.ts:143-154` `toPrioritiesPageProps({tasks, activePlan}, NOW)` supplies `periodKey`; `MobileMoveToPanelScenario.tsx:27` `inertPrioritiesPageContext(activePlanId)`; `DomainTab.tsx` MatrixTaskCard specimen inside `PrioritiesPageContext` with `MATRIX_CARD_ACTIVE_PLAN_ID`; fixture `isTracked` replaced by `planId: MATRIX_CARD_ACTIVE_PLAN_ID` (`design/constants.ts`) |
| 13 | `DumpScreen` → `DumpPage`; context capture/captureError/loadMore; `DumpComposer` 0 props, `DumpFeed` 3 | ✓ | `DumpScreen.tsx` deleted, `DumpPage.tsx` added (`:41` provides context); `DumpPageContext.ts:8-15`; `DumpComposer.tsx:13` `= () =>`, `:15` `useDumpPageContext()`; `DumpFeed.tsx:14-18` entries · hasMore · isAppending, `:24` `useDumpPageContext()` |
| 14 | `{data}` unwrap + `periodKey` → `toDumpPageProps(feed, totalCount, today)` in `utils/dump.ts`, unit test, no new action/service | ✓ | `utils/dump.ts:91-104` `toDumpPageProps`; `src/app/kanban/dump/page.tsx:16` `<DumpPage {...toDumpPageProps(feed, totalCount, getTodayDate())} />`; `utils/dump.test.ts:61-86` (two cases incl. the `{error}` branch); nothing under `src/actions` / `src/services` in the diff (the result/props types live in new `src/types/dump.ts`) |
| 15 | Console: both dump tabs render `DumpPage` | ✓ | `scenarios/dump/page.tsx:18-26` and `:32` `<DumpPage {...toDumpPageProps(…, DUMP_TODAY)} />`, through the route adapter |
| 16 | No feature component takes a callback prop | ✓ | grep over `domain/{board,priorities,dump}` for `on[A-Z]…:` / `=> void` / `=> Promise<`: only `MobileBacklogPanel.tsx:12 onClose`, `MobileMoveToSheet.tsx:12 onClose`, `MatrixUndoToast.tsx:14-15 onUndo/onDismiss` — all overlay shells allowed by rule 5 |
| 17 | Context files / hooks / throw / inert helpers follow the Projects convention | ✓ | `BoardPageContext.ts`, `PrioritiesPageContext.ts`, `DumpPageContext.ts`: `createContext<…Value \| null>(null)`, `use<Feature>PageContext` throwing `'use<Feature>PageContext must be used within <Feature>Page'` — identical shape to `ProjectsPageContext.ts`; `inertBoardPageContext()` and `inertPrioritiesPageContext(activePlanId)` sit next to `inertProjectsPageContext` in `design/constants.ts` (no Dump helper: no Dump specimen reads the context) |
| 18 | Nothing outside the plan changed | ✓ | no change under `src/actions`, `src/services`, `src/lib`, `src/components/domain/plan`, `domain/auth`, `components/application`, settings or `src/proxy.ts`; files outside the listed paths (all support edits): `src/components/domain/shared/task-modal/TaskModalPanel.tsx` (one import of `FALLBACK_QUADRANT` repointed to `utils/oneOffUtils`), `src/hooks/useDumpFeed.ts` (comment `PriorityMatrixPage` → `PrioritiesPage`), `src/types/dump.ts` (new), `src/types/priorities.ts` (new) |
| 19 | Docs: spike archived + links; tracker bullets; AGENTS sentence; README log 2026-10-26; baseline Board section | ✓ | `design/spike/component-structure.md → archived/` (git R100); links fixed in `tracker.md:33` and `component-structure-experiment.md:3,42,81,134`; the only other reference is `README.md:122` inside the frozen 2026-10-25 Update Log entry (repo precedent: `README.md:343` keeps `design/spike/board-prop-drilling.md`); `tracker.md` Board/Priorities/Dump sub-bullets removed (with their parent "Page structure for the other pages" bullet and the Q9 line); `AGENTS.md:132` "pages not on it yet: tracker › Step 10" → "the Plan page moves onto it with Plan week (tracker)"; `README.md:106` `### 2026-10-26` with the day rewritten into one summary; `baseline.md:282-283` `BoardScreen`/`KanbanBoard` → `BoardPage`, `:286` "Every page but Plan is on the page structure" |
| 20 | One commit per page + one docs commit | ✓ | `git log --oneline 1ae70f7..d6b5ce3`: `fb9d0ca` Board, `89d5286` Dump, `27a950b` Priorities, `d6b5ce3` Docs — four commits, linear, no merges; the Priorities commit also carries the `TaskModalPanel` import, the `useDumpFeed` comment and `types/priorities.ts` |

## Props observed

Counted from each component's props interface at the candidate (base count in parentheses):

- `QuadrantCell` 2 (9): `quadrant`, `tasks`
- `MatrixTaskCard` 2 (9): `task`, `index`
- `MoveToPopover` 1 (4): `task`
- `MoveToRows` 2 (5): `task`, `variant`
- `MobileMoveToSheet` 2 (6): `task`, `onClose`
- `MobileMoveToPanel` 1 (5): `task`
- `DumpComposer` 0 (2)
- `DumpFeed` 3 (4): `entries`, `hasMore`, `isAppending`
- `MobileBacklogCard` 1 (2): `card`

## Files outside the plan

Changed files not under `src/components/domain/{board,priorities,dump}`, `src/app/kanban/{page.tsx,priorities,dump}`, `src/app/design`, `src/utils`, tests or docs:

- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — import path only: `FALLBACK_QUADRANT` now from `@/utils/oneOffUtils` (it moved out of `priorities/constants.ts`).
- `src/hooks/useDumpFeed.ts` — doc comment only (`PriorityMatrixPage` → `PrioritiesPage`).
- `src/types/dump.ts` — new: `DumpFeedPage`, `DumpFeedResult` (`{data} | {error: unknown}`, matching `fetchDumpEntriesAction`'s two return shapes), `DumpPageData`.
- `src/types/priorities.ts` — new: `PrioritiesPageData extends MatrixData {periodKey}` (type-only import from the service).

No change to the Plan feature, auth, settings, the app shell, services, actions or the DAL. (`design/spike/component-structure-experiment.md` and `src/app/design/README.md` are docs/console and in plan.)

## Possible bugs

None seen that change behavior. Notes from the diff:

- `togglePopover` (`PrioritiesPage.tsx:177-178`) preserves the base's `onSendToggle(isPopoverOpen ? null : task.id)` semantics (base `MatrixTaskCard.tsx:74`).
- `DragDropContext` now wraps only the matrix (`PrioritiesPage.tsx:316-339`); the click-away layer, toasts, sheet and modal sit outside it (`:362-386`). None of them contain a Draggable/Droppable and the DOM order is the same as `PrioritiesScreen` + base container, so no behavior change.
- `groupTasksByQuadrant(localTasks)` runs on every render without `useMemo` (`PrioritiesPage.tsx:87`) — the base memoized it; consistent with the spike's premise ("每次 render 算一次") and the React Compiler.
- Priorities no-plan scenario tabs now take `periodKey` from `getISOWeekKey(NOW)` (`fixtures.ts:15` NOW = 2026-07-10 → 2026-W28), which equals `SCENARIO_ACTIVE_PLAN.periodKey`, so the header badge is unchanged.
- `tracker.md`: the Q9 "comparison, start here" controller line was deleted together with the per-page bullets while the experiment is still running — a docs judgment call, not a code issue.
- `README.md:122` keeps the pre-archive spike path inside the frozen 2026-10-25 log entry; by the letter of item 19 a leftover link, by the repo's Documentation Style rule (earlier days never edited) intended.
