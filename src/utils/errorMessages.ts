// Error messages of the planning tools and the MCP layer around them. Written
// for the assistant that reads them: each says what was wrong and what to do
// instead. LLM-facing, so never translated (user-facing copy lives in en.json).

import {PROJECT_STEP_LIMIT} from './projectUtils';

/** Planning requests the user's data cannot satisfy (thrown as PlanningError). */
export const PLANNING_ERROR = {
  ACTIVE_PLAN_EXISTS: (activePlanId: string) =>
    `This week already has an active plan (${activePlanId}); change that plan instead of creating another.`,
  NOT_ACTIVE_PLAN: (planId: string, activePlanId: string) =>
    `Plan ${planId} is not this week's active plan; the active plan is ${activePlanId}.`,
  NO_ACTIVE_PLAN: (planId: string) =>
    `Plan ${planId} is not this week's active plan; this week has no active plan yet, so create one.`,
  EMPTY_PLAN:
    'A plan needs at least one template, carried-over one-off task or project step.',
  TEMPLATES_LISTED_TWICE: (templateIds: string[]) =>
    `Templates listed more than once: ${templateIds.join(', ')}.`,
  TEMPLATES_ALREADY_IN_PLAN: (templateIds: string[]) =>
    `Already in the plan (change them with updateTemplates): ${templateIds.join(', ')}.`,
  TEMPLATES_NOT_IN_PLAN: (templateIds: string[]) =>
    `Not in the plan: ${templateIds.join(', ')}.`,
  PATCH_REJECTED: (problems: string[]) =>
    `No changes were made. ${problems.join(' ')}`,
  ADHOC_TASKS_NOT_IN_LAST_PLAN: (taskIds: string[]) =>
    `Not unfinished one-off tasks of the last plan: ${taskIds.join(', ')}.`,
  ADHOC_TASKS_NOT_IN_PLAN: (taskIds: string[]) =>
    `Not unfinished one-off tasks of this plan: ${taskIds.join(', ')}.`,
  PROJECT_STEPS_LISTED_TWICE: (stepIds: string[]) =>
    `Project steps listed more than once: ${stepIds.join(', ')}.`,
  PROJECT_STEPS_NOT_IN_LAST_PLAN: (stepIds: string[]) =>
    `Not unfinished project steps of the last plan: ${stepIds.join(', ')}. carryOverProjectStepIds takes steps in state LAST_WEEK.`,
  PROJECT_STEPS_NOT_UPCOMING: (stepIds: string[]) =>
    `Not upcoming project steps: ${stepIds.join(', ')}. addProjectStepIds takes steps in state UPCOMING of a project that isn't archived.`,
  PROJECT_STEPS_NOT_IN_PLAN: (stepIds: string[]) =>
    `Not unfinished project steps of this plan: ${stepIds.join(', ')}.`,
  PROJECT_NOT_FOUND: (projectId: string) =>
    `Project not found: ${projectId}. Use a projectId from get_planning_context.`,
  PROJECT_ARCHIVED: (projectId: string) =>
    `Project ${projectId} is archived. To change it, unarchive it in the same call (archived: false) — only if the user asked.`,
  PROJECT_STEP_LIMIT: (stepCount: number) =>
    `A project holds at most ${PROJECT_STEP_LIMIT} steps; this change would leave ${stepCount}. Propose the first milestone as its own project instead.`,
  STEPS_NOT_IN_PROJECT: (stepIds: string[]) =>
    `Not steps of this project: ${stepIds.join(', ')}.`,
  STEPS_DONE: (stepIds: string[]) =>
    `Done steps are locked — they can't be edited, moved, removed or used as beforeStepId: ${stepIds.join(', ')}.`,
  STEPS_REMOVED_AND_CHANGED: (stepIds: string[]) =>
    `Removed and also edited or moved in the same call: ${stepIds.join(', ')}.`,
  STEPS_LISTED_TWICE: (stepIds: string[]) =>
    `Steps listed more than once in the same list: ${stepIds.join(', ')}.`,
  STEP_POSITION_INVALID: (stepIds: string[]) =>
    `beforeStepId must be another step of this project that is not done and not removed: ${stepIds.join(', ')}.`,
};

/** What the MCP layer reports around a tool call (see mcp/middleware/runTool). */
export const MCP_ERROR = {
  NO_SIGNED_IN_USER:
    'No signed-in Mars Workbench user for this request. Ask the user to reconnect the Mars Workbench connector, then retry.',
  TEMPLATE_NOT_FOUND: (templateIds: string[]) =>
    `Template not found: ${templateIds.join(', ')}. No changes were made; use templateIds from get_planning_context.`,
  UNEXPECTED:
    'Mars Workbench hit an unexpected error. Call get_planning_context to see the current state before retrying.',
};
