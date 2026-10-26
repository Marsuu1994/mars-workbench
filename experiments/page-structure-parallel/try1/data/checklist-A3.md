# Checklist — A3 (`origin/claude/page-structure-a3`, `721fec2`, base `1ae70f7`)

Read-only audit through git plumbing. Line numbers are in the candidate (`721fec2`).

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | `BoardPage` absorbs `BoardScreen`, which is deleted | ✓ | `src/components/domain/board/KanbanBoard.tsx` → `BoardPage.tsx` (git rename); `BoardPage.tsx:124-128` `flex flex-col h-full` › `BoardHeader` › `ProgressDashboard` › `flex-1 min-h-0`; `BoardScreen.tsx` deleted (-29 lines) |
| 2 | Route renders `BoardPage`, `EmptyBoard` kept | ✓ | `src/app/kanban/page.tsx:6,20` `return <BoardPage {...board} />`; the no-plan `EmptyBoard` branch untouched by the diff |
| 3 | `BoardPageContext.pullToTodo`; `MobileBacklogCard` drops `onPull` | ✓ | `BoardPageContext.ts:10`; `BoardPage.tsx:68-71` `pageContext = {pullToTodo: …}`; `MobileBacklogCard.tsx:10-12` interface is `{card}` only, `:20` `const {pullToTodo} = useBoardPageContext()` |
| 4 | `toBoardCards` + three frames unchanged | ✓ | `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx`, `src/utils/boardCardUtils.ts`: comment-only edits ("rendered by KanbanBoard" → "by BoardPage"); `isDragActive` still a `BoardColumn` prop |
| 5 | Board console: tabs render `BoardPage`; sheet frame + gallery card in inert context | ✓ | `scenarios/board/page.tsx:44,57` `<BoardPage`; `MobileBacklogSheetFrame.tsx:28` `<BoardPageContext value={inertBoardPageContext()}>`; `tabs/DomainTab.tsx:172` same; `design/constants.ts:424-426` `inertBoardPageContext` |
| 6 | `PrioritiesPage` absorbs `PrioritiesScreen`, which is deleted | ✓ | `PriorityMatrixPage.tsx` → `PrioritiesPage.tsx` (git rename, 71%); `PrioritiesPage.tsx:339-340` `flex flex-col h-full` › `<BoardHeader periodKey={periodKey} />`; `PrioritiesScreen.tsx` deleted |
| 7 | `toPrioritiesPageProps(matrix, today)` adapter in `utils/oneOffUtils.ts`, route calls it, unit test, `matrixService` unchanged | ✓ | `src/utils/oneOffUtils.ts:121-131`; `src/app/kanban/priorities/page.tsx:9` `<PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />`; `oneOffUtils.test.ts:43-58`; no `src/services/` file in `--stat` |
| 8 | `groupTasksByQuadrant` + `isTrackedTask` in `oneOffUtils.ts` with tests; `isTracked` defined once | ✓ | `oneOffUtils.ts:92-96` (`isTrackedTask`), `:100-113` (`groupTasksByQuadrant`); tests `:10-41`; QuadrantCell's inline `activePlanId !== null && task.planId === activePlanId` and the container's closure both removed — callers (`MatrixTaskCard.tsx:33`, `MoveToRows.tsx:72`, `PrioritiesPage.tsx:90`) call the one helper. `FALLBACK_QUADRANT` moved along (`oneOffUtils.ts:26`) |
| 9 | `PrioritiesPageContext` members | ✓ | `PrioritiesPageContext.ts:12-28`: `activePlanId`, `openPopoverTaskId`, `togglePopover`, `openMoveToSheet`, `openAddTask`, `trackTask`, `completeTask` — exactly the spike's seven |
| 10 | Props counts 2 · 2 · 1 · 2 · 2 · 1 | ✓ | `QuadrantCell.tsx:12-15` {quadrant, tasks}; `MatrixTaskCard.tsx:17-21` {task, index}; `MoveToPopover.tsx:7-9` {task}; `MoveToRows.tsx:19-24` {variant, task}; `MobileMoveToSheet.tsx:9-13` {task, onClose}; `MobileMoveToPanel.tsx:7-9` {task} |
| 11 | Overlays keep props; click-away layer in container | ✓ | `MatrixUndoToast.tsx`, `ui/Toast`, `TaskModal` absent from the diff; `PrioritiesPage.tsx:191-197, 206-216, 364-379` pass the same props as the base; click-away `fixed inset-0 z-40` at `PrioritiesPage.tsx:350-355` |
| 12 | Priorities console: 7 tabs → `PrioritiesPage`; panel scenario + gallery card in inert context | ✓ | `scenarios/priorities/page.tsx:26-33` `renderPrioritiesPage` = `<PrioritiesPage {...toPrioritiesPageProps({tasks, activePlan}, SCENARIO_TODAY)} />`, used by all 7 former `PrioritiesScreen` tabs (periodKey comes through the adapter: plan's `2026-W28`, or `SCENARIO_TODAY` = 2026-07-10 → W28 for the no-plan tabs; `fixtures.ts:16-18`); `MobileMoveToPanelScenario.tsx:25-27` `inertPrioritiesPageContext(activePlanId)`; `DomainTab.tsx:221-223` wraps `MatrixTaskCard` specimens; fixture `isTracked` dropped, tracked fixture keeps `planId 'plan-1'` = `MATRIX_CARD_ACTIVE_PLAN_ID` (`constants.ts:430`) |
| 13 | `DumpPage`; context capture/captureError/loadMore; composer 0 props, feed 3 | ✓ | `DumpPage.tsx:18,38,41`; `DumpPageContext.ts:8-15`; `DumpComposer.tsx:13` `export const DumpComposer = () =>`; `DumpFeed.tsx:14-18` {entries, hasMore, isAppending}; `DumpScreen.tsx` deleted |
| 14 | `toDumpPageProps(feed, totalCount, today)` in `utils/dump.ts`, unit test, no new action/service | ✓ | `src/utils/dump.ts:105-118`; route `src/app/kanban/dump/page.tsx:16` `<DumpPage {...toDumpPageProps(feed, totalCount, getTodayDate())} />`; `dump.test.ts:61-89` (page passed on + error fallback); no `src/actions/` or `src/services/` in `--stat` |
| 15 | Dump console: both tabs render `DumpPage` | ✓ | `scenarios/dump/page.tsx:13-20, 27-34` via `toDumpPageProps(…, DUMP_TODAY)` (`fixtures.ts:58` 2026-07-16 → W29, same badge as before) |
| 16 | No callback props on feature components (overlays excepted) | ✓ | `git grep` of `=>`-typed members across `domain/{board,priorities,dump}`: only `MobileBacklogPanel.tsx:12 onClose`, `MobileMoveToSheet.tsx:12 onClose`, `MatrixUndoToast.tsx:14-15 onUndo/onDismiss` — all overlays under rule 5; `TaskCard`, `EmptyBoard`, `ProgressDashboard`, `DumpEntryCard`, `DumpTitleBar` take none |
| 17 | One convention, matching Projects | ✓ | All three `<Feature>PageContext.ts` export `<Feature>PageContextValue`, `createContext<… \| null>(null)`, `use<Feature>PageContext()` via `use()` throwing `'use<F>PageContext must be used within <F>Page'` (`BoardPageContext.ts:18-24`, `PrioritiesPageContext.ts:34-42`, `DumpPageContext.ts:20-26`) — same text shape as `ProjectsPageContext.ts`; containers build a plain `pageContext: <F>PageContextValue` and render `<<F>PageContext value={pageContext}>` like `ProjectsPage.tsx:165,335`; `inertBoardPageContext()` / `inertPrioritiesPageContext(activePlanId)` sit beside `inertProjectsPageContext` in `design/constants.ts:424,470` (no Dump inert helper — nothing in the gallery reads `DumpPageContext`, per the spike) |
| 18 | Nothing outside the plan changed | ✓ | No Plan, auth, settings, app-shell, `services/`, `actions/` or `lib/db` file in the 48-file stat. Two files outside the listed areas, both forced follow-throughs: `src/components/domain/shared/task-modal/TaskModalPanel.tsx:18` (import of `FALLBACK_QUADRANT` repointed to `@/utils/oneOffUtils`), `src/hooks/useDumpFeed.ts:44` (comment drops "mirroring PriorityMatrixPage") |
| 19 | Docs: spike archived + links, tracker bullets, AGENTS.md sentence, README log, baseline rename | ~ | **Spike not moved**: `git ls-tree 721fec2 design/spike` still lists `design/spike/component-structure.md`, no `archived/component-structure.md`; `README.md:115` and `design/tracker.md:33` still link `design/spike/component-structure.md`. Met: tracker's Board/Priorities/Dump sub-bullets removed (`design/tracker.md` diff, with the parent "Page structure for the other pages" and the "Q9 comparison, start here" lines removed too, and the `'use client'` half-sentence dropped from *Uniform page header*); `AGENTS.md:132` now ends "Every page but Plan is on it; Plan moves with Phase 2's Plan week (tracker)"; README `### 2026-10-26` gains the first bullet "Board, Priorities and Dump now follow the Projects page's structure"; `design/baseline.md:282-283` `BoardScreen`/`KanbanBoard` → `BoardPage`, line 286 rewritten for Plan |
| 20 | One commit per page + one docs commit | ✓ | `a637adf` Board (15 files, board + console only), `c1a2094` Dump (11 files), `25f166d` Priorities (19 files, incl. the `TaskModalPanel` import), `721fec2` Docs (AGENTS.md, README.md, baseline.md, tracker.md, design README only) |

Score: 19 ✓ · 1 ~ · 0 ✗.

## Props observed

| component | props (candidate) | count | spike target |
| --- | --- | --- | --- |
| `QuadrantCell` | quadrant, tasks | 2 | 2 |
| `MatrixTaskCard` | task, index | 2 | 2 |
| `MoveToPopover` | task | 1 | 1 |
| `MoveToRows` | variant, task | 2 | 2 |
| `MobileMoveToSheet` | task, onClose | 2 | 2 |
| `MobileMoveToPanel` | task | 1 | 1 |
| `DumpComposer` | — | 0 | 0 |
| `DumpFeed` | entries, hasMore, isAppending | 3 | 3 |
| `MobileBacklogCard` | card | 1 | 1 |

## Files outside the plan

Outside `src/components/domain/{board,priorities,dump}`, `src/app/kanban/{page.tsx,priorities,dump}`, `src/app/design`, `src/utils`, tests and docs:

- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — one import line: `FALLBACK_QUADRANT` now from `@/utils/oneOffUtils` instead of `@/components/domain/priorities/constants` (the constant moved with `groupTasksByQuadrant`; keeping it in `priorities/constants.ts` would have made a util import a component folder).
- `src/hooks/useDumpFeed.ts` — one doc-comment line (drops "mirroring PriorityMatrixPage").

No services, actions, DAL, Plan, auth, settings or app-shell files changed.

## Possible bugs

none seen. Checked specifically: `togglePopover` (`PrioritiesPage.tsx:178-179`, functional `current === taskId ? null : taskId`) reproduces the base's `onSendToggle(isPopoverOpen ? null : task.id)`; the `DragDropContext` moved inside the `h-full` column but renders no DOM, so the layout tree is unchanged; `groupTasksByQuadrant` indexes `Record<PriorityQuadrant, …>` with `task.quadrant ?? FALLBACK_QUADRANT`, valid since `TaskItem.quadrant: PriorityQuadrant | null` (`src/lib/db/tasks.ts:24`); the tracked mobile-sheet tab still renders tracked because `SHEET_TRACKED_TASK` carries `planId: SCENARIO_ACTIVE_PLAN.id` (`scenarios/priorities/fixtures.ts:85-89`) and the scenario passes that id; the no-plan tabs' header stays 2026-W28 / W29 through the adapters' fixed `SCENARIO_TODAY` / `DUMP_TODAY`; `oneOffUtils.ts:4` and `dump.ts:6` add only `import type` from `services/` and `lib/db/` (allowed by AGENTS.md); `test/buildTask.ts` exists and `_` is an allowed identifier in `eslint.config.mjs:82-83`. Non-bug notes: the `useMemo` around the quadrant grouping is gone (recomputed per render, as the spike's premise asks); git shows `DumpScreen.tsx` → `DumpPage.tsx` as delete + add rather than a rename (cosmetic); the tracker also lost the "Q9 comparison, start here" line, which the running experiment still relies on.
