import type {McpServer} from '@modelcontextprotocol/server';
import {getPlanningContext} from '@/services/planningService';
import {runTool} from '../runTool';

/** The snapshot every planning conversation starts from. */
export const registerGetPlanningContextTool = (server: McpServer) => {
  server.registerTool(
    'get_planning_context',
    {
      title: 'Get planning context',
      description:
        "Read what you need to plan the user's week in Mars Workbench: today's date and week; this week's active plan (its templates with type, frequency and progress so far, plus attached one-off tasks); last week's finished plan with per-template completion stats and the one-off tasks that carry over; and the user's reusable templates. Call it first whenever you plan or change a plan — the ids the other tools take come from here.",
      // The week sync it runs first is the same idempotent catch-up every
      // page view runs; it changes nothing the user decided.
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ctx => runTool(ctx, getPlanningContext),
  );
};
