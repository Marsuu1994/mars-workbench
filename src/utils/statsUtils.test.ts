import {describe, expect, it} from 'vitest';
import {TaskType} from './enums';
import {sizeToPoints} from './sizeUtils';
import {rollUpOverall} from './statsUtils';

describe('rollUpOverall', () => {
  it('sums templates; the daily rate counts DAILY templates only', () => {
    expect(
      rollUpOverall([
        {type: TaskType.DAILY, completed: 3, total: 4, pointsEarned: 6},
        {type: TaskType.WEEKLY, completed: 0, total: 2, pointsEarned: 0},
      ]),
    ).toEqual({
      completedCount: 3,
      totalCount: 6,
      totalPoints: 6,
      completionRate: 0.5,
      dailyCompletionRate: 0.75,
    });
  });

  it('rates an empty plan at zero instead of dividing by zero', () => {
    expect(rollUpOverall([])).toMatchObject({
      completionRate: 0,
      dailyCompletionRate: 0,
    });
  });
});

describe('sizeToPoints', () => {
  it('follows the size scale', () => {
    expect(
      (['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'] as const).map(
        sizeToPoints,
      ),
    ).toEqual([1, 2, 3, 5, 8]);
  });
});
