import {createMcpHandler, withMcpAuth} from 'mcp-handler';
import {registerTools} from '@/mcp/registerTools';
import {verifyMcpAccessToken} from '@/mcp/middleware/auth';
import {MCP_RESOURCE_METADATA_PATH, MCP_SERVER_INFO} from '@/mcp/constants';
import {MCP_SERVER_INSTRUCTIONS} from '@/mcp/prompts/serverInstructions';

const mcpHandler = createMcpHandler(registerTools, {
  serverInfo: MCP_SERVER_INFO,
  instructions: MCP_SERVER_INSTRUCTIONS,
});

/**
 * Every request needs a verified Supabase OAuth access token (local
 * development may act as `MCP_DEV_USER_ID` instead). Without one the answer is
 * 401 with a `WWW-Authenticate` pointing at the protected-resource metadata,
 * from which the client finds Supabase's authorization server.
 */
const handleMcpRequest = withMcpAuth(mcpHandler, verifyMcpAccessToken, {
  required: true,
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
