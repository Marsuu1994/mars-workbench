import type {McpServer} from '@modelcontextprotocol/server';
import {registerGetPlanningContextTool} from './tools/getPlanningContext';
import {registerCreatePlanTool} from './tools/createPlan';
import {registerUpdatePlanTool} from './tools/updatePlan';

/** Every tool the Mars Workbench MCP server exposes. */
export const registerTools = (server: McpServer) => {
  registerGetPlanningContextTool(server);
  registerCreatePlanTool(server);
  registerUpdatePlanTool(server);
};
