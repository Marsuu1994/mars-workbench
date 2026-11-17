// Spec: design/flows/board.md
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
    doneAt: new Date('2026-10-12T18:00:00Z'),
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
  buildTask({
    id: 'passport',
    status: TaskStatus.DONE,
    doneAt: new Date('2026-10-12T17:00:00Z'),
  }),
  buildTask({id: 'old-run', status: TaskStatus.EXPIRED}),
];

describe('toBoardCards', () => {
  const cards = toBoardCards(tasks, {plan, projects: [course]});
  const idsOf = (status: keyof typeof cards) =>
    cards[status].map(card => card.task.id);
  const findCard = (status: keyof typeof cards, id: string) =>
    cards[status].find(card => card.task.id === id);

  it('COL-1 BL-1 groups cards by status and skips EXPIRED', () => {
    expect(idsOf(TaskStatus.BACKLOG)).toEqual(['unit-3']);
    expect(idsOf(TaskStatus.TODO)).toEqual(['review', 'orphan-step']);
  });

  it('COL-3 sorts Done by when each task was done', () => {
    // unit-2 was done after the passport, though a step sorts after a one-off
    expect(idsOf(TaskStatus.DONE)).toEqual(['unit-2', 'passport']);
  });

  it('CARD-3 gives a habit card its plan line and its own dot', () => {
    expect(findCard(TaskStatus.TODO, 'review')).toMatchObject({
      kind: TaskKind.HABIT,
      habitWeek: {target: 1, done: 0},
      currentSlot: 0,
    });
  });

  it("CARD-4 draws a step's path from the board's latest statuses", () => {
    expect(findCard(TaskStatus.DONE, 'unit-2')).toEqual({
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

  it('CARD-4 leaves a step without context when its project is not in the lookup', () => {
    expect(findCard(TaskStatus.TODO, 'orphan-step')).toEqual({
      kind: TaskKind.PROJECT,
      task: tasks[3],
      step: undefined,
    });
  });

  it('CARD-5 gives a one-off card nothing but the task', () => {
    expect(findCard(TaskStatus.DONE, 'passport')).toEqual({
      kind: TaskKind.ONE_OFF,
      task: tasks[4],
    });
  });
});
