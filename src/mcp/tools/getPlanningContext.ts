import type {McpServer} from '@modelcontextprotocol/server';
import {getPlanningContext} from '@/services/planningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

/** The snapshot every planning conversation starts from. */
export const registerGetPlanningContextTool = (server: McpServer) => {
  server.registerTool(
    'get_planning_context',
    {
      title: 'Get planning context',
      description: TOOL_DESCRIPTIONS.GET_PLANNING_CONTEXT,
      // The week sync it runs first is the same idempotent catch-up every
      // page view runs; it changes nothing the user decided.
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async context => runTool(context, getPlanningContext),
  );
};
