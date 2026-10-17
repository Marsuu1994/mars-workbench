# Flows

One doc per feature — `board.md`, `plan.md`, `priorities.md`, `projects.md`, `dump.md`, `auth.md` — plus `shared.md` for the cross-page sync lifecycle. A flow is a step contract: what triggers it, what happens, and the rules that hold.

## Format

- One flow per `##` heading, separated by `---`.
- Every flow has two required `###` sections — `Trigger / Entry Point` and `Steps` — plus an optional `### Rules` section for constraints and invariants. Extra `###` sections (e.g. `Metrics`) are allowed only for reference material that fits neither Steps nor Rules.

## Facts, not UI detail or decisions

A flow says what triggers it, what happens (to the data, and what the user sees next) and the rules that hold. UI detail — modal anatomy, controls and their placement, copy, breakpoint presentation — belongs in the Design Console (scenarios and gallery), or in the mockup until the UI ships. Decisions and their reasons belong in the spike and in `baseline.md`'s Architecture Decision.

Bad: "Open the New Project modal — the TaskModal shell (header with ×, a banner, Title / Goal, Cancel / Create project)", or "There is no new nav item: the sidebar's Plan item stays active." Good: "Open the New Project modal: title (required) and goal (optional). On create, validate via Zod and persist the Project."
