import {z} from 'zod';
import type {AuthInfo, ServerContext} from '@modelcontextprotocol/server';
import {getStatelessClient} from '@/lib/supabase/stateless';
import {MCP_DEV_IDENTITY_VERCEL_ENVS} from '../constants';

const DEV_CLIENT_ID = 'mcp-dev-identity';

/**
 * The claims `/api/mcp` relies on. `client_id` is only in tokens Supabase's
 * OAuth server issues to a client, so the user's own browser-session token
 * is rejected. Scopes are left out: they are OIDC ones (openid, email…) and
 * never gate a tool.
 */
const oauthAccessTokenClaimsSchema = z.object({
  iss: z.string(),
  sub: z.string().uuid(),
  client_id: z.string().min(1),
  exp: z.number(),
});

/**
 * Supabase Auth's issuer URL: the OAuth authorization server MCP clients get
 * their tokens from, and the `iss` every accepted token must carry.
 */
export const getAuthorizationServerUrl = () =>
  new URL('/auth/v1', process.env.NEXT_PUBLIC_SUPABASE_URL).href;

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

/**
 * Local-development identity for requests without a bearer token: tool calls
 * act as `MCP_DEV_USER_ID`. Undefined when the variable is unset or not a
 * UUID.
 */
const getDevAuthInfo = (): AuthInfo | undefined => {
  const {success, data: userId} = z
    .string()
    .uuid()
    .safeParse(process.env.MCP_DEV_USER_ID);
  if (!success) return undefined;
  return {token: 'dev', clientId: DEV_CLIENT_ID, scopes: [], extra: {userId}};
};

/**
 * The token's claims once its signature and expiry check out, else undefined.
 * Expired and undecodable tokens make `getClaims` throw rather than return an
 * error; they are ordinary invalid tokens (an expired one is routine before
 * the client refreshes), so they get a 401 without a logged stack trace.
 */
const getVerifiedClaims = async (bearerToken: string): Promise<unknown> => {
  try {
    const {data} = await getStatelessClient().auth.getClaims(bearerToken);
    return data?.claims;
  } catch {
    return undefined;
  }
};

/**
 * `withMcpAuth`'s verifier. A bearer token must be a Supabase OAuth access
 * token from this project: `getClaims` checks its signature against the
 * project's JWKS (cached, no Auth round trip) and its expiry, then the issuer
 * and `client_id` are checked here. No token falls back to the dev identity in
 * local development only. Undefined makes `withMcpAuth` answer 401.
 */
export const verifyMcpAccessToken = async (
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) {
    const isLocalDevelopment =
      MCP_DEV_IDENTITY_VERCEL_ENVS.includes(getDeploymentEnv());
    return isLocalDevelopment ? getDevAuthInfo() : undefined;
  }

  const {success, data: claims} = oauthAccessTokenClaimsSchema.safeParse(
    await getVerifiedClaims(bearerToken),
  );
  if (!success || claims.iss !== getAuthorizationServerUrl()) return undefined;

  const {sub: userId, client_id: clientId, exp: expiresAt} = claims;
  return {
    token: bearerToken,
    clientId,
    scopes: [],
    expiresAt,
    extra: {userId},
  };
};

/** The user a tool call acts for, or null when the request has no identity. */
export const getMcpUserId = (context: ServerContext): string | null => {
  const userId = context.http?.authInfo?.extra?.userId;
  return typeof userId === 'string' ? userId : null;
};
