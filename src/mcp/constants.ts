export const MCP_SERVER_INFO = {name: 'mars-workbench', version: '0.3.0'};

/**
 * Where the `/api/mcp` resource's RFC 9728 metadata lives (the well-known
 * prefix inserted before the resource path). The endpoint's 401 points MCP
 * clients here; served by `app/.well-known/oauth-protected-resource/api/mcp`.
 */
export const MCP_RESOURCE_METADATA_PATH =
  '/.well-known/oauth-protected-resource/api/mcp';

/**
 * Environments where a request without a bearer token acts as
 * `MCP_DEV_USER_ID`. Local development only: the OAuth flow can't finish
 * there (Supabase sends consent to the Site URL), and a deployment must never
 * serve a tool call without a verified token.
 */
export const MCP_DEV_IDENTITY_VERCEL_ENVS = ['development'];
