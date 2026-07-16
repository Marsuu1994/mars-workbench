# Design System Proposal — "Calling Card" (mars-dark × Persona 5)

> **Status: PROPOSAL / exploration — not adopted.** This document specifies a full
> Persona 5-styled reskin of **mars-dark only** (mars-light is explicitly out of scope
> for now and keeps its current "dawn on Mars" identity until a companion pass is
> designed). Nothing in `src/` changes until this proposal is approved.
> Live demo: `design/mockup/future-work/mockup-p5-design-system.html`.
> Current production system: [design-system.md](./design-system.md) ("Mission Control HUD").

## Concept

Your week is a heist; the plan is your **calling card**. Where Mission Control HUD is a
night-ops console (phosphor telemetry over a star chart), Calling Card is a **phantom
threat letter**: ink-black ground, arterial-red structure, paper-white payload — the
Persona 5 triad. High contrast is not a styling choice here; it is the entire system.

Research base: Atlus UI-team interviews (art director Masayoshi Suto), designer
breakdowns of P5/P5R menus, and CSS recreations. The five rules below are distilled
from that research and carry the identity:

1. **Red is structure, not decoration.** P5 uses red as the *ground* (full fields,
   wedges, rails), never as sprinkles. Here: the brand channel, CTA fills, active
   states, section rails, drop-shadow depth layers. Small red accents scattered over
   gray UI would read as "app with red highlights", not P5.
2. **Payload rides maximum value contrast.** Atlus rule: "relevant information is
   always on the same side as the mainly white color." Readable content is always
   paper-on-ink, paper-on-red, or ink-on-paper — never color-on-color.
3. **Flat depth — no gradients, no soft glows, no glass.** Suto: "I tend to not add
   gradations… prefer filling in each and every graphic." Depth comes from a second
   flat layer offset behind the first (blood-red or ink), i.e. hard 0-blur offset
   shadows. Every luminous glow, gradient hairline, and backdrop blur in the HUD
   system is replaced by a flat equivalent.
4. **Two-tier type.** P5's ransom-note lettering is reserved for *fixed, learned
   labels* (menu commands, screen titles) that players recognize by shape; variable
   content stays in a plain readable face. Here: a heavy **display voice** for chrome
   labels only; Geist Sans keeps prose; Geist Mono keeps telemetry.
5. **Oblique discipline.** Everything decorative tilts (−6° base is the community
   consensus for P5 recreations; hover kicks harder); everything *readable at length*
   stays level. Cards, form fields, and body text never tilt — labels, chips, rails,
   and chrome do.

## Palette

Seven OKLCH hue-wheel stops, re-anchored on the P5 triad. Wheel:
**12 error · 29 primary · 55 accent · 90 warning · 150 success · 235 info · 295 secondary.**
All values verified in-sRGB-gamut and WCAG-checked numerically (same OKLCH → linear
sRGB → relative-luminance script method as the production palette).

### Channel continuity

The channel *semantics* survive the reskin — only the voice changes. Orange stays
targeting (drag & drop), violet stays AI **and WEEKLY** (`TaskTypeBadge`), blue stays
DAILY/datalink, green stays go/done/sizes (`SizeChip`), gold stays stars/caution/ONCE
(`text-warning` star convention unchanged). The one structural change: **primary hands
cyan's job to red** — action, active nav, progress are all phantom red now.

### mars-dark ("Calling Card")

| Token | OKLCH | ≈ Hex | Signal on base-100/200/300 | Pair |
| --- | --- | --- | --- | --- |
| base-100 (ink panel) | 0.185 0.008 20 | `#161111` | — | base-content 16.6 |
| base-200 (ink floor) | 0.15 0.006 20 | `#0e0a0a` | — | base-content 17.5 |
| base-300 (ink well) | 0.115 0.004 20 | `#060505` | — | base-content 18.0 |
| base-content (paper white) | 0.96 0.005 20 | `#f5f0f0` | — | — |
| primary (phantom red) | 0.63 0.255 29 | `#ff0c0b` | 4.73 / 4.98 / 5.15 | 5.09 |
| secondary (metaverse violet · AI) | 0.74 0.15 295 | `#b296ff` | 7.75 / 8.16 / 8.43 | 7.84 |
| accent (heist orange · targeting) | 0.74 0.17 55 | `#fa8927` | 7.73 / 8.13 / 8.41 | 7.52 |
| info (royal blue) | 0.78 0.12 235 | `#61c3f9` | 9.52 / 10.02 / 10.35 | 9.35 |
| success (all-clear green) | 0.8 0.17 150 | `#5edb81` | 10.63 / 11.18 / 11.56 | 10.42 |
| warning (star gold) | 0.85 0.16 90 | `#f6c835` | 11.79 / 12.41 / 12.83 | 10.93 |
| error (crimson rose) | 0.63 0.22 12 | `#ef3565` | 4.78 / 5.03 / 5.20 | 5.12 |
| neutral (ink slab) | 0.25 0.012 20 | `#271f1f` | — | 13.91 |

Every signal color is **body-text grade (≥ 4.5:1) on all three bases**. All pairs are
AAA (≥ 7:1) **except the two reds** (5.09 / 5.12 — AA): red is physically a dark hue,
and pushing it to an AAA-pairable luminance turns it salmon and kills the P5 identity.
This is a **documented, deliberate deviation** from the HUD system's all-AAA bar;
both reds stay comfortably above the 4.5:1 body-text line. Their content colors are
near-ink (the P5 black-on-red layering), not white.

### Surface-only vars (never text)

Like `--fx-art` today, these live outside the daisyUI token set:

| Var | OKLCH | ≈ Hex | Role | Constraint |
| --- | --- | --- | --- | --- |
| `--fx-field-red` | 0.53 0.2 26 | `#c51d24` | Large red *fields*: CTA fills, header wedges, rails, calling-card surfaces | Payload on it is always paper white (5.75:1, AA) or larger display type; never body copy in any other color |
| `--fx-blood-red` | 0.36 0.13 25 | `#721216` | The flat *depth layer* — hard offset shadows behind panels/cards (P5 fakes depth with a darker flat red behind the shape) | Decoration only; never carries text, 1.6:1 on bases is fine because it is never information |

Both derive from the research palette (fan-sampled P5 fields cluster around
`#D92323`/`#CC2C34`; the darkened "shadow red" around `#732424`).

### Base rationale

P5's black is near-black ink (`#0D0D0D`-family), not `#000`. The three bases keep the
production system's three-layer depth logic but drop the blue cast for a barely-warm
ink (hue 20, chroma ≤ 0.008). `base-300` approaches true black for wells and overlay
scrims.

## Radius — zero

P5 has no rounded corners. All radius tokens collapse:
`--radius-selector: 0; --radius-field: 0; --radius-box: 0; --radius-card: 0`.
Softness is replaced by **oblique cuts** (see `fx-cut`) — a corner sliced at an
irregular angle reads "scissor-cut paper", which is the P5 shape language
(the calling cards are newspaper cutouts). Pills (`rounded-full` chips) become
**skewed parallelograms**.

## FX utility layer (`fx-*`) — reskin map

**API contract: every existing `fx-*` class name and its usage sites survive.** Only
the skin behind each name changes, so adoption touches `globals.css` and nothing in
component markup (exceptions flagged ⚠). All utilities keep deriving from daisyUI
tokens via `color-mix()`. Loops still animate opacity/transform only;
`prefers-reduced-motion` still disables them.

| Utility | Current (HUD) | Calling Card reskin |
| --- | --- | --- |
| `fx-shell-bg` | Star chart + nebula SVG + corner blooms | **Metaverse ground**: flat ink field + two staggered halftone dot layers (screentone, base-content at ≈4–5%) + faint diagonal speed-lines + one flat red corner wedge (clip-path triangle of `--fx-field-red` at low alpha). ✅ Fully token-derived — the two baked `--fx-art` SVG data-URIs are deleted, killing that sync hazard |
| `fx-chrome` / `fx-chrome-glass` | Solid slab / blur-capable slab | Both opaque ink slabs with a 2px paper top edge. **Backdrop blur is removed everywhere** (P5 is opaque paper; also a mobile perf win). `fx-chrome-glass` becomes an alias |
| `fx-panel` / `fx-panel-solid` | Glass console panel | **Paper-cut panel**: base-100 fill, 2px solid paper border at 90%, one oblique corner cut, hard offset shadow `6px 6px 0` blood-red (via `filter: drop-shadow` so it follows the cut). Both names = same opaque skin |
| `fx-corners` | Cyan reticle brackets | **Crop marks**: same 8-stroke bracket geometry, 2px, phantom red — the calling card's print marks |
| `fx-card` / `fx-card-lift` | Edge-light + glow hover | **Sticker card**: 1.5px paper border at 12%; hover = hard `4px 4px 0` primary offset + `translate(-1px,-1px)` (no border-color change — risk edges still win); lift (drag) = `7px 7px 0` blood-red + `rotate(-1.2deg)` class swap |
| `fx-target` | Orange dashed outline + pulsing halo | **Hazard target**: orange 2px dashed outline + flat diagonal hazard stripes (repeating-linear-gradient, hard stops — stripes are flat fills, not gradations) + opacity pulse. Channel unchanged |
| `fx-glow` / `fx-glow-accent` | Soft luminous halo | **Pop shadow**: hard `4px 4px 0` offset in channel color; hover/focus = `6px 6px 0` + `translate(-2px,-2px)`. Same names, flat skin |
| `fx-chip` | currentColor rounded chip | currentColor **parallelogram**: `skewX(-10deg)`, 1.5px border at 45%, fill at 12%; text stays skewed (P5 labels are oblique). Derivation from `currentColor` unchanged — `text-*` pairing still works |
| `fx-label` (+`-bright`) | 11px mono uppercase | Unchanged (telemetry voice is load-bearing for readability). Brightness steps re-tuned to paper |
| `fx-num` | Mono tabular numerals | Unchanged |
| `fx-led` (+`fx-led-pulse`) | Glowing dot | **Diamond stud**: 7px square rotated 45°, flat `currentColor`, 1px ink outline, no glow. Pulse stays opacity-only |
| `fx-rule` / `fx-hairline-top` | Luminous gradient hairlines | **Slash rules**: flat 2px `--fx-field-red` strip with parallelogram-clipped ends; `fx-hairline-top` = flat 2px red top strip. No gradients |
| `fx-holo` | Conic holo border (AI live) | **Spray border**: 2px violet dashed border + violet `3px 3px 0` offset; "thinking" adds opacity pulse. ⚠ visual metaphor changes from hologram to stencil spray |
| `fx-orbit` | Rotating conic tail | **Comet tick**: flat red arc segment (border-slice, no gradient) rotating — still transform-only on a masked layer; reduced-motion off |
| `fx-glow-pulse` | Breathing halo (login icon) | Breathing **double offset**: red + blood-red stacked hard shadows, opacity loop on pseudo-element |
| `fx-text-gradient` | Cyan→violet gradient text | ⚠ **Replaced by `fx-text-tile`** (gradients banned): first word sits in an inverted paper tile (paper bg, ink text, −4° tilt) — the ransom-note "one inverted letter/word" treatment. Restraint rule unchanged: first word only |
| `fx-boot-in` | 420ms rise+fade | **Snap-in**: 240ms slide from −14px/−2.5° with overshoot settle (keyframed past rest, no bounce library). P5's stated principle is zero-latency UI — entrances get *faster* |
| `fx-nav-rail` | Luminous left rail | **White flip**: active item becomes paper bg + ink text on a skewed clip wedge + red `3px 3px 0` offset — the P5 selection flip (selected items invert, not underline). Rail replaced by a red tick triangle |
| `fx-quadrant` + `fx-q-*` | Radial corner bloom | **Corner wedge**: flat clip-path triangle in the quadrant channel color at ≈8% + halftone overlay. Same `fx-q-{hue}` / `fx-q-{corner}` keying |
| `fx-grid-flow` | Login grid crawl | **Speed-line crawl**: diagonal line field on a transform loop (login only) |

### New utilities

| Utility | Use |
| --- | --- |
| `fx-display` | The display voice: Anton, uppercase, `−6°` skew, tight tracking — chrome labels only (column headers, screen titles, buttons, nav) |
| `fx-tile` | Inverted letter/word tile (paper bg, ink text, small rotation) — the ransom accent, used inside `fx-display` runs |
| `fx-cut` (+`fx-cut-sm/lg`) | Oblique corner cuts via clip-path, three sizes; irregular by design (no two adjacent cuts identical) |
| `fx-slash` | Flat skewed red underline-strip for emphasis under display headings |
| `fx-burst` | Decorative star-burst (inline SVG mask, flat fill) behind hero numerals — results-screen garnish, max one per view |

## Typography

Three voices (was two):

- **Display — Anton** (Google Fonts), uppercase, skewed −6°, only via `fx-display`:
  fixed, learned chrome labels (nav items, column headers, modal titles, buttons,
  screen titles). Never for user-generated content, form values, or body copy.
  Per-letter ransom jitter (case/size/rotation) is allowed **only** in hero moments
  (login wordmark) — data UI never jitters. CJK fallback: `Noto Sans JP`/`SC` 900,
  never skewed (skewed CJK glyphs look broken). Licensing note: Anton/Archivo Black
  are OFL (production-safe); the fan fonts recreations use (P5 Hatty, Earwig Factory)
  are personal-use only and must not ship.
- **Geist Sans** — unchanged: 400 body · 500 interactive · 600 titles · 700 h1.
  Prose, task titles, descriptions, anything the user reads at length. Level, never
  skewed.
- **Geist Mono** — unchanged: `fx-label` / `fx-num` / `fx-chip` telemetry.

The HUD rule "sans for humans, mono for telemetry" gains a clause: **"display for the
heist"** — if a label is fixed chrome the user learns by shape, it may speak Anton;
if it is *content*, it must not.

## Motion

- Easing unchanged: `cubic-bezier(0.2, 0, 0, 1)` for micro-transitions; structural
  entrances add keyframed overshoot (settle-back past rest, ~1° / 2px).
- Timings compress (P5's stated zero-latency principle): 120ms micro · 200ms
  structural · 240ms `fx-boot-in` (was 150/240/420).
- Hover kicks are transform-only: `translate(-2px,-2px)` + shadow offset growth —
  never blur, never color fades on large surfaces.
- Ambient loops stay rare: LED pulse 2.4s · hazard pulse 1.6s · comet 2s. The
  halftone field and speed-lines **never move** (except the login crawl).
- `prefers-reduced-motion` disables all loops and entrance animations, as today.

## Focus & keyboard

The app-wide `:focus-visible` ring changes from primary cyan to **paper white**
(`2px solid base-content, offset 2px`): red is now the ambient structure color, so a
red ring would vanish on red fields; the white ring reads on ink, red, and every
channel fill (≥ 3:1 non-text contrast everywhere). Hover motion never replaces focus
styling — every interactive spec above pairs with this ring.

## What this buys beyond style

- **Perf**: backdrop blur removed (mobile dock/sidebar win); shell background loses
  two big baked SVGs; shadows are 0-blur (cheaper than layered glows).
- **Sync-point reduction**: `--fx-art` data-URIs are deleted; the shell becomes fully
  token-derived, so a future palette change no longer requires hand-regenerating SVGs.
- **Same component API**: daisyUI semantic classes (`btn-primary`, `text-warning`,
  `border-l-error`) and `fx-*` names are untouched; the reskin is ~1 file of CSS plus
  the sync points below.

## Open questions / risks

- **Red primary vs rose error adjacency** (hue 29 vs 12): distinct side-by-side in the
  demo, but audit the board's risk borders (`border-l-error`) next to primary CTAs.
  Escape hatch: push error toward magenta (hue ~5) if real screens confuse.
- **Zero radius everywhere** changes daisyUI-styled controls (inputs, toggles,
  checkboxes) globally — the demo covers the main ones; a full `/design` gallery pass
  is required at adoption.
- **AA (not AAA) red pairs** — see palette section; accepted here, veto-able.
- **mars-light** is unresolved by design: a P5 "daylight Shibuya" light theme is a
  separate exploration; until then the theme toggle would mix metaphors.

## Sync points (on adoption)

Unchanged list, minus the SVG hazard: `src/app/globals.css` (theme block + full fx
layer reskin — **no `--fx-art` URIs anymore**), `public/manifest.json`
(`background_color` = `#060505`, `theme_color` = `#161111`), `src/app/layout.tsx`
(`viewport.themeColor`), `design/mockup/mockup-theme.css` (dark `--m-*` ladder regen
from the hexes above), `design/mockup/auth/mockup-login.html` (token block), plus:

- the Anton font subset added to the font pipeline next to Geist;
- the `--login-*` var blocks in `globals.css` (grid/glow hooks) re-tuned to the new
  tokens; `fadeUp` and `.scrollbar-hide` survive untouched;
- `public/icons/` PWA icons (192/512/maskable/apple-touch) carry brand colors —
  audit and likely regenerate (not in the current sync list; it should be);
- `design/design-system.md` palette/contrast tables and fx table become this
  document's, after re-running the contrast script against the shipped values;
- verification pass: `/design` gallery (every token swatch, fx specimen, primitive)
  and `/design/scenarios/board` all four states, both breakpoints.
