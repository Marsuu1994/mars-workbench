import {TaskType} from '@/generated/prisma/client';
import type {PlanTemplateStatRow} from '@/lib/db/tasks';
import type {OverallStats} from '../types/plan';

/** The subset of per-template fields the overall rollup reads. */
type RollUpInput = Pick<
  PlanTemplateStatRow,
  'completed' | 'total' | 'pointsEarned' | 'type'
>;

/**
 * Roll per-template rows up into overall aggregates. Daily completion rate is
 * computed over DAILY templates only (habit signal). Accepts any rows carrying
 * the counted fields.
 */
export function rollUpOverall(perTemplate: RollUpInput[]): OverallStats {
  let completedCount = 0;
  let totalCount = 0;
  let totalPoints = 0;
  let dailyCompleted = 0;
  let dailyTotal = 0;

  for (const templateStats of perTemplate) {
    completedCount += templateStats.completed;
    totalCount += templateStats.total;
    totalPoints += templateStats.pointsEarned;
    if (templateStats.type === TaskType.DAILY) {
      dailyCompleted += templateStats.completed;
      dailyTotal += templateStats.total;
    }
  }

  return {
    completedCount,
    totalCount,
    totalPoints,
    completionRate: totalCount > 0 ? completedCount / totalCount : 0,
    dailyCompletionRate: dailyTotal > 0 ? dailyCompleted / dailyTotal : 0,
  };
}
