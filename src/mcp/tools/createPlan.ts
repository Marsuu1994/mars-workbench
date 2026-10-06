import type {McpServer} from '@modelcontextprotocol/server';
import {planSpecSchema} from '@/schemas';
import {createPlanFromSpec} from '@/services/planningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerCreatePlanTool = (server: McpServer) => {
  server.registerTool(
    'create_plan',
    {
      title: 'Create plan',
      description: TOOL_DESCRIPTIONS.CREATE_PLAN,
      inputSchema: planSpecSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (planSpec, context) =>
      runTool(context, userId => createPlanFromSpec(userId, planSpec)),
  );
};
