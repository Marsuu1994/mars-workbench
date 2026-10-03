import {NextResponse} from 'next/server';
import {createMcpHandler} from 'mcp-handler';
import {registerTools} from '@/mcp/registerTools';
import {MCP_DISABLED_VERCEL_ENVS, MCP_SERVER_INFO} from '@/mcp/constants';

const mcpHandler = createMcpHandler(registerTools, {
  serverInfo: MCP_SERVER_INFO,
});

/**
 * Fails closed: a production build with no `VERCEL_ENV` (e.g. a local
 * `next start`, or system env vars not exposed) counts as production.
 */
const isMcpDisabled = () => {
  const {VERCEL_ENV, NODE_ENV} = process.env;
  const deploymentEnv =
    VERCEL_ENV ?? (NODE_ENV === 'production' ? 'production' : 'development');
  return MCP_DISABLED_VERCEL_ENVS.includes(deploymentEnv);
};

const handleMcpRequest = async (request: Request) => {
  if (isMcpDisabled()) {
    return NextResponse.json({error: 'Not found'}, {status: 404});
  }
  return mcpHandler(request);
};

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
