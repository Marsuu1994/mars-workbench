import {prisma} from '@/lib/prisma';
import {
  createProjectSteps,
  deleteProjectSteps,
  getProjectWithStepsById,
  renumberProjectPath,
  unlinkUnfinishedStepsByProjectId,
  updateProject,
  updateProjectArchived,
  updateProjectStep,
} from '@/lib/db/projects';
import {sizeToPoints} from '@/utils/sizeUtils';
import {
  PROJECT_STEP_LIMIT,
  applyStepPatch,
  numberStepPath,
  toNullableText,
  toProjectContext,
  toProjectStepRow,
} from '@/utils/projectUtils';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import type {ProjectPatchInput, ProjectSpecInput} from '@/schemas';
import type {
  PlanChangeRef,
  ProjectContext,
  ProjectPatchResult,
} from '../types/plan';
import type {StepPathPatchConflicts} from '../types/projects';
import {createProject} from './projectService';
import {PlanningError} from './planningService';
import {ensureSynced} from './syncService';

/** Throws a PlanningError naming every step id the patch cannot apply. */
function assertNoStepConflicts({
  notInProject,
  done,
  removedAndChanged,
  repeated,
  invalidPositions,
}: StepPathPatchConflicts) {
  const problems: string[] = [];
  if (notInProject.length > 0) {
    problems.push(PLANNING_ERROR.STEPS_NOT_IN_PROJECT(notInProject));
  }
  if (done.length > 0) problems.push(PLANNING_ERROR.STEPS_DONE(done));
  if (removedAndChanged.length > 0) {
    problems.push(PLANNING_ERROR.STEPS_REMOVED_AND_CHANGED(removedAndChanged));
  }
  if (repeated.length > 0) {
    problems.push(PLANNING_ERROR.STEPS_LISTED_TWICE(repeated));
  }
  if (invalidPositions.length > 0) {
    problems.push(PLANNING_ERROR.STEP_POSITION_INVALID(invalidPositions));
  }
  if (problems.length > 0) {
    throw new PlanningError(PLANNING_ERROR.PATCH_REJECTED(problems));
  }
}

/**
 * Create a project with its path (MCP `create_project`), one transaction.
 * Schedules nothing: every new step is UPCOMING.
 */
export async function createProjectFromSpec(
  userId: string,
  projectSpec: ProjectSpecInput,
): Promise<{project: ProjectContext}> {
  const project = await createProject(userId, projectSpec);
  // New steps are on no plan, so the active plan can't change their state
  return {project: toProjectContext(project, null)};
}

/**
 * Apply a patch to a project (MCP `update_project`) in one transaction: steps
 * removed, edited, moved and added (placed by `applyStepPatch`, the path then
 * renumbered), title and goal, and archive last. Rejected whole, nothing
 * written, when any step can't be changed, the path would pass
 * PROJECT_STEP_LIMIT, or the project is archived and stays so.
 */
export async function patchProject(
  userId: string,
  projectPatch: ProjectPatchInput,
): Promise<ProjectPatchResult> {
  const {
    projectId,
    title,
    goal,
    archived,
    addSteps,
    updateSteps,
    moveSteps,
    removeStepIds,
  } = projectPatch;

  // The step states in the result read this week's plan
  const activePlan = await ensureSynced(userId);

  const {stepsBeforePatch, addedSteps, archivedChange} =
    await prisma.$transaction(async tx => {
      const project = await getProjectWithStepsById(userId, projectId, tx);
      if (!project) {
        throw new PlanningError(PLANNING_ERROR.PROJECT_NOT_FOUND(projectId));
      }
      if (project.isArchived && archived !== false) {
        throw new PlanningError(PLANNING_ERROR.PROJECT_ARCHIVED(projectId));
      }

      const {path, conflicts} = applyStepPatch(project.steps, {
        addSteps,
        moveSteps,
        updateStepIds: updateSteps.map(({stepId}) => stepId),
        removeStepIds,
      });
      assertNoStepConflicts(conflicts);
      if (path.length > PROJECT_STEP_LIMIT) {
        throw new PlanningError(PLANNING_ERROR.PROJECT_STEP_LIMIT(path.length));
      }
      const {numberByStepId, addedStepNumbers} = numberStepPath(path);

      await deleteProjectSteps(userId, projectId, removeStepIds, tx);
      for (const {stepId, title, description, size} of updateSteps) {
        await updateProjectStep(
          userId,
          stepId,
          {
            title,
            description: toNullableText(description),
            ...(size !== undefined && {size, points: sizeToPoints(size)}),
          },
          tx,
        );
      }
      const createdSteps = await createProjectSteps(
        userId,
        projectId,
        addSteps.map((step, index) =>
          toProjectStepRow(step, addedStepNumbers[index]),
        ),
        tx,
      );
      await renumberProjectPath(
        userId,
        projectId,
        [...numberByStepId.keys()],
        [...numberByStepId.values()],
        tx,
      );

      if (title !== undefined || goal !== undefined) {
        await updateProject(
          userId,
          projectId,
          {title, goal: toNullableText(goal)},
          tx,
        );
      }
      const isArchiveChanging =
        archived !== undefined && archived !== project.isArchived;
      if (isArchiveChanging) {
        await updateProjectArchived(userId, projectId, archived, tx);
        // Archiving takes the unfinished steps off any week
        if (archived) {
          await unlinkUnfinishedStepsByProjectId(userId, projectId, tx);
        }
      }

      return {
        stepsBeforePatch: project.steps,
        addedSteps: createdSteps,
        archivedChange: isArchiveChanging ? archived : undefined,
      };
    });

  const projectAfterPatch = await getProjectWithStepsById(userId, projectId);
  if (!projectAfterPatch) throw new Error(`Project not found: ${projectId}`);

  // Titles of removed steps come from before the patch, the rest from after
  const stepTitleById = new Map(
    [...stepsBeforePatch, ...projectAfterPatch.steps].map(({id, title}) => [
      id,
      title,
    ]),
  );
  const toChangeRef = (stepId: string): PlanChangeRef => ({
    id: stepId,
    title: stepTitleById.get(stepId) ?? '',
  });

  return {
    changes: {
      addedSteps: addedSteps.map(({id, title}) => ({id, title})),
      updatedSteps: updateSteps.map(({stepId}) => toChangeRef(stepId)),
      movedSteps: moveSteps.map(({stepId}) => toChangeRef(stepId)),
      removedSteps: removeStepIds.map(toChangeRef),
      ...(archivedChange !== undefined && {archived: archivedChange}),
    },
    project: toProjectContext(projectAfterPatch, activePlan?.id ?? null),
  };
}
