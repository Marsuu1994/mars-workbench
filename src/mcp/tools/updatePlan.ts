import type {McpServer} from '@modelcontextprotocol/server';
import {planPatchSchema} from '@/schemas';
import {patchActivePlan} from '@/services/planningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerUpdatePlanTool = (server: McpServer) => {
  server.registerTool(
    'update_plan',
    {
      title: 'Update plan',
      description: TOOL_DESCRIPTIONS.UPDATE_PLAN,
      inputSchema: planPatchSchema,
      // Removing or reconfiguring a template deletes its unfinished instances.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (planPatch, context) =>
      runTool(context, userId => patchActivePlan(userId, planPatch)),
  );
};
