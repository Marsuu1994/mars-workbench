import type {TaskItem} from '@/lib/db/tasks';

/** One optimistic write's effect on a page's task list. */
export type TasksChange = (tasks: TaskItem[]) => TaskItem[];

/** A patch per task id — what one optimistic write changes. */
export type TaskPatchById = Record<string, Partial<TaskItem>>;

/**
 * An optimistic write waiting for the server. Until its action settles it
 * applies over every task list the server sends; once it has saved, it still
 * applies over the list it settled on (the revalidated list carrying the
 * write hasn't arrived yet) and stops with the next one.
 */
export interface PendingTasksChange {
  id: number;
  change: TasksChange;
  /** The server's task list when the action saved; null while in flight */
  settledOn: TaskItem[] | null;
}

/** Whether a pending change still applies over the server's latest list. */
export const isChangeApplied = (
  {settledOn}: PendingTasksChange,
  serverTasks: TaskItem[],
): boolean => settledOn === null || settledOn === serverTasks;

/**
 * The tasks a page shows: the server's latest list with the changes still
 * waiting applied in the order they were made. A failed write is simply
 * removed from the pending list, so it rolls back only itself.
 */
export const applyPendingChanges = (
  serverTasks: TaskItem[],
  pendingChanges: PendingTasksChange[],
): TaskItem[] =>
  pendingChanges
    .filter(pending => isChangeApplied(pending, serverTasks))
    .reduce((tasks, {change}) => change(tasks), serverTasks);

/** A change that patches the listed tasks in place. */
export const patchTasks =
  (patchById: TaskPatchById): TasksChange =>
  tasks =>
    tasks.map(task =>
      Object.hasOwn(patchById, task.id)
        ? {...task, ...patchById[task.id]}
        : task,
    );

/** A change that takes a task off the list. */
export const removeTask =
  (taskId: string): TasksChange =>
  tasks =>
    tasks.filter(task => task.id !== taskId);

/**
 * A change that puts a task back at `index` — a no-op once the server's
 * list has it again.
 */
export const insertTask =
  (task: TaskItem, index: number): TasksChange =>
  tasks =>
    tasks.some(({id}) => id === task.id)
      ? tasks
      : [...tasks.slice(0, index), task, ...tasks.slice(index)];
