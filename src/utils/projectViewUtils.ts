import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from './enums';
import {countDoneSteps, isAllStepsDone, isStepDone} from './projectUtils';

// ─── View model ────────────────────────────────────────────────────────────

/** Where a step sits: done, on this week, left on last week's plan, or not
    scheduled yet. */
export const ProjectStepState = {
  DONE: 'DONE',
  THIS_WEEK: 'THIS_WEEK',
  /** On the previous week's plan (PENDING_UPDATE) until the next plan
      carries it over or returns it */
  LAST_WEEK: 'LAST_WEEK',
  UPCOMING: 'UPCOMING',
} as const;
export type ProjectStepState =
  (typeof ProjectStepState)[keyof typeof ProjectStepState];

/** A project's card in the list. */
export interface ProjectSummary {
  id: string;
  title: string;
  doneCount: number;
  stepCount: number;
  /** The first step that isn't done, in path order */
  nextStepTitle: string | null;
  isAllStepsDone: boolean;
  /** Unfinished steps on this week's plan */
  thisWeekCount: number;
}

export type ArchivedProjectSummary = Pick<
  ProjectSummary,
  'id' | 'title' | 'doneCount' | 'stepCount'
>;

/** The detail's header: what the project is and how far along. */
export interface ProjectHeaderModel {
  id: string;
  title: string;
  goal: string | null;
  doneCount: number;
  stepCount: number;
}

/** One step row; the state says which controls it offers. */
export type ProjectStepRowModel =
  | {state: typeof ProjectStepState.DONE; step: TaskItem}
  | {
      state: typeof ProjectStepState.THIS_WEEK;
      step: TaskItem;
      /** Still in the board's backlog, so it can leave the week again */
      canTakeBack: boolean;
    }
  | {state: typeof ProjectStepState.LAST_WEEK; step: TaskItem}
  | {
      state: typeof ProjectStepState.UPCOMING;
      step: TaskItem;
      /** A plan this week to schedule into */
      canSchedule: boolean;
    };

/** The selected project: its header and its path. */
export interface ProjectDetailModel {
  header: ProjectHeaderModel;
  isAllStepsDone: boolean;
  /** The number a new step gets — the end of the path */
  nextStepNumber: number;
  /** Locked, in the order they were done */
  doneSteps: ProjectStepRowModel[];
  /** The rest of the path, in step order (the reorderable list) */
  openSteps: ProjectStepRowModel[];
}

export interface ProjectsView {
  /** Newest first (the server's order) */
  activeProjects: ProjectSummary[];
  archivedProjects: ArchivedProjectSummary[];
  /** The selected project, or the first active one when the selection isn't
      an active project; null when there is none */
  selectedProject: ProjectDetailModel | null;
}

/** What toProjectsView reads besides the projects and their steps. */
export interface ProjectsViewInputs {
  /** The plan "+ This week" schedules into; null: no plan this week yet */
  activePlanId: string | null;
  selectedProjectId: string | null;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

const byStepNumber = (left: TaskItem, right: TaskItem) =>
  left.instanceIndex - right.instanceIndex;

/** Done steps in completion order (step number breaks ties). */
const byDoneAt = (left: TaskItem, right: TaskItem) =>
  (left.doneAt?.getTime() ?? 0) - (right.doneAt?.getTime() ?? 0) ||
  byStepNumber(left, right);

/** Each project's steps, in step order. */
function groupStepsByProjectId(steps: TaskItem[]): Map<string, TaskItem[]> {
  const stepsByProjectId = new Map<string, TaskItem[]>();
  for (const step of steps) {
    if (!step.projectId) continue;
    const projectSteps = stepsByProjectId.get(step.projectId) ?? [];
    projectSteps.push(step);
    stepsByProjectId.set(step.projectId, projectSteps);
  }
  for (const projectSteps of stepsByProjectId.values()) {
    projectSteps.sort(byStepNumber);
  }
  return stepsByProjectId;
}

function toStepRow(
  step: TaskItem,
  activePlanId: string | null,
): ProjectStepRowModel {
  if (isStepDone(step)) return {state: ProjectStepState.DONE, step};
  if (activePlanId !== null && step.planId === activePlanId) {
    return {
      state: ProjectStepState.THIS_WEEK,
      step,
      canTakeBack: step.status === TaskStatus.BACKLOG,
    };
  }
  if (step.planId !== null) return {state: ProjectStepState.LAST_WEEK, step};
  return {
    state: ProjectStepState.UPCOMING,
    step,
    canSchedule: activePlanId !== null,
  };
}

function toProjectDetail(
  {id, title, goal}: ProjectItem,
  steps: TaskItem[],
  activePlanId: string | null,
): ProjectDetailModel {
  const toRow = (step: TaskItem) => toStepRow(step, activePlanId);
  return {
    header: {
      id,
      title,
      goal,
      doneCount: countDoneSteps(steps),
      stepCount: steps.length,
    },
    isAllStepsDone: isAllStepsDone(steps),
    nextStepNumber: Math.max(0, ...steps.map(step => step.instanceIndex)) + 1,
    doneSteps: steps.filter(isStepDone).sort(byDoneAt).map(toRow),
    openSteps: steps.filter(step => !isStepDone(step)).map(toRow),
  };
}

/**
 * The Projects page's adapter: the projects and their steps (the steps are
 * client state, in the server's shape) → the list, the archived list and the
 * selected project's detail. Pure, so ProjectsContainer re-runs it on every
 * optimistic write and the Projects scenarios run it on fixtures.
 */
export function toProjectsView(
  projects: ProjectItem[],
  steps: TaskItem[],
  {activePlanId, selectedProjectId}: ProjectsViewInputs,
): ProjectsView {
  const stepsByProjectId = groupStepsByProjectId(steps);
  const stepsOf = (projectId: string) => stepsByProjectId.get(projectId) ?? [];

  const activeProjects = projects.filter(({isArchived}) => !isArchived);
  const archivedProjects = projects.filter(({isArchived}) => isArchived);

  const toSummary = ({id, title}: ProjectItem): ProjectSummary => {
    const projectSteps = stepsOf(id);
    const openSteps = projectSteps.filter(step => !isStepDone(step));
    return {
      id,
      title,
      doneCount: projectSteps.length - openSteps.length,
      stepCount: projectSteps.length,
      nextStepTitle: openSteps[0]?.title ?? null,
      isAllStepsDone: isAllStepsDone(projectSteps),
      thisWeekCount:
        activePlanId === null
          ? 0
          : openSteps.filter(step => step.planId === activePlanId).length,
    };
  };

  const selected =
    activeProjects.find(({id}) => id === selectedProjectId) ??
    activeProjects[0];

  return {
    activeProjects: activeProjects.map(toSummary),
    archivedProjects: archivedProjects.map(({id, title}) => {
      const projectSteps = stepsOf(id);
      return {
        id,
        title,
        doneCount: countDoneSteps(projectSteps),
        stepCount: projectSteps.length,
      };
    }),
    selectedProject: selected
      ? toProjectDetail(selected, stepsOf(selected.id), activePlanId)
      : null,
  };
}
