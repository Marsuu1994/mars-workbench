// Spec: design/specs/board.md
import {describe, expect, it} from 'vitest';
import {buildTask, dateColumn} from '../../test/buildTask';
import {WEEK_KEY} from '../../test/time';
import {
  BacklogSection,
  countBacklogTasks,
  toBacklogSections,
  type BacklogSections,
} from './backlogGroupUtils';
import {toBoardCards} from './boardCardUtils';
import {PlanMode, TaskStatus, TaskType} from './enums';
import type {TaskItem} from '@/lib/db/tasks';

/** The plan lists its habits by when each habit was created: read, then run. */
const plan = {
  periodKey: WEEK_KEY,
  mode: PlanMode.EXTREME,
  planTemplates: [
    {templateId: 'read', type: TaskType.WEEKLY, frequency: 3},
    {templateId: 'run', type: TaskType.DAILY, frequency: 2},
  ],
};

/** The lookup lists its projects by when each was created: course, then book. */
const projects = [
  {id: 'course', title: 'Spanish course', steps: []},
  {id: 'book', title: 'Book', steps: []},
];

const readCopy = (instanceIndex: number, createdAt?: Date) =>
  buildTask({
    id: `read-${instanceIndex}`,
    templateId: 'read',
    type: TaskType.WEEKLY,
    instanceIndex,
    ...(createdAt && {createdAt}),
  });
const runCopy = (day: string, instanceIndex: number) =>
  buildTask({
    id: `run-${day}-${instanceIndex}`,
    templateId: 'run',
    type: TaskType.DAILY,
    forDate: dateColumn(day),
    instanceIndex,
  });
const step = (projectId: string, instanceIndex: number) =>
  buildTask({
    id: `${projectId}-${instanceIndex}`,
    projectId,
    type: TaskType.PROJECT,
    instanceIndex,
  });

const sectionsOf = (tasks: TaskItem[]) =>
  toBacklogSections(toBoardCards(tasks, {plan, projects})[TaskStatus.BACKLOG], {
    plan,
    projects,
  });

/** Each group as its key, its next task's id and the ids behind it. */
const describeGroups = (sections: BacklogSections, section: BacklogSection) =>
  sections[section].map(({key, next, behind}) => ({
    key,
    next: next.task.id,
    behind: behind.map(card => card.task.id),
  }));

describe('toBacklogSections', () => {
  it("BL-9 groups one habit's tasks and one project's steps, each showing its lowest copy or step", () => {
    const sections = sectionsOf([
      step('course', 5),
      readCopy(2),
      step('course', 4),
      readCopy(1),
      runCopy('2026-10-13', 1),
      runCopy('2026-10-13', 0),
      step('book', 1),
    ]);

    expect(describeGroups(sections, BacklogSection.HABITS)).toEqual([
      {key: 'read', next: 'read-1', behind: ['read-2']},
      {key: 'run', next: 'run-2026-10-13-0', behind: ['run-2026-10-13-1']},
    ]);
    expect(describeGroups(sections, BacklogSection.PROJECTS)).toEqual([
      {key: 'course', next: 'course-4', behind: ['course-5']},
      {key: 'book', next: 'book-1', behind: []},
    ]);
  });

  it('BL-9 leaves a section empty when no group is in it, and never groups a one-off', () => {
    const sections = sectionsOf([
      readCopy(0),
      buildTask({id: 'stray-one-off'}),
    ]);

    expect(describeGroups(sections, BacklogSection.HABITS)).toEqual([
      {key: 'read', next: 'read-0', behind: []},
    ]);
    expect(sections[BacklogSection.PROJECTS]).toEqual([]);
  });

  it('BL-9 puts the next copy first even when a later copy was made earlier', () => {
    const sections = sectionsOf([
      readCopy(2, new Date('2026-10-11T00:00:00Z')),
      readCopy(1, new Date('2026-10-12T00:00:00Z')),
    ]);

    expect(describeGroups(sections, BacklogSection.HABITS)).toEqual([
      {key: 'read', next: 'read-1', behind: ['read-2']},
    ]);
  });

  it('BL-16 sorts the groups by when their habit or project was created, whatever their tasks', () => {
    // The tasks list run and book first, and run's task was made earlier
    const sections = sectionsOf([
      runCopy('2026-10-13', 0),
      step('book', 1),
      readCopy(0, new Date('2026-10-13T00:00:00Z')),
      step('course', 1),
    ]);

    expect(sections[BacklogSection.HABITS].map(group => group.key)).toEqual([
      'read',
      'run',
    ]);
    expect(sections[BacklogSection.PROJECTS].map(group => group.key)).toEqual([
      'course',
      'book',
    ]);
  });

  it('BL-16 puts a group the plan or the lookup lacks last, by its id', () => {
    const sections = sectionsOf([
      step('gone-b', 1),
      step('gone-a', 1),
      step('book', 1),
    ]);

    expect(sections[BacklogSection.PROJECTS].map(group => group.key)).toEqual([
      'book',
      'gone-a',
      'gone-b',
    ]);
  });
});

describe('countBacklogTasks', () => {
  it('BL-8 counts every task in the backlog, not the groups', () => {
    const sections = sectionsOf([
      readCopy(0),
      readCopy(1),
      readCopy(2),
      step('course', 1),
      step('course', 2),
    ]);

    expect(countBacklogTasks(sections)).toBe(5);
    expect(countBacklogTasks(sectionsOf([]))).toBe(0);
  });
});
