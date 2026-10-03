import type {McpServer} from '@modelcontextprotocol/server';
import {mcpEchoInputSchema} from '@/schemas';

/** Connectivity check for the MCP endpoint; replaced by the planning tools. */
export const registerEchoTool = (server: McpServer) => {
  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description:
        'Return the given message unchanged. Use only to verify that the Mars Workbench connection works.',
      inputSchema: mcpEchoInputSchema,
      annotations: {readOnlyHint: true, destructiveHint: false},
    },
    async ({message}) => ({content: [{type: 'text', text: message}]}),
  );
};
