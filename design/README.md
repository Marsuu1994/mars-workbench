# Design Docs

Centralized design documentation for Mars Workbench. Code is organized layer-first under `src/` (`actions/`, `services/`, `utils/`, `components/<page>/`, …); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [design-system.md](./design-system.md) | The visual design system ("Mission Control HUD"): OKLCH palette + contrast report, `fx-*` utility layer, typography, motion, palette sync points. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items and ideas only (closed work moves to feature Update Logs). |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [flows/](./flows/) | Per-page flow docs: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `journal.md`, `auth.md`. |
| [mockup/future-work/](./mockup/future-work/) | Self-contained HTML explorations of **unbuilt** designs only. Implemented UI is documented by the live scenario pages instead. |
| `/design` (in-app) | The Design Console (`src/app/design/`): component gallery tabbed by layer, plus per-feature **scenario pages** (`/design/scenarios`) — real page components + fixture data, the screen-level source of truth. |

## UI Design Workflow

- Scenario pages are the source of truth for implemented UI — each feature's screens render the real components with pinned fixture states. After a UI change, update the affected scenario/gallery fixtures so the pinned states stay accurate.
- Future or unapproved designs are explored as self-contained HTML mockups in `mockup/future-work/` (see `/design-explore`). Once a design ships, extend the feature's scenario page and delete the exploration mockup.

## App README

The repo-root [README.md](../README.md) holds the app-wide **Current State** (per-page sections) and the append-only **Update Log**.
