import type {McpServer} from '@modelcontextprotocol/server';
import {runTool} from '../middleware/runTool';
import {MCP_SERVER_INSTRUCTIONS} from '../prompts/serverInstructions';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

/**
 * The guide as a tool: claude.ai hands the model no server instructions from
 * remote connectors, so the model reads them here. Its name says when.
 */
export const registerGetPlanningGuideTool = (server: McpServer) => {
  server.registerTool(
    'get_planning_guide_before_everything',
    {
      title: 'Get planning guide',
      description: TOOL_DESCRIPTIONS.GET_PLANNING_GUIDE_BEFORE_EVERYTHING,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async context =>
      runTool(context, async () => ({guide: MCP_SERVER_INSTRUCTIONS})),
  );
};
