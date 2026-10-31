# Design Docs

Centralized design documentation for Mars Workbench. Code is organized layer-first under `src/` (`actions/`, `services/`, `utils/`, and `components/` with its `ui/` · `application/` · `domain/` layers); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [design-language/](./design-language/README.md) | Per-theme visual specs (`mars-dark` · `mars-light` · `p5-dark`, one md per theme) + the shared skeleton: `fx-*` utility API, voices, motion, contrast method, sync points, visual rules. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items only; closed work is recorded in the git history and PR descriptions. Its format rules are in its Conventions section. |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [flows/](./flows/README.md) | Per-feature flow docs: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md`. Format and rules in its README. |
| [spike/](./spike/README.md) | Point-in-time spike docs for open questions; lifecycle and shape in its README. Implemented spikes move to [spike/archived/](./spike/archived/). |
| [mockup/](./mockup/) | Self-contained HTML mockups of designs **not yet fully implemented** (see Mockups below). Implemented UI is documented by the Design Console instead. |
| `/design` (in-app) | The Design Console (`src/app/design/`, how it works in [its README](../src/app/design/README.md)): component gallery tabbed by layer, plus per-feature **scenario pages** (`/design/scenarios`) — real page components + fixture data, the screen-level source of truth. |

## Mockups

A file in `mockup/` is a design that isn't fully implemented yet. A mockup is self-contained HTML — inline styles, no shared stylesheets — typically showing the current state (Before) next to the proposed design (After), plus the screens of any other flow the design cascades into.

- Name it `mockup/mockup-<area>.html` from the first draft and keep that name through every round, so its link never changes; link it from the tracker item it belongs to.
- Link it in its PR's description, rendered through raw.githack (the repository is public, no sign-in): `https://raw.githack.com/Marsuu1994/mars-workbench/<branch>/design/mockup/<file>.html`. The Mockup links check (`npm run check:mockup-links`) fails while a mockup the PR changes isn't linked, and prints the line to paste.
- New UI lands in two PRs: a **design PR** (the mockup, the owner's review rounds, then the e2e contract in `e2e/contract/`; merged once the design is settled) and an **implementation PR** from `main` afterwards (build it, flip the contract, delete the mockup). The `ui-design` skill (`.claude/skills/ui-design/`) walks both; the decision record is `spike/archived/mockup-hosting-design-workflow.md`.
- A design built over several PRs keeps its mockup until the last one lands. Once it is fully implemented, the mockup is deleted and the Design Console's scenario pages are its source of truth (AGENTS.md › UI Workflow).

## App README

The repo-root [README.md](../README.md) holds the app-wide **Current State** (per-page sections).
