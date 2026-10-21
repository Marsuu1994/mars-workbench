import {vi} from 'vitest';

/**
 * Moments in the week of Monday 2026-10-12 (ISO week 2026-W42), as instants:
 * the kanban day is Los Angeles time (PDT, UTC-7), so noon there is 19:00 UTC.
 */
export const MOMENTS = {
  MONDAY_NOON: '2026-10-12T19:00:00Z',
  WEDNESDAY_NOON: '2026-10-14T19:00:00Z',
  THURSDAY_NOON: '2026-10-15T19:00:00Z',
  SATURDAY_NOON: '2026-10-17T19:00:00Z',
  SUNDAY_NOON: '2026-10-18T19:00:00Z',
  /** Sunday evening in Los Angeles, already Monday in UTC */
  SUNDAY_LATE: '2026-10-19T05:30:00Z',
  NEXT_MONDAY_NOON: '2026-10-19T19:00:00Z',
} as const;

export const WEEK_KEY = '2026-W42';
export const NEXT_WEEK_KEY = '2026-W43';

/**
 * Freezes the clock at an instant. Only `Date` is faked, so database
 * connections and their timers keep working; the integration setup restores
 * real timers after each test.
 */
export const freezeTime = (instant: string) => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(new Date(instant));
};
