'use client';

import {useEffect, useState} from 'react';
import type {TaskItem} from '@/lib/db/tasks';

/**
 * A page's tasks as client state, in the server's shape: replaced whenever
 * the server sends new props (after revalidation), patched optimistically in
 * between. Shared by the board and the priority matrix.
 */
export function useOptimisticTasks(tasks: TaskItem[]) {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Optimistically patch one task and fire the server action; on failure only
  // that task's previous value is restored — restoring a whole-list snapshot
  // would clobber concurrent optimistic updates that landed in between.
  function runOptimisticTaskUpdate(
    taskId: string,
    patch: Partial<TaskItem>,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ) {
    const previous = localTasks.find(task => task.id === taskId);
    if (!previous) return;

    setLocalTasks(prev =>
      prev.map(task => (task.id === taskId ? {...task, ...patch} : task)),
    );

    action().then(result => {
      if (result.error) {
        console.error(errorLabel, result.error);
        setLocalTasks(prev =>
          prev.map(task => (task.id === taskId ? previous : task)),
        );
      }
    });
  }

  return {localTasks, setLocalTasks, runOptimisticTaskUpdate};
}
