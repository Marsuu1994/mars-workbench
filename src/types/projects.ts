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

/** Where a step goes in its project's path: right before another step. */
export interface StepPlacement {
  /** Omitted: the end of the path */
  beforeStepId?: string;
}

/** An existing step moved to a new place in its path. */
export interface StepMove extends StepPlacement {
  stepId: string;
}

/**
 * What a change does to a project's path (see `applyStepPatch`): steps added
 * where they go, moved, edited (in place) or removed. Shared by the Projects
 * page's drag reorder and MCP's `update_project`, so both number steps alike.
 */
export interface StepPathPatch {
  addSteps: readonly StepPlacement[];
  moveSteps: readonly StepMove[];
  updateStepIds: readonly string[];
  removeStepIds: readonly string[];
}

/** One slot of a patched path: an existing step, or the patch's n-th new one. */
export type StepPathEntry = {stepId: string} | {addedStepIndex: number};

/** Step ids a path patch cannot apply, by reason. */
export interface StepPathPatchConflicts {
  /** not a step of this project */
  notInProject: string[];
  /** done steps are locked, also as a position */
  done: string[];
  /** removed and also edited or moved */
  removedAndChanged: string[];
  /** named more than once in the same list */
  repeated: string[];
  /** a position that is removed, or a step placed before itself */
  invalidPositions: string[];
}
