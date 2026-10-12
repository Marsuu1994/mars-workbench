import {redirect} from 'next/navigation';
import {getSessionClaims} from './getSessionClaims';

/**
 * Resolve the authenticated user's id for use in the data layer.
 *
 * Auth is resolved only at the entry boundary (Server Actions and Server
 * Component pages); the id is then passed explicitly into services and the DAL,
 * which stay auth-agnostic. The id is the verified token's `sub`, checked once
 * per request (see getSessionClaims).
 *
 * If there is no session, this redirects to the login page. `redirect()` throws
 * a `NEXT_REDIRECT` control-flow error and never returns — do NOT wrap calls to
 * this in a broad try/catch that would swallow it.
 */
export async function getCurrentUserId(): Promise<string> {
  const claims = await getSessionClaims();

  if (!claims) {
    redirect('/auth/login');
  }

  return claims.sub;
}
