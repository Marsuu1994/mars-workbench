# Component Library (`src/components/ui/`)

Proposal for the **structural** component layer of the design system. Status: **approved direction, not yet implemented** — phases are tracked in [tracker.md](./tracker.md) (Cross-cutting). The **visual** layer (OKLCH tokens + `fx-*` skin utilities) shipped with the Mission Control HUD redesign and is documented in [design-system.md](./design-system.md); this layer builds on it.

Guiding principles:

- Only extract structure that already repeats (≥2 hand-written copies); never invent abstractions ahead of need.
- `ui/` components **compose** daisyUI + `fx-*`; they never invent visual recipes. New recipes belong in the FX layer (`globals.css`), new structure belongs here.

## Where this sits

| Layer | What | Where | Status |
| --- | --- | --- | --- |
| L0 | Tokens: OKLCH themes, typography, motion | `globals.css` theme blocks | ✅ shipped (HUD redesign) |
| L1 | Skin recipes: `fx-chip`, `fx-label`, `fx-num`, `fx-panel`, … | `globals.css` `@layer components` | ✅ shipped |
| L2 | Structure + behavior: `Pill`, `BottomSheet`, `FieldRow`, … | `src/components/ui/` | **this proposal** |
| L3 | Feature components | `src/components/<page>/` | existing |

The HUD redesign wired L1 onto the *named* atoms — `TaskTypeBadge`, `SizeChip`, the BoardHeader date pill, and the chat BETA pill now use `fx-chip` — but the structural duplication beneath them is untouched. Closing that is L2's job.

## Audit (re-checked 2026-07, post-HUD-redesign)

| Pattern | State after the redesign |
| --- | --- |
| Tinted pill | **24 hand-rolled sites remain** (instance badge `#n` ×3 at 8/10/10px, "This Week" tag, ReviewChangesModal count pills, AppSidebar active state, …); only the 4 named chips adopted `fx-chip` |
| Mobile bottom sheets | Unchanged: `MobileBacklogSheet` / `MobileTrackSheet` share only the `<dialog class="modal modal-bottom md:hidden">` + backdrop-form shell; grip, header, scroll region, open mechanism all diverge |
| Overlay open-state | Unchanged: 4 coexisting mechanisms — imperative ref (`MobileBacklogSheet`), `isOpen` prop + effect (`TaskModal`, `ReviewChangesModal`), Zustand (`AiPlanChatModal`), parent state (`TrackPopover`) |
| Backdrop dismiss | Unchanged: `TaskModal` / `ReviewChangesModal` are Esc-only; the sheets + chat modal dismiss on backdrop — implicit, not a stated decision |
| Selectable pill group | Unchanged: 4 variants — TaskModal size picker, TemplateItem type pills, PlanForm mode toggle, QuadrantPicker |
| Field row | Unchanged: `form-control > label > control + hint` hand-written in TaskModal / PlanForm / QuadrantPicker; submit-spinner swap ×3; `IconNumberField` still dead code (never imported) |
| Risk borders / rollover tag / stat block | Unchanged: 2–3 hand-written copies each |
| Micro-typography | `fx-label` / `fx-num` adopted in only 7 files; arbitrary sizes remain — `text-[11px]` ×41, `text-[13px]` ×18, `text-[10px]` ×14, `text-[8px]` ×8, `text-[9px]` ×5, `text-[15px]` ×2 |
| Radii | `rounded-[10px]` ×6, `rounded-[5px]` ×1 — no semantic radius token yet |

## What goes into `ui/` (three tiers)

### Tier 1 — Overlay containers (highest leverage)

```text
ui/overlay/
├── useDialogSync.ts   # isOpen prop ↔ <dialog>.showModal()/close() effect, onClose wiring
├── OverlayShell.tsx   # the one <dialog> + modal-box + backdrop shell
│                      #   variant: "sheet" (modal-bottom md:hidden)
│                      #          | "responsive" (modal-bottom md:modal-middle)
│                      #          | "center" (modal)
├── BottomSheet.tsx    # sheet preset: grip bar, optional header slot, scrollable body
└── Popover.tsx        # TrackPopover generalized: positioning + arrow notch + click-away contract
```

`OverlayShell` also owns the HUD modal chrome — `fx-panel-solid fx-boot-in` (+ optional `md:fx-corners`) — so the boot animation and panel treatment cannot drift per-modal.

`BottomSheet` API sketch:

```tsx
<BottomSheet
  isOpen={...} onClose={...}          // prop-driven everywhere; kills the 4 mechanisms
  header={{ icon, title, count }}     // optional; renders close button when present
  scrollable                          // true → max-h-[80vh] flex column + overflow-y-auto body
  dismissOnBackdrop                   // explicit decision instead of accidental divergence
>
  {children}
</BottomSheet>
```

Consumers: `MobileTrackSheet`, `MobileBacklogSheet` (BottomSheet); `TaskModal`, `ReviewChangesModal` (OverlayShell `responsive`); `AiPlanChatModal` (OverlayShell `center`). Safe-area, grip bar, and backdrop form live only in the shell.

### Tier 2 — Domain atoms (kills drift)

| Component | Notes |
| --- | --- |
| `Pill` | Wraps `fx-chip`. Since `fx-chip` derives border/fill from `currentColor`, the color axis is just a `text-{token}` class; add a size axis. Absorbs the 24 remaining hand-rolled sites |
| `InstanceBadge`, `RiskBadge`, `RolloverTag` | Built on `Pill`; 3+ hand-rolled copies each converge, task-type color mapping lives in one place |
| `riskBorderClass(level, edge)` const map | TaskCard / BacklogSheetCard border logic |
| `StatBlock` | Value in `fx-num`, label in `fx-label` — ProgressDashboard ×4 + EmptyBoard ×3 |
| `ProgressBar` | The 3 linear bars in ProgressDashboard |
| `EmptyState` | icon + title + desc + CTA — EmptyBoard both modes, BacklogSheet empty text |
| `SectionLabel` | Wraps `fx-label`(`-bright`) — finishes the adoption currently stuck at 7 files |

`SizeChip` / `TaskTypeBadge` move into `ui/`, reimplemented on `Pill`.

### Tier 3 — Form kit

- `FieldRow` — label + required star + control slot + hint (the canonical `form-control` row)
- `ChoicePills` — single-select pill group, `layout: "row" | "grid"`; absorbs the 4 variants
- `Stepper` — −/+ number stepper (from TemplateItem); delete dead `IconNumberField`
- `SubmitButton` (spinner swap + `flex-1 md:flex-none`) and `FormErrorAlert` (form-level `alert alert-error`)

## Non-goals

- **No unified mega `TaskCard`.** `TaskCard` / `MatrixTaskCard` / `BacklogSheetCard` differ in layout and behavior (drag / tap / pull) for real reasons; they share the atoms and keep their own shells.
- **No cva / styling library.** Variants are plain `const` class maps (the existing `TaskTypeBadge` `CLASS_CONFIG` style).
- **No new skin.** If a `ui/` component needs a visual treatment that doesn't exist, add an `fx-*` recipe to the FX layer first, then compose it.
- **No copy inside `ui/`.** Labels/children come from callers so i18n stays at the feature layer; enum-labelled atoms (RiskBadge, SizeChip) may read their `Enums.*` namespace directly (existing SizeChip precedent).

## Conventions

1. **`tailwind-merge`** is the one new dependency: `ui/` components expose `className`, and unmerged class conflicts already shipped a real bug (the SizeChip double-chip incident recorded in `MatrixTaskCard.tsx`).
2. **Close the remaining token gaps in Phase 1**: a semantic radius token for the `rounded-[10px]` family; per arbitrary text size, either map it to `fx-label` / `fx-num` (when it's telemetry) or to a small type-scale token (e.g. `text-2xs` = 11px) when it's prose.
3. **Accessibility contracts live in the atoms**: constraints documented in design-system.md (e.g. light-theme `accent` is icon/large-text grade on base-200) are encoded once in the relevant `ui/` component, not re-checked per call site.
4. **The `/design` gallery is the acceptance spec**: every `ui/` component must have a gallery entry (overlays demoed via trigger buttons). Check the gallery before writing new UI.
5. `ui/` components are presentational only — no data fetching, no server actions.

## Migration phases (lowest risk first, each independently mergeable)

1. **Foundations** — `ui/` folder, `Pill` (on `fx-chip`), tailwind-merge, radius/type-scale token decisions, gallery entries. Pure visual swap.
2. **Badge family** — InstanceBadge / RiskBadge / RolloverTag / riskBorderClass across the 24 remaining sites; SizeChip + TaskTypeBadge move to `ui/` on Pill. Verify by gallery comparison.
3. **Bottom sheets** — `useDialogSync` + `BottomSheet`; migrate MobileTrackSheet (simplest) then MobileBacklogSheet; unify open state to prop-driven.
4. **Modal shells** — OverlayShell takes over TaskModal / ReviewChangesModal / AiPlanChatModal, owning `fx-panel-solid` / `fx-boot-in` / `fx-corners`; backdrop behavior becomes explicit `dismissOnBackdrop={false}`. Touches interaction — hand-test each.
5. **Form kit** — FieldRow / ChoicePills / Stepper / SubmitButton; refactor TaskModal + PlanForm (largest beneficiary); delete IconNumberField.
6. **Content blocks + micro-type sweep** — StatBlock / ProgressBar / EmptyState / SectionLabel; finish `fx-label` / `fx-num` adoption across the arbitrary-size sites; align loading skeletons with real component structure.

## Mockups → scenario pages (retirement plan)

**Why.** The HTML mockups are a parallel implementation of the UI: ~10.5k lines across 17 files plus their own CSS (`styles.css`, `mockup-theme.css`). Drift is structural, not a discipline problem, and the HUD redesign raised the cost: design-system.md's "Sync points" now lists five locations to touch in lockstep on any palette change, and the tracker carries an open item to back-port the FX language into mockup CSS. Every mockup read also costs agents thousands of tokens.

**The three jobs mockups do today, and where each moves:**

| Job | New home |
| --- | --- |
| Proposal medium (approve before code) | A scenario *variant* on a branch, built from real components — cheap once Tiers 1–2 exist. Disposable HTML stays allowed for greenfield redesigns unconstrained by existing components, deleted after implementation |
| Implementation spec ("build exactly this") | `/design` gallery (atoms) + **scenario pages** (screens) |
| Durable reference | Git history for artifacts; `design/flows/*.md` keeps behavioral truth (triggers, steps, rules) — unchanged |

**Scenario pages** are `/design/scenarios/*` routes that compose the *real* page components with fixture data — the states that are hard to reach with live data: empty board (new user), danger-heavy Friday, AI chat mid-conversation, review modal with every change type. They render pixel-identical to production because they are the production components; drift becomes a compile error and the back-port step ceases to exist. (The gallery's EmptyBoard and TaskCard fixtures are the existing embryo of this.)

**Policy once adopted** (gated on Phases 1–2 landing):

1. Freeze per-feature mockup folders as archive; stop back-porting.
2. New UI proposals go through scenario variants (screenshots for async review); `future-work/` keeps its role for approved-but-unbuilt designs.
3. Retire `styles.css` / `mockup-theme.css` maintenance; the open "back-port FX into mockup CSS" tracker item is superseded if this lands — hold it until this decision is made.
4. Update AGENTS.md UI Workflow and the `/design-explore` + `/new-flow` skills to the scenario flow.
