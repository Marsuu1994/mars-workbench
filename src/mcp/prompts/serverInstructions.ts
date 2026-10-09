// Server-level instructions of the Mars Workbench MCP server: sent to clients
// at connection time (initialize / server/discover) and read by the model next
// to the tool descriptions. LLM-facing — never translated.
export const MCP_SERVER_INSTRUCTIONS = `Mars Workbench is the user's weekly kanban planner. These tools let you plan the user's week together with them.

# Workflow
1. Call get_planning_context first, every time you plan or change a plan. It reflects today's date and catches the week up (a finished week's plan becomes lastPlan). Use only the ids it returns.
2. No activePlan: propose a new week and create it with create_plan. An activePlan: propose changes and apply them with update_plan, passing activePlan.planId.
3. Talk the proposal through with the user, and call create_plan or update_plan only after they agree. Afterwards, tell them what changed.

# How a plan works
- A plan covers one ISO week (Monday to Sunday). Each line is a reusable task template plus how it runs this week.
- A template is its title, description and size. Size sets effort and points: EXTRA_SMALL ~1h = 1 pt, SMALL ~2h = 2, MEDIUM ~3h = 3, LARGE ~5h = 5, EXTRA_LARGE ~8h = 8. Prefer SMALL to MEDIUM; split larger work into smaller templates.
- type and frequency are chosen per week, not part of the template: DAILY × n is n task instances every day; WEEKLY × n is n instances across the whole week. Frequency runs from 1 to 10. "Three times a week" is WEEKLY × 3, never DAILY × 3.
- mode: NORMAL generates daily instances on weekdays only; EXTREME every day, weekends included.
- Generated instances start in the user's backlog; the user pulls them onto the board.
- One-off tasks live on the user's priority matrix. These tools only carry over or drop the ones attached to a plan; they never create one-off tasks.

# Planning well
- Reuse existing templates (by templateId) instead of creating near-duplicates; create a new template only when nothing fits. Never invent or alter an id.
- Calibrate with lastPlan: a low completionRate or many expired instances means the user over-committed, so ease the frequency or drop the template; a high completionRate leaves room to add. The user's stated goals override the stats.
- Keep the load realistic for the days left in the week.

# Tell the user before writing
- create_plan completes lastPlan and moves its unfinished one-off tasks into the new plan (all of them unless carryOverAdhocTaskIds narrows it; the rest return to the priority matrix).
- update_plan: removing a template, or changing its type or frequency, deletes that template's unfinished instances (backlog, to-do) and regenerates them in the backlog; completed tasks are kept. Removing a one-off task sends it back to the priority matrix.`;
