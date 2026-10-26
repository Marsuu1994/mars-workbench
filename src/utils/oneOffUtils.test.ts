import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

describe('isTrackedTask', () => {
  it('is true for a one-off on the active plan', () => {
    expect(isTrackedTask(buildTask({id: 'a', planId: 'plan'}), 'plan')).toBe(
      true,
    );
  });

  it('is false for a one-off on another plan or on none', () => {
    expect(isTrackedTask(buildTask({id: 'a', planId: 'old'}), 'plan')).toBe(
      false,
    );
    expect(isTrackedTask(buildTask({id: 'a', planId: null}), 'plan')).toBe(
      false,
    );
  });

  it('is false without an active plan, even for an unplanned one-off', () => {
    expect(isTrackedTask(buildTask({id: 'a', planId: null}), null)).toBe(false);
  });
});

describe('groupTasksByQuadrant', () => {
  it('puts each task in its quadrant, keeping the order given', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: PriorityQuadrant.DO_FIRST}),
      buildTask({id: 'b', quadrant: PriorityQuadrant.MAYBE_LATER}),
      buildTask({id: 'c', quadrant: PriorityQuadrant.DO_FIRST}),
    ];

    const tasksByQuadrant = groupTasksByQuadrant(tasks);

    expect(
      tasksByQuadrant[PriorityQuadrant.DO_FIRST].map(({id}) => id),
    ).toEqual(['a', 'c']);
    expect(
      tasksByQuadrant[PriorityQuadrant.MAYBE_LATER].map(({id}) => id),
    ).toEqual(['b']);
    expect(tasksByQuadrant[PriorityQuadrant.SQUEEZE_IN]).toEqual([]);
  });

  it('counts a task without a quadrant as Schedule', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: PriorityQuadrant.SCHEDULE}),
      buildTask({id: 'b', quadrant: null}),
    ];

    expect(
      groupTasksByQuadrant(tasks)[PriorityQuadrant.SCHEDULE].map(({id}) => id),
    ).toEqual(['a', 'b']);
  });

  it('gives every quadrant a list when there are no tasks', () => {
    expect(groupTasksByQuadrant([])).toEqual({
      [PriorityQuadrant.DO_FIRST]: [],
      [PriorityQuadrant.SCHEDULE]: [],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [],
    });
  });
});

describe('toPrioritiesPageProps', () => {
  const tasks = [buildTask({id: 'a'})];
  // A Wednesday in ISO week 43
  const today = new Date(2026, 9, 21);

  it("shows the active plan's week", () => {
    const activePlan = {id: 'plan', periodKey: '2026-W42'};

    expect(toPrioritiesPageProps({tasks, activePlan}, today)).toEqual({
      tasks,
      activePlan,
      periodKey: '2026-W42',
    });
  });

  it("falls back to today's ISO week without an active plan", () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, today)).toEqual({
      tasks,
      activePlan: null,
      periodKey: '2026-W43',
    });
  });
});
