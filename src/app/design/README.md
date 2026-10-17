# Design Console

`/design` documents implemented UI with the real components: a gallery tabbed by layer (Tokens & FX · UI · Application · Domain) and per-feature scenario pages (`/design/scenarios/<feature>/`) that render each screen with pinned fixture states. AGENTS.md › UI Workflow holds the rules every session needs — the console is the source of truth, and production comes first; this file is how the console works.

## Local access

`npm run dev` serves `/design` and its scenario pages without signing in, so agents and the owner can browse, screenshot and debug UI straight away; production builds (Vercel previews included) keep the auth gate. The console renders fixtures only and never reads Supabase or the database, so a machine without the project's `.env.local` — a cloud agent's container — only needs placeholder Supabase variables to boot:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=placeholder npm run dev
```

## Frames

- **Frame modes**: `fill` (the default) is for screen-level tabs only — a 1:1, viewport-bounded stand-in for the page inside AppShell's `<main>`. Everything standalone (empty states, sheets, inline modal panels) is `fit` — content height plus padding — and/or `overlay` for a dimmed modal backdrop.
- **Live-feel, no side effects**: frames wrap their content in an `InteractionShield`. Hover and scroll stay live; clicks, submits and drag-starts are swallowed, so wired handlers can never fire against fixture ids.
- **Modals render inline** through their extracted `*Panel` / `*Content` components — the live `OverlayShell` top-layer dialog would escape the frame's clipping.
- **Time freezes at the frame**: `data-time="frozen"` holds `fx-countdown` clocks, so a pinned toast neither drains nor dismisses itself.

## Tabs

- **One tab, one state**: each scenario tab pins exactly one fixture or state of the rendered component (the settings overlay at rest vs with its sign-out confirm triggered) — never several states composed into one tab. Breakpoints are not states: mobile and desktop render the same component, so they share a tab.
- **Reach a state the way a user would**: a tab's `play` steps click the real control through the shield (gallery specimens wrap in `<Play>`). A state that needs a side effect is composed from genuine pieces — the matrix's Done-toast tabs pair post-completion fixtures with the shared `MatrixUndoToast`. Good: `play: [{click: {within: matrixCard(id), label: 'Priorities.sendLabel'}}]`.
- **Skip what a tab can't reach**: production code is never reshaped for a specimen. Bad: a slot-only frame or a view-model type introduced so a gallery specimen can render a piece in isolation. Good: the Projects scenario selects a project by leading the fixture list with it (the page picks the first active one), and drops the mobile detail tab because `?project=` is URL state a tab can't pin.
