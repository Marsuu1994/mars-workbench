import type {TaskItem} from '@/lib/db/tasks';
import {TaskSize, TaskStatus, TaskType} from '@/utils/enums';

const CREATED_AT = new Date('2026-10-12T16:00:00Z');

/**
 * A task row as the DAL returns it, for unit tests of the pure adapters:
 * a backlog one-off unless the overrides say otherwise.
 */
export const buildTask = (overrides: Partial<TaskItem> & {id: string}) =>
  ({
    planId: 'plan',
    templateId: null,
    type: TaskType.AD_HOC,
    title: overrides.id,
    description: null,
    size: TaskSize.SMALL,
    points: 2,
    status: TaskStatus.BACKLOG,
    forDate: null,
    periodKey: null,
    quadrant: null,
    instanceIndex: 0,
    projectId: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    doneAt: null,
    ...overrides,
  }) satisfies TaskItem;

/** A Prisma DATE value: the calendar day at UTC midnight. */
export const dateColumn = (isoDay: string) => new Date(`${isoDay}T00:00:00Z`);
