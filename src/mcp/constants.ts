export const MCP_SERVER_INFO = {name: 'mars-workbench', version: '0.2.0'};

/**
 * Vercel environments where `/api/mcp` answers 404. Production stays dark
 * until the OAuth layer lands, so no unauthenticated endpoint ever ships there;
 * local dev and preview deployments keep it reachable for validation.
 */
export const MCP_DISABLED_VERCEL_ENVS = ['production'];

/**
 * Environments where tool calls act as `MCP_DEV_USER_ID` until token auth
 * lands. Local development only: preview URLs are public and share the
 * production database, so a deployment never carries the dev identity.
 */
export const MCP_DEV_IDENTITY_VERCEL_ENVS = ['development'];
