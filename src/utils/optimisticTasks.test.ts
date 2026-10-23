import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {TaskStatus} from './enums';
import {
  applyPendingChanges,
  insertTask,
  patchTasks,
  removeTask,
  type PendingTasksChange,
} from './optimisticTasks';

const statusOf = (tasks: {id: string; status: TaskStatus}[]) =>
  Object.fromEntries(tasks.map(({id, status}) => [id, status]));

const pendingChange = (
  id: number,
  change: PendingTasksChange['change'],
  settledOn: PendingTasksChange['settledOn'] = null,
): PendingTasksChange => ({id, change, settledOn});

describe('applyPendingChanges', () => {
  const first = buildTask({id: 'first', status: TaskStatus.TODO});
  const second = buildTask({id: 'second', status: TaskStatus.TODO});
  const beforeWrites = [first, second];

  it("keeps a second write while the first write's revalidation lands", () => {
    // Both rows done in a row; the first saves and the server sends a list
    // carrying it, while the second is still in flight
    const firstDone = pendingChange(
      1,
      patchTasks({first: {status: TaskStatus.DONE}}),
      beforeWrites,
    );
    const secondDone = pendingChange(
      2,
      patchTasks({second: {status: TaskStatus.DONE}}),
    );
    const afterFirstWrite = [{...first, status: TaskStatus.DONE}, second];

    expect(
      statusOf(applyPendingChanges(afterFirstWrite, [firstDone, secondDone])),
    ).toEqual({first: TaskStatus.DONE, second: TaskStatus.DONE});
  });

  it('holds a saved write until the list carrying it arrives', () => {
    const saved = pendingChange(
      1,
      patchTasks({first: {status: TaskStatus.DONE}}),
      beforeWrites,
    );

    expect(statusOf(applyPendingChanges(beforeWrites, [saved]))).toEqual({
      first: TaskStatus.DONE,
      second: TaskStatus.TODO,
    });
    // The next list is the server's word: the saved write no longer applies
    const revalidated = [first, second];
    expect(statusOf(applyPendingChanges(revalidated, [saved]))).toEqual({
      first: TaskStatus.TODO,
      second: TaskStatus.TODO,
    });
  });

  it('rolls back a failed write alone: it just leaves the pending list', () => {
    const stillPending = pendingChange(
      2,
      patchTasks({second: {status: TaskStatus.DONE}}),
    );

    expect(statusOf(applyPendingChanges(beforeWrites, [stillPending]))).toEqual(
      {first: TaskStatus.TODO, second: TaskStatus.DONE},
    );
  });

  it('applies removals and re-insertions in the order they were made', () => {
    // Complete, then undo before either write has landed
    const completed = pendingChange(1, removeTask('first'));
    const undone = pendingChange(2, insertTask(first, 0));

    expect(
      applyPendingChanges(beforeWrites, [completed]).map(({id}) => id),
    ).toEqual(['second']);
    expect(
      applyPendingChanges(beforeWrites, [completed, undone]).map(({id}) => id),
    ).toEqual(['first', 'second']);
  });

  it("inserts nothing once the server's list has the task again", () => {
    const undone = pendingChange(1, insertTask(first, 0));

    expect(
      applyPendingChanges(beforeWrites, [undone]).map(({id}) => id),
    ).toEqual(['first', 'second']);
  });
});
