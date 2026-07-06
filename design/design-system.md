# Design System — Mission Control HUD

The app-wide visual language. Source of truth for tokens, the FX utility layer, typography, and motion. Implemented in `src/app/globals.css` (daisyUI theme blocks + `fx-*` layer); mirrored for mockups in `design/mockup/mockup-theme.css`.

## Concept

Your week is a flight plan; the app is the console you fly it from. **mars-dark** is a night ops deck: near-black blue console panels over a faint telemetry dot-field, phosphor-cyan telemetry as the primary voice, mars signal-orange for targeting (drag & drop), violet for the AI channel. **mars-light** is **dawn on Mars** — deliberately not a white theme: warm sunlit-sand consoles, cool space-ink text, the identical seven signal hues driven deep so the identity survives daylight.

Two rules carry the identity:

1. **Sans for humans, mono for telemetry.** Geist Sans speaks prose and titles; Geist Mono renders everything the console *measures* — micro-labels (`fx-label`), numerals/dates/counts (`fx-num`), badges (`fx-chip`).
2. **Color by channel, not decoration.** Cyan = action/telemetry, violet = AI, orange = targeting (drop zones) & signature accents, blue = datalink stats, green = go, amber = caution, red = abort.

## Palette

Seven OKLCH hue-wheel stops (25 error · 55 accent · 85 warning · 155 success · 205 primary · 235 info · 295 secondary) with matched chroma bands. All values verified in-sRGB-gamut and WCAG-checked numerically (conversion script: OKLCH → linear sRGB → relative luminance).

### mars-dark (night ops)

| Token | OKLCH | ≈ Hex | Pair contrast |
| --- | --- | --- | --- |
| base-100 / 200 / 300 | 0.19/0.155/0.125 C≈0.03 H265 | `#0d1321` `#070c18` `#030610` | base-content ≥ 14.6:1 |
| base-content | 0.92 0.016 210 | `#d9e8ea` | — |
| primary (phosphor cyan) | 0.83 0.135 205 | `#2ce0f1` | 11.2 |
| secondary (violet · AI) | 0.74 0.15 295 | `#b296ff` | 7.8 |
| accent (signal orange) | 0.76 0.155 55 | `#fb9344` | 8.1 |
| info (datalink blue) | 0.79 0.115 235 | `#69c6fa` | 9.7 |
| success (go-green) | 0.8 0.165 155 | `#50dc8e` | 10.4 |
| warning (caution amber) | 0.84 0.155 85 | `#f9c13b` | 10.5 |
| error (abort red) | 0.72 0.17 25 | `#fd736d` | 7.3 |
| neutral (console slab) | 0.26 0.035 265 | `#1c2435` | 11.6 |

Every signal color is **body-text grade (≥ 4.5:1)** on base-100 and base-200. All pairs AAA (≥ 7:1).

### mars-light (dawn on Mars)

| Token | OKLCH | ≈ Hex | Pair contrast |
| --- | --- | --- | --- |
| base-100 / 200 / 300 (sand) | 0.955/0.925/0.885 H≈78 | `#f7efe3` `#efe5d5` `#e5d7c4` | base-content ≥ 11.6:1 |
| base-content (space ink) | 0.24 0.032 265 | `#181f2f` | — |
| primary | 0.5 0.085 215 | `#0e6f81` | 5.4 |
| secondary | 0.5 0.185 295 | `#6e43bf` | 6.1 |
| accent (rust) | 0.54 0.14 50 | `#ac5107` | 5.0 |
| info | 0.5 0.115 240 | `#006a9e` | 5.5 |
| success | 0.5 0.13 152 | `#05773b` | 5.3 |
| warning (bronze) | 0.49 0.1 75 | `#815709` | 6.0 |
| error | 0.53 0.19 25 | `#c2272d` | 5.4 |
| neutral (mars rock) | 0.34 0.045 55 | `#4a3221` | 10.9 |

The light theme is intentionally sand-warm, not white — the "dawn shift" of the same console. Warning stays a deep bronze so `text-warning` (star points, at-risk labels) is **body-text grade on the sand bases** (the pre-redesign amber failed AA in three components). **Constraint to preserve:** light accent on base-200 is 4.27:1 — icon/large-text grade only; don't use `text-accent` for small body copy on base-200 surfaces.

## FX utility layer (`fx-*`)

All utilities derive colors from daisyUI tokens via `color-mix()`, so both themes restyle automatically. They live in `@layer components` — any Tailwind utility can override their properties. Loops animate opacity/transform only (composite-friendly); `prefers-reduced-motion` disables them.

| Utility | Use | Where it's applied |
| --- | --- | --- |
| `fx-shell-bg` | 4-corner horizon blooms + telemetry dot lattice (fine 24px field + sparse 96px "stars"; mobile keeps only the sparse layer); paint once on a non-scrolling wrapper | `AppShell`, `/design` gallery |
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

## Typography

- Geist Sans: 400 body · 500 interactive · 600 titles (`tracking -0.01em`) · 700 page h1 / hero %.
- Geist Mono via `fx-label` / `fx-num` / `fx-chip` — anything measured. Decorative glyphs (`·`, `↩`, `★`) stay in JSX per the i18n rule.

## Motion

One easing: `cubic-bezier(0.2, 0, 0, 1)` ("console snap"). 150ms micro (hover lift, glow ramp) · 240ms structural · 420ms `fx-boot-in`. Ambient loops are rare and slow: LED pulse 2.4s, sweep 6s, orbit 5s, target pulse 1.6s. Drag lift is a class swap, never a transition. The grid/scanlines never move (except the login crawl).

## Sync points

Changing base colors requires touching, in lockstep: `src/app/globals.css` (theme blocks), `public/manifest.json` (`background_color` = dark base-300, `theme_color` = dark base-100), `src/app/layout.tsx` (`viewport.themeColor`), `design/mockup/mockup-theme.css` (`--m-*` incl. regenerating every rgba alpha ladder from the new hexes), and `design/mockup/auth/mockup-login.html` (private token block mirroring the app tokens).
