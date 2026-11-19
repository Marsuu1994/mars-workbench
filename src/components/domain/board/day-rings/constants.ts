/** A ring's size in px: today's, and every other day's (RING-1) */
export const RING_SIZE = {today: 44, day: 30};
/** The ring's stroke, as a share of its size */
export const RING_STROKE_RATIO = 0.15;
/** The gap left at the end of each arc, in px, so the kinds stay apart */
export const RING_ARC_GAP = 1.6;
/** The ✓'s size, as a share of the ring's */
export const RING_CHECK_RATIO = 0.42;
/** How many sparks fly out of a closing ring (FX-4) */
export const SPARK_COUNT = 12;
/** From this day on, the desktop panel hangs from its cell's right edge, so
    it stays on the row */
export const DAY_LIST_ALIGN_RIGHT_FROM = 4;
/** Each day's key under Board.Rings.Days, Monday first, by its dayIndex */
export const DAY_NAME_KEYS = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
] as const;
