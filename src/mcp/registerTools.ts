import type {McpServer} from '@modelcontextprotocol/server';
import {registerGetPlanningGuideTool} from './tools/getPlanningGuide';
import {registerGetPlanningContextTool} from './tools/getPlanningContext';
import {registerCreatePlanTool} from './tools/createPlan';
import {registerUpdatePlanTool} from './tools/updatePlan';
import {registerUpdateHabitTool} from './tools/updateHabit';
import {registerCreateProjectTool} from './tools/createProject';
import {registerUpdateProjectTool} from './tools/updateProject';

/** Every tool the Mars Workbench MCP server exposes; the guide comes first. */
export const registerTools = (server: McpServer) => {
  registerGetPlanningGuideTool(server);
  registerGetPlanningContextTool(server);
  registerCreatePlanTool(server);
  registerUpdatePlanTool(server);
  registerUpdateHabitTool(server);
  registerCreateProjectTool(server);
  registerUpdateProjectTool(server);
};
