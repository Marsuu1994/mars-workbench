import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {toBoardCards} from './boardCardUtils';
import {PlanMode, TaskStatus, TaskType} from './enums';
import {TaskKind} from './taskUtils';

const plan = {
  periodKey: WEEK_KEY,
  mode: PlanMode.NORMAL,
  planTemplates: [{templateId: 'review', type: TaskType.WEEKLY, frequency: 1}],
};

const course = {
  id: 'course',
  title: 'Spanish A2 course',
  steps: [
    {id: 'unit-1', status: TaskStatus.DONE, instanceIndex: 1},
    {id: 'unit-2', status: TaskStatus.TODO, instanceIndex: 2},
    {id: 'unit-3', status: TaskStatus.BACKLOG, instanceIndex: 3},
  ],
};

const tasks = [
  buildTask({
    id: 'review',
    templateId: 'review',
    type: TaskType.WEEKLY,
    status: TaskStatus.TODO,
  }),
  // Dragged to Done on the board; the lookup still says TODO
  buildTask({
    id: 'unit-2',
    projectId: 'course',
    type: TaskType.PROJECT,
    instanceIndex: 2,
    status: TaskStatus.DONE,
  }),
  buildTask({
    id: 'unit-3',
    projectId: 'course',
    type: TaskType.PROJECT,
    instanceIndex: 3,
  }),
  buildTask({
    id: 'orphan-step',
    projectId: 'gone',
    type: TaskType.PROJECT,
    status: TaskStatus.TODO,
  }),
  buildTask({id: 'passport', status: TaskStatus.DONE}),
  buildTask({id: 'old-run', status: TaskStatus.EXPIRED}),
];

describe('toBoardCards', () => {
  const cards = toBoardCards(tasks, {plan, projects: [course]});
  const idsOf = (status: keyof typeof cards) =>
    cards[status].map(card => card.task.id);

  it('groups cards by status and skips EXPIRED', () => {
    expect(idsOf(TaskStatus.BACKLOG)).toEqual(['unit-3']);
    expect(idsOf(TaskStatus.TODO)).toEqual(['orphan-step', 'review']);
    expect(idsOf(TaskStatus.DONE)).toEqual(['passport', 'unit-2']);
  });

  it('gives a habit card its plan line and its own dot', () => {
    const [, reviewCard] = cards[TaskStatus.TODO];
    expect(reviewCard).toMatchObject({
      kind: TaskKind.HABIT,
      habitWeek: {target: 1, done: 0},
      currentSlot: 0,
    });
  });

  it("draws a step's path from the board's latest statuses", () => {
    const unitTwoCard = cards[TaskStatus.DONE].find(
      card => card.task.id === 'unit-2',
    );
    expect(unitTwoCard).toEqual({
      kind: TaskKind.PROJECT,
      task: tasks[1],
      step: {
        projectTitle: 'Spanish A2 course',
        number: 2,
        count: 3,
        path: [true, true, false],
        currentSegment: 1,
      },
    });
  });

  it('leaves a step without context when its project is not in the lookup', () => {
    const [orphanCard] = cards[TaskStatus.TODO];
    expect(orphanCard).toEqual({
      kind: TaskKind.PROJECT,
      task: tasks[3],
      step: undefined,
    });
  });

  it('gives a one-off card nothing but the task', () => {
    expect(cards[TaskStatus.DONE][0]).toEqual({
      kind: TaskKind.ONE_OFF,
      task: tasks[4],
    });
  });
});
