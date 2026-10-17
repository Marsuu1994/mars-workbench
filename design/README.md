# Design Docs

Centralized design documentation for Mars Workbench. Code is organized layer-first under `src/` (`actions/`, `services/`, `utils/`, and `components/` with its `ui/` · `application/` · `domain/` layers); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [design-language/](./design-language/README.md) | Per-theme visual specs (`mars-dark` · `mars-light` · `p5-dark`, one md per theme) + the shared skeleton: `fx-*` utility API, voices, motion, contrast method, sync points, visual rules. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items only; closed work is recorded in the root README's Update Log. Its format rules are in its Conventions section. |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [flows/](./flows/README.md) | Per-feature flow docs: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md`. Format and rules in its README. |
| [spike/](./spike/README.md) | Point-in-time spike docs for open questions; lifecycle and shape in its README. Implemented spikes move to [spike/archived/](./spike/archived/). |
| [mockup/future-work/](./mockup/future-work/) | Self-contained HTML explorations of **unbuilt** designs only (see Mockups below). Implemented UI is documented by the live scenario pages instead. |
| `/design` (in-app) | The Design Console (`src/app/design/`, how it works in [its README](../src/app/design/README.md)): component gallery tabbed by layer, plus per-feature **scenario pages** (`/design/scenarios`) — real page components + fixture data, the screen-level source of truth. |

## Mockups

An exploration is self-contained HTML — inline styles, no shared stylesheets — showing the current state (Before) next to the proposed design (After), plus updated mockups for any other flow the design cascades into.

- While iterating, name it `mockup/future-work/temp-<area>-v2.html`.
- Once the owner approves it, rename it to `mockup-<area>-v2.html`, link it from the tracker item it belongs to, and delete any `temp-*` files.
- When the design ships, the feature's scenario page takes over and the mockup is deleted (AGENTS.md › UI Workflow).

## App README

The repo-root [README.md](../README.md) holds the app-wide **Current State** (per-page sections) and the per-day **Update Log**.
