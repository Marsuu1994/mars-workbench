import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

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

describe('groupTasksByQuadrant', () => {
  it('fills every quadrant, keeping the order given', () => {
    const tasks = [
      buildTask({id: 'first', quadrant: PriorityQuadrant.DO_FIRST}),
      buildTask({id: 'later', quadrant: PriorityQuadrant.MAYBE_LATER}),
      buildTask({id: 'second', quadrant: PriorityQuadrant.DO_FIRST}),
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
      [PriorityQuadrant.DO_FIRST]: ['first', 'second'],
      [PriorityQuadrant.SCHEDULE]: [],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: ['later'],
    });
  });

  it('puts a task without a quadrant into Schedule', () => {
    const groups = groupTasksByQuadrant([
      buildTask({id: 'unsorted', quadrant: null}),
    ]);
    expect(groups[PriorityQuadrant.SCHEDULE].map(({id}) => id)).toEqual([
      'unsorted',
    ]);
  });
});

describe('toPrioritiesPageProps', () => {
  // getTodayDate's shape: local midnight of the Los Angeles day
  const sunday = new Date(2026, 9, 18);
  const tasks = [buildTask({id: 'one-off'})];

  it("heads the page with the active plan's week", () => {
    const activePlan = {id: 'plan', periodKey: '2026-W41'};
    expect(toPrioritiesPageProps({tasks, activePlan}, sunday)).toEqual({
      tasks,
      activePlan,
      periodKey: '2026-W41',
    });
  });

  it("falls back to today's week without an active plan", () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, sunday)).toEqual({
      tasks,
      activePlan: null,
      periodKey: '2026-W42',
    });
  });
});
