import type {TaskItem} from '@/lib/db/tasks';
import type {BoardProject} from '@/lib/db/projects';
import {TaskStatus} from '@/utils/enums';
import {
  computeHabitWeeks,
  getTaskKind,
  sortTasks,
  TaskKind,
  type BoardPlan,
  type HabitWeek,
} from '@/utils/taskUtils';

// ─── Card model ────────────────────────────────────────────────────────────

interface BoardCardBase {
  task: TaskItem;
}

/** A habit instance: its plan line and week dots, and its own dot (ringed). */
export interface HabitCard extends BoardCardBase {
  kind: typeof TaskKind.HABIT;
  /** Absent when the template has no line on the plan */
  habitWeek?: HabitWeek;
  /** This instance's dot; absent when it has none (a mode switch, a cut) */
  currentSlot?: number;
}

/** A step card's context and signal: its project, its number, the path. */
export interface ProjectStepContext {
  projectTitle: string;
  /** The step's number in its project (its instanceIndex) */
  number: number;
  /** Steps in the project */
  count: number;
  /** One mark per step, in path order; true when that step is done */
  path: boolean[];
  /** This step's mark in the path; absent when the lookup doesn't list it */
  currentSegment?: number;
}

/** A project step: its project's name, step n of N and the path. */
export interface ProjectStepCard extends BoardCardBase {
  kind: typeof TaskKind.PROJECT;
  /** Absent when the project isn't in the lookup */
  step?: ProjectStepContext;
}

export interface OneOffCard extends BoardCardBase {
  kind: typeof TaskKind.ONE_OFF;
}

/**
 * The board's view of one task: exactly what its kind's face shows, worked
 * out once by toBoardCards so cards and faces only render.
 */
export type BoardCard = HabitCard | ProjectStepCard | OneOffCard;

/**
 * Statuses the board renders (excludes EXPIRED): BACKLOG in the backlog,
 * TODO / DONE as the columns.
 */
export type BoardStatus =
  typeof TaskStatus.BACKLOG | typeof TaskStatus.TODO | typeof TaskStatus.DONE;

/** What toBoardCards reads besides the tasks. */
export interface BoardCardInputs {
  plan: BoardPlan;
  /** The projects behind the step cards (fetchBoard's lookup) */
  projects: BoardProject[];
}

// ─── Adapter ───────────────────────────────────────────────────────────────

/**
 * A step card's context from its project in the lookup. A step's own status
 * comes from the board's tasks when it is one of them, so a step dragged to
 * Done fills its mark at once (the lookup only changes on revalidation).
 */
function toProjectStepContext(
  task: TaskItem,
  {title, steps}: BoardProject,
  statusByTaskId: Map<string, TaskItem['status']>,
): ProjectStepContext {
  const currentSegment = steps.findIndex(step => step.id === task.id);
  return {
    projectTitle: title,
    number: task.instanceIndex,
    count: steps.length,
    path: steps.map(
      step => (statusByTaskId.get(step.id) ?? step.status) === TaskStatus.DONE,
    ),
    currentSegment: currentSegment === -1 ? undefined : currentSegment,
  };
}

/**
 * The board's adapter: the tasks (client state, in the server's shape) →
 * card models, grouped by status and sorted. Pure, so BoardPage re-runs it
 * on every optimistic update and the board scenarios run it on fixtures.
 */
export function toBoardCards(
  tasks: TaskItem[],
  {plan, projects}: BoardCardInputs,
): Record<BoardStatus, BoardCard[]> {
  const {habitWeekByTemplateId, slotByTaskId} = computeHabitWeeks(tasks, plan);
  const projectById = new Map(projects.map(project => [project.id, project]));
  const statusByTaskId = new Map(tasks.map(task => [task.id, task.status]));

  const toBoardCard = (task: TaskItem): BoardCard => {
    const kind = getTaskKind(task.type);
    switch (kind) {
      case TaskKind.HABIT:
        return {
          kind,
          task,
          habitWeek: task.templateId
            ? habitWeekByTemplateId.get(task.templateId)
            : undefined,
          currentSlot: slotByTaskId.get(task.id),
        };
      case TaskKind.PROJECT: {
        const project = task.projectId
          ? projectById.get(task.projectId)
          : undefined;
        return {
          kind,
          task,
          step: project
            ? toProjectStepContext(task, project, statusByTaskId)
            : undefined,
        };
      }
      case TaskKind.ONE_OFF:
        return {kind, task};
    }
  };

  const tasksByStatus: Record<BoardStatus, TaskItem[]> = {
    [TaskStatus.BACKLOG]: [],
    [TaskStatus.TODO]: [],
    [TaskStatus.DONE]: [],
  };
  for (const task of tasks) {
    // EXPIRED (and the retired DOING) have no bucket — the board skips them.
    tasksByStatus[task.status as BoardStatus]?.push(task);
  }

  const toSortedCards = (statusTasks: TaskItem[]) =>
    sortTasks(statusTasks).map(toBoardCard);

  return {
    [TaskStatus.BACKLOG]: toSortedCards(tasksByStatus[TaskStatus.BACKLOG]),
    [TaskStatus.TODO]: toSortedCards(tasksByStatus[TaskStatus.TODO]),
    [TaskStatus.DONE]: toSortedCards(tasksByStatus[TaskStatus.DONE]),
  };
}
