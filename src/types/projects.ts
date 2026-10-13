import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';

/**
 * What the Projects page needs, shaped by the server: every project
 * (archived ones are listed apart), all their steps flat — the rows the page
 * keeps as state and patches optimistically — and the plan "+ This week"
 * schedules into (null: no plan this week yet).
 */
export interface ProjectsPageData {
  projects: ProjectItem[];
  steps: TaskItem[];
  activePlanId: string | null;
}
