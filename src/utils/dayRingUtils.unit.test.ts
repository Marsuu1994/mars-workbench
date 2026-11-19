// Spec: design/specs/board.md
import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {MOMENTS, WEEK_KEY} from '../../test/time';
import {
  countOtherDayCells,
  DayState,
  getMobileDayRange,
  getWeekDates,
  toDayListTasks,
  toDayRings,
} from './dayRingUtils';
import {TaskStatus, TaskType} from './enums';
import {TaskKind} from './taskUtils';

const WEDNESDAY = new Date(MOMENTS.WEDNESDAY_NOON);

const habitDone = (id: string, doneAt: string) =>
  buildTask({
    id,
    type: TaskType.DAILY,
    templateId: 'run',
    status: TaskStatus.DONE,
    doneAt: new Date(doneAt),
  });
const stepDone = (id: string, doneAt: string) =>
  buildTask({
    id,
    type: TaskType.PROJECT,
    projectId: 'course',
    status: TaskStatus.DONE,
    doneAt: new Date(doneAt),
  });
const oneOffDone = (id: string, doneAt: string) =>
  buildTask({id, status: TaskStatus.DONE, doneAt: new Date(doneAt)});

describe('toDayRings', () => {
  it('RING-2 counts done by the day each task was finished, in KANBAN_TZ', () => {
    const tasks = [
      habitDone('mon-run', '2026-10-12T16:00:00Z'),
      // Tuesday evening in Los Angeles, already Wednesday in UTC
      oneOffDone('tue-late', '2026-10-14T05:30:00Z'),
      stepDone('wed-step', MOMENTS.WEDNESDAY_NOON),
    ];

    const rings = toDayRings(tasks, {
      periodKey: WEEK_KEY,
      expiredDailyCountByDate: {},
      now: WEDNESDAY,
    });

    expect(rings.map(({doneCount}) => doneCount)).toEqual([
      1, 1, 1, 0, 0, 0, 0,
    ]);
    expect(rings[1].done[TaskKind.ONE_OFF]).toBe(1);
    expect(rings[2].done[TaskKind.PROJECT]).toBe(1);
  });

  it("RING-2 plans today's done tasks and every Todo card, not the backlog", () => {
    const tasks = [
      habitDone('wed-run', MOMENTS.WEDNESDAY_NOON),
      buildTask({
        id: 'todo-step',
        type: TaskType.PROJECT,
        status: TaskStatus.TODO,
      }),
      buildTask({id: 'todo-one-off', status: TaskStatus.TODO}),
      buildTask({
        id: 'waiting',
        type: TaskType.WEEKLY,
        status: TaskStatus.BACKLOG,
      }),
    ];

    const today = toDayRings(tasks, {
      periodKey: WEEK_KEY,
      expiredDailyCountByDate: {},
      now: WEDNESDAY,
    })[2];

    expect(today.state).toBe(DayState.TODAY);
    expect(today.planned).toEqual({
      [TaskKind.HABIT]: 1,
      [TaskKind.PROJECT]: 1,
      [TaskKind.ONE_OFF]: 1,
    });
    expect(today.doneCount).toBe(1);
    expect(today.plannedCount).toBe(3);
    expect(today.isClosed).toBe(false);
  });

  it("RING-2 ST-4 plans a past day's done tasks and its expired daily habit tasks", () => {
    const tasks = [habitDone('tue-run', '2026-10-13T16:00:00Z')];

    const rings = toDayRings(tasks, {
      periodKey: WEEK_KEY,
      expiredDailyCountByDate: {'2026-10-13': 1, '2026-10-12': 2},
      now: WEDNESDAY,
    });

    expect(rings[0]).toMatchObject({
      state: DayState.PAST,
      doneCount: 0,
      plannedCount: 2,
    });
    expect(rings[1]).toMatchObject({
      doneCount: 1,
      plannedCount: 2,
      isClosed: false,
    });
    expect(rings[1].planned[TaskKind.HABIT]).toBe(2);
  });

  it('RING-2 RING-7 plans nothing for a day after today', () => {
    const rings = toDayRings(
      [buildTask({id: 'todo', status: TaskStatus.TODO})],
      {periodKey: WEEK_KEY, expiredDailyCountByDate: {}, now: WEDNESDAY},
    );

    expect(rings.slice(3).map(({state}) => state)).toEqual(
      Array(4).fill(DayState.FUTURE),
    );
    expect(rings.slice(3).map(({plannedCount}) => plannedCount)).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('RING-3 closes a day only when something is planned and all of it is done', () => {
    const rings = toDayRings([habitDone('mon-run', '2026-10-12T16:00:00Z')], {
      periodKey: WEEK_KEY,
      expiredDailyCountByDate: {},
      now: WEDNESDAY,
    });

    expect(rings[0].isClosed).toBe(true);
    // Nothing planned today: an empty track, not a closed ring
    expect(rings[2]).toMatchObject({plannedCount: 0, isClosed: false});
  });

  it("RING-1 lays out the plan's week Monday to Sunday", () => {
    expect(getWeekDates(WEEK_KEY)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });
});

describe('toDayListTasks', () => {
  it("DAY-3 lists a day's finished tasks: habits, steps, one-offs, the earliest first", () => {
    const tasks = [
      oneOffDone('one-off', '2026-10-12T15:00:00Z'),
      stepDone('step', '2026-10-12T16:00:00Z'),
      habitDone('run-late', '2026-10-12T20:00:00Z'),
      habitDone('run-early', '2026-10-12T17:00:00Z'),
      habitDone('tuesday', '2026-10-13T17:00:00Z'),
      buildTask({id: 'todo', status: TaskStatus.TODO}),
    ];

    expect(toDayListTasks(tasks, '2026-10-12').map(({id}) => id)).toEqual([
      'run-early',
      'run-late',
      'step',
      'one-off',
    ]);
  });
});

describe('the mobile row', () => {
  it('RING-1 fits 2, 3, 3 and 4 other days at 320, 375, 390 and 430 px', () => {
    // The row's content box: the screen less 20 px on each side
    expect(
      [320, 375, 390, 430].map(width => countOtherDayCells(width - 40)),
    ).toEqual([2, 3, 3, 4]);
  });

  it('RING-1 shows the days before today, the days after filling in early in the week', () => {
    expect(getMobileDayRange(3, 3)).toEqual({first: 0, last: 3});
    expect(getMobileDayRange(5, 3)).toEqual({first: 2, last: 5});
    expect(getMobileDayRange(0, 3)).toEqual({first: 0, last: 3});
    expect(getMobileDayRange(1, 4)).toEqual({first: 0, last: 4});
  });
});
