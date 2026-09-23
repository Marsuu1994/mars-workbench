# Spike: Complete one-off tasks from the priority matrix

**Status: decided — Option C, no undo toast** (2026-09-23; proposed 2026-09-22) · Mockup: `design/mockup/future-work/mockup-priorities-complete-one-off.html` (Today · C, desktop + mobile, interactive — open the chooser, pick a row) · Flow: `design/flows/priorities.md` → Complete One-off Flow

## Decision (2026-09-23)

**Option C — Move-to chooser — ships, without the undo toast.** Owner's reasoning:

- **Not A (Done dock).** Drag-to-complete is not actually a convenient gesture — lift, travel, drop, and the weakest input on mobile — so the dock would cost space and dnd surface for no real UX win.
- **Not B (card check).** A ring on every card puts too many elements on an already dense matrix card; it overcomplicates the card for a single action.
- **No undo toast.** Not worth it: C's deliberate two-step (open the chooser, pick Done) makes accidental completes rare, and the toast would need a new `ui/Toast` primitive plus a whole undo write path. Accepted consequence: a completed one-off has no UI reverse path — Done cards on the board are drag-locked, and DONE tasks never return to the matrix.

**Completion semantics (confirmed).** One `ensureSynced` lookup — the same call Track this week already makes — then one owner-scoped conditional write (`type = AD_HOC`, `status ≠ DONE`):

1. **Active plan exists** → an unassigned task is linked to it (`planId: null → plan.id`) and set `status = DONE`, `doneAt = now`. It shows in the board's Done column and its points count toward Today / Week — the same outcome as track → drag to Done.
2. **No active plan** → `planId` stays `null`; only `status = DONE`, `doneAt = now` are written. The points are credited nowhere.

An already-tracked card keeps its existing `planId` in both cases — only `status` / `doneAt` change, never a re-attribution.

The shared contract, the Option C plan and the draft flow below are updated to this shape; Options A and B and the comparison stay as proposed, for the record.

## Trigger

One-off (`AD_HOC`) tasks can only be finished on the board: track the card into the current `ACTIVE` plan, open the board, drag it to Done. Two consequences:

1. **No active plan → nothing on the matrix can finish a task.** Between periods (plan ended, next one not created) and for users who never made a plan, "Track this week" is disabled on both breakpoints, so a done errand stays on the matrix forever — or the user creates a plan just to close a 1-point task.
2. **Even with a plan it is a two-page round trip** for the most frequent terminal action on this page.

The owner's first idea — drag the card onto a trash-can-like zone in the middle of the matrix — is the seed for Option A; the reasons it should not ship as-is are listed there.

## Shared contract (independent of the chosen interaction)

Whichever interaction wins, the write and its feedback are the same:

- **Complete** = `status → DONE`, `doneAt = now`. `planId` is only ever *added*: `null → current-week ACTIVE plan` when one exists — the task then shows in the board's Done column and its points count toward Today/Week, the same outcome as track → drag to Done. An existing `planId` is never changed; with no active plan it stays `null` and the points are credited nowhere (there is no week to credit; crediting the *next* plan would be retroactive attribution — rejected).
- The card leaves the matrix immediately (optimistic), title-bar counts update, `/kanban` and `/kanban/priorities` revalidate.
- **Tracked ("This Week") cards can be completed from here too** — identical to the board drag to Done.
- **No confirm, no undo.** The chooser's two-step is the deliberate action; completing is final from the UI (see Decision).
- Failures keep the page's current convention (silent optimistic rollback + `console.error`) until the cross-cutting error-state design lands.

**Backend plan:**

| Layer | Change |
| --- | --- |
| `lib/db/tasks.ts` | `completeAdhocTask(userId, taskId, activePlanId \| null)` — owner-scoped conditional write (`type = AD_HOC`, `status ≠ DONE`) that sets `status DONE`, `doneAt now`, and fills `planId` only when it is null (an existing link is never re-attributed) |
| `services/matrixService.ts` | `completeMatrixTask(userId, taskId)` — `ensureSynced` → active plan id or null → DAL |
| `actions/matrixActions.ts` | `completeTaskAction(taskId)` — service → `revalidatePath('/kanban')` + `'/kanban/priorities'` |
| `i18n/en.json` → `Priorities` | `doneRow` "Done" (chooser row); `hintNoPlan` gains "· you can still mark tasks done"; the Move-to rename keys are in the Option C plan |
| `design/reference.md` | one new row each (action / service / DAL) |

---

## Option A — Done dock (drag to complete; refined from the trash-can idea)

**Why not the trash can in the middle, as proposed**

1. *Trash means delete.* Using it for "complete" teaches the wrong verb, and the tracker already lists ad-hoc task deletion as future work — that flow will need the trash metaphor for actual deletion.
2. *The centre is the worst spot.* All four quadrants meet there; a zone would cover the cards nearest the crossing in every quadrant and compete with the four quadrant drop targets. `@hello-pangea/dnd` hit-testing is purely geometric with an unintuitive tie-break — the board's invisible backlog panel once stole Done drops for exactly this reason.
3. *Nothing at rest reveals it.* A zone that only appears mid-drag is never discovered by someone who does not drag — and drag is the least reliable gesture on mobile (long-press to lift, then travel).

**Design**

- A persistent **Done dock**: a low band along the bottom edge, outside the 2×2 — below the Urgent / Not Urgent axis on desktop, between the axis and the tab bar on mobile. The bottom edge is "off the board"; dragging a card down and out finishes it.
- At rest: muted strip — check ring, `DONE` micro-label, hint "Drag a card here to mark it done" (mobile: "Drag here to mark done").
- On any card lift: the dock **arms** (success LED, green label) so it advertises itself exactly when it is usable. With the card over it: dashed success outline, tint, "Drop to mark done". Drop → card collapses, undo toast.
- Channel: **success**, deliberately not the accent-orange drop language — orange targets *reposition*, this one *completes*. The one sanctioned exception, documented in the design-language README when it ships.
- Later (not v1): the same band is the natural home for a "done this week" tray (expand → list, un-complete), which also serves the tracker's auto-clear item.

**Pros**

- The matrix stays one gesture family — everything is drag; cards keep today's silhouette (no per-card chrome).
- Same mechanism on both breakpoints.
- Grows into the completed-tray naturally.

**Cons**

- Lift + travel + drop vs one tap; from the top quadrants the travel is the full matrix height.
- Mobile drag: long-press to lift, thumb covers the card, travel across scrolling quadrants, and the band sits directly above the tab bar so an overshoot lands on the dock (nothing happens — but it is a miss).
- Permanent ~40 px of vertical space on every breakpoint; the mobile matrix is already tight.
- dnd cost: a fifth `Droppable` outside the grid, a `handleDragEnd` branch, geometric hit-testing to verify by hand — drags cannot be automated (known constraint), and the "over" state cannot be pinned in the Design Console.

**Implementation plan (UI)**

1. `domain/priorities/DoneDock.tsx` — a `Droppable` band (`DONE_DROPPABLE_ID` in `constants.ts`; not a `PriorityQuadrant` value, so the quadrant cast in `handleDragEnd` gets a guard); `state: 'rest' | 'armed'` from the page, `snapshot.isDraggingOver` for the over state.
2. `PriorityMatrixPage` — `isDragging` from `onDragStart`/`onDragEnd`; `handleDragEnd` branch → `handleComplete(draggableId)`; `handleComplete`/`handleUndo` + toast (shared contract). Render the dock after `renderAxisX()` on both breakpoints.
3. i18n: `doneDockLabel` "Done", `doneDockHint` (per breakpoint), `doneDockDrop` "Drop to mark done".
4. Scenarios: "Done dock — armed" (fixture override `initialDockState`, like `initialOpenPopoverTaskId`), "Done toast". The over-state stays a hand-verified state.
5. Size: **M** — the dnd branch and manual drag verification are the bulk.

---

## Option B — Card check (one tap) · **recommended**

**Design**

- Every matrix card gets a **check ring** at its leading edge — the universal todo idiom (Things, Todoist, Reminders, Linear). 18 px on desktop, 16 px on mobile, 1.5 px stroke at ~25 % at rest, no glyph, no fill — always visible, never hover-revealed (the template-pencil lesson from the tracker: `opacity-0 group-hover` affordances are invisible on touch).
- Desktop hover on the ring: success stroke, faint success fill, check glyph fades in. Click: ring fills success, title strikes through and dims (220 ms), the card collapses (240 ms console-snap) and the undo toast rises. Mobile: the ring is the tap target (≈36 px hit area); tapping anywhere else still opens the track sheet as today.
- The send "→" and grip stay where they are. Tracked (dimmed, "This Week"/★) cards get the ring too; the dim moves from the card root to its content so the ring stays crisp.
- Hint bar: "Drag between quadrants to reprioritize · click → to track this week · click ✓ to mark done". No-plan bar: "No active plan — Create Plan to track tasks this week · you can still mark tasks done".
- Keyboard for free: the ring is a real `<button>`.

**Pros**

- One click / one tap; identical on both breakpoints, with or without a plan — one mental model.
- Discoverable at rest; nothing to learn.
- Zero dnd surface: no new `Droppable`; a press-and-release without movement inside the drag handle is a click, exactly like today's send button.
- Every state is pinnable in the Design Console (`completingTaskId`, `initialToast` fixture overrides); no manual-only states.

**Cons**

- A permanent element on every card in a dense 2×2 (8 rings on the scenario fixture) — kept quiet by the 25 % rest opacity and the absence of a glyph.
- Accidental taps on mobile (a thumb aiming for the card hits the ring) — the undo toast is the mitigation; a long-press on the ring still lifts the card for drag, as with the send button.
- Cards gain ~22 px of leading padding; long titles truncate slightly sooner on mobile.

**Implementation plan (UI)**

1. `MatrixTaskCard` — `onComplete(taskId)` + `isCompleting` prop; ring button rendered before the title block (`aria-label = t('markDoneLabel')`, `stopPropagation`); `completing` treatment (success fill, line-through); dim moved to the content wrapper.
2. `PriorityMatrixPage` — `handleComplete(taskId)`: snapshot `{status, planId}`, mark completing, remove after `COMPLETE_SETTLE_MS`, `completeTaskAction`, rollback on error, set `undoToast`; `handleUndo`: re-insert (sort by `createdAt`), `undoCompleteTaskAction(taskId, {status, detach: planId === null})`. `constants.ts`: `COMPLETE_SETTLE_MS = 240`, `UNDO_TOAST_MS = 5000`.
3. `ui/Toast.tsx` (shared contract) rendered by the page; migrate `renderAddedToast` onto it.
4. i18n as in the shared table; scenario tabs: "Matrix" (rings at rest — updates by construction), "Completing" (pinned), "Done toast — credited", "No plan" (new copy). Gallery: `Toast`.
5. Size: **S–M** — mostly the shared backend + toast; the card change is small.

---

## Option C — Move-to chooser (extend the existing popover / sheet)

**Design**

- Desktop: the hover "→" button and popover stay; the section label becomes **"Move to"** and gains a third row **Done** (success dot, check glyph) under a hairline. With no active plan the "→" is *enabled* (today: disabled + tooltip); the popover shows Todo / In Progress disabled with the "No active plan yet" note and Done enabled.
- Mobile: the tap sheet gains the same Done row. With no plan the sheet finally has a purpose — today it opens only to show two disabled buttons.
- Tracked cards: show the "→" (today hidden) with only the Done row, since they are already on the board.
- Done → the card leaves the matrix immediately (shared contract). No toast.

**Pros**

- Smallest UI change: no new gesture, no new chrome at rest; the popover, sheet, click-away layer and `isDragDisabled`-while-open rules carry over.
- Deliberate two-step → near-zero accidental completes.
- On mobile it is genuinely good: tap card → Done is one row away, in the place users already go for actions.

**Cons**

- Desktop is three steps (hover → click → click) for the most frequent terminal action, and Done hides behind a "send to board" glyph.
- Nothing on the surface says completion is possible — Done lives inside a menu.
- "Track this week" → "Move to" weakens the framing the popover exists to teach.

**Implementation plan (UI)**

1. `constants.ts` — a `ChooserRow` union (`{kind: 'track', status}` × 2 + `{kind: 'complete'}`) replacing `TRACK_TARGETS`; rows carry `needsPlan`.
2. `TrackPopover` → `MoveToPopover`, `MobileTrackSheet` → `MobileMoveToSheet` (rename files with components); rows dispatch `onTrack(status)` or `onComplete()`; disabled treatment per row instead of per sheet.
3. `MatrixTaskCard` — send button enabled without a plan; rendered for tracked cards with the reduced row set.
4. `PriorityMatrixPage` — `handleComplete(taskId)`: optimistic remove, `completeTaskAction`, rollback on error (shared contract).
5. i18n: `moveTitle` "Move to" (replaces `trackTitle`); scenario tabs renamed ("Move-to popover", "Move-to popover — no plan", both sheet tabs); `MobileTrackPanel` scenario mirror renamed.
6. Size: **S**.

---

## Considered, not mocked

- **Swipe to complete (mobile)** — iOS-Mail idiom, but it collides with the dnd touch sensor (a horizontal move after the long-press is a drag, before it is a scroll), needs a hand-rolled gesture layer, has no desktop analogue, and nothing at rest reveals it.
- **Long-press / right-click menu** — long-press is already the touch drag trigger; context menus are invisible on mobile.
- **Confirm-before instead of undo-after** — right for sign-out, wrong for a high-frequency action.
- **"Done this week" tray on the matrix** (list of completed one-offs, un-complete) — valuable but separable; it is the natural continuation of Option A's dock and of the tracker's auto-clear item, and it needs its own query (DONE ad-hoc tasks by `doneAt` within the current week).

## Comparison

| | A · Done dock | B · Card check | C · Move-to chooser |
| --- | --- | --- | --- |
| Steps, desktop | lift · travel · drop | 1 click | hover · click · click |
| Steps, mobile | long-press · travel · drop | 1 tap | tap · tap |
| Discoverable at rest | band with hint | ring on every card | no — inside a menu |
| Accidental-complete risk | low | medium (undo) | very low |
| New chrome at rest | ~40 px band, both breakpoints | 18 px ring per card | none |
| Works with no plan | yes | yes | yes |
| dnd surface | +1 Droppable, geometric hit-testing | none | none |
| Console-pinnable states | partial (over-state by hand) | all | all |
| Estimated size | M | S–M | S |

## Decision framing

The question is not "which is cheapest" (all three share the backend; C saves perhaps an afternoon) but **which gesture should completing a one-off be**: a drag (A, on-brand for this drag-first page), a tap on the card (B, the universal idiom), or a menu choice (C, the cautious one).

- Pick **A** if keeping the matrix a pure drag surface matters more than tap speed, and the completed-tray is wanted soon.
- Pick **B** if completion should be the cheapest gesture on the page and identical on phone and desktop.
- Pick **C** if accidental completes worry you more than the extra clicks, or if this must ship in the smallest possible diff.

**Recommendation: B** — *as proposed; superseded by the Decision above.* One tap, one mental model across breakpoints and plan states, discoverable at rest, no dnd risk, fully pinnable in the Design Console. A's dock can still be layered on later — a drop target and a ring coexist without conflict — if the completed-tray becomes wanted.

## After the decision

1. Trim the mockup to Option C and rename it `mockup-priorities-complete-one-off.html`.
2. Lift the draft flow below into `design/flows/priorities.md` and add the backend rows to `design/reference.md`.
3. Implement (backend from the shared table, UI from the Option C plan), extend the priorities scenarios, delete the mockup, update the tracker item.

### Draft flow — Complete One-off Flow

**Trigger / Entry Point**

- Choose **Done** in a matrix card's Move-to popover (desktop, via the hover "→") or Move-to sheet (mobile, tap the card) — both breakpoints, with or without an active plan, tracked cards included.

**Steps**

1. UI closes the chooser, removes the card optimistically, and title-bar counts update.
2. Server Action completes the task: `status = DONE`, `doneAt = now`; an unassigned task is attached to the current-week `ACTIVE` plan when one exists. Rollback on failure.
3. Revalidate `/kanban` (Done column, Today / Week metrics) and `/kanban/priorities`.

**Rules**

- Works without an active plan — that is the point of the flow; the no-plan hint bar says so.
- `planId` is only ever added (`null → active plan`), never re-attributed. DONE tasks never return to the matrix.
- Tracked cards complete exactly like a board drag to Done.
- Completing is final: no confirm, no undo, and no "un-complete" on the board or the matrix.
