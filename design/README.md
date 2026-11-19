# Design Docs

Centralized design documentation for Mars Workbench. Code is organized layer-first under `src/` (`actions/`, `services/`, `utils/`, and `components/` with its `ui/` · `application/` · `domain/` layers); the design source of truth lives here.

## What Lives Where

| Path | Purpose |
| --- | --- |
| [baseline.md](./baseline.md) | The one app-wide design baseline: goal, implemented features, entities, full Prisma schema, architecture decisions. |
| [design-language/](./design-language/README.md) | Per-theme visual specs (`mars-dark` · `mars-light` · `p5-dark`, one md per theme) + the shared skeleton: `fx-*` utility API, voices, motion, contrast method, sync points, visual rules. |
| [tracker.md](./tracker.md) | Consolidated roadmap — open items only; closed work is recorded in the git history and PR descriptions. Its format rules are in its Conventions section. |
| [future-ideas.md](./future-ideas.md) | Problems we have seen coming but chose to wait on, each with the first idea for a fix; one moves to the tracker once it is worth doing. Its rules are in its Conventions section. |
| [session-log.md](./session-log.md) | A local session's parking lot for notes and ideas, wrapped up into the tracker, a spike or the docs before the session's final PR. |
| [reference.md](./reference.md) | Lean lookup tables for server actions, services, and DAL functions. |
| [specs/](./specs/README.md) | One spec per page: `shared.md`, `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md`. Format and rules in its README. |
| [spike/](./spike/README.md) | Point-in-time spike docs for open questions; lifecycle and shape in its README. Implemented spikes move to [spike/archived/](./spike/archived/). |
| [mockup/](./mockup/) | Self-contained HTML mockups of designs **not yet fully implemented** (see Mockups below). Implemented UI is documented by the Design Console instead. |
| `/design` (in-app) | The Design Console (`src/app/design/`, how it works in [its README](../src/app/design/README.md)): component gallery tabbed by layer, plus per-feature **scenario pages** (`/design/scenarios`) — real page components + fixture data, the screen-level source of truth. |

## Mockups

A file in `mockup/` is a design that isn't fully implemented yet. A mockup is self-contained HTML — inline styles, no shared stylesheets — typically showing the current state (Before) next to the proposed design (After), plus the screens of any other flow the design cascades into.

- Name it `mockup/mockup-<area>.html` from the first draft and keep that name through every round, so its link never changes; link it from the tracker item it belongs to.
- Link it in its PR's description, rendered through raw.githack (the repository is public, no sign-in): `https://raw.githack.com/Marsuu1994/mars-workbench/<branch>/design/mockup/<file>.html`. The Mockup links check (`npm run check:mockup-links`) fails while a mockup the PR changes isn't linked, and prints the line to paste.
- Put the freshness script in its `<head>` — the `<script data-mockup-latest>` block of any current mockup, copied as is. A branch link on raw.githack can serve a copy minutes old; the script moves the page to the newest commit's link, which never goes stale, so the description's branch link always opens the latest round. The Mockup links check fails a changed mockup without it.
- When the owner has to choose, draw every option side by side on one screen — not behind a switch — each with its Before / After, desktop and mobile. Rank them by `design-language/README.md` › Principles, and say which you recommend.
- Back a choice with a research screen: how other products solve it, each point with its source.
- Draw what the owner will actually meet: the real combinations of data side by side (a habit-heavy day, a one-colour day), not one tidy case.
- Where the design is an interaction, make After clickable, so the owner tries it rather than reads about it.
- A design with several parts goes one module at a time, each on its own tab, merged into one final tab at the end.
- Check that it renders before every push: every screen, in every theme, with no console errors.
- A mockup settles how a design looks and feels. What it implies about behaviour — a sort order, what a count counts, an edge case — goes into the mockup's ideas for the spec, not decided on the drawing.
- Everything a mockup shows is either today's product or a part of the design that its notes name. The owner approves a design by looking at it, and whoever writes its spec and builds it reads the mockup the same way, so nothing is on it by accident:
  - Before: the product exactly as it is, drawn from its components — their structure, tokens, `fx-*` utilities and motion. It does nothing the product doesn't do.
  - After: whatever it adds to Before, or takes away, is named in the note beside it — an element, a state, a line of copy, a motion.
  - Motion: besides its note, a motion is set out in the tab of the component it belongs to, the way the tap-to-complete mockup sets out the completion animation in its `M · 完成动画` tab (PR #115): what sets it off, which element moves and how, how long it takes, and what is left of it when the system asks for reduced motion.
  - A clickable mockup: its script does only what the design does. It adds no highlight or animation of its own to point out what a click changed.

  Bad: the backlog grouping mockup (PR #109), where a pull made the pulled card flash and the count bump in Before and After alike, and the next card rise in After, with no note mentioning any of it. The owner never saw it, the spec had no item for it, and the review of the build (PR #126) couldn't tell a missing part of the design from a leftover of the drawing. Good: the same mockup's finish box (PR #122), whose note says it eases in when the last task leaves; the build has it.
- Write the narrative (notes, labels, research) in Chinese with English product terms, like the spikes; the product's own UI copy on the drawn screens stays English.
- Once the owner picks, the mockup keeps only the chosen design — the rest stay in its commit history. A pick or a direction is not approval: a design, or one of its modules, is marked decided — `final version · decided <date>` at the top, 定稿, a ✓ on its tab — only after the owner approves it in so many words; until then it says what was picked and that it waits on the owner's approval. A change after that is marked as an amendment with its date.
- New UI starts with a **design PR**: the mockup and the owner's review rounds until it is decided, walked by the `ui-design` skill (`.claude/skills/ui-design/`); the decision record is `spike/archived/mockup-hosting-design-workflow.md`. What follows a decided design, its spec and its implementation, is AGENTS.md › UI Workflow.
- A design built over several PRs keeps its mockup until the last one lands. Once it is fully implemented, the mockup is deleted and the Design Console's scenario pages are its source of truth (AGENTS.md › UI Workflow).

## App README

The repo-root [README.md](../README.md) holds the app-wide **Current State** (per-page sections).
