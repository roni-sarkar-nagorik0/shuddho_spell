# 12 — Design system

A dense professional instrument, not a game. These tokens are already agreed with the design
work — implement them exactly in the Tailwind config. Do not "improve" them.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `ink-900` | `#101423` | sidebar, exam runtime, dark hero |
| `ink-700` | `#2A3050` | primary text on light, secondary surfaces |
| `canvas` | `#F6F7F9` | page background |
| `surface` | `#FFFFFF` | panels, cards, tables |
| `hairline` | `#E1E4EA` | **all** separation |
| `muted` | `#69708A` | secondary text, labels |
| `signal` | `#E08700` | attention, focus ring, timer warning |
| `mastered` | `#0E7A55` | mastery, pass |
| `error` | `#C0392E` | failure, timer critical |
| `cold` | `#C7CCD8` | inactive, not-yet-seen |

Heat scale (mastery matrices, heatmaps), low → high:

```
#EDEFF3   #C7CCD8   #F0C36B   #7FB79B   #0E7A55
```

## Typography

| Family | Use |
| --- | --- |
| **Instrument Sans** | display, headings |
| **Inter** | body |
| **IBM Plex Mono** | **all** numerals, IPA, timers, scores — tabular figures on |
| **Noto Sans Bengali** | all Bangla |

Base body size **13px**. This is deliberate density. Do not scale it up.

Every number the learner reads — a score, a countdown, a streak, a percentage, an interval —
is IBM Plex Mono with `font-variant-numeric: tabular-nums`. Numbers that shift horizontally
as they tick are the fastest way to make an instrument feel cheap.

## Shape and separation

- Radius: **6px** cards · **4px** controls · **2px** chips.
- Separation is a **1px hairline**, not a shadow. Shadows exist only on overlays
  (popover, drawer, dialog).
- **No gradients. No illustration. No emoji.** Anywhere. Including empty states, including
  the marketing page.

## Layout

- Sidebar **232px**, `ink-900`, collapsible to **56px**.
- Top bar **48px**: breadcrumb, session timer, streak, notification bell, avatar.
- Content region max-width **1280px** on a **12-column** grid.
- Table rows **32px**. Sticky header. Pinned first column where the table scrolls
  horizontally.

## The two signature components

Built **once**, properly, in Phase 10. They appear on nine screens.

### `PhonemeStrip`

- the word with syllable dividers
- a row of bordered **22px** phoneme cells, each tinted by the **learner's** mastery of that
  phoneme (heat scale)
- the Bangla pronunciation line (Noto Sans Bengali)
- a mono stat line

### `MasteryMatrix`

- an **11×4** heatmap of the 44 phonemes
- **the same component** renders the 24 rule families via a `dimension` prop
- hover tooltips, and a drill action that routes to targeted practice

One component, two dimensions. Two components would drift within a month.

## Accessibility — WCAG 2.1 AA

- Visible focus rings: **2px `signal`, 2px offset**. Never removed, never `outline: none`
  without a replacement.
- **Full keyboard operation** of the dictation tiles and the exam navigator. Not "supported" —
  the primary path must work with no mouse.
- `prefers-reduced-motion` respected.
- Live regions for timer warnings (5:00 and 0:60).
- The heat scale must not be the *only* signal — pair it with a number or a label, because
  green-vs-amber is exactly the pair that fails for the most common colour blindness.

## Internationalisation

`next-intl` with **complete** `en` and `bn` catalogues. CI fails on any key present in `en`
and missing in `bn`.

Bangla is **real Bangla script**. Never transliteration. `শুদ্ধ`, not `shuddho`.
