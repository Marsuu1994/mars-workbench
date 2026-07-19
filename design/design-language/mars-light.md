# mars-light — "Sora light" (Mission Control HUD · dawn on Mars)

> **Status: shipped.** Skeleton, `fx-*` API and shared voices:
> [README.md](./README.md). Sibling skin: [mars-dark.md](./mars-dark.md) (same
> HUD concept at night). The HUD identity rules (sans/mono voices,
> color-by-channel) are listed there.

## Concept

**Dawn on Mars** — deliberately *not* a white theme: warm sunlit-sand consoles,
cool space-ink text, the identical seven signal hues driven deep so the identity
survives daylight. The "dawn shift" of the same console.

## Palette

Same seven hue-wheel stops as mars-dark, driven deep against sand bases.

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

Warning stays a deep bronze so `text-warning` (star points, at-risk labels) is
**body-text grade on the sand bases** (the pre-redesign amber failed AA in three
components).

## Constraints to preserve

- **Accent on base-200 is 4.27:1 — icon/large-text grade only**; never use
  `text-accent` for small body copy on base-200 surfaces.
- The light `--fx-art` dust-mote SVG data-URI bakes its colors — re-tint by hand
  on any palette change (see Sync points in the README).
