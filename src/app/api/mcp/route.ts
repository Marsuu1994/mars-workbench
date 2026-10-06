import {NextResponse} from 'next/server';
import {createMcpHandler} from 'mcp-handler';
import {registerTools} from '@/mcp/registerTools';
import {getDevAuthInfo} from '@/mcp/auth';
import {
  MCP_DEV_IDENTITY_VERCEL_ENVS,
  MCP_DISABLED_VERCEL_ENVS,
  MCP_SERVER_INFO,
} from '@/mcp/constants';
import {MCP_SERVER_INSTRUCTIONS} from '@/prompt/mcpServerInstructions';

const mcpHandler = createMcpHandler(registerTools, {
  serverInfo: MCP_SERVER_INFO,
  instructions: MCP_SERVER_INSTRUCTIONS,
});

/**
 * Fails closed: a production build with no `VERCEL_ENV` (e.g. a local
 * `next start`, or system env vars not exposed) counts as production.
 */
const getDeploymentEnv = () => {
  const {VERCEL_ENV, NODE_ENV} = process.env;
  return (
    VERCEL_ENV ?? (NODE_ENV === 'production' ? 'production' : 'development')
  );
};

const handleMcpRequest = async (request: Request) => {
  const deploymentEnv = getDeploymentEnv();
  if (MCP_DISABLED_VERCEL_ENVS.includes(deploymentEnv)) {
    return NextResponse.json({error: 'Not found'}, {status: 404});
  }
  // Until token auth lands, only local development has a user: the dev
  // identity. Every deployment serves tool calls with no identity.
  if (MCP_DEV_IDENTITY_VERCEL_ENVS.includes(deploymentEnv)) {
    request.auth = getDevAuthInfo();
  }
  return mcpHandler(request);
};

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
