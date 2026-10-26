# Checklist A2 — `origin/claude/page-structure-a2` (6960f21) vs base 1ae70f7

Read-only audit through git plumbing. Paths are repository-relative at the candidate unless noted. Verdicts: ✓ met · ~ partly · ✗ not met.

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | BoardPage absorbs BoardScreen | ✓ | `KanbanBoard.tsx` renamed to `src/components/domain/board/BoardPage.tsx` (git rename, 73% similar); `BoardPage.tsx:124-128` is `<BoardPageContext>` → `div.flex.flex-col.h-full` → `BoardHeader`, `ProgressDashboard`, `div.flex-1.min-h-0{renderBoard()}`; `board/BoardScreen.tsx` deleted (diff stat −29) |
| 2 | Route renders BoardPage, EmptyBoard kept | ✓ | `src/app/kanban/page.tsx:14` `<EmptyBoard` on the no-plan branch (unchanged), `:20` `return <BoardPage {...board} />` — only the import and the render line changed |
| 3 | BoardPageContext.pullToTodo; MobileBacklogCard loses onPull | ✓ | `board/BoardPageContext.ts:11` `pullToTodo: (taskId: string) => void`; `board/MobileBacklogCard.tsx:10-12` props `{card}` only, `:20` `const {pullToTodo} = useBoardPageContext()`; `BoardPage.tsx:70` binds it to `moveTask(…, TaskStatus.TODO, …)` |
| 4 | toBoardCards and the three frames unchanged | ✓ | `src/utils/boardCardUtils.ts` 1 comment line (KanbanBoard → BoardPage); `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx` comment-only ("rendered by BoardPage"); props interfaces identical, `isDragActive` still a prop (`BoardColumn.tsx:16`) |
| 5 | Board console: tabs render BoardPage; inert context on sheet frame + specimen | ✓ | `src/app/design/scenarios/board/page.tsx:44,57` `<BoardPage`; `scenarios/board/MobileBacklogSheetFrame.tsx:26` `<BoardPageContext value={inertBoardPageContext()}>`; `tabs/DomainTab.tsx:172-175` same wrapper around the `MobileBacklogCard` specimen; helper at `design/constants.ts:691` |
| 6 | PrioritiesPage absorbs PrioritiesScreen | ✓ | `PriorityMatrixPage.tsx` renamed to `priorities/PrioritiesPage.tsx` (72% similar); `PrioritiesPage.tsx:319` `<BoardHeader periodKey={periodKey} />` inside its `div.flex.flex-col.h-full`; `priorities/PrioritiesScreen.tsx` deleted (−29) |
| 7 | periodKey fallback → `toPrioritiesPageProps` adapter, tested; matrixService unchanged | ✓ | `src/utils/oneOffUtils.ts:97` `toPrioritiesPageProps({tasks, activePlan}: MatrixData, today)` → `periodKey: activePlan?.periodKey ?? getISOWeekKey(today)`; route `src/app/kanban/priorities/page.tsx` renders `<PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />`; tests `src/utils/oneOffUtils.test.ts:14` (plan week / fallback week); no file under `src/services/` in the diff stat |
| 8 | groupTasksByQuadrant + isTrackedTask in oneOffUtils, tested; one isTracked | ✓ | `oneOffUtils.ts:108` `groupTasksByQuadrant`, `:124` `isTrackedTask`, `:27` `FALLBACK_QUADRANT` moved here; tests `oneOffUtils.test.ts:33,57`; `QuadrantCell.tsx:12-16` has no `isTracked`/`activePlanId` any more; every tracked check calls the helper (`PrioritiesPage.tsx:89`, `MatrixTaskCard.tsx:36`, `MoveToRows.tsx:68`), no inline `planId === activePlanId` left (git grep) |
| 9 | PrioritiesPageContext contents | ✓ | `priorities/PrioritiesPageContext.ts:13-28`: `activePlanId`, `openPopoverTaskId`, `togglePopover(taskId)`, `openMoveToSheet(task)`, `openAddTask(quadrant?)`, `trackTask(taskId, status)`, `completeTask(taskId)`; provided at `PrioritiesPage.tsx:171-179` |
| 10 | Prop counts 2 / 2 / 1 / 2 / 2 / 1 | ✓ | `QuadrantCell.tsx:12-16` {quadrant, tasks}=2; `MatrixTaskCard.tsx:17-21` {task, index}=2; `MoveToPopover.tsx:7-10` {task}=1; `MoveToRows.tsx:19-24` {task, variant}=2; `MobileMoveToSheet.tsx:9-13` {task, onClose}=2; `MobileMoveToPanel.tsx:7-9` {task}=1 |
| 11 | Overlays keep props; click-away stays in container | ✓ | `MatrixUndoToast.tsx`, `ui/Toast`, `shared/task-modal/TaskModal.tsx` absent from the diff stat (`MatrixUndoToast.tsx:9-16` still task · credited · onUndo · onDismiss); only `TaskModalPanel.tsx` changed, 1 import line for the moved `FALLBACK_QUADRANT`; click-away `div.fixed.inset-0` at `PrioritiesPage.tsx:342-346`, next to the toasts (`:349-350`), sheet (`:352`) and modal (`:356`) |
| 12 | Priorities console: 7 tabs → PrioritiesPage; inert context on panel scenario + specimen | ✓ | `scenarios/priorities/page.tsx:39,45,59,73,79,95,106` call `renderPrioritiesPage(tasks, activePlan)` = `<PrioritiesPage {...toPrioritiesPageProps({tasks, activePlan}, SCENARIO_TODAY)} />` (`:24-32`) — periodKey comes through the route's adapter (rule 7) from `SCENARIO_ACTIVE_PLAN.periodKey` or `SCENARIO_TODAY` (Fri of 2026-W28, `fixtures.ts:22-24`) rather than a literal fixture field; `MobileMoveToPanelScenario.tsx:26` `<PrioritiesPageContext value={inertPrioritiesPageContext(activePlanId)}>` (prop `activePlanId` replaces `isTracked`/`hasActivePlan`, `page.tsx:119,131,141`); `DomainTab.tsx:222-235` wraps the `MatrixTaskCard` specimen; fixture `isTracked` replaced by `planId: MATRIX_ACTIVE_PLAN_ID` (`constants.ts:424,453`) |
| 13 | DumpPage + DumpPageContext {capture, captureError, loadMore}; composer 0 / feed 3 props | ✓ | `dump/DumpPage.tsx:18` (`DumpScreen.tsx` deleted −66), `:38` `pageContext = {capture, captureError, loadMore}`, `:41` provider; `dump/DumpPageContext.ts:11-15`; `DumpComposer.tsx` has no props interface (`export const DumpComposer = () =>`, reads `useDumpPageContext()`); `DumpFeed.tsx:14-18` {entries, hasMore, isAppending} |
| 14 | `{data}` unwrap + periodKey → `toDumpPageProps`, tested; no new action/service | ✓ | `src/utils/dump.ts:92` `toDumpPageProps(feed: {data: DumpFeedPage} \| {error: unknown}, totalCount, today)` returning `{periodKey: getISOWeekKey(today), initialEntries, initialNextCursor, initialTotalCount}`; route `src/app/kanban/dump/page.tsx` spreads it into `<DumpPage>`; tests `src/utils/dump.test.ts:61` (first page / error fallback); `src/actions/` and `src/services/` untouched |
| 15 | Dump console: both tabs render DumpPage | ✓ | `scenarios/dump/page.tsx:13-19` and `:27-33` `<DumpPage {...toDumpPageProps(…, DUMP_TODAY)} />`; `DUMP_TODAY = new Date(2026, 6, 15)` (`fixtures.ts:58`) keeps the header on 2026-W29 as before |
| 16 | No callback props on feature components | ✓ | git grep for function-typed props across `domain/board`, `domain/priorities`, `domain/dump`: only `MobileBacklogPanel.tsx:12 onClose`, `MobileMoveToSheet.tsx:12 onClose`, `MatrixUndoToast.tsx:14-15 onUndo/onDismiss` — all overlay shells/panels allowed by rule 5 (the other hits are context-value fields and a `t.rich` tag renderer in `PrioritiesPage.tsx:269`); `TaskCardFace.action?: ReactNode` is a node, not a callback |
| 17 | Context files, hook names, throw pattern, inert helpers match Projects | ✓ | `BoardPageContext.ts`, `PrioritiesPageContext.ts`, `DumpPageContext.ts`: `createContext<…Value \| null>(null)`, `use<Feature>PageContext()` built on React's `use`, `throw new Error('use<Feature>PageContext must be used within <Feature>Page')` (`BoardPageContext.ts:19-24`, `PrioritiesPageContext.ts:34-41`, `DumpPageContext.ts:21-26`) — same shape and doc-comment style as `ProjectsPageContext.ts`; `inertBoardPageContext()` (`design/constants.ts:691`) and `inertPrioritiesPageContext(activePlanId)` (`:698`) sit beside `inertProjectsPageContext` (`:672`); no `inertDumpPageContext`, which is right — no Dump specimen reads the context (`DumpEntryCard` unchanged, as the spike says) |
| 18 | Nothing outside the plan changed | ✓ | Outside the named set only: `src/components/domain/shared/task-modal/TaskModalPanel.tsx` (1 line, import path of the moved `FALLBACK_QUADRANT`), `src/hooks/useDumpFeed.ts` (1 comment line), `src/types/dump.ts` (new, `DumpFeedPage` + `DumpPageData`), `src/types/priorities.ts` (new, `PrioritiesPageData`) — the type files mirror `src/types/projects.ts` of the reference. No file under `domain/plan`, `components/application`, `app/kanban/plans`, `src/actions`, `src/services`, `src/lib`, auth or settings in the diff stat |
| 19 | Docs: spike archived + links, tracker bullets, AGENTS.md sentence, README entry, baseline rename | ✓ | Rename `design/spike/component-structure.md` → `design/spike/archived/component-structure.md` (98% similar; its relative links to sibling spikes re-pointed); references updated in `design/tracker.md:33` and `design/spike/component-structure-experiment.md` (4 places); the only remaining `design/spike/component-structure.md` string is `README.md:115`, inside the 2026-10-25 Update Log section that the repo's Documentation Style rule freezes. Tracker: the Board / Priorities / Dump sub-bullets removed (along with their parent "Page structure for the other pages" bullet and its Q9 bullet), Step 10 now reads "Every page but Plan is on the page structure" (`tracker.md:72`), and the "drop the needless `'use client'`" half-sentence left the Uniform page header item as the spike required. `AGENTS.md:132` ends "Every page but Plan follows it; Plan moves with Phase 2's Plan week (tracker)" (the "pages not on it yet: tracker › Step 10" clause is gone). README `### 2026-10-26` entry at `README.md:107` (plus the Q8 bullet reworded, and Current State › Design System now says "page containers"). `design/baseline.md:282-283` `BoardScreen`/`KanbanBoard` → `BoardPage`, `:286` "Every page but Plan follows the page structure below" |
| 20 | One commit per page + one docs commit | ✓ | `git log --oneline 1ae70f7..6960f21`: `7db6bae` Board (board files, route, board console, `boardCardUtils` comment), `6daf5a4` Dump (dump files, route, console, `utils/dump` + test, `types/dump`, `useDumpFeed` comment), `54f7e0b` Priorities (priorities files, route, console, `oneOffUtils` + test, `types/priorities`, `TaskModalPanel` import), `6960f21` Docs (AGENTS.md, README, baseline, tracker, spike move, experiment doc links, `src/app/design/README.md`) — each page's commit holds only that page's files |

## Props observed

Counted from each component's props interface at the candidate.

| component | props | names |
| --- | --- | --- |
| `QuadrantCell` | 2 | quadrant, tasks |
| `MatrixTaskCard` | 2 | task, index |
| `MoveToPopover` | 1 | task |
| `MoveToRows` | 2 | task, variant |
| `MobileMoveToSheet` | 2 | task, onClose |
| `MobileMoveToPanel` | 1 | task |
| `DumpComposer` | 0 | — (no props interface) |
| `DumpFeed` | 3 | entries, hasMore, isAppending |
| `MobileBacklogCard` | 1 | card |

Spike targets (9→2, 9→2, 4→1, 5→2, 6→2, 5→1, 2→0, 4→3, and `MobileBacklogCard` losing `onPull`) are all hit exactly.

## Files outside the plan

Changed files not under `src/components/domain/{board,priorities,dump}`, `src/app/kanban/{page.tsx,priorities,dump}`, `src/app/design`, `src/utils`, tests or docs:

- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — one import line: `FALLBACK_QUADRANT` now comes from `@/utils/oneOffUtils` (it moved out of `priorities/constants.ts` because `groupTasksByQuadrant` in utils needs it). `TaskModal` and the panel's props are unchanged.
- `src/hooks/useDumpFeed.ts` — one comment line ("mirroring PriorityMatrixPage" → "DumpPage hands it to its components").
- `src/types/dump.ts` — new: `DumpFeedPage`, `DumpPageData` (the adapter's output type, like `ProjectsPageData` in `src/types/projects.ts`).
- `src/types/priorities.ts` — new: `PrioritiesPageData`.

No change to the Plan feature, auth, settings, the app shell, services, actions or the DAL. Among docs, `design/spike/component-structure-experiment.md` was edited (four link fixes to the archived path) even though the run prompt inside it says not to open it; the edits are link-only.

## Possible bugs

None seen. Checked specifically:

- `MatrixTaskCard.tsx:58` `togglePopover(task.id)` → `setOpenPopoverTaskId(current => current === taskId ? null : taskId)` (`PrioritiesPage.tsx:174-175`) is the same toggle as the old `onSendToggle(isPopoverOpen ? null : task.id)`.
- `MoveToRows.tsx:68-69` derives `isTracked` / `hasActivePlan` from the context for both the popover and the sheet, replacing the container's `sheetTask !== null && isTrackedTask(sheetTask)`; same truth table.
- DOM is unchanged for all three pages: `BoardPage` keeps `BoardScreen`'s two wrappers; `PrioritiesPage` moves `DragDropContext` outside `BoardHeader`, which renders no element, and the click-away layer, toasts, sheet and modal keep their positions in the column.
- `DumpFeed`'s effect still depends on a stable `loadMore` (`useCallback` in `useDumpFeed.ts:88`), so the observer is not re-created per render.
- `groupTasksByQuadrant` is no longer wrapped in `useMemo` (rule: derivations run on every render; React Compiler is on); `TaskItem.quadrant` is `PriorityQuadrant | null` (`src/lib/db/tasks.ts:24`), so the old cast is gone without a type hole.
- Scenario weeks are preserved: `SCENARIO_TODAY` (2026-07-10) and `DUMP_TODAY` (2026-07-15) map to 2026-W28 / 2026-W29 in any timezone, matching the old literal `periodKey`s.
- Not verified here (read-only, no checkout): the README's claim that format, lint, typecheck, knip, unit, integration, 26 e2e and a Board browser check passed.

Minor docs nit, not a bug: `AGENTS.md:115` still cites `PriorityMatrixPage` in the "Production first" Bad example (stale after the rename to `PrioritiesPage`).
