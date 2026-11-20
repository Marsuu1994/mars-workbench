import type {PlanTaskTotals, TaskItem} from '@/lib/db/tasks';
import type {BoardProject} from '@/lib/db/projects';
import type {BoardPlan} from '@/utils/taskUtils';

/**
 * What the board page needs, shaped by the server: the plan narrowed to what
 * the board reads, the tasks the client keeps as state, the projects behind
 * the board's step cards (their paths), and how many daily
 * habit tasks expired undone on each past day ("YYYY-MM-DD"), which the day
 * rings count as planned.
 */
export interface BoardData {
  plan: BoardPlan;
  tasks: TaskItem[];
  projects: BoardProject[];
  expiredDailyCountByDate: Record<string, number>;
}

/**
 * The returning user's recap: last week's plan over every kind of task —
 * habit instances, project steps and one-offs, expired included.
 */
export interface BoardRecap extends PlanTaskTotals {
  /** doneCount / totalCount, 0 when the plan had no tasks */
  completionRate: number;
}
