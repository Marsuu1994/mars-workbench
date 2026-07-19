import type {DumpEntryItem} from '@/lib/db/dumpEntries';

/* Dump scenario fixtures — a DumpEntryItem[] spanning Today / Yesterday / an
   older day so the feed's day-group headers all render, plus one long (>6
   line) entry to pin the clamp + Show more. createdAt is relative to now so
   the Today/Yesterday headings stay correct whenever the scenario is viewed
   (grouping is anchored to KANBAN_TZ). */

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const entry = (id: string, content: string, msAgo: number): DumpEntryItem => ({
  id,
  content,
  createdAt: new Date(NOW - msAgo),
});

export const DUMP_FEED_ENTRIES: DumpEntryItem[] = [
  entry(
    'scn-d0',
    'Dentist says come back in October for a cleaning. Book it before the calendar fills up — and actually floss this time.',
    1 * HOUR,
  ),
  entry(
    'scn-d1',
    'Woke up at 4am with the demo running in my head. Note to self: no coffee after 3pm, it is not worth it.',
    4 * HOUR,
  ),
  entry(
    'scn-d2',
    `Long walk after dinner. The week finally feels like it has a shape — the plan helped more than I expected. I keep noticing that the days I write the plan down before 9am are the days I actually finish things. Maybe the ritual matters more than the plan itself.

Also thinking about how much of my anxiety is just unwritten to-dos circling. When they land somewhere — the board, this dump — the volume drops. That is probably the whole point of this app.

Tomorrow: gym before standup, then a deep-work block till noon.`,
    26 * HOUR,
  ),
  entry(
    'scn-d3',
    'Standup: Sara flagged the Q3 migration risk. I volunteered to draft the rollback plan by Friday.',
    27 * HOUR,
  ),
  entry(
    'scn-d4',
    'The dark forest chapters get better on a reread. Grab the sequel before next month is flight.',
    3 * DAY + 2 * HOUR,
  ),
  entry(
    'scn-d5',
    'Three deep-work blocks actually happened last week. Protect the 9–11 slot; meetings can have the afternoon.',
    3 * DAY + 5 * HOUR,
  ),
];

/** Header week badge — dump is plan-independent, so a fixed recent week. */
export const DUMP_PERIOD_KEY = '2026-W29';
