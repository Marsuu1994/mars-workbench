import type {McpServer} from '@modelcontextprotocol/server';
import {registerEchoTool} from './tools/echo';

/** Every tool the Mars Workbench MCP server exposes. */
export const registerTools = (server: McpServer) => {
  registerEchoTool(server);
};
