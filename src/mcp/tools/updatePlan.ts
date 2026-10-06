import type {McpServer} from '@modelcontextprotocol/server';
import {planPatchSchema} from '@/schemas';
import {patchActivePlan} from '@/services/planningService';
import {runTool} from '../runTool';

export const registerUpdatePlanTool = (server: McpServer) => {
  server.registerTool(
    'update_plan',
    {
      title: 'Update plan',
      description:
        "Change this week's active plan; only what you pass changes. Removing a template, or changing its type or frequency, deletes that template's unfinished task instances (backlog, to-do, in progress) and regenerates them in the backlog; completed tasks are never touched. Agree on the change with the user before calling.",
      inputSchema: planPatchSchema,
      // Removing or reconfiguring a template deletes its unfinished instances.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (patch, ctx) =>
      runTool(ctx, userId => patchActivePlan(userId, patch)),
  );
};
