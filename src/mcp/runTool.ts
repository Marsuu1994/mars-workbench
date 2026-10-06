import type {CallToolResult, ServerContext} from '@modelcontextprotocol/server';
import {PlanningError} from '@/services/planningService';
import {TemplateNotFoundError} from '@/services/planService';
import {getMcpUserId} from './auth';

const NO_IDENTITY_MESSAGE =
  'No signed-in Mars Workbench user. In local development, set MCP_DEV_USER_ID to a Supabase user id and restart the server.';
const UNEXPECTED_ERROR_MESSAGE =
  'Mars Workbench hit an unexpected error. Call get_planning_context to see the current state before retrying.';

const toolError = (text: string): CallToolResult => ({
  content: [{type: 'text', text}],
  isError: true,
});

/**
 * Run a tool body as the calling user and shape its MCP result: the returned
 * object as JSON (text + structuredContent); planning errors as `isError`
 * results the model can act on; anything else logged and reported generically,
 * so no database detail reaches the client.
 */
export const runTool = async (
  ctx: ServerContext,
  body: (userId: string) => Promise<Record<string, unknown>>,
): Promise<CallToolResult> => {
  const userId = getMcpUserId(ctx);
  if (!userId) return toolError(NO_IDENTITY_MESSAGE);

  try {
    const data = await body(userId);
    return {
      content: [{type: 'text', text: JSON.stringify(data, null, 2)}],
      structuredContent: data,
    };
  } catch (error) {
    if (error instanceof PlanningError) return toolError(error.message);
    if (error instanceof TemplateNotFoundError) {
      return toolError(
        `${error.message}. No changes were made; use templateIds from get_planning_context.`,
      );
    }
    console.error('MCP tool failed:', error);
    return toolError(UNEXPECTED_ERROR_MESSAGE);
  }
};
