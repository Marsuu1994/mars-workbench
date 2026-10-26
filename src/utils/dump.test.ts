import {afterEach, describe, expect, it, vi} from 'vitest';
import {MOMENTS, freezeTime} from '../../test/time';
import {
  dumpDayKey,
  dumpTodayKey,
  formatDumpDayLabel,
  formatDumpTime,
  groupEntriesByDay,
  shiftDayKey,
  toDumpPageProps,
} from './dump';

afterEach(() => {
  vi.useRealTimers();
});

describe('dump days', () => {
  it('keys and labels a moment by its Los Angeles day', () => {
    const sundayEvening = new Date(MOMENTS.SUNDAY_LATE);
    expect(dumpDayKey(sundayEvening)).toBe('2026-10-18');
    expect(formatDumpDayLabel(sundayEvening)).toBe('Sun, Oct 18');
    expect(formatDumpTime(sundayEvening)).toBe('22:30');
  });

  it("today's key is the Los Angeles day", () => {
    freezeTime(MOMENTS.SUNDAY_LATE);
    expect(dumpTodayKey()).toBe('2026-10-18');
  });

  it.each([
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-11-01', -1, '2026-10-31'],
    ['2026-03-08', 1, '2026-03-09'],
    ['2026-01-01', -1, '2025-12-31'],
  ])('shifts %s by %i day to %s', (key, days, shifted) => {
    expect(shiftDayKey(key, days)).toBe(shifted);
  });
});

describe('groupEntriesByDay', () => {
  it('groups newest-first entries into contiguous days', () => {
    const entries = [
      {id: 'monday-late', createdAt: new Date('2026-10-13T06:00:00Z')},
      {id: 'monday', createdAt: new Date('2026-10-12T19:00:00Z')},
      {id: 'sunday', createdAt: new Date(MOMENTS.SUNDAY_NOON)},
    ];
    const groups = groupEntriesByDay(entries);
    expect(
      groups.map(({key, dateLabel, entries: dayEntries}) => [
        key,
        dateLabel,
        dayEntries.map(({id}) => id),
      ]),
    ).toEqual([
      ['2026-10-12', 'Mon, Oct 12', ['monday-late', 'monday']],
      ['2026-10-18', 'Sun, Oct 18', ['sunday']],
    ]);
  });
});

describe('toDumpPageProps', () => {
  // Today as getTodayDate returns it: local midnight of the Los Angeles day
  const thursday = new Date(2026, 9, 15);
  const entry = {
    id: 'entry-1',
    content: 'Book the dentist',
    createdAt: new Date(MOMENTS.WEDNESDAY_NOON),
  };

  it("passes the first page through under today's week", () => {
    expect(
      toDumpPageProps(
        {data: {entries: [entry], nextCursor: 'cursor-1'}},
        21,
        thursday,
      ),
    ).toEqual({
      periodKey: '2026-W42',
      entries: [entry],
      nextCursor: 'cursor-1',
      totalCount: 21,
    });
  });

  it('falls back to an empty feed when the read failed', () => {
    expect(
      toDumpPageProps(
        {error: {formErrors: ['failed'], fieldErrors: {}}},
        0,
        thursday,
      ),
    ).toEqual({
      periodKey: '2026-W42',
      entries: [],
      nextCursor: null,
      totalCount: 0,
    });
  });
});
