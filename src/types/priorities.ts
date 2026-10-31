import type {TaskItem} from '@/lib/db/tasks';

export type MatrixActivePlan = {id: string; periodKey: string};

/** What the server shapes for the matrix, before the page adds its week. */
export type MatrixData = {
  /** All of the user's non-DONE AD_HOC tasks — unassigned and tracked alike. */
  tasks: TaskItem[];
  /** Current-week ACTIVE plan, or null (drives the no-plan state). */
  activePlan: MatrixActivePlan | null;
};

/**
 * What the Priorities page takes: the matrix as the server shapes it — the
 * one-offs the page keeps as state, and the plan tracking moves them onto —
 * and the week its header shows.
 */
export interface PrioritiesPageData extends MatrixData {
  periodKey: string;
}
