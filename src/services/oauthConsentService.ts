import type {
  AuthOAuthConsentResponse,
  OAuthAuthorizationDetails,
} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import type {OAuthConsentRedirect, OAuthConsentRequest} from '@/types/oauth';
import {ConsentDecision} from '@/utils/oauthConsent';

/** The host the user returns to; the full URI when it has none (custom schemes). */
const getReturnHost = (redirectUri: string): string => {
  try {
    return new URL(redirectUri).host || redirectUri;
  } catch {
    return redirectUri;
  }
};

/** Only https logos are shown; anything else falls back to the initial. */
const getHttpsUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const getRedirectUrl = ({data, error}: AuthOAuthConsentResponse) =>
  error ? null : data.redirect_url;

const toConsentRequest = ({
  authorization_id: authorizationId,
  client,
  redirect_uri: redirectUri,
  scope,
  user,
}: OAuthAuthorizationDetails): OAuthConsentRequest => {
  const returnHost = getReturnHost(redirectUri);
  return {
    authorizationId,
    clientName: client.name || returnHost,
    clientLogoUrl: getHttpsUrl(client.logo_uri),
    returnHost,
    scopes: scope.split(' ').filter(Boolean),
    userEmail: user.email,
  };
};

/**
 * What the consent page shows for one authorization request, for the
 * signed-in user: the request to approve, a redirect when Supabase already
 * holds consent for it, or null when it is unknown, expired or decided.
 */
export async function getConsentRequestByAuthorizationId(
  authorizationId: string,
): Promise<OAuthConsentRequest | OAuthConsentRedirect | null> {
  const supabase = await createClient();
  const {data, error} =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error) return null;
  return 'authorization_id' in data
    ? toConsentRequest(data)
    : {redirectUrl: data.redirect_url};
}

/**
 * Records the user's decision with Supabase. Returns the client's redirect
 * URL — carrying the authorization code, or `error=access_denied` on deny —
 * or null when the request can no longer be decided.
 */
export async function submitConsentDecision(
  authorizationId: string,
  decision: ConsentDecision,
): Promise<string | null> {
  const supabase = await createClient();
  const {oauth} = supabase.auth;
  switch (decision) {
    case ConsentDecision.APPROVE:
      return getRedirectUrl(await oauth.approveAuthorization(authorizationId));
    case ConsentDecision.DENY:
      return getRedirectUrl(await oauth.denyAuthorization(authorizationId));
    default:
      throw new Error(`Unknown consent decision: ${decision satisfies never}`);
  }
}
