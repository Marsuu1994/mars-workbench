import type {McpServer} from '@modelcontextprotocol/server';
import {planSpecSchema} from '@/schemas';
import {createPlanFromSpec} from '@/services/planningService';
import {runTool} from '../runTool';

export const registerCreatePlanTool = (server: McpServer) => {
  server.registerTool(
    'create_plan',
    {
      title: 'Create plan',
      description:
        "Create this week's plan — only when get_planning_context shows no activePlan. Run existing templates by templateId in `templates` and add brand-new ones in `newTemplates`. Completes lastPlan and moves its unfinished one-off tasks into the new plan (all of them by default). Task instances are generated into the user's backlog. Agree on the plan with the user before calling.",
      inputSchema: planSpecSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (spec, ctx) =>
      runTool(ctx, userId => createPlanFromSpec(userId, spec)),
  );
};
