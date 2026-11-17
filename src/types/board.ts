import type {PlanTaskTotals, TaskItem} from '@/lib/db/tasks';
import type {BoardProject} from '@/lib/db/projects';
import type {BoardPlan} from '@/utils/taskUtils';

/** The board's Today / Week metrics, computed server-side by fetchBoard. */
export interface BoardProgress {
  todayDoneCount: number;
  todayTotalCount: number;
  todayDonePoints: number;
  todayTotalPoints: number;
  weekDoneCount: number;
  weekProjectedCount: number;
  weekDonePoints: number;
  weekProjectedPoints: number;
  daysElapsed: number;
}

/**
 * What the board page needs, shaped by the server: the plan narrowed to what
 * the board reads, the tasks the client keeps as state, the metrics, and the
 * projects behind the board's step cards (their paths).
 */
export interface BoardData {
  plan: BoardPlan;
  tasks: TaskItem[];
  progress: BoardProgress;
  projects: BoardProject[];
}

/**
 * The returning user's recap: last week's plan over every kind of task —
 * habit instances, project steps and one-offs, expired included.
 */
export interface BoardRecap extends PlanTaskTotals {
  /** doneCount / totalCount, 0 when the plan had no tasks */
  completionRate: number;
}
