import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus, TaskType as TaskTypeEnum } from "./enums";

/**
 * Sort tasks: daily tasks first, then weekly, then by createdAt ascending,
 * with id as a deterministic tiebreaker for same-timestamp records.
 */
export function sortTasks(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const aIsDaily = a.type === TaskTypeEnum.DAILY;
    const bIsDaily = b.type === TaskTypeEnum.DAILY;

    if (aIsDaily && !bIsDaily) return -1;
    if (!aIsDaily && bIsDaily) return 1;

    const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id);
  });
}

/** The three statuses shown as board columns (excludes EXPIRED). */
type BoardStatus = typeof TaskStatus.TODO | typeof TaskStatus.DOING | typeof TaskStatus.DONE;

/**
 * Group tasks by status and sort each group (daily first, then by createdAt).
 * Used by KanbanBoard for both initial render and optimistic state updates.
 */
export function groupAndSortTasks(
  tasks: TaskItem[]
): Record<BoardStatus, TaskItem[]> {
  const grouped: Record<BoardStatus, TaskItem[]> = {
    [TaskStatus.TODO]: [],
    [TaskStatus.DOING]: [],
    [TaskStatus.DONE]: [],
  };

  for (const task of tasks) {
    const bucket = grouped[task.status as BoardStatus];
    if (bucket) {
      bucket.push(task);
    }
  }

  return {
    [TaskStatus.TODO]: sortTasks(grouped[TaskStatus.TODO]),
    [TaskStatus.DOING]: sortTasks(grouped[TaskStatus.DOING]),
    [TaskStatus.DONE]: sortTasks(grouped[TaskStatus.DONE]),
  } as Record<BoardStatus, TaskItem[]>;
}
