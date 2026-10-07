import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from 'mcp-handler';
import {getAuthorizationServerUrl} from '@/mcp/middleware/auth';

/**
 * RFC 9728 protected-resource metadata for `/api/mcp`, where the endpoint's
 * 401 sends MCP clients: `resource` is the endpoint's public URL (derived from
 * the request, so previews name themselves) and `authorization_servers` names
 * Supabase Auth, which issues the tokens.
 */
const handleMetadataRequest = (request: Request) =>
  protectedResourceHandler({
    authServerUrls: [getAuthorizationServerUrl()],
  })(request);

export const GET = handleMetadataRequest;
export const OPTIONS = metadataCorsOptionsRequestHandler();
