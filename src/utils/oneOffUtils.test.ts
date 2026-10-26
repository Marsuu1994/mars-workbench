import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

/** Wednesday of WEEK_KEY, as getTodayDate returns it: local midnight. */
const WEDNESDAY = new Date(2026, 9, 14);

describe('toPrioritiesPageProps', () => {
  const tasks = [buildTask({id: 'a'})];

  it("shows the active plan's week", () => {
    const activePlan = {id: 'plan', periodKey: '2026-W41'};
    expect(toPrioritiesPageProps({tasks, activePlan}, WEDNESDAY)).toEqual({
      periodKey: '2026-W41',
      tasks,
      activePlan,
    });
  });

  it("falls back to today's ISO week without a plan", () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, WEDNESDAY)).toEqual(
      {periodKey: WEEK_KEY, tasks, activePlan: null},
    );
  });
});

describe('groupTasksByQuadrant', () => {
  it('groups each quadrant in the order given, null into Schedule', () => {
    const doFirst = buildTask({id: 'a', quadrant: PriorityQuadrant.DO_FIRST});
    const schedule = buildTask({id: 'b', quadrant: PriorityQuadrant.SCHEDULE});
    const unsorted = buildTask({id: 'c', quadrant: null});
    const doFirstToo = buildTask({
      id: 'd',
      quadrant: PriorityQuadrant.DO_FIRST,
    });

    expect(
      groupTasksByQuadrant([doFirst, schedule, unsorted, doFirstToo]),
    ).toEqual({
      [PriorityQuadrant.DO_FIRST]: [doFirst, doFirstToo],
      [PriorityQuadrant.SCHEDULE]: [schedule, unsorted],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [],
    });
  });
});

describe('isTrackedTask', () => {
  it('is tracked only on the active plan', () => {
    expect(isTrackedTask({planId: 'plan'}, 'plan')).toBe(true);
    expect(isTrackedTask({planId: 'last-week'}, 'plan')).toBe(false);
    expect(isTrackedTask({planId: null}, 'plan')).toBe(false);
  });

  it('is never tracked without an active plan', () => {
    expect(isTrackedTask({planId: null}, null)).toBe(false);
    expect(isTrackedTask({planId: 'plan'}, null)).toBe(false);
  });
});
