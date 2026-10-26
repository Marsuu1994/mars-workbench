import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

describe('groupTasksByQuadrant', () => {
  it('fills each quadrant in the order given, a null quadrant in Schedule', () => {
    const urgent = buildTask({
      id: 'urgent',
      quadrant: PriorityQuadrant.DO_FIRST,
    });
    const later = buildTask({id: 'later', quadrant: PriorityQuadrant.SCHEDULE});
    const legacy = buildTask({id: 'legacy', quadrant: null});
    const maybe = buildTask({
      id: 'maybe',
      quadrant: PriorityQuadrant.MAYBE_LATER,
    });

    expect(groupTasksByQuadrant([urgent, later, legacy, maybe])).toEqual({
      [PriorityQuadrant.DO_FIRST]: [urgent],
      [PriorityQuadrant.SCHEDULE]: [later, legacy],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [maybe],
    });
  });
});

describe('isTrackedTask', () => {
  it.each([
    ['on the active plan', 'plan-1', 'plan-1', true],
    ['on another plan', 'plan-0', 'plan-1', false],
    ['on no plan', null, 'plan-1', false],
    ['with no active plan', null, null, false],
  ])('a one-off %s is tracked: %s', (_, planId, activePlanId, isTracked) => {
    expect(isTrackedTask({planId}, activePlanId)).toBe(isTracked);
  });
});

describe('toPrioritiesPageProps', () => {
  const tasks = [buildTask({id: 'task'})];

  it("shows the active plan's week", () => {
    const activePlan = {id: 'plan-1', periodKey: '2026-W41'};
    expect(
      toPrioritiesPageProps({tasks, activePlan}, new Date(2026, 9, 19)),
    ).toEqual({tasks, activePlan, periodKey: '2026-W41'});
  });

  it("falls back to today's ISO week without a plan", () => {
    expect(
      toPrioritiesPageProps({tasks, activePlan: null}, new Date(2026, 9, 19)),
    ).toEqual({tasks, activePlan: null, periodKey: '2026-W43'});
  });
});
