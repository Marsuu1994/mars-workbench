import type {McpServer} from '@modelcontextprotocol/server';
import {oneOffTasksSpecSchema} from '@/schemas';
import {createOneOffTasks} from '@/services/oneOffPlanningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerCreateOneOffTasksTool = (server: McpServer) => {
  server.registerTool(
    'create_one_off_tasks',
    {
      title: 'Create one-off tasks',
      description: TOOL_DESCRIPTIONS.CREATE_ONE_OFF_TASKS,
      inputSchema: oneOffTasksSpecSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (oneOffTasksSpec, context) =>
      runTool(context, userId => createOneOffTasks(userId, oneOffTasksSpec)),
  );
};
