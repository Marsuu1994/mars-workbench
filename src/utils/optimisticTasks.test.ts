import {describe, expect, it} from 'vitest';
import {buildTask} from '../../test/buildTask';
import {TaskStatus} from './enums';
import {insertTask, patchTasks, removeTask} from './optimisticTasks';

const first = buildTask({id: 'first', status: TaskStatus.TODO});
const second = buildTask({id: 'second', status: TaskStatus.TODO});
const tasks = [first, second];

const idsOf = (list: {id: string}[]) => list.map(({id}) => id);

describe('patchTasks', () => {
  it('patches the listed tasks and leaves the rest as they are', () => {
    const patched = patchTasks({second: {status: TaskStatus.DONE}})(tasks);

    expect(patched.map(({status}) => status)).toEqual([
      TaskStatus.TODO,
      TaskStatus.DONE,
    ]);
    expect(patched[0]).toBe(first);
  });
});

describe('removeTask and insertTask', () => {
  it('compose in the order they were made: complete, then undo', () => {
    const completed = removeTask('first')(tasks);
    expect(idsOf(completed)).toEqual(['second']);
    expect(idsOf(insertTask(first, 0)(completed))).toEqual(['first', 'second']);
  });

  it("inserts nothing once the server's list has the task again", () => {
    expect(insertTask(first, 0)(tasks)).toBe(tasks);
  });
});
