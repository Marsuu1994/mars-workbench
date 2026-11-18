# Implementation context

What the `implement-spec` skill and the `implement-spec-reviewer` agent both read: the skill to build a page's spec items and their tests, the agent to check them. This file points to where each rule lives (AGENTS.md › Adding a rule) and lists the inputs; what the skill and the agent each do is in their own files.

## The standard

- `test/README.md`, in full: which layer tests an item, how every test is written, and how a test holds a spec ID.
- AGENTS.md › Layers, › Coding Conventions and › UI Workflow: where the code goes, how it is written, and how a decided mockup is built (exactly, production first, the Design Console synced as the UI lands).
- `design/specs/README.md` › Items and IDs: what the markers mean, and when an implementation PR is done.
- `src/app/design/README.md`: the Design Console's scenarios, whose fixtures the component tests share.

## The inputs

- **The page's spec**, `design/specs/<page>.md`, and `npm run check:spec -- --list <page>`, which lists the items still marked *(pending)* or *(removing)*: those are the change's scope.
- **The decided mockup**, `design/mockup/mockup-<area>.html`, for what the spec leaves to it (`design/specs/README.md` › What a spec doesn't say): the layout, the copy, the spacing, the colours, the icons.
- **The questions the spec left open**: the feature's item in `design/tracker.md`, and the review log of the PR that wrote the spec, `reviews/pr-<NNN>.md`.
- **What AGENTS.md › Session start says the change needs**: `design/baseline.md` › Architecture Decision when a page's data flow changes, and `design/reference.md` when actions, services or the DAL change.
- **The change**: `git diff <base>`, where the base is usually `main`.
