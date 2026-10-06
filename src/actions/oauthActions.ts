'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {authorizationIdSchema, submitConsentDecisionSchema} from '@/schemas';
import {
  getConsentRequestByAuthorizationId,
  signOutOnThisDevice,
  submitConsentDecision,
} from '@/services/oauthConsentService';
import {LOGIN_PATH, withNextParam} from '@/utils/authRedirect';
import {CONSENT_PATH, getConsentPath} from '@/utils/oauthConsent';

/** Load one authorization request for `/oauth/consent`. See OAuth Consent Flow. */
export async function getConsentRequestAction(authorizationId: string) {
  const parsedAuthorizationId = authorizationIdSchema.parse(authorizationId);
  return getConsentRequestByAuthorizationId(parsedAuthorizationId);
}

/**
 * Approve or deny an authorization request, then send the browser back to
 * the client. A request that can no longer be decided (expired, already
 * used) re-renders the page, which re-reads it into the invalid-link state.
 */
export async function submitConsentDecisionAction(
  authorizationId: string,
  decision: string,
): Promise<void> {
  const parsed = submitConsentDecisionSchema.parse({authorizationId, decision});
  const redirectUrl = await submitConsentDecision(
    parsed.authorizationId,
    parsed.decision,
  );
  if (redirectUrl) {
    redirect(redirectUrl);
  }
  revalidatePath(CONSENT_PATH);
}

/**
 * "Switch account": sign out on this device and return to the login page,
 * which brings the newly signed-in user back to the same request.
 */
export async function switchConsentAccountAction(
  authorizationId: string,
): Promise<void> {
  const parsedAuthorizationId = authorizationIdSchema.parse(authorizationId);
  await signOutOnThisDevice();
  redirect(withNextParam(LOGIN_PATH, getConsentPath(parsedAuthorizationId)));
}
