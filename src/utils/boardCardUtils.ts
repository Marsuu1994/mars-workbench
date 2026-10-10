import type {TaskItem} from '@/lib/db/tasks';
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

export interface ProjectStepCard extends BoardCardBase {
  kind: typeof TaskKind.PROJECT;
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
}

// ─── Adapter ───────────────────────────────────────────────────────────────

/**
 * The board's adapter: the tasks (client state, in the server's shape) →
 * card models, grouped by status and sorted. Pure, so KanbanBoard re-runs it
 * on every optimistic update and the board scenarios run it on fixtures.
 */
export function toBoardCards(
  tasks: TaskItem[],
  {plan}: BoardCardInputs,
): Record<BoardStatus, BoardCard[]> {
  const {habitWeekByTemplateId, slotByTaskId} = computeHabitWeeks(tasks, plan);

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
      case TaskKind.PROJECT:
        return {kind, task};
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
