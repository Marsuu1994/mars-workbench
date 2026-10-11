'use client';

import {useEffect, useState} from 'react';
import type {TaskItem} from '@/lib/db/tasks';

/** A patch per task id — what one optimistic write changes. */
export type TaskPatchById = Record<string, Partial<TaskItem>>;

/**
 * A page's tasks as client state, in the server's shape: replaced whenever
 * the server sends new props (after revalidation), patched optimistically in
 * between. Shared by the board, the priority matrix and the Projects page.
 */
export function useOptimisticTasks(tasks: TaskItem[]) {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Optimistically patch several tasks at once (a reorder renumbers a whole
  // path) and fire the server action; on failure only those tasks' previous
  // values are restored — restoring a whole-list snapshot would clobber
  // concurrent optimistic updates that landed in between.
  function runOptimisticTasksUpdate(
    patchById: TaskPatchById,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ) {
    const previousById = new Map(
      localTasks
        .filter(task => Object.hasOwn(patchById, task.id))
        .map(task => [task.id, task]),
    );
    if (previousById.size === 0) return;

    setLocalTasks(prev =>
      prev.map(task =>
        Object.hasOwn(patchById, task.id)
          ? {...task, ...patchById[task.id]}
          : task,
      ),
    );

    action().then(result => {
      if (result.error) {
        console.error(errorLabel, result.error);
        setLocalTasks(prev =>
          prev.map(task => previousById.get(task.id) ?? task),
        );
      }
    });
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
    setLocalTasks,
    runOptimisticTaskUpdate,
    runOptimisticTasksUpdate,
  };
}
