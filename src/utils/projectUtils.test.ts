import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {TaskSize, TaskStatus, TaskType} from './enums';
import {
  ProjectStepState,
  applyStepPatch,
  countDoneSteps,
  getNextStepNumber,
  getStepState,
  groupStepsByProjectId,
  hasNoStepConflicts,
  isAllStepsDone,
  numberStepPath,
  summarizeProject,
  toNullableText,
  toProjectContext,
  toProjectStepRow,
} from './projectUtils';

const NO_CHANGES = {
  addSteps: [],
  moveSteps: [],
  updateStepIds: [],
  removeStepIds: [],
};

const path = ['a', 'b', 'c', 'd'].map(id => ({id, status: TaskStatus.BACKLOG}));

const step = (id: string, instanceIndex: number, overrides = {}) =>
  buildTask({
    id,
    type: TaskType.PROJECT,
    projectId: 'course',
    planId: null,
    instanceIndex,
    ...overrides,
  });

describe('applyStepPatch', () => {
  it('removes, then moves in order, then places new steps', () => {
    const {path: patched, conflicts} = applyStepPatch(path, {
      ...NO_CHANGES,
      removeStepIds: ['b'],
      moveSteps: [{stepId: 'd', beforeStepId: 'a'}],
      addSteps: [{beforeStepId: 'c'}, {}],
    });
    expect(patched).toEqual([
      {stepId: 'd'},
      {stepId: 'a'},
      {addedStepIndex: 0},
      {stepId: 'c'},
      {addedStepIndex: 1},
    ]);
    expect(hasNoStepConflicts(conflicts)).toBe(true);
  });

  it('moves a step to the end without a position', () => {
    const {path: patched} = applyStepPatch(path, {
      ...NO_CHANGES,
      moveSteps: [{stepId: 'a'}],
    });
    expect(patched.map(entry => 'stepId' in entry && entry.stepId)).toEqual([
      'b',
      'c',
      'd',
      'a',
    ]);
  });

  it('reports every id it cannot apply, by reason', () => {
    const steps = [...path, {id: 'done', status: TaskStatus.DONE}];
    const {conflicts} = applyStepPatch(steps, {
      addSteps: [{beforeStepId: 'b'}],
      moveSteps: [
        {stepId: 'c', beforeStepId: 'c'},
        {stepId: 'a', beforeStepId: 'done'},
      ],
      updateStepIds: ['ghost', 'd', 'd'],
      removeStepIds: ['b', 'done'],
    });
    expect(conflicts).toEqual({
      notInProject: ['ghost'],
      done: ['done'],
      removedAndChanged: [],
      repeated: ['d'],
      // b and done are removed but used as positions; c goes before itself
      invalidPositions: ['b', 'done', 'c'],
    });
    expect(hasNoStepConflicts(conflicts)).toBe(false);
  });

  it('rejects a step removed and also moved or edited', () => {
    const {conflicts} = applyStepPatch(path, {
      ...NO_CHANGES,
      updateStepIds: ['a'],
      moveSteps: [{stepId: 'b'}],
      removeStepIds: ['a', 'b'],
    });
    expect(conflicts.removedAndChanged).toEqual(['a', 'b']);
  });
});

describe('numbering', () => {
  it('numbers a patched path from 1, new steps included', () => {
    expect(
      numberStepPath([{stepId: 'b'}, {addedStepIndex: 0}, {stepId: 'a'}]),
    ).toEqual({
      numberByStepId: new Map([
        ['b', 1],
        ['a', 3],
      ]),
      addedStepNumbers: [2],
    });
  });

  it('gives a new step the number after the last', () => {
    expect(getNextStepNumber([{instanceIndex: 3}, {instanceIndex: 1}])).toBe(4);
    expect(getNextStepNumber([])).toBe(1);
  });

  it('builds a new step row with points from its size', () => {
    expect(
      toProjectStepRow(
        {title: 'Unit 1', description: '', size: TaskSize.LARGE},
        4,
      ),
    ).toEqual({
      title: 'Unit 1',
      description: undefined,
      size: TaskSize.LARGE,
      points: 5,
      instanceIndex: 4,
    });
  });

  it('clears optional text with an empty string, keeps it when omitted', () => {
    expect(toNullableText('')).toBeNull();
    expect(toNullableText(undefined)).toBeUndefined();
    expect(toNullableText('Notes')).toBe('Notes');
  });
});

describe('step state and progress', () => {
  it.each([
    [{status: TaskStatus.DONE, planId: 'active'}, ProjectStepState.DONE],
    [{status: TaskStatus.TODO, planId: 'active'}, ProjectStepState.THIS_WEEK],
    [{status: TaskStatus.BACKLOG, planId: 'last'}, ProjectStepState.LAST_WEEK],
    [{status: TaskStatus.BACKLOG, planId: null}, ProjectStepState.UPCOMING],
  ])('%o is %s', (stepFields, state) => {
    expect(getStepState(stepFields, 'active')).toBe(state);
  });

  it('a step on a plan is LAST_WEEK when there is no active plan', () => {
    expect(getStepState({status: TaskStatus.TODO, planId: 'last'}, null)).toBe(
      ProjectStepState.LAST_WEEK,
    );
  });

  it('counts done steps; all done needs at least one step', () => {
    const doneStep = {status: TaskStatus.DONE};
    expect(countDoneSteps([doneStep, {status: TaskStatus.TODO}])).toBe(1);
    expect(isAllStepsDone([doneStep, doneStep])).toBe(true);
    expect(isAllStepsDone([])).toBe(false);
  });

  it('summarizes a project for its list card', () => {
    const steps = [
      step('one', 1, {status: TaskStatus.DONE}),
      step('two', 2, {planId: 'active', status: TaskStatus.TODO}),
      step('three', 3),
    ];
    expect(summarizeProject(steps, 'active')).toEqual({
      doneCount: 1,
      stepCount: 3,
      nextStepTitle: 'two',
      isAllStepsDone: false,
      thisWeekCount: 1,
    });
  });

  it("groups each project's steps in step order", () => {
    const grouped = groupStepsByProjectId([
      step('three', 3),
      buildTask({id: 'one-off'}),
      step('one', 1),
      step('other', 1, {projectId: 'book'}),
    ]);
    expect(grouped.get('course')?.map(({id}) => id)).toEqual(['one', 'three']);
    expect([...grouped.keys()]).toEqual(['course', 'book']);
  });
});

describe('toProjectContext', () => {
  it('lists a project and its path as the planning tools see it', () => {
    const doneAt = new Date('2026-10-13T05:00:00Z');
    const context = toProjectContext(
      {
        id: 'course',
        title: 'Spanish A2 course',
        goal: null,
        isArchived: false,
        createdAt: doneAt,
        updatedAt: doneAt,
        steps: [
          step('one', 1, {status: TaskStatus.DONE, doneAt}),
          step('two', 2, {planId: 'active'}),
        ],
      },
      'active',
    );
    expect(context).toMatchObject({
      projectId: 'course',
      doneCount: 1,
      stepCount: 2,
      allStepsDone: false,
      steps: [
        // 05:00 UTC is still the evening before in Los Angeles
        {stepId: 'one', stepNumber: 1, state: 'DONE', doneOn: '2026-10-12'},
        {stepId: 'two', stepNumber: 2, state: 'THIS_WEEK', doneOn: null},
      ],
    });
  });
});
