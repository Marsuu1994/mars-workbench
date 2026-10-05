export const MCP_SERVER_INFO = {name: 'mars-workbench', version: '0.1.0'};

/**
 * Vercel environments where `/api/mcp` answers 404. Production stays dark
 * until the OAuth layer lands, so no unauthenticated endpoint ever ships there;
 * local dev and preview deployments keep it reachable for validation.
 */
export const MCP_DISABLED_VERCEL_ENVS = ['production'];
