import {redirect} from 'next/navigation';
import {
  getConsentRequestAction,
  submitConsentDecisionAction,
  switchConsentAccountAction,
} from '@/actions/oauthActions';
import {ConsentInvalidScreen} from '@/components/domain/auth/ConsentInvalidScreen';
import {ConsentScreen} from '@/components/domain/auth/ConsentScreen';
import {authorizationIdSchema} from '@/schemas';

interface ConsentPageProps {
  searchParams: Promise<{authorization_id?: string | string[]}>;
}

/**
 * Where Supabase's OAuth 2.1 server sends the user when a client (Claude)
 * asks to connect. Signed-out visitors never reach it: the proxy sends them
 * through login and back here. See OAuth Consent Flow.
 */
export default async function ConsentPage({searchParams}: ConsentPageProps) {
  const {authorization_id: authorizationIdParam} = await searchParams;
  const {success, data: authorizationId} =
    authorizationIdSchema.safeParse(authorizationIdParam);
  if (!success) {
    return <ConsentInvalidScreen />;
  }

  const consent = await getConsentRequestAction(authorizationId);
  if (!consent) {
    return <ConsentInvalidScreen />;
  }
  if ('redirectUrl' in consent) {
    redirect(consent.redirectUrl);
  }

  return (
    <ConsentScreen
      request={consent}
      onDecision={submitConsentDecisionAction.bind(null, authorizationId)}
      onSwitchAccount={switchConsentAccountAction.bind(null, authorizationId)}
    />
  );
}
