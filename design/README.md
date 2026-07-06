# Design Docs

Centralized design documentation for Mars Workbench. Code is organized layer-first under `src/` (`actions/`, `services/`, `utils/`, `components/<page>/`, …); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [design-system.md](./design-system.md) | The domain design-system layer on top of daisyUI: `ui/` component tiers, conventions, and migration phases. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items and ideas only (closed work moves to feature Update Logs). |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [flows/](./flows/) | Per-page flow docs: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `auth.md`. |
| [mockup/](./mockup/) | HTML mockups grouped by page: `board/`, `plan/`, `priorities/`, `auth/`, `shared/`, `future-work/`, plus shared `styles.css` and `mockup-theme.css`. |

## Mockup Workflow

- Mockups are the source of truth for UI — implement approved mockups exactly; if something can't be built as-is, raise the blocker and update the mockup first.
- To modify existing UI, create a temporary before/after mockup for review; after approval, promote it to source of truth (keep only the approved screens, strip before/after labels and navigator entries).
- After completing a UI task, back-port any implementation details (hover states, cursor styles, copy changes) to the source-of-truth mockup so it stays accurate.

## App README

The repo-root [README.md](../README.md) holds the app-wide **Current State** (per-page sections) and the append-only **Update Log**.
