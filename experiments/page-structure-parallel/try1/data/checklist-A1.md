# Checklist — A1 (`origin/claude/page-structure-a1`, 15452f1 vs base 1ae70f7)

Read-only audit through git plumbing. Line numbers are in the candidate (15452f1).

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | KanbanBoard → BoardPage absorbs BoardScreen; BoardScreen deleted | ✓ | `git diff -M`: `KanbanBoard.tsx` → `BoardPage.tsx` (rename, 74% similar). `BoardPage.tsx:124-131` renders `flex flex-col h-full` › `BoardHeader` › `ProgressDashboard` › `flex-1 min-h-0` › `renderBoard()`. `BoardScreen.tsx` absent from the candidate tree (−29 lines). |
| 2 | Route renders BoardPage; EmptyBoard kept | ✓ | `src/app/kanban/page.tsx`: only the import and `return <BoardPage {...board} />` changed; the `EmptyBoard` branch is untouched context. |
| 3 | BoardPageContext.pullToTodo; MobileBacklogCard drops onPull | ✓ | `BoardPageContext.ts:8-11` (`pullToTodo`); `BoardPage.tsx:73` provides it; `MobileBacklogCard.tsx:9-11` interface is `{card}` only, `:17` `const {pullToTodo} = useBoardPageContext()`. |
| 4 | toBoardCards and the three frames unchanged | ✓ | `boardCardUtils.ts`, `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx` diffs are comment-only (KanbanBoard → BoardPage); `isDragActive` still a `BoardColumn` prop. |
| 5 | Console: board tabs render BoardPage; sheet frame + gallery card in inert context | ✓ | `scenarios/board/page.tsx` both tabs `<BoardPage …/>`; `MobileBacklogSheetFrame.tsx:28` `<BoardPageContext value={inertBoardPageContext()}>`; `tabs/DomainTab.tsx` MobileBacklogCard section wrapped the same way; `design/constants.ts` adds `inertBoardPageContext`. |
| 6 | PriorityMatrixPage → PrioritiesPage absorbs PrioritiesScreen; deleted | ✓ | `PrioritiesPage.tsx:374-381`: `flex flex-col h-full` › `<BoardHeader periodKey={periodKey} />` › `renderMatrix()`. `PrioritiesScreen.tsx` and `PriorityMatrixPage.tsx` absent from the candidate tree. |
| 7 | toPrioritiesPageProps adapter in utils/oneOffUtils, route calls it, unit test, matrixService unchanged | ✓ | `oneOffUtils.ts:101-111` `toPrioritiesPageProps({tasks, activePlan}, today)` (`activePlan?.periodKey ?? getISOWeekKey(today)`); `kanban/priorities/page.tsx` `<PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />`; `oneOffUtils.test.ts` `describe('toPrioritiesPageProps')` (plan week / fallback); `src/services/` not in the diff stat. |
| 8 | groupTasksByQuadrant + isTrackedTask in utils with tests; isTracked computed once | ✓ | `oneOffUtils.ts:79-98`; tests for both (null quadrant → Schedule; 4 tracked cases). One definition; `QuadrantCell`'s inline `activePlanId !== null && task.planId === activePlanId` is gone. Callers: `PrioritiesPage.tsx:95` (count), `MatrixTaskCard.tsx:36`, `MoveToRows.tsx:70` — each component derives its own from the rows it holds (rule 4). |
| 9 | PrioritiesPageContext contents | ✓ | `PrioritiesPageContext.ts:12-26`: `activePlanId`, `openPopoverTaskId`, `togglePopover`, `openMoveToSheet`, `openAddTask`, `trackTask`, `completeTask` — exactly the spike's list. |
| 10 | Props counts 2 / 2 / 1 / 2 / 2 / 1 | ✓ | `QuadrantCell.tsx:12-16` 2 (quadrant, tasks); `MatrixTaskCard.tsx:17-21` 2 (task, index); `MoveToPopover.tsx:7-9` 1 (task); `MoveToRows.tsx:19-24` 2 (task, variant); `MobileMoveToSheet.tsx:9-13` 2 (task, onClose); `MobileMoveToPanel.tsx:7-9` 1 (task). |
| 11 | Overlays keep props; click-away layer in the container | ✓ | `MatrixUndoToast.tsx`, `ui/Toast.tsx`, `TaskModal.tsx` not in the diff (`TaskModalPanel.tsx` changed one import path only); `PrioritiesPage.tsx:343-350` keeps the `fixed inset-0 z-40` click-away div outside every Draggable. |
| 12 | Console: 7 tabs render PrioritiesPage; panel scenario + gallery card in inert context | ✓ | `scenarios/priorities/page.tsx` `renderPrioritiesPage()` = `<PrioritiesPage {...toPrioritiesPageProps({tasks, activePlan}, SCENARIO_TODAY)} />` for Matrix, popover ×3, No plan, Done toast ×2 (periodKey comes from the adapter; `SCENARIO_TODAY` = 2026-07-10 → W28, same as before). `MobileMoveToPanelScenario.tsx` wraps `<PrioritiesPageContext value={inertPrioritiesPageContext(activePlanId)}>`; `DomainTab.tsx` MatrixTaskCard section wrapped with `MATRIX_CARD_ACTIVE_PLAN_ID`; `MATRIX_CARD_FIXTURES.isTracked` replaced by `planId`. |
| 13 | DumpScreen → DumpPage; context capture / captureError / loadMore; composer 0 props, feed 3 | ✓ | `DumpPage.tsx:38` `{capture, captureError, loadMore}`; `DumpPageContext.ts:9-16`; `DumpComposer.tsx:13` `= () =>`, `:15` reads the context; `DumpFeed.tsx:14-18` entries · hasMore · isAppending, `:24` `loadMore` from the context. |
| 14 | toDumpPageProps(feed, totalCount, today) in utils/dump.ts, unit test, no new action/service | ✓ | `dump.ts:91-104`; `kanban/dump/page.tsx` `<DumpPage {...toDumpPageProps(feed, totalCount, getTodayDate())} />`; `dump.test.ts` 2 cases (first page; error result → empty feed); `src/actions/`, `src/services/` untouched (types live in new `src/types/dump.ts`). |
| 15 | Both dump tabs render DumpPage | ✓ | `scenarios/dump/page.tsx`: both tabs `<DumpPage {...toDumpPageProps(…, DUMP_TODAY)} />` (`DUMP_TODAY` 2026-07-15 → W29, the previously pinned week). |
| 16 | No callback props on feature components | ✓ | `git grep` of `on[A-Z]…:` and `=> void` over the three dirs: only `MobileBacklogPanel.tsx:12 onClose`, `MobileMoveToSheet.tsx:12 onClose`, `MatrixUndoToast.tsx:14-15 onUndo/onDismiss` — overlay shells/panels allowed by rule 5. Every other `=> void` is in a `*PageContextValue` interface. |
| 17 | Context files, hooks, throw pattern, inert helpers follow the Projects convention | ✓ | `Board/Priorities/DumpPageContext.ts`: `createContext<…Value \| null>(null)`, `use<Feature>PageContext` via `use()`, throw `'use…PageContext must be used within <Feature>Page'` (same wording as `ProjectsPageContext.ts:34`). `inertBoardPageContext()` and `inertPrioritiesPageContext(activePlanId)` sit beside `inertProjectsPageContext` in `design/constants.ts`; Dump needs none (`DumpEntryCard` reads no context). |
| 18 | Nothing outside the plan changed | ✓ | No edits under `src/actions`, `src/services`, `src/lib`, `domain/plan`, auth, settings or `components/application`. Outside the listed paths (all consequential, see below): `src/components/domain/shared/task-modal/TaskModalPanel.tsx`, `src/hooks/useDumpFeed.ts`, `src/types/priorities.ts` (new), `src/types/dump.ts` (new). |
| 19 | Docs: spike archived + links, tracker sub-bullets, AGENTS.md sentence, README log, baseline rename | ~ | Done: tracker's Board/Priorities/Dump sub-bullets removed (and the "drop `'use client'` from BoardHeader/ProgressDashboard" half-sentence, as the spike's Board plan says); AGENTS.md › *Page structure* now ends "the one page not on it yet, Plan: tracker › Phase 2's Plan week"; README Update Log 2026-10-26 rewritten into one day summary with the new entry; `baseline.md` › Architecture Decision `BoardScreen`/`KanbanBoard` → `BoardPage`. **Not done:** the spike is still `design/spike/component-structure.md` (no `archived/` copy per `git ls-tree`); it is still referenced from `design/tracker.md:33,73`. The tracker instead adds "Close the component-structure spike: record the Q9 comparison's results in its Decision, then move it and its experiment doc to `archived/`". |
| 20 | One commit per page plus one docs commit | ✓ | `a1973c9` Board, `02d57bd` Dump, `cc559fd` Priorities, `15452f1` Docs — four commits, in the spike's suggested Board → Dump → Priorities order; each page commit touches only its own files plus the shared console files. |

Score: 19 ✓ · 1 ~ (item 19) · 0 ✗.

## Props observed

Counted from each component's props interface at the candidate (base count in parentheses).

| component | props | names |
| --- | --- | --- |
| `QuadrantCell` | 2 (9) | quadrant, tasks |
| `MatrixTaskCard` | 2 (9) | task, index |
| `MoveToPopover` | 1 (4) | task |
| `MoveToRows` | 2 (5) | task, variant |
| `MobileMoveToSheet` | 2 (6) | task, onClose |
| `MobileMoveToPanel` | 1 (5) | task |
| `DumpComposer` | 0 (2) | — |
| `DumpFeed` | 3 (4) | entries, hasMore, isAppending |
| `MobileBacklogCard` | 1 (2) | card |

## Files outside the plan

Changed files outside `src/components/domain/{board,priorities,dump}`, `src/app/kanban/{page.tsx,priorities,dump}`, `src/app/design`, `src/utils`, tests and docs:

- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — one import re-pointed: `FALLBACK_QUADRANT` moved from `priorities/constants.ts` to `utils/oneOffUtils.ts` (so `groupTasksByQuadrant` can use it without a utils → components import).
- `src/hooks/useDumpFeed.ts` — a doc comment only ("mirroring PriorityMatrixPage" → "the other pages' containers").
- `src/types/priorities.ts` (new) — `PrioritiesPageProps extends MatrixData {periodKey}`, the adapter's return type (`import type` from the service, like `types/projects.ts`).
- `src/types/dump.ts` (new) — `DumpFeedPage`, `DumpPageProps`, the adapter's input/return types.

No plan, auth, settings, app-shell, service, action or DAL file changed. (`src/utils/boardCardUtils.ts` also changed, comment only, but is inside `src/utils`.)

## Possible bugs

None seen. Checks made:

- `togglePopover(task.id)` (`PrioritiesPage.tsx:181-182`, `current === taskId ? null : taskId`) is equivalent to the base `onSendToggle(isPopoverOpen ? null : task.id)`.
- `MoveToRows` now derives `isTracked` / `hasActivePlan` from the context's `activePlanId` and its `task` prop (the same sheet snapshot the container used before); `event.stopPropagation()` on both rows kept.
- `DumpFeed`'s effect depends on `loadMore` from the context; `useDumpFeed.ts:58,88` define `capture` and `loadMore` with `useCallback`, so the IntersectionObserver is not re-created on every container render.
- `groupTasksByQuadrant` drops the base's cast; `TaskItem.quadrant` is already `PriorityQuadrant | null` (`src/lib/db/tasks.ts:24`), so the index into `Record<PriorityQuadrant, …>` typechecks.
- Console "tracked" states now depend on fixture `planId`s: `scenarios/priorities/fixtures.ts:74,89` give the tracked popover/sheet tasks `planId: SCENARIO_ACTIVE_PLAN.id`; the gallery's "Tracked" matrix card gets `MATRIX_CARD_ACTIVE_PLAN_ID`; the "Default" card has `planId: null`.
- The no-plan scenario tabs keep showing W28: the adapter's fallback on `SCENARIO_TODAY` (2026-07-10) yields `2026-W28`, the week the tabs pinned before.

Docs observation (not a code bug): the tracker's "Q9 comparison, start here" controller bullet was deleted together with the finished per-page sub-bullets while the comparison is still running; the new "Close the component-structure spike" bullet keeps the archive step, so nothing is lost but the controller pointer.
