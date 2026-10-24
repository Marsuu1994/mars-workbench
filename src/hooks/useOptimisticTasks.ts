'use client';

import {startTransition, useOptimistic} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import {
  patchTasks,
  type TaskPatchById,
  type TasksChange,
} from '@/utils/optimisticTasks';

const applyChange = (tasks: TaskItem[], change: TasksChange) => change(tasks);

/**
 * A page's tasks with its optimistic writes on top. The server's list (the
 * props, replaced by every revalidation) stays the base. Each write is an
 * async transition, and Next sets the action's revalidated page in that same
 * transition, so React drops the change in the commit that brings the list
 * carrying it: nothing flashes back. A failed write's change is simply
 * dropped, rolling back only itself. Shared by the board, the priority matrix
 * and the Projects page.
 */
export function useOptimisticTasks(tasks: TaskItem[]) {
  const [localTasks, addChange] = useOptimistic(tasks, applyChange);

  /**
   * Applies `change` and fires `action`. Resolves whether the write saved;
   * a thrown action (the network, a crash) counts as a failure.
   */
  function runOptimisticChange(
    change: TasksChange,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ): Promise<boolean> {
    return new Promise(resolve => {
      startTransition(async () => {
        addChange(change);
        try {
          const {error} = await action();
          if (error) console.error(errorLabel, error);
          resolve(!error);
        } catch (error) {
          console.error(errorLabel, error);
          resolve(false);
        }
      });
    });
  }

  // Several tasks at once: a reorder renumbers a whole path
  function runOptimisticTasksUpdate(
    patchById: TaskPatchById,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ) {
    if (!localTasks.some(task => Object.hasOwn(patchById, task.id))) return;
    void runOptimisticChange(patchTasks(patchById), action, errorLabel);
  }

  function runOptimisticTaskUpdate(
    taskId: string,
    patch: Partial<TaskItem>,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ) {
    runOptimisticTasksUpdate({[taskId]: patch}, action, errorLabel);
  }

  return {
    localTasks,
    runOptimisticChange,
    runOptimisticTaskUpdate,
    runOptimisticTasksUpdate,
  };
}
