// Descriptions of the Mars Workbench MCP tools, read by the model next to the
// server instructions. LLM-facing — never translated.
export const TOOL_DESCRIPTIONS = {
  GET_PLANNING_CONTEXT:
    "Read what you need to plan the user's week in Mars Workbench: today's date and week; this week's active plan (its templates with type, frequency and progress so far, plus attached one-off tasks); last week's finished plan with per-template completion stats and the one-off tasks that carry over; and the user's reusable templates. Call it first whenever you plan or change a plan — the ids the other tools take come from here.",
  CREATE_PLAN:
    "Create this week's plan — only when get_planning_context shows no activePlan. Run existing templates by templateId in `templates` and add brand-new ones in `newTemplates`. Completes lastPlan and moves its unfinished one-off tasks into the new plan (all of them by default). Task instances are generated into the user's backlog. Agree on the plan with the user before calling.",
  UPDATE_PLAN:
    "Change this week's active plan; only what you pass changes. Removing a template, or changing its type or frequency, deletes that template's unfinished task instances (backlog, to-do, in progress) and regenerates them in the backlog; completed tasks are never touched. Agree on the change with the user before calling.",
};
