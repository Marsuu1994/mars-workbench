import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

const ACTIVE_PLAN = {id: 'plan-w42', periodKey: '2026-W42'};
/** Wednesday of 2026-W43, as the kanban day getTodayDate returns */
const TODAY = new Date(2026, 9, 21);

describe('toPrioritiesPageProps', () => {
  const tasks = [buildTask({id: 'dentist'})];

  it("shows the active plan's week and passes the matrix through", () => {
    expect(
      toPrioritiesPageProps({tasks, activePlan: ACTIVE_PLAN}, TODAY),
    ).toEqual({periodKey: '2026-W42', tasks, activePlan: ACTIVE_PLAN});
  });

  it('falls back to the current ISO week without a plan', () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, TODAY)).toEqual({
      periodKey: '2026-W43',
      tasks,
      activePlan: null,
    });
  });
});

describe('groupTasksByQuadrant', () => {
  it('groups by quadrant, keeping the order given', () => {
    const first = buildTask({id: 'a', quadrant: PriorityQuadrant.DO_FIRST});
    const second = buildTask({id: 'b', quadrant: PriorityQuadrant.SQUEEZE_IN});
    const third = buildTask({id: 'c', quadrant: PriorityQuadrant.DO_FIRST});

    expect(groupTasksByQuadrant([first, second, third])).toEqual({
      [PriorityQuadrant.DO_FIRST]: [first, third],
      [PriorityQuadrant.SCHEDULE]: [],
      [PriorityQuadrant.SQUEEZE_IN]: [second],
      [PriorityQuadrant.MAYBE_LATER]: [],
    });
  });

  it('puts a task without a quadrant into Schedule', () => {
    const scheduled = buildTask({id: 'a', quadrant: PriorityQuadrant.SCHEDULE});
    const unsorted = buildTask({id: 'b', quadrant: null});

    expect(
      groupTasksByQuadrant([scheduled, unsorted])[PriorityQuadrant.SCHEDULE],
    ).toEqual([scheduled, unsorted]);
  });
});

describe('isTrackedTask', () => {
  it("is tracked on the active plan's week", () => {
    expect(isTrackedTask({planId: ACTIVE_PLAN.id}, ACTIVE_PLAN.id)).toBe(true);
  });

  it('is not tracked on another plan or none', () => {
    expect(isTrackedTask({planId: 'plan-w41'}, ACTIVE_PLAN.id)).toBe(false);
    expect(isTrackedTask({planId: null}, ACTIVE_PLAN.id)).toBe(false);
  });

  it('is never tracked without an active plan', () => {
    expect(isTrackedTask({planId: null}, null)).toBe(false);
  });
});
