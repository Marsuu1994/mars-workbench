'use client';

import {useEffect, useRef, useState} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import {
  applyPendingChanges,
  isChangeApplied,
  patchTasks,
  type PendingTasksChange,
  type TaskPatchById,
  type TasksChange,
} from '@/utils/optimisticTasks';

/**
 * A page's tasks with its optimistic writes on top. The server's list (the
 * props, replaced by every revalidation) stays the base; each write's change
 * applies over it until the server's list carries the write, so a
 * revalidation landing mid-way never flashes another write back. Shared by
 * the board, the priority matrix and the Projects page.
 */
export function useOptimisticTasks(tasks: TaskItem[]) {
  const [pendingChanges, setPendingChanges] = useState<PendingTasksChange[]>(
    [],
  );
  const nextChangeId = useRef(0);
  // The server's list as last committed: a write that saves holds until the
  // list after this one arrives
  const committedTasks = useRef(tasks);
  useEffect(() => {
    committedTasks.current = tasks;
  }, [tasks]);

  const localTasks = applyPendingChanges(tasks, pendingChanges);

  /**
   * Applies `change` and fires `action`. On failure the change alone is
   * dropped (rolling back only this write); on success it holds until the
   * revalidated list arrives. Resolves whether the write saved.
   */
  function runOptimisticChange(
    change: TasksChange,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ): Promise<boolean> {
    nextChangeId.current += 1;
    const id = nextChangeId.current;
    // Changes that saved before the current list arrived are done with
    setPendingChanges(prev => [
      ...prev.filter(pending => isChangeApplied(pending, tasks)),
      {id, change, settledOn: null},
    ]);

    return action().then(result => {
      if (result.error) {
        console.error(errorLabel, result.error);
        setPendingChanges(prev => prev.filter(pending => pending.id !== id));
        return false;
      }
      setPendingChanges(prev =>
        prev.map(pending =>
          pending.id === id
            ? {...pending, settledOn: committedTasks.current}
            : pending,
        ),
      );
      return true;
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
