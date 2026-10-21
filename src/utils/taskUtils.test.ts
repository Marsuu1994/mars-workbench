import {describe, expect, it} from 'vitest';
import {buildTask, dateColumn} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {PlanMode, TaskStatus, TaskType} from './enums';
import {
  TaskKind,
  computeHabitWeeks,
  getTaskKind,
  sortTasks,
  type BoardPlan,
} from './taskUtils';

describe('getTaskKind', () => {
  it.each([
    [TaskType.DAILY, TaskKind.HABIT],
    [TaskType.WEEKLY, TaskKind.HABIT],
    [TaskType.PROJECT, TaskKind.PROJECT],
    [TaskType.AD_HOC, TaskKind.ONE_OFF],
  ])('%s is a %s', (type, kind) => {
    expect(getTaskKind(type)).toBe(kind);
  });
});

describe('computeHabitWeeks', () => {
  const runOn = (id: string, isoDay: string, status: TaskStatus) =>
    buildTask({
      id,
      templateId: 'run',
      type: TaskType.DAILY,
      forDate: dateColumn(isoDay),
      status,
    });
  const review = (id: string, instanceIndex: number, status: TaskStatus) =>
    buildTask({
      id,
      templateId: 'review',
      type: TaskType.WEEKLY,
      periodKey: WEEK_KEY,
      instanceIndex,
      status,
    });
  const plan = (mode: PlanMode, reviewFrequency = 2): BoardPlan => ({
    periodKey: WEEK_KEY,
    mode,
    planTemplates: [
      {templateId: 'run', type: TaskType.DAILY, frequency: 1},
      {templateId: 'review', type: TaskType.WEEKLY, frequency: reviewFrequency},
    ],
  });
  const tasks = [
    runOn('run-mon', '2026-10-12', TaskStatus.DONE),
    runOn('run-tue', '2026-10-13', TaskStatus.EXPIRED),
    runOn('run-wed', '2026-10-14', TaskStatus.TODO),
    runOn('run-sat', '2026-10-17', TaskStatus.DONE),
    review('review-1', 0, TaskStatus.DONE),
    review('review-2', 1, TaskStatus.BACKLOG),
  ];

  it('gives a daily line a dot for every weekday of a NORMAL week', () => {
    const {habitWeekByTemplateId, slotByTaskId} = computeHabitWeeks(
      tasks,
      plan(PlanMode.NORMAL),
    );
    expect(habitWeekByTemplateId.get('run')).toEqual({
      type: TaskType.DAILY,
      frequency: 1,
      slots: [true, false, false, false, false],
      done: 1,
      target: 5,
    });
    expect(slotByTaskId.get('run-wed')).toBe(2);
    // Saturday isn't a generating day in NORMAL mode
    expect(slotByTaskId.has('run-sat')).toBe(false);
  });

  it('counts every day of an EXTREME week', () => {
    const {habitWeekByTemplateId, slotByTaskId} = computeHabitWeeks(
      tasks,
      plan(PlanMode.EXTREME),
    );
    expect(habitWeekByTemplateId.get('run')).toMatchObject({
      slots: [true, false, false, false, false, true, false],
      done: 2,
      target: 7,
    });
    expect(slotByTaskId.get('run-sat')).toBe(5);
  });

  it('gives a weekly line one dot per instance', () => {
    const {habitWeekByTemplateId, slotByTaskId} = computeHabitWeeks(
      tasks,
      plan(PlanMode.NORMAL),
    );
    expect(habitWeekByTemplateId.get('review')).toMatchObject({
      slots: [true, false],
      done: 1,
      target: 2,
    });
    expect(slotByTaskId.get('review-2')).toBe(1);
  });

  it('keeps a DONE instance past a frequency cut', () => {
    const cutTasks = [...tasks, review('review-3', 2, TaskStatus.DONE)];
    const {habitWeekByTemplateId} = computeHabitWeeks(
      cutTasks,
      plan(PlanMode.NORMAL, 1),
    );
    expect(habitWeekByTemplateId.get('review')).toMatchObject({
      slots: [true, false, true],
      target: 3,
    });
  });

  it('leaves a daily instance past the frequency without a dot', () => {
    const secondRun = buildTask({
      ...runOn('run-mon-2', '2026-10-12', TaskStatus.DONE),
      instanceIndex: 1,
    });
    const {slotByTaskId} = computeHabitWeeks(
      [...tasks, secondRun],
      plan(PlanMode.NORMAL),
    );
    expect(slotByTaskId.has('run-mon-2')).toBe(false);
  });

  it('gives a template with no instances an empty line', () => {
    const {habitWeekByTemplateId} = computeHabitWeeks(
      [],
      plan(PlanMode.NORMAL),
    );
    expect(habitWeekByTemplateId.get('review')).toMatchObject({
      slots: [false, false],
      done: 0,
    });
  });
});

describe('sortTasks', () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 12, 16, minute));

  it('puts DAILY first, keeps groups together and orders them by number', () => {
    const tasks = [
      buildTask({
        id: 'review-2',
        templateId: 'review',
        type: TaskType.WEEKLY,
        instanceIndex: 1,
        createdAt: at(3),
      }),
      buildTask({
        id: 'run',
        templateId: 'run',
        type: TaskType.DAILY,
        createdAt: at(5),
      }),
      buildTask({
        id: 'review-1',
        templateId: 'review',
        type: TaskType.WEEKLY,
        instanceIndex: 0,
        createdAt: at(4),
      }),
      buildTask({id: 'one-off', createdAt: at(1)}),
      buildTask({
        id: 'step-2',
        projectId: 'course',
        type: TaskType.PROJECT,
        instanceIndex: 2,
        createdAt: at(2),
      }),
      buildTask({
        id: 'step-1',
        projectId: 'course',
        type: TaskType.PROJECT,
        instanceIndex: 1,
        createdAt: at(6),
      }),
    ];
    expect(sortTasks(tasks).map(task => task.id)).toEqual([
      'run',
      'one-off',
      'step-1',
      'step-2',
      'review-1',
      'review-2',
    ]);
  });

  it('breaks ties by createdAt, then id', () => {
    const tasks = ['b', 'a', 'c'].map(id =>
      buildTask({id, createdAt: id === 'c' ? at(0) : at(1)}),
    );
    expect(sortTasks(tasks).map(task => task.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not reorder its input', () => {
    const tasks = [
      buildTask({id: 'late', createdAt: at(9)}),
      buildTask({id: 'early', createdAt: at(1)}),
    ];
    sortTasks(tasks);
    expect(tasks.map(task => task.id)).toEqual(['late', 'early']);
  });
});
