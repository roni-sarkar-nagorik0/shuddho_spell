/**
 * The heat scale, in one place.
 *
 * `12-design-system.md` gives five steps low → high. Every heatmap in the
 * product — the phoneme strip's cells, both mastery matrices, the activity
 * heatmap — reads them from here, because five hexes copied into four files is
 * four files that drift.
 */
export const HEAT_LEVELS = Object.freeze([0, 1, 2, 3, 4] as const);

export type HeatLevel = (typeof HEAT_LEVELS)[number];

/** Level 0 is also "never attempted". The two are told apart by the border, not the fill. */
const THRESHOLDS: readonly number[] = [0.4, 0.6, 0.75, 0.9];

/**
 * Accuracy 0..1 → a level. `null` means the learner has never attempted this
 * dimension, which is level 0 and is **not** the same as being bad at it — the
 * caller draws an unattempted cell with a dashed border and says `not seen` in
 * its label, so the two never read alike.
 */
export function heatLevel(accuracy: number | null): HeatLevel {
  if (accuracy === null) {
    return 0;
  }

  const clamped = Math.min(1, Math.max(0, accuracy));
  const step = THRESHOLDS.filter((threshold) => clamped >= threshold).length;

  return HEAT_LEVELS[step] ?? 4;
}

/**
 * Fill plus the text colour that stays legible on it. Level 3 is amber and
 * level 4 is a dark green, so a single foreground colour cannot serve both.
 */
export const HEAT_CLASSES: Readonly<Record<HeatLevel, string>> = {
  0: 'bg-heat-0 text-neutral-700',
  1: 'bg-heat-1 text-neutral-900',
  2: 'bg-heat-2 text-neutral-900',
  3: 'bg-heat-3 text-primary-900',
  4: 'bg-heat-4 text-surface',
};

/** Percent for display. Never a bare ratio — the learner reads whole numbers. */
export function accuracyPercent(accuracy: number | null): number | null {
  return accuracy === null ? null : Math.round(Math.min(1, Math.max(0, accuracy)) * 100);
}
