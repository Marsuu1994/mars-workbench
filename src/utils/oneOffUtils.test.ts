import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

describe('groupTasksByQuadrant', () => {
  it('fills every quadrant in order, a missing quadrant going to Schedule', () => {
    const tasks = [
      buildTask({id: 'urgent', quadrant: PriorityQuadrant.DO_FIRST}),
      buildTask({id: 'unsorted', quadrant: null}),
      buildTask({id: 'planned', quadrant: PriorityQuadrant.SCHEDULE}),
      buildTask({id: 'quick', quadrant: PriorityQuadrant.SQUEEZE_IN}),
    ];
    const groups = groupTasksByQuadrant(tasks);
    expect(
      Object.fromEntries(
        Object.entries(groups).map(([quadrant, quadrantTasks]) => [
          quadrant,
          quadrantTasks.map(({id}) => id),
        ]),
      ),
    ).toEqual({
      [PriorityQuadrant.DO_FIRST]: ['urgent'],
      [PriorityQuadrant.SCHEDULE]: ['unsorted', 'planned'],
      [PriorityQuadrant.SQUEEZE_IN]: ['quick'],
      [PriorityQuadrant.MAYBE_LATER]: [],
    });
  });
});

describe('isTrackedTask', () => {
  it.each([
    ['on the active plan is tracked', 'plan-w42', 'plan-w42', true],
    ['on another plan is not', 'plan-w41', 'plan-w42', false],
    ['on no plan is not', null, 'plan-w42', false],
    ['with no active plan is not', null, null, false],
  ] as const)('a one-off %s', (_label, planId, activePlanId, tracked) => {
    expect(isTrackedTask({planId}, activePlanId)).toBe(tracked);
  });
});

describe('toPrioritiesPageProps', () => {
  // getTodayDate's shape: local midnight of the Los Angeles day
  const wednesday = new Date(2026, 9, 14);
  const tasks = [buildTask({id: 'dentist'})];

  it("shows the active plan's week", () => {
    const activePlan = {id: 'plan-w41', periodKey: '2026-W41'};
    expect(toPrioritiesPageProps({tasks, activePlan}, wednesday)).toEqual({
      periodKey: '2026-W41',
      tasks,
      activePlan,
    });
  });

  it("falls back to today's week without a plan", () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, wednesday)).toEqual(
      {periodKey: WEEK_KEY, tasks, activePlan: null},
    );
  });
});
