/**
 * Dump feature constants + client-safe date helpers — shared by the zod schema,
 * the server action's paging, and the composer/feed UI (textarea maxLength,
 * skeletons, day grouping).
 */
import type {DumpFeedResult, DumpPageData} from '@/types/dump';
import {
  KANBAN_TZ,
  formatDayLabel,
  formatKanbanISODate,
  getISOWeekKey,
} from './dateUtils';

export const DUMP_PAGE_SIZE = 20;
export const DUMP_ENTRY_MAX_LENGTH = 10000;

const pad2 = (value: number) => String(value).padStart(2, '0');

// All feed dates are rendered in the app's canonical timezone so day grouping
// and "Today"/"Yesterday" are stable regardless of the client's local offset.
const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: KANBAN_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** KANBAN-tz calendar day key, e.g. "2026-07-16". */
export function dumpDayKey(date: Date): string {
  return formatKanbanISODate(date);
}

/** KANBAN-tz weekday + date label, e.g. "Wed, Jul 16". */
export function formatDumpDayLabel(date: Date): string {
  return formatDayLabel(date);
}

/** KANBAN-tz 24h time, e.g. "09:42". */
export function formatDumpTime(date: Date): string {
  return timeFmt.format(date);
}

/** Today's day key in KANBAN tz (compared against group keys for the header). */
export function dumpTodayKey(): string {
  return formatKanbanISODate(new Date());
}

/** Shift a "YYYY-MM-DD" key by whole days — DST-immune calendar arithmetic. */
export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export interface DumpDayGroup<T> {
  key: string;
  dateLabel: string;
  entries: T[];
}

/**
 * Bucket entries (already newest-first) into contiguous day groups, preserving
 * order. The header's "Today"/"Yesterday" wording is the caller's concern
 * (i18n): compare `group.key` against `dumpTodayKey()` / `shiftDayKey(key, -1)`.
 */
export function groupEntriesByDay<T extends {createdAt: Date}>(
  entries: T[],
): DumpDayGroup<T>[] {
  const groups: DumpDayGroup<T>[] = [];
  let current: DumpDayGroup<T> | null = null;
  for (const entry of entries) {
    const key = dumpDayKey(entry.createdAt);
    if (!current || current.key !== key) {
      current = {
        key,
        dateLabel: formatDumpDayLabel(entry.createdAt),
        entries: [],
      };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}

/**
 * The Dump page's props from its two reads: the feed's first page (empty on
 * the error branch, which the cursorless first page can't reach — the
 * fallback keeps the types honest) and the total. Dump is plan-independent,
 * so the header's week is just `today`'s ISO week.
 */
export function toDumpPageProps(
  feed: DumpFeedResult,
  totalCount: number,
  today: Date,
): DumpPageData {
  const {entries, nextCursor} =
    'data' in feed ? feed.data : {entries: [], nextCursor: null};
  return {
    periodKey: getISOWeekKey(today),
    initialEntries: entries,
    initialNextCursor: nextCursor,
    initialTotalCount: totalCount,
  };
}
