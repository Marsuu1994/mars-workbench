import type {TaskItem} from '@/lib/db/tasks';

/**
 * What the Priorities page needs, shaped by the route's adapter: the week
 * the header shows, every non-DONE one-off — the rows the page keeps as
 * state and patches optimistically — and the plan tracking moves them onto
 * (null: no active plan this week).
 */
export interface PrioritiesPageData {
  periodKey: string;
  tasks: TaskItem[];
  activePlanId: string | null;
}
