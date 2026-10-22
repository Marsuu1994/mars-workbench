import type {ProjectStepRow, ProjectWithSteps} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import type {CreateProjectStepInput} from '../schemas';
import type {ProjectContext, ProjectStepContext} from '../types/plan';
import type {
  StepPathEntry,
  StepPathPatch,
  StepPathPatchConflicts,
} from '../types/projects';
import {TaskStatus} from './enums';
import {formatKanbanISODate} from './dateUtils';
import {findRepeatedIds} from './planUtils';
import {sizeToPoints} from './sizeUtils';
import {getWeekPlacement} from './taskUtils';

/** The most steps a project's path holds — the app and Claude alike. */
export const PROJECT_STEP_LIMIT = 50;

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

const listUnique = (ids: Iterable<string>) => [...new Set(ids)];

/**
 * Apply a path patch to a project's steps (in path order): the new path —
 * removed steps out, moves in list order, then new steps where they go — plus
 * the ids the patch cannot apply. A placement goes right before its
 * `beforeStepId`, or at the end without one. Pure, so the Projects page's
 * optimistic reorder and the server number a path the same way; the caller
 * rejects the patch when any conflict list is non-empty.
 */
export function applyStepPatch(
  steps: readonly Pick<TaskItem, 'id' | 'status'>[],
  {addSteps, moveSteps, updateStepIds, removeStepIds}: StepPathPatch,
): {path: StepPathEntry[]; conflicts: StepPathPatchConflicts} {
  const stepById = new Map(steps.map(step => [step.id, step]));
  const removedStepIds = new Set(removeStepIds);
  const movedStepIds = moveSteps.map(({stepId}) => stepId);
  const positionStepIds = [...addSteps, ...moveSteps].flatMap(
    ({beforeStepId}) => (beforeStepId === undefined ? [] : [beforeStepId]),
  );
  const namedStepIds = [
    ...updateStepIds,
    ...movedStepIds,
    ...removeStepIds,
    ...positionStepIds,
  ];

  const conflicts: StepPathPatchConflicts = {
    notInProject: listUnique(
      namedStepIds.filter(stepId => !stepById.has(stepId)),
    ),
    done: listUnique(
      namedStepIds.filter(stepId => {
        const step = stepById.get(stepId);
        return step !== undefined && isStepDone(step);
      }),
    ),
    removedAndChanged: listUnique(
      [...updateStepIds, ...movedStepIds].filter(stepId =>
        removedStepIds.has(stepId),
      ),
    ),
    repeated: listUnique([
      ...findRepeatedIds(updateStepIds),
      ...findRepeatedIds(movedStepIds),
      ...findRepeatedIds(removeStepIds),
    ]),
    invalidPositions: listUnique([
      ...positionStepIds.filter(stepId => removedStepIds.has(stepId)),
      ...moveSteps
        .filter(({stepId, beforeStepId}) => stepId === beforeStepId)
        .map(({stepId}) => stepId),
    ]),
  };

  const path: StepPathEntry[] = steps
    .filter(({id}) => !removedStepIds.has(id))
    .map(({id}) => ({stepId: id}));
  const findStepPosition = (stepId: string) =>
    path.findIndex(entry => 'stepId' in entry && entry.stepId === stepId);
  const placeEntry = (entry: StepPathEntry, beforeStepId?: string) => {
    const position =
      beforeStepId === undefined ? -1 : findStepPosition(beforeStepId);
    if (position === -1) path.push(entry);
    else path.splice(position, 0, entry);
  };

  for (const {stepId, beforeStepId} of moveSteps) {
    const position = findStepPosition(stepId);
    if (position === -1) continue;
    const [movedEntry] = path.splice(position, 1);
    placeEntry(movedEntry, beforeStepId);
  }
  addSteps.forEach(({beforeStepId}, addedStepIndex) =>
    placeEntry({addedStepIndex}, beforeStepId),
  );

  return {path, conflicts};
}

/** True when a path patch's conflict lists are all empty. */
export const hasNoStepConflicts = (conflicts: StepPathPatchConflicts) =>
  Object.values(conflicts).every(stepIds => stepIds.length === 0);

/**
 * The step numbers of a patched path (1-based, contiguous): existing steps by
 * id, and each new step's number in the patch's order.
 */
export function numberStepPath(path: readonly StepPathEntry[]): {
  numberByStepId: Map<string, number>;
  addedStepNumbers: number[];
} {
  const numberByStepId = new Map<string, number>();
  const addedStepNumbers: number[] = [];
  path.forEach((entry, position) => {
    if ('stepId' in entry) numberByStepId.set(entry.stepId, position + 1);
    else addedStepNumbers[entry.addedStepIndex] = position + 1;
  });
  return {numberByStepId, addedStepNumbers};
}

/** Empty optional text clears the field (a goal, a step's description). */
export const toNullableText = (text: string | undefined) =>
  text === undefined ? undefined : text || null;

/** A new step's row at `instanceIndex`, with points derived from its size. */
export const toProjectStepRow = (
  {title, description, size}: CreateProjectStepInput,
  instanceIndex: number,
): ProjectStepRow => ({
  title,
  description: description || undefined,
  size,
  points: sizeToPoints(size),
  instanceIndex,
});

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
  return getWeekPlacement(step, activePlanId) ?? ProjectStepState.UPCOMING;
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

const toProjectStepContext = (
  step: TaskItem,
  activePlanId: string | null,
): ProjectStepContext => {
  const {id, instanceIndex, title, description, size, points, doneAt} = step;
  return {
    stepId: id,
    stepNumber: instanceIndex,
    title,
    description,
    size,
    points,
    state: getStepState(step, activePlanId),
    doneOn: doneAt ? formatKanbanISODate(doneAt) : null,
  };
};

/** A project with its path (in step order) as the planning tools list it. */
export function toProjectContext(
  {id, title, goal, steps}: ProjectWithSteps,
  activePlanId: string | null,
): ProjectContext {
  return {
    projectId: id,
    title,
    goal,
    doneCount: countDoneSteps(steps),
    stepCount: steps.length,
    allStepsDone: isAllStepsDone(steps),
    steps: steps.map(step => toProjectStepContext(step, activePlanId)),
  };
}
