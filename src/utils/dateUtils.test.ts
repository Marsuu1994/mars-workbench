import {afterEach, describe, expect, it, vi} from 'vitest';
import {MOMENTS, freezeTime} from '../../test/time';
import {
  countWeekdaysInRange,
  formatDayLabel,
  formatISODate,
  formatKanbanISODate,
  getISOWeekKey,
  getMondayFromPeriodKey,
  getSundayFromPeriodKey,
  getTodayDate,
  getWeekDateRange,
  getWeekNumberFromPeriodKey,
  isPeriodCurrent,
  isWeekend,
  normalizeForDate,
} from './dateUtils';

afterEach(() => {
  vi.useRealTimers();
});

/** A local-midnight date, the shape getTodayDate returns. */
const localDay = (isoDay: string) => {
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day);
};

describe('getTodayDate', () => {
  it('is the Los Angeles calendar day, at local midnight', () => {
    freezeTime(MOMENTS.WEDNESDAY_NOON);
    const today = getTodayDate();
    expect(formatISODate(today)).toBe('2026-10-14');
    expect(today.getHours()).toBe(0);
  });

  it('is still Sunday in Los Angeles after midnight UTC', () => {
    freezeTime(MOMENTS.SUNDAY_LATE);
    expect(formatISODate(getTodayDate())).toBe('2026-10-18');
  });
});

describe('ISO week keys', () => {
  it.each([
    ['2026-10-18', '2026-W42'],
    ['2026-10-19', '2026-W43'],
    ['2025-12-29', '2026-W01'],
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2026-11-01', '2026-W44'],
    ['2026-11-02', '2026-W45'],
  ])('%s falls in %s', (isoDay, periodKey) => {
    expect(getISOWeekKey(localDay(isoDay))).toBe(periodKey);
  });

  it.each([
    ['2026-W43', '2026-10-19', '2026-10-25'],
    ['2026-W01', '2025-12-29', '2026-01-04'],
    ['2026-W53', '2026-12-28', '2027-01-03'],
  ])('%s runs from Monday %s to Sunday %s', (periodKey, monday, sunday) => {
    expect(formatISODate(getMondayFromPeriodKey(periodKey))).toBe(monday);
    expect(formatISODate(getSundayFromPeriodKey(periodKey))).toBe(sunday);
  });

  it('labels a week with its number and dates', () => {
    expect(getWeekNumberFromPeriodKey('2026-W07')).toBe('07');
    expect(getWeekDateRange('2026-W42')).toBe('Week 42 · Oct 12 – Oct 18');
  });

  it('a period stops being current on the next Monday', () => {
    expect(isPeriodCurrent('2026-W42', localDay('2026-10-18'))).toBe(true);
    expect(isPeriodCurrent('2026-W42', localDay('2026-10-19'))).toBe(false);
  });
});

describe('calendar days', () => {
  it('keeps the calendar day of a Prisma DATE value', () => {
    const fromPrisma = new Date('2026-10-14T00:00:00Z');
    expect(formatISODate(normalizeForDate(fromPrisma))).toBe('2026-10-14');
  });

  it('formats a moment as its Los Angeles day', () => {
    expect(formatKanbanISODate(new Date(MOMENTS.SUNDAY_LATE))).toBe(
      '2026-10-18',
    );
    expect(formatDayLabel(new Date(MOMENTS.WEDNESDAY_NOON))).toBe(
      'Wed, Oct 14',
    );
  });

  it('knows weekends', () => {
    expect(isWeekend(localDay('2026-10-17'))).toBe(true);
    expect(isWeekend(localDay('2026-10-18'))).toBe(true);
    expect(isWeekend(localDay('2026-10-16'))).toBe(false);
  });

  it.each([
    ['2026-10-14', '2026-10-18', 3],
    ['2026-10-12', '2026-10-18', 5],
    ['2026-10-14', '2026-10-14', 1],
    ['2026-10-17', '2026-10-18', 0],
    ['2026-10-26', '2026-11-06', 10],
  ])('counts weekdays from %s to %s: %i', (from, to, weekdays) => {
    expect(countWeekdaysInRange(localDay(from), localDay(to))).toBe(weekdays);
  });
});
