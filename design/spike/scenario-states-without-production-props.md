# Spike: Pin scenario states without production props

**Status: decided — Option A, implemented** · 2026-10-02 · Related: `design/spike/design-console-vs-storybook.md` (the Panel/Shell split is a separate tax and stays out of scope here)

## Trigger

#34 and #35 pinned two transient matrix states — the Move-to popover open and the undo toast showing — and `PriorityMatrixPage` grew a second code path just for that: two override props drilled through `PrioritiesScreen`, a `pinned` flag on the undo state, a fabricated pre-resolved completion promise, and a filter that hides the "completed" task from the component's own props. `ui/Toast` grew `paused`. None of it runs in production.

The pattern predates #35 — every pinned interaction state in the console is reached the same way:

| Seam | Production files | Used by |
| --- | --- | --- |
| `initialOpenPopoverTaskId` | `PriorityMatrixPage`, `PrioritiesScreen` | 3 priorities tabs |
| `initialUndoToastTaskId`, `UndoToastState.pinned`, seeded initializer, `withoutTask` | `PriorityMatrixPage`, `PrioritiesScreen` | 2 priorities tabs |
| `paused` | `ui/Toast` | the undo seam above, 1 gallery specimen |
| `defaultBacklogOpen` → `defaultOpen` | `BoardScreen` → `KanbanBoard` → `DesktopBacklog` | 1 board tab |
| `signOutTriggered` → `triggered` | `SettingsPanel` → `ui/ConfirmButton` | 1 auth tab, 1 gallery specimen |
| `pathname`, `collapsed` | `AppSidebar` | gallery specimens |
| `pathname`, `settingsOpen` | `BottomTabBar` | gallery (`settingsOpen` has no caller at all) |

Seven seams in ten production files, one shape: **a prop production never sets**.

Already clean, out of scope: genuine initial-data props (`DumpScreen` / `PlanForm` `initial*`, `SettingsSheet.initialTheme` — the server passes them); the AI chat scenarios (they seed `aiPlanChatStore` from the scenario side, `AiChatModalContent` has no console prop); the Panel/Shell pairs (production renders both halves).

## Why it happens

A scenario renders the **stateful** component, but the states worth pinning live inside it as **interaction state** (`useState`: popover open, backlog expanded, sign-out armed, undo window open) or come from **ambient state** it reads (the route, global stores). From outside, a prop is the only way in. Two needs ride along: **time** has to stop (a pinned toast must not drain), and **side effects** must not fire — already solved at the frame by `InteractionShield`.

So a fix has to answer three questions without touching production components: how a scenario reaches interaction state, how it supplies ambient state, and how it stops time.

## Acceptance bar

- No prop, branch or comment in `src/components/` exists only for the console: **every prop is set by production**.
- Screen tabs still render the shared screen component — the no-drift guarantee stays.
- In-context interaction states stay possible. The Move-to popover's scroll-clipping bug was caught only because the popover was pinned *inside* the matrix.
- Pinned states hold: no countdown, no visible flash.

---

## Option A — Play steps: reach the state the way a user would

**Design**

- A scenario tab may declare `play`: a few steps run once after mount, e.g. "click the Move-to button on the card *Find gym coach*". The component reaches the state through its **real** handlers; nothing is injected.
- Steps are **declarative data** (`{click: {within, label}}`), not functions — tabs are built in server `page.tsx` files, and functions cannot cross into the client `ScenarioTabs`. A step targets a stable scope (the fixture card's `data-rfd-draggable-id`, a section) plus an i18n key for the accessible name, so copy edits don't break it.
- `InteractionShield` lets activation through only while a step is dispatching (a `data-playing` window around each synchronous `element.click()`); human clicks stay swallowed. A step whose target is missing paints a red "play failed" chip in the frame header — breakage is loud, never a silent rest state.
- States that need a **side effect** to exist (the undo toast appears only after `completeTaskAction` succeeds) are **composed from genuine pieces**: the shared screen fed the post-action fixtures (done task removed) plus `MatrixUndoToast` — extracted from the page's `renderUndoToast` and used by production — with inert handlers.
- **Ambient state** of the app chrome becomes real props: `AppShell`, already a client component reading `usePathname()`, passes `pathname`, `collapsed` and `settingsOpen` to `AppSidebar` / `BottomTabBar`; the gallery passes fixture values.
- **Time** freezes at the frame — see *Freezing time* below.

```tsx
// scenarios/priorities/page.tsx — no override props left on the screen
{
  label: 'Move-to popover',
  content: <PrioritiesScreen periodKey={…} tasks={MATRIX_TASKS} activePlan={SCENARIO_ACTIVE_PLAN} />,
  play: [{click: {within: card(POPOVER_TASK_ID), label: 'Priorities.sendLabel'}}],
},
{
  label: 'Done toast',
  content: (
    <>
      <PrioritiesScreen periodKey={…} tasks={without(MATRIX_TASKS, DONE_TASK)} activePlan={SCENARIO_ACTIVE_PLAN} />
      <DoneToastScenario task={DONE_TASK} credited /> {/* client: MatrixUndoToast + inert handlers */}
    </>
  ),
},
```

**Pros**

- Production components lose every console prop and gain nothing console-specific (the toast extraction and the chrome props are used by production).
- Pinned states go through the real transition code: a regression in "open the chooser" shows up in the scenario, which a pinned prop silently bypasses.
- New code lives in the design app only — a play runner, one shield check, a gallery wrapper. One click per play covers every current case.
- Ports 1:1 to Storybook `play` functions should the Storybook spike ever be decided that way.

**Cons**

- Plays couple to accessible names and a scope selector — the contract an e2e test has. The i18n-key targets and the loud chip mitigate it; they don't remove it.
- Side-effect states are composed, which repeats one fact about the page in the scenario ("Done removes the card"). If the page later keeps the card struck through during the undo window, the composed tab must follow by hand.
- Multi-step plays wait a frame between steps (none are needed today).

**Implementation plan**

1. Console: `ScenarioTab.play?: PlayStep[]`; a client `PlayRunner` inside the frame (first step in a layout effect so nothing paints before it, a frame between later steps, i18n keys resolved via next-intl, failure chip); `InteractionShield` returns early inside the `data-playing` window; a gallery `<Play steps>` wrapper.
2. Time: the frame freeze below; delete `Toast.paused`.
3. Priorities: delete `initialOpenPopoverTaskId`, `initialUndoToastTaskId`, `pinned`, the seeded initializer and `withoutTask`, plus the `PrioritiesScreen` pass-throughs; popover tabs → `play`; extract `MatrixUndoToast`; Done-toast tabs → composition with a client `DoneToastScenario` owning the inert handlers.
4. Board: delete the `defaultBacklogOpen` → `defaultOpen` chain; the backlog tab plays a click on the collapsed rail.
5. Settings: delete `signOutTriggered` and `ConfirmButton.triggered`; the auth tab and the gallery specimen play a click on the rest-state row.
6. Chrome: `AppShell` passes `pathname` / `collapsed` / `settingsOpen`, which become required props; drop the override comments.
7. Size: **S–M** — mostly deletions; the runner (~60 lines) is the only new code.

---

## Option B — Container / view split: screens render injected state

**Design**

- Each stateful screen body splits into a controller hook (state, effects, server actions) and a pure view taking `state` + `actions`. The route renders the stateful wrapper; the scenario renders the view with a state object built from fixtures and inert actions, slotted into the shared screen (`PrioritiesScreen` takes the matrix as `children`).
- Optional refinement: transitions as a pure reducer, so scenarios *derive* states by applying the real transitions to the fixture state (`complete(initial, taskId)`) — reachable by construction.

```tsx
// route
<PrioritiesScreen periodKey={…}><PriorityMatrixPage tasks={tasks} activePlan={plan} /></PrioritiesScreen>
// scenario (a client component — actions are functions)
<PrioritiesScreen periodKey={…}>
  <PriorityMatrixView state={{...initialMatrixState(MATRIX_TASKS, PLAN), openPopoverTaskId: X}} actions={INERT_MATRIX_ACTIONS} />
</PrioritiesScreen>
```

**Pros**

- Every state is injectable, side-effect states included, type-checked and selector-free.
- Transition logic becomes unit-testable (with the reducer).
- The view's `state` prop is set by production on every render — an input, not an override.

**Cons**

- Leaf state must be lifted to the container boundary before a scenario can reach it: the backlog's `isOpen`, `ConfirmButton`'s armed flag, the popover id. The structure is shaped by the console again — the pollution moves into architecture instead of disappearing.
- Largest diff: the matrix page (~440 lines) splits in three; the board (dnd, backlog, sheets) follows.
- Hand-built states can be unreachable unless the reducer refinement is done.
- Still needs the frame freeze for time.

**Implementation plan**

1. Matrix: `usePriorityMatrix` (state, handlers, pending-completion map) → `PriorityMatrixView({state, actions})` → a five-line `PriorityMatrixPage`; `PrioritiesScreen` gains a `children` slot.
2. Board and settings: lift the backlog's and the confirm's state into controllers, same split.
3. Scenarios: client wrappers build states and inert actions.
4. Size: **M–L**.

---

## Option C — Seed context: inject internal state through a provider

**Design**

- One generic provider and hook: `useSeed(key, fallback)` returns the seeded value inside `<SeedProvider value={…}>` and the fallback anywhere else. Stateful components initialize from it — `useState(useSeed('priorities.openPopover', null))`. Scenarios wrap the screen in the provider; no props, no drilling.

**Pros**

- Smallest diff that also covers side-effect states (seed the undo toast directly).
- One documented seam instead of bespoke props.

**Cons**

- The same smell, renamed: every pinned state still costs a console-only line in a production component, plus a key registry that is a catalogue of scenarios living in `src/components/`.
- Implicit: nothing at a call site says the component can be seeded.
- Seeded raw state can be impossible (a toast for a task still on the grid).

**Implementation plan**

1. `application/SeedProvider` plus a typed `SeedRegistry` (declaration merging). 2. Replace each override prop with a `useSeed` initializer. 3. Scenarios wrap content in the provider. Size: **S**.

---

## Option D — Demote interaction states to component-level specimens

**Design**

- Screen tabs pin **data** states only (populated, empty, no plan, tracked). Interaction states drop to the lowest component that already exposes them as a genuine prop: a lone `MatrixTaskCard` with `isPopoverOpen` and its `MoveToPopover`; the shared undo toast composed over the screen (as in A). States no component exposes — backlog expanded, sign-out armed — stop being pinned: the gallery's live specimens show them on click, and the shielded scenario tabs drop them.

**Pros**

- Deletions only, no new infra.

**Cons**

- Loses in-context interaction states — exactly where the popover-clipping bug surfaced.
- Two pinned tabs disappear; review of those states falls back to clicking around the live app.

**Implementation plan**

1. Delete the seams as in A (steps 3–6) without adding plays. 2. Move the popover tabs to card-level specimens (a `DragDropContext` wrapper, like the gallery's `MatrixTaskCard` section). 3. Remove the backlog-open and sign-out-confirm tabs. Size: **S**.

---

## Freezing time (needed by A, B and D)

- The toast counts down in JS today and takes `paused`. Move the countdown to CSS: an `fx-countdown` utility (`transform: scaleX(1 → 0)`, linear, duration from a `--fx-countdown-ms` custom property), paused on hover by CSS, dismissal on the bar's `animationend`. The toast loses its interval, refs, hover state and `paused`.
- Frames and the gallery's specimen boxes carry `data-time="frozen"`; one rule pauses every `fx-countdown` inside them. The bar holds full width and `animationend` never fires.
- Guardrails: keep `fx-countdown` out of the `prefers-reduced-motion` `animation: none` list (otherwise the toast never dismisses — and a 2 px linear bar is not a vestibular trigger); listen for `animationend` on the bar element only, since the toast root animates too (`fx-boot-in`); the custom property is set inline, the same dynamic-value exception `ProgressBar` uses for its width.

```css
@keyframes fx-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.fx-countdown { transform-origin: left; animation: fx-countdown var(--fx-countdown-ms) linear forwards; }
.group:hover .fx-countdown,
[data-time='frozen'] .fx-countdown { animation-play-state: paused; }
```

Alternative: keep the JS countdown and read a frame-provided `useFrozenTime()` context. It works, but leaves a console-aware line in a `ui/` primitive — the thing this spike removes.

## Considered, not proposed

- **Rename overrides to the `default*` convention** (`defaultOpen`, as Radix does). Reads like API, but production still never sets them — cosmetic.
- **Compile the seams out** (`process.env` guards). `/design` ships with production, so nothing can be stripped, and guarded code is still read.
- **URL-addressable UI states** (`?moveTo=<id>`). Feature creep — no product need for deep links into transient UI.
- **Playwright screenshot catalogue** driving the real app. True interactions with zero seams, but it needs an auth bypass and a seeded database, and screenshots go stale between runs.
- **Storybook.** Its own spike. It would not remove these seams by itself — stories need a way in too — but its `play` functions, module mocking and iframe canvas are the tools Option A reaches for, so A shrinks a future port instead of competing with it.

## Comparison

| | A · Play steps | B · View split | C · Seed context | D · Demote |
| --- | --- | --- | --- | --- |
| Console-only code in `src/components/` | none | none, but state lifted for the console | one seeded initializer per pinned state | none |
| In-context interaction states | yes | yes | yes | no |
| Side-effect states (undo toast) | composition | injected | seeded | composition |
| Exercises the real transition | yes | with the reducer refinement | no | no |
| Main failure mode | renamed play target → loud chip | unreachable hand-built state | impossible seeded state | missing coverage |
| New infra | play runner (~60 lines) | none | provider + registry | none |
| Size | S–M | M–L | S | S |

## Decision framing

The question is what a scenario *is*: **the live component plus fixtures plus the user's first click** (A), **a render function fed hand-built state** (B, C), or **only what fixtures alone can produce** (D).

- Pick **A** to keep production free of the console while keeping in-context states, accepting an e2e-style coupling to accessible names.
- Pick **B** if typed, injectable state and unit-testable transitions are worth restructuring the stateful screens.
- Pick **C** only to quiet the noise quickly — it does not remove it.
- Pick **D** for the smallest change, giving up in-context interaction states.

**Recommendation: A** — with composition for side-effect states, the frame-level time freeze, and the chrome reads lifted into `AppShell`.

## After the decision

1. Add the rule to `AGENTS.md` → UI Workflow → Source of Truth, beside "Live-feel, no side effects": *No console-only props — a production component never carries a prop, branch or comment that only the Design Console uses; a scenario reaches a state through a `play` step or composes it from genuine pieces, and time freezes at the frame.* Bad: `initialUndoToastTaskId` on `PriorityMatrixPage`. Good: the tab's `play` clicks the card's Move-to button.
2. Implement the chosen option's plan; `grep -rniE "scenario override|used by design scenarios" src/components` comes back empty.
3. Close the tracker item and record the outcome in the README Update Log.
