import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from './enums';

/** The one field a step's progress reads. */
interface StepStatus {
  status: TaskStatus;
}

export const isStepDone = ({status}: StepStatus) => status === TaskStatus.DONE;

/** A project's progress: its DONE steps. */
export const countDoneSteps = (steps: readonly StepStatus[]) =>
  steps.filter(isStepDone).length;

/**
 * All steps done: at least one step, every one DONE. Derived, never stored —
 * adding a step makes the project active again.
 */
export const isAllStepsDone = (steps: readonly StepStatus[]) =>
  steps.length > 0 && steps.every(isStepDone);

/**
 * Renumber a project's unfinished steps after a reorder: they take over the
 * step numbers they already hold, ascending, in their new order — so done
 * steps keep theirs and the numbers stay contiguous. Shared by the server's
 * reorder and the Projects page's optimistic one, so the two always agree.
 */
export function assignStepNumbers(
  orderedStepIds: readonly string[],
  currentNumbers: readonly number[],
): Map<string, number> {
  const ascendingNumbers = [...currentNumbers].sort(
    (left, right) => left - right,
  );
  return new Map(
    orderedStepIds.map((stepId, position) => [
      stepId,
      ascendingNumbers[position],
    ]),
  );
}

/** The number a new step gets: the end of the path. */
export const getNextStepNumber = (
  steps: readonly Pick<TaskItem, 'instanceIndex'>[],
) => Math.max(0, ...steps.map(({instanceIndex}) => instanceIndex)) + 1;

/** Where a step sits on the weeks. */
export const ProjectStepState = {
  DONE: 'DONE',
  THIS_WEEK: 'THIS_WEEK',
  /** Left on the previous week's plan (PENDING_UPDATE) until the next plan
      carries it over or returns it */
  LAST_WEEK: 'LAST_WEEK',
  /** Not on any week yet */
  UPCOMING: 'UPCOMING',
} as const;
export type ProjectStepState =
  (typeof ProjectStepState)[keyof typeof ProjectStepState];

export function getStepState(
  step: Pick<TaskItem, 'status' | 'planId'>,
  activePlanId: string | null,
): ProjectStepState {
  if (isStepDone(step)) return ProjectStepState.DONE;
  if (activePlanId !== null && step.planId === activePlanId) {
    return ProjectStepState.THIS_WEEK;
  }
  if (step.planId !== null) return ProjectStepState.LAST_WEEK;
  return ProjectStepState.UPCOMING;
}

/** Each project's steps, in step order. */
export function groupStepsByProjectId(
  steps: readonly TaskItem[],
): Map<string, TaskItem[]> {
  const stepsByProjectId = new Map<string, TaskItem[]>();
  for (const step of steps) {
    if (!step.projectId) continue;
    const projectSteps = stepsByProjectId.get(step.projectId) ?? [];
    projectSteps.push(step);
    stepsByProjectId.set(step.projectId, projectSteps);
  }
  for (const projectSteps of stepsByProjectId.values()) {
    projectSteps.sort(
      (left, right) => left.instanceIndex - right.instanceIndex,
    );
  }
  return stepsByProjectId;
}

/** What a project's list card says: progress, the next step, this week. */
export interface ProjectSummary {
  doneCount: number;
  stepCount: number;
  /** The first step that isn't done, in step order */
  nextStepTitle: string | null;
  isAllStepsDone: boolean;
  /** Unfinished steps on this week's plan */
  thisWeekCount: number;
}

/** A project's summary from its steps (in step order). */
export function summarizeProject(
  steps: readonly TaskItem[],
  activePlanId: string | null,
): ProjectSummary {
  const openSteps = steps.filter(step => !isStepDone(step));
  return {
    doneCount: steps.length - openSteps.length,
    stepCount: steps.length,
    nextStepTitle: openSteps[0]?.title ?? null,
    isAllStepsDone: isAllStepsDone(steps),
    thisWeekCount: openSteps.filter(
      step => getStepState(step, activePlanId) === ProjectStepState.THIS_WEEK,
    ).length,
  };
}
