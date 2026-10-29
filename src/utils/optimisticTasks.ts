import type {TaskItem} from '@/lib/db/tasks';

/** One optimistic write's effect on a page's task list. */
export type TasksChange = (tasks: TaskItem[]) => TaskItem[];

/** A patch per task id — what one optimistic write changes. */
export type TaskPatchById = Record<string, Partial<TaskItem>>;

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
