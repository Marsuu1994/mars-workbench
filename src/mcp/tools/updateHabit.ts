import type {McpServer} from '@modelcontextprotocol/server';
import {habitPatchSchema} from '@/schemas';
import {updateHabit} from '@/services/planningService';
import {runTool} from '../middleware/runTool';
import {TOOL_DESCRIPTIONS} from '../prompts/toolDescriptions';

export const registerUpdateHabitTool = (server: McpServer) => {
  server.registerTool(
    'update_habit',
    {
      title: 'Update habit',
      description: TOOL_DESCRIPTIONS.UPDATE_HABIT,
      inputSchema: habitPatchSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (habitPatch, context) =>
      runTool(context, userId => updateHabit(userId, habitPatch)),
  );
};
