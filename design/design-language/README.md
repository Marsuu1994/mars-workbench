# Design Language

Per-theme visual specs plus the shared skeleton they all hang on. Implemented in
`src/app/globals.css` (daisyUI theme blocks + the `fx-*` layer).

## Themes

| File | Theme (internal) | Display name | Status |
| --- | --- | --- | --- |
| [mars-dark.md](./mars-dark.md) | `mars-dark` | "Sora dark" | Shipped · default |
| [mars-light.md](./mars-light.md) | `mars-light` | "Sora light" | Shipped |
| [p5-dark.md](./p5-dark.md) | `p5-dark` | "P5 dark" | Approved direction · implementation pending (ships with the settings/theme-switch work) |

Display names are UI labels (i18n) — internal theme names are stable and never
renamed. New-user default is `mars-dark`; theme is an explicit user choice
(cookie-persisted — see `design/flows/auth.md`, Theme Change Flow).

## Architecture: one skeleton, N skins

A theme is a **skin over a shared skeleton**, never a fork of components:

- **daisyUI semantic tokens** (`--color-primary`, `text-warning`, `border-l-error`, …)
  carry all color; components only ever reference semantics.
- **Channel semantics are theme-invariant**: primary = action/brand · secondary = AI
  (and WEEKLY) · accent = targeting/drop zones · info = DAILY/datalink · success =
  go/done/sizes · warning = stars/caution/ONCE · error = abort/urgent. A theme may
  change *what color* a channel is, never *what it means*.
- **`fx-*` utility class names are the API** — usage sites never change per theme.
  Their looks come from per-theme `--fx-*` variable blocks (`[data-theme='…']`),
  plus theme-gated skin rules where geometry differs (see p5-dark).
- Radius tokens are per-theme (daisyUI theme blocks); `--radius-card` overrides are
  gated per `data-theme`.

## FX utility layer — API + Mission Control HUD skin

The table below is the utility API and its **HUD skin** (shared by `mars-dark` /
`mars-light`); [p5-dark.md](./p5-dark.md) specifies its own skin per utility. All
utilities derive colors from daisyUI tokens via `color-mix()`. They live in
`@layer components` — any Tailwind utility can override their properties. Loops
animate opacity/transform only (composite-friendly); `prefers-reduced-motion`
disables them.

| Utility | Use | Where it's applied |
| --- | --- | --- |
| `fx-shell-bg` | The cosmic sky, three strata painted once on a non-scrolling wrapper: (1) 4-corner horizon blooms; (2) `--fx-art`, a per-theme inline-SVG nebula painting — corner wisps (blurred ellipses), filament threads, beaded bezier curves, glowing anchor stars; (3) a star chart of four star "magnitudes" tiled at mutually-prime sizes (233×187 → 389×331, so the scatter never visibly repeats) plus a rare cross-glint twinkle. ⚠ `--fx-art` colors are baked into the SVG data-URIs (not token-derived) — re-tint both URIs by hand when the palette changes | `AppShell`, `/design` gallery |
| `fx-chrome` / `fx-chrome-glass` | Chrome slab (always solid) / chrome that may blur. The dock stays solid — it floats over a scrolling board, where backdrop blur re-filters every frame; the sidebar's backdrop is static, so glass is cheap there | dock (solid), sidebar (glass) |
| `fx-panel` / `fx-panel-solid` | Console panel (glass / no-blur). Glass is for stationary chrome only — never in scroll containers | modals |
| `fx-corners` | Targeting-reticle corner brackets (inset 2px to clear the radius) | task modal, gallery specimens |
| `fx-card` / `fx-card-lift` | Card edge-light + hover lift (shadow only — risk borders always win); lift = drag state class swap | `TaskCard` |
| `fx-target` | Drop-zone highlight, mars-orange channel; pulse = pseudo-element opacity (`@utility`, composes as `md:fx-target`) | board columns, gallery |
| `fx-glow` / `fx-glow-accent` | Powered-up CTA halo | primary CTAs, sidebar logo |
| `fx-chip` | Console chip from `currentColor` (border 28% / fill 10% / inset highlight) — pair with any `text-*` token | `TaskTypeBadge`, `SizeChip`, date pill, beta pill |
| `fx-label` (+`-bright`) | 11px mono uppercase 0.14em micro-label | column headers, quadrant titles, stat labels, "Workspace" |
| `fx-num` | Mono tabular numerals | points, counts, %, dates, `#n` |
| `fx-led` (+`fx-led-pulse`) | Status LED dot from `currentColor` | column status, quadrant headers, AI live |
| `fx-rule` / `fx-hairline-top` | Luminous gradient hairlines (single / multi-hue top edge) | dock top edge, AI modal header |
| `fx-holo` | Conic holo border — the AI thinking/live state | `LoadingBubble` |
| `fx-orbit` | Rotating conic tail behind the progress ring — continuous by deliberate product choice (transform-only on a tiny masked layer; reduced-motion disables it); the ring's halo is a static SVG under-circle, not a CSS filter | `ProgressDashboard` |
| `fx-glow-pulse` | Breathing brand halo — pre-composited shadow on a pseudo-element, opacity-only loop | login `BrandIcon` |
| `fx-text-gradient` | Cyan→violet headline gradient. Restraint rule: first word only | gallery title, login "Mars" |
| `fx-boot-in` | 420ms mount animation (rise + scale + fade) | modals |
| `fx-nav-rail` | Luminous active-nav left rail | sidebar active item |
| `fx-quadrant` + `fx-q-{error,primary,warning,neutral}` + `fx-q-{tl,tr,bl,br}` | Per-quadrant corner bloom keyed to semantic hue | priority matrix |
| `fx-grid-flow` | Login-only grid crawl (transform loop; host extends 64px above viewport) | login grid layer |

## Typography (shared voices)

- **Geist Sans** — humans: 400 body · 500 interactive · 600 titles
  (`tracking -0.01em`) · 700 page h1 / hero %.
- **Geist Mono** — telemetry, via `fx-label` / `fx-num` / `fx-chip`: anything
  measured. Decorative glyphs (`·`, `↩`, `★`) stay in JSX per the i18n rule.
- p5-dark adds a third, theme-scoped **display voice** (Anton) — see its spec.

## Motion (shared baseline)

One easing: `cubic-bezier(0.2, 0, 0, 1)` ("console snap"). HUD timings: 150ms
micro (hover lift, glow ramp) · 240ms structural · 420ms `fx-boot-in`. Ambient
loops are rare and slow: LED pulse 2.4s, orbit 2s, target pulse 1.6s. Drag lift
is a class swap, never a transition. Backgrounds never move (except the login
crawl). Theme specs may compress timings (p5-dark does) but never break the
opacity/transform-only rule or the `prefers-reduced-motion` opt-out.

## Contrast method & bars

All palette values are verified in-sRGB-gamut and WCAG-checked **numerically**
(conversion script: OKLCH → linear sRGB → relative luminance → contrast ratio) —
never by eye. Bars: every signal color body-text grade (≥ 4.5:1) on its bases;
X/X-content pairs AAA (≥ 7:1) unless a theme documents a deliberate deviation
(see p5-dark's reds). Each theme file carries its own measured table.

## Sync points

Changing any theme's base colors requires touching, in lockstep:
`src/app/globals.css` (theme block — for the mars themes also the baked
`--fx-art` SVG data-URIs), `public/manifest.json` (`background_color` /
`theme_color` follow the **default** theme, mars-dark), `src/app/layout.tsx`
(`viewport.themeColor`), and the theme file here (re-run the contrast script,
update the table). Verification surface: the `/design` gallery (Tokens & FX tab)
and the scenario pages.
