import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {
  formatISODate,
  formatKanbanISODate,
  getMondayFromPeriodKey,
} from '@/utils/dateUtils';
import {getTaskKind, TaskKind} from '@/utils/taskUtils';

// ─── Model ─────────────────────────────────────────────────────────────────

/** The kinds in the order a ring draws them and a day's list lists them. */
export const RING_KIND_ORDER: readonly TaskKind[] = [
  TaskKind.HABIT,
  TaskKind.PROJECT,
  TaskKind.ONE_OFF,
];

/** Where a day stands against today, in KANBAN_TZ. */
export const DayState = {
  PAST: 'PAST',
  TODAY: 'TODAY',
  FUTURE: 'FUTURE',
} as const;
export type DayState = (typeof DayState)[keyof typeof DayState];

export type KindCounts = Record<TaskKind, number>;

/** One day of the week's row: what it has done and planned, by kind. */
export interface DayRing {
  /** The day as "YYYY-MM-DD" */
  date: string;
  /** 0 for Monday … 6 for Sunday */
  dayIndex: number;
  state: DayState;
  done: KindCounts;
  planned: KindCounts;
  doneCount: number;
  plannedCount: number;
  /** Something is planned and all of it is done */
  isClosed: boolean;
}

/** What toDayRings reads besides the tasks. */
export interface DayRingInputs {
  periodKey: string;
  /** A past day's daily habit tasks that expired undone, by "YYYY-MM-DD" */
  expiredDailyCountByDate: Record<string, number>;
  now: Date;
}

const DAYS_IN_WEEK = 7;

const emptyCounts = (): KindCounts => ({
  [TaskKind.HABIT]: 0,
  [TaskKind.PROJECT]: 0,
  [TaskKind.ONE_OFF]: 0,
});

const sumCounts = (counts: KindCounts): number =>
  RING_KIND_ORDER.reduce((sum, kind) => sum + counts[kind], 0);

/** The week's seven days as "YYYY-MM-DD", Monday first. */
export function getWeekDates(periodKey: string): string[] {
  const monday = getMondayFromPeriodKey(periodKey);
  return Array.from({length: DAYS_IN_WEEK}, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return formatISODate(day);
  });
}

// ─── Rings ─────────────────────────────────────────────────────────────────

/**
 * The week's rings, Monday to Sunday. Every day counts as done the tasks
 * finished on it. Today plans what it has done and every card in Todo; a
 * past day plans what it did and its daily habit tasks that expired undone;
 * a day after today plans nothing yet. Pure, so the board re-runs it on
 * every optimistic move.
 */
export function toDayRings(
  tasks: TaskItem[],
  {periodKey, expiredDailyCountByDate, now}: DayRingInputs,
): DayRing[] {
  const today = formatKanbanISODate(now);
  const doneByDate = new Map<string, KindCounts>();
  const todoCounts = emptyCounts();

  for (const task of tasks) {
    const kind = getTaskKind(task.type);
    if (task.status === TaskStatus.TODO) todoCounts[kind] += 1;
    if (task.status !== TaskStatus.DONE || !task.doneAt) continue;
    const date = formatKanbanISODate(new Date(task.doneAt));
    const counts = doneByDate.get(date) ?? emptyCounts();
    counts[kind] += 1;
    doneByDate.set(date, counts);
  }

  return getWeekDates(periodKey).map((date, dayIndex) => {
    const state =
      date === today
        ? DayState.TODAY
        : date < today
          ? DayState.PAST
          : DayState.FUTURE;
    const done = doneByDate.get(date) ?? emptyCounts();
    const planned = toPlannedCounts(state, done, {
      todoCounts,
      expiredDailyCount: expiredDailyCountByDate[date] ?? 0,
    });
    const doneCount = sumCounts(done);
    const plannedCount = sumCounts(planned);
    return {
      date,
      dayIndex,
      state,
      done,
      planned,
      doneCount,
      plannedCount,
      isClosed: plannedCount > 0 && doneCount === plannedCount,
    };
  });
}

function toPlannedCounts(
  state: DayState,
  done: KindCounts,
  {
    todoCounts,
    expiredDailyCount,
  }: {todoCounts: KindCounts; expiredDailyCount: number},
): KindCounts {
  switch (state) {
    case DayState.TODAY:
      return {
        [TaskKind.HABIT]: done[TaskKind.HABIT] + todoCounts[TaskKind.HABIT],
        [TaskKind.PROJECT]:
          done[TaskKind.PROJECT] + todoCounts[TaskKind.PROJECT],
        [TaskKind.ONE_OFF]:
          done[TaskKind.ONE_OFF] + todoCounts[TaskKind.ONE_OFF],
      };
    case DayState.PAST:
      return {
        ...done,
        [TaskKind.HABIT]: done[TaskKind.HABIT] + expiredDailyCount,
      };
    case DayState.FUTURE:
      return emptyCounts();
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled day state: ${unhandled}`);
    }
  }
}

// ─── A day's list ──────────────────────────────────────────────────────────

/**
 * The tasks finished on a day ("YYYY-MM-DD", KANBAN_TZ): habits, then project
 * steps, then one-offs; within a kind, the earliest finished first.
 */
export function toDayListTasks(tasks: TaskItem[], date: string): TaskItem[] {
  const doneTime = ({doneAt}: TaskItem): number =>
    doneAt ? new Date(doneAt).getTime() : 0;
  return tasks
    .filter(
      task =>
        task.status === TaskStatus.DONE &&
        task.doneAt !== null &&
        formatKanbanISODate(new Date(task.doneAt)) === date,
    )
    .sort(
      (a, b) =>
        RING_KIND_ORDER.indexOf(getTaskKind(a.type)) -
          RING_KIND_ORDER.indexOf(getTaskKind(b.type)) ||
        doneTime(a) - doneTime(b) ||
        a.id.localeCompare(b.id),
    );
}

// ─── The mobile row ────────────────────────────────────────────────────────

/** The mobile row's cell sizes (RING-1), in px. */
export const MOBILE_ROW_LAYOUT = {todayMinWidth: 132, dayMinWidth: 54, gap: 4};

/**
 * How many days besides today fit in a mobile row `rowWidth` px wide (its
 * content box): today's cell at its minimum, each other cell at its
 * minimum, with a gap before each.
 */
export function countOtherDayCells(rowWidth: number): number {
  const {todayMinWidth, dayMinWidth, gap} = MOBILE_ROW_LAYOUT;
  const fits = Math.floor((rowWidth - todayMinWidth) / (dayMinWidth + gap));
  return Math.min(DAYS_IN_WEEK - 1, Math.max(0, fits));
}

/**
 * The days a mobile row shows, as the first and last day's index: today and
 * as many days before it as fit, with the days after today filling the rest
 * early in the week.
 */
export function getMobileDayRange(
  todayIndex: number,
  otherCount: number,
): {first: number; last: number} {
  const first = Math.max(0, todayIndex - otherCount);
  return {first, last: Math.min(DAYS_IN_WEEK - 1, first + otherCount)};
}
