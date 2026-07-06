# Design System (`src/components/ui/`)

Proposal for a domain-specific design-system layer on top of daisyUI. Status: **approved direction, not yet implemented** — phases are tracked in [tracker.md](./tracker.md) (Cross-cutting).

Guiding principle: **only extract visual language that already repeats (≥2 hand-written copies); never invent new abstractions ahead of need.**

## Why (audit evidence, 2026-07)

Findings from a full sweep of `src/components/` + `src/app/`:

| Pattern | Duplication found |
| --- | --- |
| Tinted pill (`bg-{color}/10–15` + `text-{color}` + small font + rounded) | ~30 occurrences across 15 files: instance badge (`#2`) hand-rolled 3× at 8/10/10px, "This Week" tag, BoardHeader date capsule, BETA pill, ReviewChangesModal count pills, AppSidebar active state, … |
| Mobile bottom sheets | `MobileBacklogSheet` and `MobileTrackSheet` share only the `<dialog class="modal modal-bottom md:hidden">` + backdrop-form shell; grip, header, scroll region, and open mechanism all diverge |
| Overlay open-state | 4 coexisting mechanisms: imperative ref (`MobileBacklogSheet`), `isOpen` prop + effect (`TaskModal`, `ReviewChangesModal`), Zustand (`AiPlanChatModal`), parent state (`TrackPopover`) |
| Backdrop dismiss | Sheets + chat modal close on backdrop tap; `TaskModal` / `ReviewChangesModal` do not (Esc only) — implicit, not a stated decision |
| Selectable pill group | 4 variants of "mutually exclusive buttons, selected state swaps border/bg": TaskModal size picker, TemplateItem type pills, PlanForm mode toggle, QuadrantPicker |
| Field row | `form-control > label.label > control + hint` hand-written in TaskModal, PlanForm, QuadrantPicker; submit-button spinner swap ×3; `IconNumberField` is dead code (never imported) |
| Risk borders | danger/warning edge-border logic duplicated in TaskCard + BacklogSheetCard |
| Rollover tag (`↩ date`) | 3 copies, 3 font sizes |
| Stat block (big value + small label) | ProgressDashboard ×4 + EmptyBoard ×3, two implementations |
| Uppercase tracking section label | 18 occurrences |
| Font sizes | 6 arbitrary values `text-[8px]`…`text-[15px]` (`text-[11px]` ×44) |
| Radii | `rounded-[10px]` ×6, `rounded-[5px]` ×1 as magic values |

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

| Component | Replaces |
| --- | --- |
| `Pill` (color × size variant axes) | the ~30 tinted-pill sites; `SizeChip` / `TaskTypeBadge` reimplemented on top and moved into `ui/` |
| `InstanceBadge`, `RiskBadge`, `RolloverTag` | 3+ hand-rolled copies each; task-type color mapping converges to one place |
| `riskBorderClass(level, edge)` const map | TaskCard / BacklogSheetCard border logic |
| `StatBlock` | ProgressDashboard + EmptyBoard stat markup |
| `ProgressBar` | 3 linear bars in ProgressDashboard |
| `EmptyState` (icon + title + desc + CTA) | EmptyBoard both modes, BacklogSheet empty text |
| `SectionLabel` | 18 uppercase-tracking labels |

### Tier 3 — Form kit

- `FieldRow` — label + required star + control slot + hint (the canonical `form-control` row)
- `ChoicePills` — single-select pill group, `layout: "row" | "grid"`; absorbs the 4 variants
- `Stepper` — −/+ number stepper (from TemplateItem); delete dead `IconNumberField`
- `SubmitButton` (spinner swap + `flex-1 md:flex-none`) and `FormErrorAlert` (form-level `alert alert-error`)

## Non-goals

- **No unified mega `TaskCard`.** `TaskCard` / `MatrixTaskCard` / `BacklogSheetCard` differ in layout and behavior (drag / tap / pull) for real reasons; they share the atoms (Pill, RiskBadge, riskBorderClass) and keep their own shells.
- **No cva / styling library.** Variants are plain `const` class maps (the existing `TaskTypeBadge` `CLASS_CONFIG` style).
- **No copy inside `ui/`.** Labels/children come from callers so i18n stays at the feature layer; enum-labelled atoms (RiskBadge, SizeChip) may read their `Enums.*` namespace directly (existing SizeChip precedent).

## Conventions

1. **`tailwind-merge`** is the one new dependency: `ui/` components expose `className`, and unmerged class conflicts already shipped a real bug (the SizeChip double-chip incident recorded in `MatrixTaskCard.tsx`).
2. **Type-scale tokens**: define 2–3 small sizes (e.g. `text-2xs` = 11px, `text-3xs` = 10px) in the Tailwind theme and retire the six arbitrary values; give `rounded-[10px]` a semantic radius token.
3. **The `/design` gallery is the acceptance spec**: every `ui/` component must have a gallery entry (overlays demoed via trigger buttons). Check the gallery before writing new UI.
4. `ui/` components are presentational only — no data fetching, no server actions.

## Migration phases (lowest risk first, each independently mergeable)

1. **Foundations** — `ui/` folder, `Pill`, tailwind-merge, type/radius tokens, gallery entries. Pure visual swap.
2. **Badge family** — InstanceBadge / RiskBadge / RolloverTag / riskBorderClass across ~30 call sites; SizeChip + TaskTypeBadge move to `ui/` on Pill. Verify by gallery comparison.
3. **Bottom sheets** — `useDialogSync` + `BottomSheet`; migrate MobileTrackSheet (simplest) then MobileBacklogSheet; unify open state to prop-driven.
4. **Modal shells** — OverlayShell takes over TaskModal / ReviewChangesModal / AiPlanChatModal; backdrop behavior becomes explicit `dismissOnBackdrop={false}`. Touches interaction — hand-test each.
5. **Form kit** — FieldRow / ChoicePills / Stepper / SubmitButton; refactor TaskModal + PlanForm (largest beneficiary); delete IconNumberField.
6. **Content blocks** — StatBlock / ProgressBar / EmptyState / SectionLabel; align loading skeletons with real component structure.

After each phase, back-port any visual details to the source-of-truth mockups in `design/mockup/` per the standard workflow.
