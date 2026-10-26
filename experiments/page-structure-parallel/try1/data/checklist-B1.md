# Checklist — B1 (`origin/claude/page-structure-b1`, 7d0b6c0 vs base 1ae70f7)

Read-only audit through git plumbing. Line numbers are the candidate's unless marked "base".

| # | item | verdict | evidence |
| --- | --- | --- | --- |
| 1 | BoardPage absorbs BoardScreen | ✓ | `KanbanBoard.tsx` renamed `BoardPage.tsx` (git similarity 71%); `BoardPage.tsx:135` `flex flex-col h-full`, `:138` `flex-1 min-h-0` wrap `BoardHeader` + `ProgressDashboard` + `renderBoard()`; `BoardScreen.tsx` deleted |
| 2 | Route renders BoardPage, EmptyBoard kept | ✓ | `src/app/kanban/page.tsx:6,20` `<BoardPage {...board} />`; `:11-18` `if (!board)` → `<EmptyBoard …/>` unchanged |
| 3 | BoardPageContext.pullToTodo; card drops onPull | ✓ | `BoardPageContext.ts:8-11` `{pullToTodo}`; `BoardPage.tsx:91` `pageContext = {pullToTodo}`; `MobileBacklogCard.tsx:10-12` props = `{card}`, `:19` `const {pullToTodo} = useBoardPageContext()` |
| 4 | toBoardCards + three frames unchanged | ✓ | `boardCardUtils.ts`, `BoardColumn.tsx`, `DesktopBacklog.tsx`, `MobileBacklog.tsx` diffs are comment-only (`KanbanBoard` → `BoardPage` in doc comments); `isDragActive` still a `BoardColumn` prop |
| 5 | Console: board tabs + inert context | ✓ | `scenarios/board/page.tsx:44,57` both tabs `<BoardPage …/>`; `MobileBacklogSheetFrame.tsx:26` `<BoardPageContext value={inertBoardPageContext()}>`; `DomainTab.tsx:171` same wrap around the `MobileBacklogCard` specimens; helper at `design/constants.ts:695-697` |
| 6 | PrioritiesPage absorbs PrioritiesScreen | ✓ | `PriorityMatrixPage.tsx` renamed `PrioritiesPage.tsx` (72%); `PrioritiesPage.tsx:31` imports `BoardHeader`, `:315-316` `flex flex-col h-full` + `<BoardHeader periodKey={periodKey} />`; `PrioritiesScreen.tsx` deleted |
| 7 | periodKey fallback → toPrioritiesPageProps | ✓ | `utils/oneOffUtils.ts:99-106` `toPrioritiesPageProps({tasks, activePlan}, today)` → `periodKey: activePlan?.periodKey ?? getISOWeekKey(today)`; route `priorities/page.tsx:9`; tests `oneOffUtils.test.ts:14-30`; `matrixService` not in the diff |
| 8 | groupTasksByQuadrant / isTrackedTask, one isTracked | ✓ | `oneOffUtils.ts:110-124`, `:127-130`; tests `:32-64`; `isTracked` computed only via `isTrackedTask` (`MatrixTaskCard.tsx:36`, `MoveToRows.tsx:71`, `PrioritiesPage.tsx:89-90`); base `QuadrantCell.tsx:120-123` duplicate gone; `FALLBACK_QUADRANT` moved to `oneOffUtils.ts:26` |
| 9 | PrioritiesPageContext contents | ✓ | `PrioritiesPageContext.ts:12-25`: `activePlanId`, `openPopoverTaskId`, `togglePopover`, `openMoveToSheet`, `openAddTask`, `trackTask`, `completeTask`; provided at `PrioritiesPage.tsx:172-181` |
| 10 | Prop counts 2/2/1/2/2/1 | ✓ | `QuadrantCell.tsx:12-15` (2), `MatrixTaskCard.tsx:17-21` (2), `MoveToPopover.tsx:7-9` (1), `MoveToRows.tsx:19-24` (2), `MobileMoveToSheet.tsx:9-13` (2), `MobileMoveToPanel.tsx:7-9` (1) |
| 11 | Overlays unchanged; click-away in container | ✓ | `git diff --stat` on `MatrixUndoToast.tsx`, `ui/Toast.tsx`, `task-modal/TaskModal.tsx` is empty; `PrioritiesPage.tsx:342-347` the `fixed inset-0 z-40` click-away layer; `:188-194`, `:203-209`, `:356-370` same overlay props as base |
| 12 | Console: 7 tabs → PrioritiesPage; inert wraps | ✓ | `scenarios/priorities/page.tsx:25-32` `renderPrioritiesPage` = `<PrioritiesPage {...toPrioritiesPageProps({tasks, activePlan}, SCENARIO_TODAY)} />`, used by the 7 former `PrioritiesScreen` tabs (Matrix, popover, popover-tracked, No plan, popover-no-plan, Done toast ×2); `MobileMoveToPanelScenario.tsx:27` and `DomainTab.tsx:232-236` wrap in `inertPrioritiesPageContext(activePlanId)` (`constants.ts:702-712`); `MATRIX_CARD_FIXTURES` carry `activePlanId` + `planId` instead of `isTracked`. Note: `periodKey` comes from the adapter (rule 7 / Q4) rather than a fixture field |
| 13 | DumpPage + DumpPageContext; composer 0 / feed 3 props | ✓ | `DumpPage.tsx:17-26` (was `DumpScreen`); `DumpPageContext.ts:8-15` `capture`, `captureError`, `loadMore`; `DumpPage.tsx:38` provides; `DumpComposer.tsx:13` no props, `:15` reads context; `DumpFeed.tsx:14-18` `entries · hasMore · isAppending`, `:24` `loadMore` from context |
| 14 | Route unwrapping → toDumpPageProps | ✓ | `utils/dump.ts:92-105` `toDumpPageProps(feed, totalCount, today)` (unwraps `{data}`, `periodKey: getISOWeekKey(today)`); route `dump/page.tsx:16`; tests `dump.test.ts:61-89`; no change under `src/actions`, `src/services`; types in new `src/types/dump.ts` |
| 15 | Console: both dump tabs render DumpPage | ✓ | `scenarios/dump/page.tsx:13-19`, `:27-33` `<DumpPage {...toDumpPageProps(…, DUMP_TODAY)} />`; `fixtures.ts:58` `DUMP_TODAY` replaces `DUMP_PERIOD_KEY` |
| 16 | No callback props on feature components | ✓ | grep over the 25 `*Props` interfaces in board/priorities/dump: function-typed props only on `MobileBacklogPanel.tsx:12` `onClose`, `MobileMoveToSheet.tsx:12` `onClose`, `MatrixUndoToast.tsx:14-15` `onUndo`/`onDismiss` — all rule-5 overlay exceptions |
| 17 | One context convention, matches Projects | ✓ | All three (`BoardPageContext.ts`, `PrioritiesPageContext.ts`, `DumpPageContext.ts`): documented `<Feature>PageContextValue` interface, `createContext<… \| null>(null)`, `use<Feature>PageContext` via `use()` throwing `"use<Feature>PageContext must be used within <Feature>Page"` — same as `ProjectsPageContext.ts`; `inertBoardPageContext()` / `inertPrioritiesPageContext(activePlanId)` beside `inertProjectsPageContext` in `design/constants.ts:693-712` (no Dump specimen reads a context, so none needed) |
| 18 | Nothing outside the plan | ✓ | Outside the listed paths only: `src/types/dump.ts` (new; `DumpFeedPage`/`DumpFeedResult`/`DumpPageData` for the adapter), `src/hooks/useDumpFeed.ts:44` (comment: `PriorityMatrixPage` → `PrioritiesPage`), `src/components/domain/shared/task-modal/TaskModalPanel.tsx:18` (import of the moved `FALLBACK_QUADRANT`). No Plan, auth, settings, app-shell, services, actions or DAL edits |
| 19 | Docs | ~ | Met: tracker's three per-page sub-bullets removed (`design/tracker.md` diff, replaced by a "Q9 comparison report" bullet); `AGENTS.md:132` now "the Plan page, not on it yet: tracker › Week model Phase 2"; `README.md:107-114` 2026-10-26 entry (day's section rewritten); `baseline.md:281-286` `BoardScreen`/`KanbanBoard` → `BoardPage`. Not met: spike still at `design/spike/component-structure.md` (`git diff --stat -- design/spike/` empty; the tracker defers the move to archived "together [with the experiment doc], the spike carrying Q9's results"); links therefore unchanged (`tracker.md:33`, `README.md:118` earlier entry) |
| 20 | One commit per page + docs | ✓ | `71a6404` Board, `b928f79` Dump, `ce03e7e` Priorities, `7d0b6c0` Docs; `git log --merges` empty |

## Props observed

| component | props | file |
| --- | --- | --- |
| QuadrantCell | 2 — `quadrant`, `tasks` | `priorities/QuadrantCell.tsx:12-15` |
| MatrixTaskCard | 2 — `task`, `index` | `priorities/MatrixTaskCard.tsx:17-21` |
| MoveToPopover | 1 — `task` | `priorities/MoveToPopover.tsx:7-9` |
| MoveToRows | 2 — `task`, `variant` | `priorities/MoveToRows.tsx:19-24` |
| MobileMoveToSheet | 2 — `task`, `onClose` | `priorities/MobileMoveToSheet.tsx:9-13` |
| MobileMoveToPanel | 1 — `task` | `priorities/MobileMoveToPanel.tsx:7-9` |
| DumpComposer | 0 | `dump/DumpComposer.tsx:13` |
| DumpFeed | 3 — `entries`, `hasMore`, `isAppending` | `dump/DumpFeed.tsx:14-18` |
| MobileBacklogCard | 1 — `card` | `board/MobileBacklogCard.tsx:10-12` |

## Files outside the plan

- `src/types/dump.ts` — new shared types (`DumpFeedPage`, `DumpFeedResult`, `DumpPageData`) used by `toDumpPageProps` and `DumpPage`; a reasonable home per the project structure, but not named by the spike.
- `src/hooks/useDumpFeed.ts` — one doc-comment line (`PriorityMatrixPage` → `PrioritiesPage`).
- `src/components/domain/shared/task-modal/TaskModalPanel.tsx` — import path only, because `FALLBACK_QUADRANT` moved from `priorities/constants.ts` to `utils/oneOffUtils.ts` with `groupTasksByQuadrant`.
- Docs: `AGENTS.md`, `README.md`, `design/baseline.md`, `design/tracker.md`, `src/app/design/README.md` (all in scope).

## Possible bugs

None seen. Behavior parity checked: popover toggle (`togglePopover` at `PrioritiesPage.tsx:175-176` ≡ base `onSendToggle(isPopoverOpen ? null : task.id)`), tracked check (`isTrackedTask` ≡ base `activePlanId !== null && task.planId === activePlanId`), `handleTrack`/`handleComplete`/undo and the overlay wiring unchanged, the no-plan scenario tabs still show W28 (`SCENARIO_TODAY` = 2026-07-10). Non-bug notes: `utils/oneOffUtils.ts:3` adds a type-only import from `services/matrixService` (`import type`, allowed by the server-only rule; the base container already did the same); `groupTasksByQuadrant` now runs on every render instead of in `useMemo` (what the standard asks; React Compiler is on).
