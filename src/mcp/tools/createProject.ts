import type {McpServer} from '@modelcontextprotocol/server';
import {projectSpecSchema} from '@/schemas';
import {createProjectFromSpec} from '@/services/projectPlanningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerCreateProjectTool = (server: McpServer) => {
  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description: TOOL_DESCRIPTIONS.CREATE_PROJECT,
      inputSchema: projectSpecSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (projectSpec, context) =>
      runTool(context, userId => createProjectFromSpec(userId, projectSpec)),
  );
};
