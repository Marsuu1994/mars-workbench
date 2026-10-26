# Checklist — B2 (origin/claude/page-structure-b2, e7eeade)

Base `1ae70f7` → candidate `e7eeade`. Paths are relative to the repo root at the candidate; line numbers are the candidate's.

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | BoardPage absorbs BoardScreen | ✓ | `KanbanBoard.tsx` → `BoardPage.tsx` (rename, 75% similar); `BoardPage.tsx:27` takes `BoardData`, `:125` `flex flex-col h-full`, `:126-127` BoardHeader + ProgressDashboard, `:128` `flex-1 min-h-0`; `BoardScreen.tsx` deleted (not in `ls-tree`) |
| 2 | Route renders BoardPage / EmptyBoard | ✓ | `src/app/kanban/page.tsx:11-17` `if (!board) … <EmptyBoard stats=…/>`; `:20` `return <BoardPage {...board} />` |
| 3 | BoardPageContext.pullToTodo; card reads it | ✓ | `BoardPageContext.ts:8-11` `{pullToTodo}`; `MobileBacklogCard.tsx:10-12` props = `{card}` only, `:19` `const {pullToTodo} = useBoardPageContext()`; `BoardPage.tsx:72` provides `{pullToTodo}` |
| 4 | toBoardCards + 3 frames unchanged | ✓ | `boardCardUtils.ts`, `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx` diffs are comment-only ("rendered by KanbanBoard" → "by BoardPage"); `isDragActive` still a BoardColumn prop (`BoardPage.tsx:101,108`) |
| 5 | Board console: BoardPage tabs + inert wraps | ✓ | `scenarios/board/page.tsx:44,57` `<BoardPage …/>` on both tabs; `MobileBacklogSheetFrame.tsx:28` `<BoardPageContext value={inertBoardPageContext()}>`; `tabs/DomainTab.tsx:173` same around the MobileBacklogCard specimens; `design/constants.ts` `inertBoardPageContext` |
| 6 | PrioritiesPage absorbs PrioritiesScreen | ✓ | `PriorityMatrixPage.tsx` → `PrioritiesPage.tsx` (rename, 72%); `PrioritiesPage.tsx:63`, `:321` `flex flex-col h-full`, `:322` `<BoardHeader periodKey={periodKey} />`; `PrioritiesScreen.tsx` deleted |
| 7 | toPrioritiesPageProps adapter + test; service unchanged | ✓ | `utils/oneOffUtils.ts` `toPrioritiesPageProps({tasks, activePlan}, today)` → `periodKey: activePlan?.periodKey ?? getISOWeekKey(today)`; `src/app/kanban/priorities/page.tsx:9` `<PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />`; `oneOffUtils.test.ts:14-30` (plan week / ISO-week fallback); `src/services/` absent from `--stat` |
| 8 | groupTasksByQuadrant + isTrackedTask, one isTracked | ✓ | `utils/oneOffUtils.ts` `groupTasksByQuadrant`, `isTrackedTask`; tests `oneOffUtils.test.ts:32-69`; QuadrantCell's inline `isTracked={activePlanId !== null && task.planId === activePlanId}` and the container's closure both removed; the one helper is called at `PrioritiesPage.tsx:93` (count), `MatrixTaskCard.tsx:36`, `MoveToRows.tsx:70` — the spike's tree (each reads `activePlanId` from context) |
| 9 | PrioritiesPageContext members | ✓ | `PrioritiesPageContext.ts:12-25`: `activePlanId`, `openPopoverTaskId`, `togglePopover`, `openMoveToSheet`, `openAddTask`, `trackTask`, `completeTask`; provided at `PrioritiesPage.tsx:178-187` |
| 10 | Props counts 2/2/1/2/2/1 | ✓ | `QuadrantCell.tsx:12-15` {quadrant, tasks}; `MatrixTaskCard.tsx:17-21` {task, index}; `MoveToPopover.tsx:7-9` {task}; `MoveToRows.tsx:19-24` {task, variant}; `MobileMoveToSheet.tsx:9-13` {task, onClose}; `MobileMoveToPanel.tsx:7-9` {task} |
| 11 | Overlays unchanged; click-away in container | ✓ | `MatrixUndoToast.tsx`, `ui/Toast.tsx`, `task-modal/TaskModal.tsx` absent from `--stat`; `PrioritiesPage.tsx:346-353` `fixed inset-0 z-40` click-away layer, `:194-200` MatrixUndoToast props, `:362-376` TaskModal props as before |
| 12 | Priorities console: 7 tabs + inert wraps | ✓ | `scenarios/priorities/page.tsx` 7 tabs render `<PrioritiesPage {...PRIORITIES_PAGE*} />` (Matrix, popover, popover-tracked, No plan, popover-no plan, Done toast ×2); `fixtures.ts:143-160` props via `toPrioritiesPageProps(…, NOW)` so `periodKey` is carried (NOW = 2026-07-10 keeps W28); `MobileMoveToPanelScenario.tsx:27` `inertPrioritiesPageContext(activePlanId)`; `DomainTab.tsx:221-223` same around MatrixTaskCard; `constants.ts` tracked fixture now `planId: MATRIX_CARD_ACTIVE_PLAN_ID`, `isTracked` field dropped |
| 13 | DumpPage + DumpPageContext; composer 0, feed 3 | ✓ | `DumpPage.tsx:18`; `DumpPageContext.ts:9-15` `{capture, captureError, loadMore}`; `DumpComposer.tsx:13` `export const DumpComposer = () =>`, `:15` reads context; `DumpFeed.tsx:14-18` {entries, hasMore, isAppending}, `:24` `loadMore` from context |
| 14 | toDumpPageProps adapter + test; no new action/service | ✓ | `utils/dump.ts` `toDumpPageProps(feed, totalCount, today): DumpPageData` (`'data' in feed` unwrap, `getISOWeekKey(today)`); `src/app/kanban/dump/page.tsx:16`; `dump.test.ts:61-98` (pass-through, error fallback); `src/actions/`, `src/services/` absent from `--stat` |
| 15 | Dump console: both tabs DumpPage | ✓ | `scenarios/dump/page.tsx:13,27` `<DumpPage {...toDumpPageProps(…, DUMP_TODAY)} />`; `fixtures.ts` `DUMP_TODAY = 2026-07-16` keeps the W29 badge |
| 16 | No callback props on feature components | ✓ | Function-typed interface members under board/priorities/dump at the candidate: `MobileBacklogPanel.onClose`, `MobileMoveToSheet.onClose`, `MatrixUndoToast.onUndo/onDismiss` — all overlay shells (rule 5). None on QuadrantCell, MatrixTaskCard, MoveToPopover, MoveToRows, MobileMoveToPanel, MobileBacklogCard, DumpComposer, DumpFeed, TaskCard or the frames |
| 17 | Context convention matches Projects | ✓ | `BoardPageContext.ts`, `PrioritiesPageContext.ts`, `DumpPageContext.ts` mirror `ProjectsPageContext.ts`: `createContext<…Value \| null>(null)`, `use(…)`, `use<Feature>PageContext` throwing "must be used within <Feature>Page", same doc shape ("`X` provides it; the … still come down as props"); `inertBoardPageContext()` / `inertPrioritiesPageContext(activePlanId)` beside `inertProjectsPageContext` in `design/constants.ts` (no Dump helper needed: no gallery specimen reads DumpPageContext) |
| 18 | Nothing outside the plan | ✓ | Outside the listed paths only `src/components/domain/shared/task-modal/TaskModalPanel.tsx` (one import: `FALLBACK_QUADRANT` now from `@/utils/oneOffUtils`, moved there with `groupTasksByQuadrant`) and `src/hooks/useDumpFeed.ts` (one comment: PriorityMatrixPage → PrioritiesPage). No Plan, auth, settings, shell, services, actions or DAL files |
| 19 | Docs | ✓ | `design/spike/{ => archived}/component-structure.md` (git mv, 0 content changes — spike README step 5 asks only mv + links); `tracker.md:33` link → `archived/`, the Board/Priorities/Dump sub-bullets removed (with their parent "Page structure for the other pages" and the Q9 "start here" bullets); `AGENTS.md:132` "the one page not on it yet, Plan, moves with Phase 2's Plan week (tracker)"; README `### 2026-10-26` rewritten with the implementation entry; `baseline.md:282-283` `BoardPage`. Remaining old-path mentions: `README.md:118` (2026-10-25 log, frozen by rule) and the experiment doc's verbatim prompts (`:42`, `:81`, path "as of {SHA}") |
| 20 | One commit per page + docs | ✓ | `1a13b30` Dump, `ae9fce0` Board, `0cbe61e` Priorities, `e7eeade` Docs (4 commits, `git log --oneline base..candidate`) |

## Props observed

| component | props | names |
| --- | --- | --- |
| QuadrantCell | 2 | quadrant, tasks |
| MatrixTaskCard | 2 | task, index |
| MoveToPopover | 1 | task |
| MoveToRows | 2 | task, variant |
| MobileMoveToSheet | 2 | task, onClose |
| MobileMoveToPanel | 1 | task |
| DumpComposer | 0 | — |
| DumpFeed | 3 | entries, hasMore, isAppending |
| MobileBacklogCard | 1 | card |
| BoardPage | 4 | plan, tasks, progress, projects (`BoardData`) |
| PrioritiesPage | 3 | periodKey, tasks, activePlan (`PrioritiesPageProps extends MatrixData`) |
| DumpPage | 4 | periodKey, entries, nextCursor, totalCount (`DumpPageData`) |

## Files outside the plan

- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — import path only: `FALLBACK_QUADRANT` moved from `priorities/constants.ts` to `utils/oneOffUtils.ts` (needed there by `groupTasksByQuadrant`).
- `src/hooks/useDumpFeed.ts` — one doc-comment rename (`PriorityMatrixPage` → `PrioritiesPage`).
- Within the allowed paths but worth knowing: `src/utils/boardCardUtils.ts` (comment), `src/app/design/README.md` (one line on inert contexts and adapters), `src/components/domain/priorities/constants.ts` (lost `FALLBACK_QUADRANT`).

## Possible bugs

none seen. Checked: the rename diffs of the three containers are structure-only (same DOM — `DragDropContext` renders no wrapper, so the header/board nesting is unchanged); `togglePopover`'s functional update matches the old `onSendToggle(isPopoverOpen ? null : task.id)`; every out-of-page render site of a context-reading component (`MobileBacklogSheetFrame`, `MobileMoveToPanelScenario`, the two gallery specimens) is wrapped in an inert context; the scenario `NOW`/`DUMP_TODAY` dates keep the header badges at the same weeks (W28/W29) as before; `toDumpPageProps`'s parameter union matches `fetchDumpEntriesAction`'s `{data}|{error}` returns; no stale `KanbanBoard`/`*Screen`/`PriorityMatrixPage` names outside historical log entries and the experiment doc. Judgment call, not a bug: the tracker's Q9 "start here" bullet was deleted with the finished item although the comparison (reviews, report, owner's pick) is still open.
