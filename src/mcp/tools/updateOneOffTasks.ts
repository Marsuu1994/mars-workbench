import type {McpServer} from '@modelcontextprotocol/server';
import {oneOffTasksPatchSchema} from '@/schemas';
import {patchOneOffTasks} from '@/services/oneOffPlanningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerUpdateOneOffTasksTool = (server: McpServer) => {
  server.registerTool(
    'update_one_off_tasks',
    {
      title: 'Update one-off tasks',
      description: TOOL_DESCRIPTIONS.UPDATE_ONE_OFF_TASKS,
      inputSchema: oneOffTasksPatchSchema,
      // Marking a task done can't be undone.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (oneOffTasksPatch, context) =>
      runTool(context, userId => patchOneOffTasks(userId, oneOffTasksPatch)),
  );
};
