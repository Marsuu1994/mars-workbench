// Descriptions of the Mars Workbench MCP tools, read by the model next to the
// guide. LLM-facing — never translated.

import {PROJECT_STEP_LIMIT} from '@/utils/projectUtils';

// Every tool but the guide opens with this: claude.ai hands the model no
// server instructions, so the guide is a tool the model has to call.
const READ_GUIDE_FIRST =
  "If you haven't read get_planning_guide_before_everything in this conversation, or no longer have it, call it first. ";

export const TOOL_DESCRIPTIONS = {
  GET_PLANNING_GUIDE_BEFORE_EVERYTHING:
    'How planning works in Mars Workbench: the rules, the three kinds of work (habits, projects, one-offs), how to plan a week, how to start something new, and what each write changes. Call this before anything else in a conversation, and again if you no longer have it.',
  GET_PLANNING_CONTEXT:
    READ_GUIDE_FIRST +
    "Read what you need to plan the user's week, habits and projects in Mars Workbench: today's date and week; this week's active plan (its habits with type, frequency and progress so far, plus the one-off tasks and project steps on it); last week's finished plan with per-habit completion stats, its project steps (done, and unfinished ones that can carry over) and the one-off tasks that carry over; the user's habits (templates); and their projects, each with its goal, progress and whole path of steps. Call it before you propose or change anything — the ids the other tools take come from here.",
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
};
