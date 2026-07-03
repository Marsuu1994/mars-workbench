# Design Docs

Centralized design documentation for Mars Workbench. Code lives in `src/features/<page>` (page features) and `src/lib/kanban` (shared domain core); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items and ideas only (closed work moves to feature Update Logs). |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [flows/](./flows/) | Per-page flow docs: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `auth.md`. |
| [mockup/](./mockup/) | HTML mockups grouped by page: `board/`, `plan/`, `priorities/`, `auth/`, `shared/`, `future-work/`, plus shared `styles.css` and `mockup-theme.css`. |

## Mockup Workflow

- Mockups are the source of truth for UI — implement approved mockups exactly; if something can't be built as-is, raise the blocker and update the mockup first.
- To modify existing UI, create a temporary before/after mockup for review; after approval, promote it to source of truth (keep only the approved screens, strip before/after labels and navigator entries).
- After completing a UI task, back-port any implementation details (hover states, cursor styles, copy changes) to the source-of-truth mockup so it stays accurate.

## Per-Feature READMEs

Feature-level docs stay with the code: each `src/features/<feature>/README.md` holds that feature's **Current State** and its append-only **Update Log**.
