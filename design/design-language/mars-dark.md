# mars-dark — "Sora dark" (Mission Control HUD · night ops)

> **Status: shipped · the default theme.** Skeleton, `fx-*` API and shared voices:
> [README.md](./README.md). Sibling skin: [mars-light.md](./mars-light.md) (same
> HUD concept at dawn).

## Concept

Your week is a flight plan; the app is the console you fly it from — at night. A
night ops deck: near-black blue console panels over a faint telemetry dot-field,
phosphor-cyan telemetry as the primary voice, mars signal-orange for targeting
(drag & drop), violet for the AI channel.

Two rules carry the HUD identity (both mars themes):

1. **Sans for humans, mono for telemetry.** Geist Sans speaks prose and titles;
   Geist Mono renders everything the console *measures* — micro-labels
   (`fx-label`), numerals/dates/counts (`fx-num`), badges (`fx-chip`).
2. **Color by channel, not decoration.** Cyan = action/telemetry, violet = AI,
   orange = targeting (drop zones) & signature accents, blue = datalink stats,
   green = go, amber = caution, red = abort.

## Palette

Seven OKLCH hue-wheel stops (25 error · 55 accent · 85 warning · 155 success ·
205 primary · 235 info · 295 secondary) with matched chroma bands.

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

Every signal color is **body-text grade (≥ 4.5:1)** on base-100 and base-200.
All pairs AAA (≥ 7:1).

## Theme-specific hazards

- The dark `--fx-art` nebula SVG data-URI bakes its wisp/filament/star colors —
  re-tint the URI by hand on any palette change (see Sync points in the README).
- `manifest.json` and `viewport.themeColor` are keyed to this theme (it is the
  default): `background_color` = base-300 `#030610`, `theme_color` = base-100
  `#0d1321`.
