import type {CallToolResult, ServerContext} from '@modelcontextprotocol/server';
import {PlanningError} from '@/services/planningService';
import {TemplateNotFoundError} from '@/services/planService';
import {MCP_ERROR} from '@/utils/errorMessages';
import {getMcpUserId} from './auth';

const buildErrorResult = (message: string): CallToolResult => ({
  content: [{type: 'text', text: message}],
  isError: true,
});

/**
 * Run a tool's function as the calling user and shape its MCP result: the
 * returned object as JSON (text + structuredContent); planning errors as
 * `isError` results the model can act on; anything else logged and reported
 * generically, so no database detail reaches the client.
 */
export const runTool = async (
  context: ServerContext,
  toolFunction: (userId: string) => Promise<Record<string, unknown>>,
): Promise<CallToolResult> => {
  const userId = getMcpUserId(context);
  if (!userId) return buildErrorResult(MCP_ERROR.NO_SIGNED_IN_USER);

  try {
    const result = await toolFunction(userId);
    return {
      content: [{type: 'text', text: JSON.stringify(result, null, 2)}],
      structuredContent: result,
    };
  } catch (error) {
    if (error instanceof PlanningError) return buildErrorResult(error.message);
    if (error instanceof TemplateNotFoundError) {
      return buildErrorResult(MCP_ERROR.TEMPLATE_NOT_FOUND(error.templateIds));
    }
    console.error('MCP tool failed:', error);
    return buildErrorResult(MCP_ERROR.UNEXPECTED);
  }
};
