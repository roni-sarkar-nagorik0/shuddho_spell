/**
 * Which programme a learner is on. Two tracks, and the name carries its own
 * length — a position of "day 19" means something different on each.
 *
 * A frozen const plus a derived union rather than an enum: the values are the
 * strings 003's check constraint allows, and an enum would introduce a second
 * set of names that has to be kept in step with them.
 */
export const TRACKS = Object.freeze(['standard28', 'sprint21'] as const);

export type Track = (typeof TRACKS)[number];

const TOTAL_DAYS: Readonly<Record<Track, number>> = Object.freeze({
  standard28: 28,
  sprint21: 21,
});

export function totalDaysIn(track: Track): number {
  return TOTAL_DAYS[track];
}
