# 12 — Design system

A dense professional instrument, not a game. These tokens are already agreed with the design
work — implement them exactly in the Tailwind config. Do not "improve" them.

## Source of truth

The five reference renders in [`ui_images/`](../../ui_images) are the design record:

| File | Screen |
| --- | --- |
| `image copy 4.png` | the token sheet — palette, type, controls |
| `image copy 2.png` | landing / language choice |
| `image copy 3.png` | dashboard |
| `image copy.png` | spelling drill, error state |
| `image.png` | pronunciation drill |

Where this document and an image disagree, **the image wins** — fix the document.

## Colour tokens

Four families, taken from the token sheet. Each ships as a Tailwind scale so tints are
picked from the ramp, never mixed ad hoc.

| Token | Hex | Use |
| --- | --- | --- |
| `primary-900` | `#16255A` | sidebar rail, headings, filled buttons, exam runtime |
| `primary-700` | `#243766` | secondary surfaces, hover on filled |
| `primary-100` | `#C9D2E8` | day-tile fill, selected chips |
| `secondary-500` | `#E9A13B` | attention, progress bar, streak, focus ring, timer warning |
| `secondary-100` | `#F7DFB8` | streak day pills, soft highlight |
| `tertiary-500` | `#C24A3C` | error, failure, timer critical, the record button |
| `tertiary-100` | `#F5D4CF` | wrong-letter tile fill |
| `neutral-50` | `#F4F6F2` | page canvas (warm, not blue-grey) |
| `surface` | `#FFFFFF` | cards, panels, tables |
| `hairline` | `#E4E6E0` | **all** separation, and the paper rules |
| `muted` | `#6B7280` | secondary text, labels, IPA |
| `mastered` | `#0E7A55` | mastery, pass, correct-letter tile |
| `cold` | `#C7CCD8` | inactive, locked, not-yet-seen |

Heat scale (mastery matrices, heatmaps), low → high:

```
#EDEFF3   #C7CCD8   #F7DFB8   #E9A13B   #0E7A55
```

## The paper surface

Every learning screen sits on ruled paper. This is the product's one visual signature and it
is built once, as a CSS background on the content region — never as an image asset.

- horizontal rules in `hairline`, **32px** apart, aligned to the baseline grid
- a single vertical **margin rule** in `tertiary-500` at 10% opacity, **64px** from the
  content region's left edge
- canvas `neutral-50` beneath
- cards sit **on** the paper as flat `surface` blocks with a 1px `hairline` border; a card
  that carries the day's focus takes a **2px `tertiary-500` left accent rule** (see the
  dashboard and drill renders)

Marketing and exam runtime do not use the rules — marketing keeps the margin rule only,
exam runtime is flat `primary-900`.

## Typography

| Family | Use |
| --- | --- |
| **Bricolage Grotesque** | display and headings — `Silent letters`, `Spell it. Say it. Mean it.` |
| **Public Sans** | body **and** labels |
| **IBM Plex Mono** | **all** numerals, IPA, timers, scores — tabular figures on |
| **Noto Sans Bengali** | all Bangla |

Base body size **13px**. This is deliberate density. Do not scale it up.

Headings are Bricolage Grotesque at tight tracking; the dashboard `Silent letters` and the
landing `Spell it.` are the same treatment at different sizes. Labels are Public Sans
uppercase, 11px, `+0.08em` tracking, `muted` — `TARGET WORD`, `DAY 8 OF 30`, `CURRENT STREAK`.

Every number the learner reads — a score, a countdown, a streak, a percentage, an interval —
is IBM Plex Mono with `font-variant-numeric: tabular-nums`. Numbers that shift horizontally
as they tick are the fastest way to make an instrument feel cheap.

## Controls

From the token sheet, four button variants and nothing else:

| Variant | Fill | Text | Border |
| --- | --- | --- | --- |
| Primary | `primary-900` | white | none |
| Secondary | `primary-100` | `primary-900` | none |
| Inverted | `#2B2B2B` | white | none |
| Outlined | transparent | `primary-900` | 1px `primary-900` |

Icon buttons are **32px** circles. Destructive icon buttons take `tertiary-500`.

## Shape and separation

- Radius: **6px** cards · **4px** controls · **2px** chips.
- Separation is a **1px hairline**, not a shadow. Shadows exist only on overlays
  (popover, drawer, dialog).
- **No gradients. No illustration. No emoji.** Anywhere. Including empty states, including
  the marketing page.

## Layout

- Sidebar **232px**, `surface` with a 1px `hairline` right edge, collapsible to a **56px**
  icon rail (both states appear in the renders).
- The rail's active item is a `primary-100` rounded square with a `primary-900` glyph.
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

- Visible focus rings: **2px `secondary-500`, 2px offset**. Never removed, never `outline: none`
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
