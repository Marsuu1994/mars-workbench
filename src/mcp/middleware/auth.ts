import {z} from 'zod';
import type {AuthInfo, ServerContext} from '@modelcontextprotocol/server';

const DEV_CLIENT_ID = 'mcp-dev-identity';

/**
 * Local-development identity until token auth lands: tool calls act as
 * `MCP_DEV_USER_ID`. It fills the same `request.auth` slot the token verifier
 * will, so the tools stay unchanged when it does. Undefined when the variable
 * is unset or not a UUID.
 */
export const getDevAuthInfo = (): AuthInfo | undefined => {
  const {success, data: userId} = z
    .string()
    .uuid()
    .safeParse(process.env.MCP_DEV_USER_ID);
  if (!success) return undefined;
  return {token: 'dev', clientId: DEV_CLIENT_ID, scopes: [], extra: {userId}};
};

/** The user a tool call acts for, or null when the request has no identity. */
export const getMcpUserId = (context: ServerContext): string | null => {
  const userId = context.http?.authInfo?.extra?.userId;
  return typeof userId === 'string' ? userId : null;
};
