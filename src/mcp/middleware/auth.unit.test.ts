import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getStatelessClient} from '@/lib/supabase/stateless';
import {getAuthorizationServerUrl, verifyMcpAccessToken} from './auth';

vi.mock('@/lib/supabase/stateless', () => ({getStatelessClient: vi.fn()}));

const SUPABASE_URL = 'http://127.0.0.1:54321';
const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '7c1f2b4e-8a3d-4f6a-9b2c-1d5e8f7a6b3c';
const request = new Request('http://localhost:3000/api/mcp', {method: 'POST'});

/** Makes Supabase's getClaims return these claims, or throw. */
const mockClaims = (claims: object | Error) => {
  const getClaims = vi.fn(async () => {
    if (claims instanceof Error) throw claims;
    return {data: {claims}};
  });
  vi.mocked(getStatelessClient).mockReturnValue({
    auth: {getClaims},
  } as unknown as ReturnType<typeof getStatelessClient>);
};

const validClaims = () => ({
  iss: getAuthorizationServerUrl(),
  sub: USER_ID,
  client_id: 'claude',
  exp: 1_900_000_000,
});

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  vi.stubEnv('MCP_DEV_USER_ID', DEV_USER_ID);
  vi.stubEnv('VERCEL_ENV', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyMcpAccessToken without a token', () => {
  it('acts as MCP_DEV_USER_ID in local development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(await verifyMcpAccessToken(request)).toMatchObject({
      extra: {userId: DEV_USER_ID},
    });
  });

  it('refuses in production, a local `next start` included', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(await verifyMcpAccessToken(request)).toBeUndefined();
  });

  it('refuses on a Vercel preview', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await verifyMcpAccessToken(request)).toBeUndefined();
  });

  it('refuses when MCP_DEV_USER_ID is not a uuid', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('MCP_DEV_USER_ID', 'dev');
    expect(await verifyMcpAccessToken(request)).toBeUndefined();
  });
});

describe('verifyMcpAccessToken with a bearer token', () => {
  it("accepts this project's OAuth access token", async () => {
    mockClaims(validClaims());
    expect(await verifyMcpAccessToken(request, 'token')).toEqual({
      token: 'token',
      clientId: 'claude',
      scopes: [],
      expiresAt: 1_900_000_000,
      extra: {userId: USER_ID},
    });
  });

  it('rejects a token from another issuer', async () => {
    mockClaims({...validClaims(), iss: 'https://other.supabase.co/auth/v1'});
    expect(await verifyMcpAccessToken(request, 'token')).toBeUndefined();
  });

  it("rejects the user's own browser-session token (no client_id)", async () => {
    mockClaims({...validClaims(), client_id: undefined});
    expect(await verifyMcpAccessToken(request, 'token')).toBeUndefined();
  });

  it('rejects an expired or undecodable token without throwing', async () => {
    mockClaims(new Error('JWT expired'));
    expect(await verifyMcpAccessToken(request, 'token')).toBeUndefined();
  });
});
