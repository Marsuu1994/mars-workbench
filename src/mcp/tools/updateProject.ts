import type {McpServer} from '@modelcontextprotocol/server';
import {projectPatchSchema} from '@/schemas';
import {patchProject} from '@/services/projectPlanningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerUpdateProjectTool = (server: McpServer) => {
  server.registerTool(
    'update_project',
    {
      title: 'Update project',
      description: TOOL_DESCRIPTIONS.UPDATE_PROJECT,
      inputSchema: projectPatchSchema,
      // Removing steps deletes them; archiving takes steps off the week.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (projectPatch, context) =>
      runTool(context, userId => patchProject(userId, projectPatch)),
  );
};
