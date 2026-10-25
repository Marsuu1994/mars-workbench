'use server';

import {ensureSynced} from '../services/syncService';
import {getSessionClaims} from '@/lib/auth/getSessionClaims';

/**
 * What the app frame shows around every page: the signed-in user (null on the
 * sign-in page) and the active plan its Plan link opens. The token's name and
 * email can lag a profile change until the session's next refresh.
 */
export async function getAppShellAction() {
  const claims = await getSessionClaims();
  if (!claims) return {user: null, activePlanId: null};

  // Synced like every kanban page (cache() makes it one run per request), so
  // on the first visit of a new week the Plan link and Board state already
  // see last week's plan as ended
  const activePlan = await ensureSynced(claims.sub);

  return {
    user: {
      name: (claims.user_metadata?.full_name as string) ?? claims.email ?? '',
      email: claims.email ?? '',
    },
    activePlanId: activePlan?.id ?? null,
  };
}
