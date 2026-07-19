# Spike: In-app Design Console vs Storybook as the UI source of truth

**Status: awaiting owner review** · 2026-07-18

## Trigger

While unifying the overlay close affordance, the natural next step — "put the header on `OverlayShell` as props" — was blocked by the Design Console architecture: scenario pages render modals as **shell-free panels** (a `<dialog>`'s top layer escapes the scenario frame's clipping), so any header baked into the shell would vanish from every modal scenario. That raised the real question: **is the scenario system taxing production code for the sake of its own rendering constraints, and would Storybook remove that tax?**

## Pain points with the current console

1. **Panel/Shell split.** Four modals ship as two files each (`TaskModalPanel`+`TaskModal`, `ReviewChangesPanel`+`ReviewChangesModal`, `AiChatModalContent`+`AiPlanChatModal`, `SettingsPanel`+`SettingsSheet`) purely so scenarios can mount the content without the top-layer dialog. The split is cheap (thin wrappers, no logic duplication) and coincides with a legitimate container/presentational separation — but it is a *requirement* imposed by the console, not a choice.
2. **Abstractions are constrained to the panel side.** Shared overlay chrome (header, close button) must live in components the panels compose (`OverlayHeader`), never in `OverlayShell` props — workable, and it happens to match how headless UI libraries (Radix, Headless UI) are shaped anyway, but the constraint is real.
3. **Hand-rolled infra.** Frame modes (`fill`/`fit`/`overlay`), `InteractionShield`, gallery tabs, per-scenario stand-in boxes that mirror the live `boxClassName` — all owned code that Storybook provides out of the box.
4. **No true breakpoint simulation.** Frames are `<div>`s in the real page, so `md:` CSS and `useBreakpoint()`'s `matchMedia` evaluate against the **real viewport**. A phone-width frame on a desktop screen still renders desktop styles; mobile states are only viewable by resizing the browser. With responsive components (the chevron/✕ close button, `OverlayHeader`'s type scale, conditional-rendered mobile sheets) this gap now bites on every overlay.
5. **Fixture upkeep.** Every UI change must be mirrored in scenario/gallery fixtures. **This tax is identical under Storybook** (stories need the same updates) — it is *not* a reason to migrate and is listed here so the comparison stays honest.

## Option A — keep the in-app Design Console

**Pros**

- **Same build ⇒ structural no-drift guarantee.** `/design` renders the same components through the same bundler, CSS pipeline, i18n provider, and themes as production. Drift is impossible at the build level, not just discouraged.
- **Zero external toolchain.** No second build pipeline, no dependency-churn tax, nothing to upgrade alongside Next/React/Tailwind majors. The owned frame code is plain app code that doesn't rot.
- **Ships with the app.** Deployed on Vercel with everything else; reviewable from a phone with no extra deploy.
- **Already paid for.** The infra exists and now carries a slimmer surface (post overlay-kit cleanup).

**Cons**

- No true breakpoint simulation (pain point 4) — the biggest fidelity gap.
- The Panel/Shell split stays a hard requirement (pain points 1–2).
- Owned infra: shield, frames, tabs are ours to maintain.
- No ecosystem tooling: a11y checks, interaction tests, visual regression all DIY.

**Implementation plan (keep + improve)**

1. ✅ Overlay-kit simplification (this PR): `OverlayHeader`, delete `BottomSheet`/`OverlayCloseButton`/`TaskModalHeader`, breakpoint-hook conditional rendering.
2. Scenario coverage diet: keep the states that are genuinely hard to reproduce live (AI chat `generating`/`error`/`created`, review-diff combinations, board Friday-at-risk / returning-user); demote open-and-look overlays (e.g. Settings) to gallery cards. Content-only change, no code-structure impact.
3. Optional future: an iframe-based scenario frame (the page renders the scenario route inside an `<iframe>`) would give breakpoint-true rendering and full-shell modals without Storybook — but it re-implements a slice of Storybook's canvas (theme/CSS injection into a second document, cross-document fixtures), so only worth it if the breakpoint gap hurts weekly and Option B stays rejected.

## Option B — migrate to Storybook

**Pros**

- **Iframe canvas.** Each story renders in its own document with its own top layer: modal stories mount the **full shelled component** (`showModal()` stays inside the canvas), and media queries evaluate against the iframe — the viewport toolbar gives true mobile/desktop simulation per story.
- Removes the Panel/Shell *requirement*, plus `InteractionShield` and the frame system (Storybook's canvas is already inert-by-default and sized).
- Standard tooling: viewport/a11y/interactions addons, play functions, and a straight upgrade path to visual regression (Chromatic) — which would also restore the drift guarantee lost by leaving the app build.
- Stories colocate with components; the industry-standard workbench any collaborator already knows.

**Cons**

- **Second build pipeline.** Storybook must reproduce the app's rendering context: Tailwind 4 + daisyUI CSS wiring, `NextIntlClientProvider` + messages decorator, Zustand store-seeding decorator (AI chat scenarios seed `aiPlanChatStore`), `data-theme` toolbar for the three themes. Each piece is documented and doable; together they are real setup and a standing sync surface.
- **Recurring toolchain tax.** Storybook is a heavy dev-dependency with roughly yearly majors that must track Next/React/Tailwind majors. For a solo project this is the largest ongoing cost — the current frame infra, by contrast, never needs upgrading.
- **Weaker same-build guarantee.** A separate bundler can diverge subtly (CSS order, providers, polyfills) unless Chromatic-style visual regression is added on top.
- Migration effort: port the gallery (4 tabs) + 5 scenario suites, then retire `/design`; separate static build/deploy (can live on Vercel too).
- The fixture-upkeep tax does **not** shrink (pain point 5).

**Implementation plan (phased migration)**

1. **Spike-install** (1 evening): `@storybook/nextjs` + Vite builder; wire `globals.css`, theme toolbar (`data-theme` decorator), `NextIntlClientProvider` decorator, a `seedStore` helper. Prove it on the hardest case — `AiChatModalContent` with the store-seeded `generating`/`error`/`created` states, plus one full-shell `TaskModal` story with viewport presets. This measures the true config cost before committing.
2. Port the gallery: one story file per `ui/` component (Zone/Section content becomes stories + autodocs); Application-tab specimens (sidebar states, dock) follow.
3. Port scenarios: fixture modules are already separate files — reuse them as story args; add `viewport` parameters for mobile-pinned states. Keep `/design` alive until parity.
4. CI: add `build-storybook` next to `format:check`; optionally Chromatic later.
5. Retire `/design` routes, `ScenarioTabs`/`ScenarioPage`/frames/`InteractionShield`; optionally merge Panel/Shell pairs back (or keep the split where the container/presentational separation still earns it).

## Decision framing

The question is **not** "which is easier to maintain" — the dominant maintenance cost (keeping pinned states in sync with shipped UI) is identical in both. The question is: **is true breakpoint simulation + standard testing tooling worth a permanent second toolchain?**

- Stay on A if the console's fidelity gaps stay tolerable and dependencies-that-rot are the bigger annoyance.
- Move to B if dual-breakpoint review keeps being a weekly need and/or visual regression becomes wanted — and move *early* if so: the port grows with every scenario added (5 suites today).

**Recommendation:** live with the slimmed console (post overlay-kit cleanup) for a few UI cycles. If the missing breakpoint simulation keeps interrupting review, run plan-B step 1 (the spike-install) — it is cheap, reversible, and turns the remaining unknown (real config cost) into a measured number before any commitment.
