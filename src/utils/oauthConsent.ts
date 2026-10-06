/**
 * The OAuth authorization page Supabase sends users to when an MCP client
 * (Claude) asks to connect. Must match Authentication → OAuth Server →
 * Authorization path in the Supabase dashboard.
 */
export const CONSENT_PATH = '/oauth/consent';

/** Query parameter Supabase appends to identify the authorization request. */
export const AUTHORIZATION_ID_PARAM = 'authorization_id';

/**
 * Supabase issues alphanumeric ids; the SDK interpolates the id into its API
 * path unescaped, so anything outside this set is rejected before the call.
 */
export const AUTHORIZATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const ConsentDecision = {
  APPROVE: 'approve',
  DENY: 'deny',
} as const;
export type ConsentDecision =
  (typeof ConsentDecision)[keyof typeof ConsentDecision];

/** The consent page for one authorization request. */
export const getConsentPath = (authorizationId: string): string =>
  `${CONSENT_PATH}?${new URLSearchParams({[AUTHORIZATION_ID_PARAM]: authorizationId})}`;
