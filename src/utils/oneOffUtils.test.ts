import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {PriorityQuadrant} from './enums';
import {
  groupTasksByQuadrant,
  isTrackedTask,
  toPrioritiesPageProps,
} from './oneOffUtils';

// A calendar day, as getTodayDate returns it: local midnight of Wednesday
const WEDNESDAY = new Date(2026, 9, 14);

describe('toPrioritiesPageProps', () => {
  const tasks = [buildTask({id: 'call-dentist'})];

  it("shows the active plan's week and tracks into it", () => {
    expect(
      toPrioritiesPageProps(
        {tasks, activePlan: {id: 'plan', periodKey: '2026-W41'}},
        WEDNESDAY,
      ),
    ).toEqual({periodKey: '2026-W41', tasks, activePlanId: 'plan'});
  });

  it("falls back to today's week without an active plan", () => {
    expect(toPrioritiesPageProps({tasks, activePlan: null}, WEDNESDAY)).toEqual(
      {periodKey: WEEK_KEY, tasks, activePlanId: null},
    );
  });
});

describe('groupTasksByQuadrant', () => {
  it('fills every cell in the order given, a missing quadrant in Schedule', () => {
    const grouped = groupTasksByQuadrant([
      buildTask({id: 'first', quadrant: PriorityQuadrant.DO_FIRST}),
      buildTask({id: 'unsorted', quadrant: null}),
      buildTask({id: 'second', quadrant: PriorityQuadrant.DO_FIRST}),
      buildTask({id: 'scheduled', quadrant: PriorityQuadrant.SCHEDULE}),
    ]);
    expect(
      Object.fromEntries(
        Object.entries(grouped).map(([quadrant, tasks]) => [
          quadrant,
          tasks.map(({id}) => id),
        ]),
      ),
    ).toEqual({
      [PriorityQuadrant.DO_FIRST]: ['first', 'second'],
      [PriorityQuadrant.SCHEDULE]: ['unsorted', 'scheduled'],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [],
    });
  });
});

describe('isTrackedTask', () => {
  it.each([
    ['on the active plan', 'plan', 'plan', true],
    ['on no plan', null, 'plan', false],
    ['on another plan', 'last-week', 'plan', false],
    ['without an active plan', null, null, false],
  ])('a task %s', (_label, planId, activePlanId, isTracked) => {
    expect(isTrackedTask({planId}, activePlanId)).toBe(isTracked);
  });
});
