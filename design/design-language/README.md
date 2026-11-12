# Design Language

Per-theme visual specs plus the shared skeleton they all hang on. Implemented in
`src/app/globals.css` (daisyUI theme blocks + the `fx-*` layer).

## Themes

| File | Theme (internal) | Display name | Status |
| --- | --- | --- | --- |
| [mars-dark.md](./mars-dark.md) | `mars-dark` | "Sora dark" | Shipped · default |
| [mars-light.md](./mars-light.md) | `mars-light` | "Sora light" | Shipped |
| [p5-dark.md](./p5-dark.md) | `p5-dark` | "P5 dark" | Shipped |

Display names are UI labels (i18n) — internal theme names are stable and never
renamed. New-user default is `mars-dark`; theme is an explicit user choice
(cookie-persisted — see `design/flows/auth.md`, Theme Change Flow).

## Architecture: one skeleton, N skins

A theme is a **skin over a shared skeleton**, never a fork of components:

- **daisyUI semantic tokens** (`--color-primary`, `text-warning`, `border-l-error`, …)
  carry all color; components only ever reference semantics.
- **Channel semantics are theme-invariant**: primary = action/brand · secondary =
  project steps · accent = targeting/drop zones · info = one-offs/datalink/Todo ·
  success = go/done/habits · warning = stars/caution · error = abort/urgent. The three
  kinds of work each own one colour (habit success, project step secondary, one-off
  info) that never changes on a card; sizes are neutral. A theme may change *what
  color* a channel is, never *what it means*.
- **Ink on gradient fills** — the brand tiles, the "New" badge and the avatars —
  is `--fx-on-gradient` (`text-on-gradient` / `stroke-on-gradient`), white in every
  theme today; a solid daisyUI fill takes its own `*-content` token instead.
- **`fx-*` utility class names are the API** — usage sites never change per theme.
  Their looks come from per-theme `--fx-*` variable blocks (`[data-theme='…']`),
  plus theme-gated skin rules where geometry differs (see p5-dark).
- Radius tokens are per-theme: `--radius-selector/field/box` in the daisyUI blocks,
  `--radius-card` in each theme's variable block (registered once in `@theme` so the
  `rounded-card` utility exists).
- **One variable contract**: every theme declares the same custom properties — its
  daisyUI block plus its `[data-theme='…']` block in `globals.css`, in the same section
  order (star chart · art · blooms · bracket · panels · edges · shadows · glows ·
  surface & depth · ink on gradients · geometry). Variables are named by role (`--fx-field`, `--fx-depth`,
  `--fx-card-bg`, `--radius-card`); a theme with no use for one still
  declares its equivalent. `npm run check:themes` enforces it in CI, and a theme added
  to `THEMES` is held to it automatically.
- **One theme scope per page**: the theme lives only on `<html data-theme>`; nothing
  nests a `data-theme` (the Design Console previews by re-stamping `<html>`). That is
  what keeps theme-gated skin rules, like p5-dark's geometry fork, from leaking into
  another theme.

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
| `fx-card` / `fx-card-lift` | Card edge-light + hover lift (shadow only — the kind edge always wins); lift = drag state class swap | `TaskCard` |
| `fx-kind-edge` + `fx-k-{success,secondary,info}` | A card's 3px left border in its kind's colour. Unlayered, so it beats the card's own Tailwind border utilities | task cards (via `TASK_KIND_STYLE`) |
| `fx-pip` | One round mark of a card's progress signal; colour and size come from utilities | habit week dots |
| `fx-target` | Drop-zone highlight, mars-orange channel; pulse = pseudo-element opacity (`@utility`, composes as `md:fx-target`) | board columns, gallery |
| `fx-glow` / `fx-glow-accent` | Powered-up CTA halo | primary CTAs, sidebar logo |
| `fx-chip` | Console chip from `currentColor` (border 28% / fill 10% / inset highlight) — pair with any `text-*` token | `SizeChip`, date pill |
| `fx-label` (+`-bright`) | 11px mono uppercase 0.14em micro-label | column headers, quadrant titles, stat labels, "Workspace" |
| `fx-num` | Mono tabular numerals | points, counts, %, dates, card kind lines |
| `fx-led` (+`fx-led-pulse`) | Status LED dot from `currentColor` | column status, quadrant headers |
| `fx-rule` / `fx-hairline-top` | Luminous gradient hairlines (single / multi-hue top edge) | dock top edge |
| `fx-orbit` | Rotating conic tail behind the progress ring — continuous by deliberate product choice (transform-only on a tiny masked layer; reduced-motion disables it); the ring's halo is a static SVG under-circle, not a CSS filter | `ProgressDashboard` |
| `fx-glow-pulse` | Breathing brand halo — pre-composited shadow on a pseudo-element, opacity-only loop | login `BrandIcon` |
| `fx-text-gradient` | Cyan→violet headline gradient. Restraint rule: first word only | gallery title, login "Mars" |
| `fx-boot-in` | 420ms mount animation (rise + scale + fade) | modals |
| `fx-countdown` | Clock bar draining over `--fx-countdown-ms`; its `animationend` is the dismissal. Holds while its host is hovered and inside `data-time="frozen"` (scenario frames, gallery specimens); deliberately kept out of the reduced-motion list | `Toast` |
| `fx-nav-rail` | Luminous active-nav left rail | sidebar active item |
| `fx-quadrant` + `fx-q-{error,primary,warning,neutral}` + `fx-q-{tl,tr,bl,br}` | Per-quadrant corner bloom keyed to semantic hue | priority matrix |
| `fx-grid-flow` | Login-only grid crawl (transform loop; host extends 64px above viewport) | login grid layer |

## Typography (shared voices)

- **Geist Sans** — humans: 400 body · 500 interactive · 600 titles
  (`tracking -0.01em`) · 700 page h1 / hero %.
- **Geist Mono** — telemetry, via `fx-label` / `fx-num` / `fx-chip`: anything
  measured. Decorative glyphs (`·`, `↩`, `★`) stay in JSX per the i18n rule.
- p5-dark adds a third, theme-scoped **display voice** (Anton) — see its spec.

## Principles

How a screen should feel, whatever the theme. An agent checks a design against
these before proposing it, and ranks its options by them. Each came from a call the
owner made on a real design — most from PR #109's backlog grouping and PR #115's
board — and an example's citation says where: `(#115 R14)` is round 14 of
`reviews/pr-115.md`, which quotes the owner and names the commit that drew it; an
example with no round to cite is left out. The product's core, in one line: **take resistance away, amplify feedback** —
the work still to do stays calm and small, the work done is celebrated loudly. Under
it runs one habit of craft: **one structure, reused** — what reads as the same thing
is built as the same thing (group 5). The principles fall into six groups; the items
in a group pull the same way.

### 1. Minimal — fewer elements, smaller changes, fewer steps

**1.1 Only the necessary elements, and one element per meaning.** If the dots, the
path or another mark already says something, no text, number or second component
says it again; if removing an element loses nothing, remove it. Bad: `Weekly × 3`
and `1/3` beside a habit's dots, `Step 4/9` beside a project's path (#109 R1, R6); a
Done pane whose day groups each carry a ring, redrawing the progress row above it
(#115 R14). Good: the dots and the path carry progress (#109 R6).

**1.2 When what exists works, change it the least.** Prefer a small change to the
current screen over a new layout, and the simplest behaviour over a clever one.
Bad: five new desktop layouts to fill the room a moved Done column left (#115
R11–14). Good: the product's Todo and Done columns, each gaining only a tag — This
week, Today (#115 R15, R25); a card pulled after the day is done simply reopens the
ring grey (#115 R19).

**1.3 The fewest actions, the least friction.** Every extra step is a reason to stop
using the app; ask first whether a step can go — this is Phase 2's direction. A move
becomes a tap on the card; dragging stays only as desktop's extra. Bad: the old three
columns, a card walking Backlog → Todo → Doing → Done (#109 R11). Good: no Doing
column (#109 R11); a card is completed by tapping it, not by dragging it into Done
(#115 R7–8); a backlog card goes to the board with its `↑ Todo`, on both widths (#115
R14). The one exception: an action the user can't take back gets one confirming
state, in place — never an undo banner after it. Good: the tapped card's ✓ Complete
instead of a 5-second Undo snackbar (#115 R7–8).

### 2. Calm ahead — the work still to do never overwhelms

Calm is for what lies ahead — Todo, the backlog, the week's plan — and for the
screen at rest (#115 R23). The design is there to keep the user going.

**2.1 Numbers serve motivation.** A big number overwhelms: small numbers are fine,
large ones discourage. A count stops at 8 and shows `8+` beyond it; the real number
stays in the accessible name (#109 R1, R11).

**2.2 A pile in plain sight is pressure.** What isn't for now stays folded away, and
no layer is added that could fill up with work nobody wants to do: plan by the week,
do by the day. Bad: the backlog always open beside Todo; a This week column between
today's cards and the backlog — a parking lot for what keeps getting put off (#115
R14). Good: the backlog folded to an edge (a pill on phones) and opened to plan (#115
R14).

**2.3 An empty list is a finish line.** When the planned work runs out, the screen says
it is done and offers what could come next without pushing it. Good: an empty Todo
reads "Today's plan is done · Pull more from the backlog, or call it a day." — both
choices weighed the same (#115 R25).

### 3. Loud wins — finishing feels like a game

The moment of finishing is where the product gets loud: strong, varied feedback
borrowed from games — Balatro is the reference. Loud is for that moment, not for
what stays on screen: a done card at rest is quiet (6.1).

**3.1 Feedback is strong.** Completing is rewarded with motion, colour and particles
the user can feel — never a quiet fade. Bad: the card fading out sideways in 240 ms.
Good: the card lifts, wobbles and is tossed into today's ring.

**3.2 Variety keeps it fresh.** Several animations, picked at random and never the same
twice in a row, so the reward doesn't wear out; more kinds join over time. Good: four
Balatro-style juices before the toss — a wobble, a foil shine, a chip burst with `+1`,
a flip.

**3.3 Bigger wins, bigger feedback.** Every card gets its burst; closing the day's plan
gets the big one. Good: a card's toss, then the ring's spin and sparks when the plan
is done.

**3.4 Feedback lands somewhere.** The reward shows where the work went. Good: the card
flies into today's ring on both widths, and the ring grows as it lands.

### 4. Hierarchy — the important at a glance

**4.1 Order by importance.** What matters most is seen at a glance; what's secondary
folds away, sits behind a tap or comes last. Phones run from most to least important
top to bottom, desktops left to right, in the same order. Good: the ring row and
Todo first; a day's done list behind its ring.

**4.2 Small visual details carry state; words don't explain it.** Good: the thin pile
under a backlog card says more wait behind it; a Done card dims and strikes through,
so it reads settled.

**4.3 Don't crowd when there is room.** Where space is free, elements sit apart —
at opposite corners if need be; apart from text itself, nothing should feel
cramped. Bad: `+N more` and `↑ Todo` squeezed into one row with space left below.
Good: `+N more` top right, `↑ Todo` bottom right.

**4.4 A layout holds when things fold.** Whatever can collapse, the screen still
reads well collapsed. Bad: the backlog and Done folded into one edge strip, leaving a
lone Todo column across the screen; two folded drawers side by side. Good: Todo and
Done as two columns, the backlog folded to an edge.

### 5. Consistent — one structure, reused by the eye and by the code

Consistency pays twice: parts that share one structure read calm, and the same
structure is built once — one component with slots, not a variant for each place.
When a design seems to need a second version of something, first ask whether it is
a slot of the first.

**5.1 One component, many places: a place fills slots, never reshapes the skeleton.**
Things of one kind keep one skeleton wherever they sit, and each slot keeps one job
everywhere. A card is a kind line, a title, a description, the signal bottom left
and the action bottom right: Todo puts the ✓ circle in the action, Backlog puts
`↑ Todo` there and `+N more` top right, Done leaves the action empty and dims. A
desktop column is a title with a tag beside its count: Todo · Today, Done · This
week. Bad: three card faces — the board's, the phone's mini card, the backlog
sheet's — each laid out its own way; a one-off's quadrant top right, the spot the
backlog needs for `+N more`; a backlog habit card whose title sits where every other
card has its kind; a project's `3 left this week ⌄` in an outlined pill where a habit's
count is plain text (#109 R3). Good: one card across Todo, Done and Backlog (PR #115 mockup, tab
K · Card), the quadrant inside the kind line — `ONE-OFF | DO FIRST`.

**5.2 One journey on both widths; desktop may add, never subtract.** Everything a
phone can do, desktop does the same way, on the same card — one face on both widths;
desktop's extra room may add a view or a gesture of its own. Good: tap twice to
complete and `↑ Todo` on backlog cards on both widths, plus drag on desktop;
desktop's Done column, where phones open a day's list from its ring.

**5.3 Kinds differ by colour and mark, never by layout.** Habit green, project-step
purple, one-off blue — the same on card edges, rings and sparks — and a habit's dots
against a step's segmented path; the layout stays the card's. Told apart by people
with colour-vision deficiency too (tracker: one-off blue and step purple are too
close). Bad: a backlog habit card without the description its project neighbours
have.

### 6. Honest controls — controls look like controls, statuses don't, feedback stays small

**6.1 Status marks must not look like controls.** A state the user can't change by
clicking it is never drawn as a control shape — no hollow or filled circles or
squares that read as a radio or checkbox. Show it with what the element already
has: a tint, a border, a pill, muted text, an inline ✓ glyph beside text. Bad:
every project step row led by a circle that fills when the step is on this week —
it looks clickable and only repeats the pill; a filled ✓ circle on a done card. Good:
this week's row is tinted with a "This week · todo" pill; a done row reads muted
with "✓ Mon, Oct 5" on the right.

**6.2 Controls look tappable, and their feedback stays small.** This is a control's
own feedback — hover and press; the loud feedback belongs to wins (3). Hover is the least it
can be; press and selection carry the weight; hover never changes how a selected
element looks. Bad: a whole cell lighting up and lifting on hover; hover dimming a
selected day's glow. Good: a day cell — hover an underline, press a slight shrink,
selected a bright frame and an inner glow.

**6.3 Interacting never changes size.** The layout holds still: a win's animation may
scale a card with a transform for a moment, but nothing around it moves until the card
has gone. Bad: a card that grows taller when selected.
Good: the selected card's ✓ scales up in place; rings keep one size on every phone
width.

## Motion (shared baseline)

One easing: `cubic-bezier(0.2, 0, 0, 1)` ("console snap"). HUD timings: 150ms
micro (hover lift, glow ramp) · 240ms structural · 420ms `fx-boot-in`. Ambient
loops are rare and slow: LED pulse 2.4s, orbit 2s, target pulse 1.6s. Drag lift
is a class swap, never a transition. Backgrounds never move (except the login
crawl). Theme specs may compress timings (p5-dark does) but never break the
opacity/transform-only rule or the `prefers-reduced-motion` opt-out.

## Contrast method & bars

Every palette value stays in the sRGB gamut, and contrast is measured as numbers
(OKLCH → linear sRGB → relative luminance → contrast ratio), never judged by eye.
Bars: every signal color body-text grade (≥ 4.5:1) on its bases; X/X-content pairs
AAA (≥ 7:1) unless a theme documents a deliberate deviation (see p5-dark's reds).
Each theme file carries the table measured when its palette was set. No script for
it lives in the repository, so a palette change re-measures by hand and updates
the table.

## Sync points

Changing any theme's base colors requires touching, in lockstep:
`src/app/globals.css` (theme block — for the mars themes also the baked
`--fx-art` SVG data-URIs), `public/manifest.json` (`background_color` /
`theme_color` follow the **default** theme, mars-dark), `src/app/layout.tsx`
(`viewport.themeColor`), and the theme file here (re-measure the contrast,
update the table). Verification surface: the `/design` gallery (Tokens & FX tab)
and the scenario pages.
