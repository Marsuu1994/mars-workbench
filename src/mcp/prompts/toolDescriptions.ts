// Descriptions of the Mars Workbench MCP tools, read by the model next to the
// guide. LLM-facing — never translated.

import {ONE_OFF_BATCH_LIMIT} from '@/utils/oneOffUtils';
import {PROJECT_STEP_LIMIT} from '@/utils/projectUtils';

// Every tool but the guide opens with this: claude.ai hands the model no
// server instructions, so the guide is a tool the model has to call.
const READ_GUIDE_FIRST =
  "If you haven't read get_planning_guide_before_everything in this conversation, or no longer have it, call it first. ";

export const TOOL_DESCRIPTIONS = {
  GET_PLANNING_GUIDE_BEFORE_EVERYTHING:
    'How planning works in Mars Workbench: the rules, the three kinds of work (habits, projects, one-offs), how to plan a week, how to start something new, how to keep one-offs, and what each write changes. Call this before anything else in a conversation, and again if you no longer have it.',
  GET_PLANNING_CONTEXT:
    READ_GUIDE_FIRST +
    "Read what you need to plan the user's week, habits and projects in Mars Workbench: today's date and week; this week's active plan (its habits with type, frequency and progress so far, plus the one-off tasks and project steps on it); last week's finished plan with per-habit completion stats, its project steps and one-off tasks (done, and unfinished ones that can carry over); the user's habits (templates); their projects, each with its goal, progress and whole path of steps; and their unfinished one-off tasks on the priority matrix, each with its quadrant and whether it is on this week, last week or no week. Call it before you propose or change anything — the ids the other tools take come from here.",
  CREATE_PLAN:
    READ_GUIDE_FIRST +
    "Create this week's plan — only when get_planning_context shows no activePlan. Run existing habits by templateId in `templates`, add brand-new ones in `newTemplates`, and put UPCOMING project steps on the week with `addProjectStepIds`. Completes lastPlan and moves its unfinished one-off tasks and project steps into the new plan (all of them by default). Task instances and steps land in the user's backlog. Agree on the plan with the user before calling.",
  UPDATE_PLAN:
    READ_GUIDE_FIRST +
    "Change this week's active plan (activePlan.planId from get_planning_context); only what you pass changes. Removing a habit, or changing its type or frequency, deletes that habit's unfinished task instances (backlog, to-do) and regenerates them in the backlog; completed tasks are never touched. `addProjectStepIds` puts UPCOMING project steps in the backlog; `removeProjectStepIds` sends steps back to their project. Agree on the change with the user before calling.",
  UPDATE_HABIT:
    READ_GUIDE_FIRST +
    'Change a habit (templateId from get_planning_context): its title, description or size; only what you pass changes. It applies to task instances generated from now on; ones already generated keep their old title and size. How often it runs this week is set with update_plan instead. Agree on the change with the user before calling.',
  CREATE_PROJECT:
    READ_GUIDE_FIRST +
    `Create a project: a goal reached through a finite, ordered path of steps, such as a course or a book (repeating work with no end is a habit instead). Give its title, an optional goal and its steps in order, each with a title, a size and an optional description; aim for 10 steps or fewer, at most ${PROJECT_STEP_LIMIT}. Check get_planning_context's projects first so you don't create a second one for the same goal. Returns the project with every step's stepId, in order. Schedules nothing: put steps on the week afterwards with update_plan or create_plan. Agree on the project and its steps with the user before calling.`,
  UPDATE_PROJECT:
    READ_GUIDE_FIRST +
    "Change a project (projectId and stepIds from get_planning_context); only what you pass changes. Rename it or change its goal; add steps (at the end, or before a given step); edit, move or remove steps that aren't done; archive or unarchive it. Done steps are locked, and steps keep their order unless the user asks. Removing a step deletes it, and takes it off the board if it is on this week. Archiving takes every unfinished step off the week — archive only when the user asks. Agree on the change with the user before calling.",
  CREATE_ONE_OFF_TASKS:
    READ_GUIDE_FIRST +
    `Add one or more one-off tasks to the user's priority matrix — single tasks with nothing behind them (a finite list toward one goal is a project; repeating work is a habit). Give each a title, a size, a quadrant and an optional description; up to ${ONE_OFF_BATCH_LIMIT} per call. Check get_planning_context's oneOffTasks first so you don't add one twice. They land on no week; only the user tracks a one-off onto a week. Returns each task with its taskId, in order. Agree on the tasks and their quadrants with the user before calling.`,
  UPDATE_ONE_OFF_TASKS:
    READ_GUIDE_FIRST +
    "Mark the user's one-off tasks done (completeTaskIds) or move them to another quadrant (reprioritizeTasks), by taskId from get_planning_context; unfinished tasks only. Done is final — the user can't undo it — so pass only the tasks the user said are done. A task done while on no week counts toward this week's active plan, if there is one. It never puts a task on a week or takes one off: update_plan's removeOneOffTaskIds sends a task on this week back to the matrix. Agree on the change with the user before calling.",
};
