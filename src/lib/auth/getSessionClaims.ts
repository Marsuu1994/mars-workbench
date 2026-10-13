import {cache} from 'react';
import type {JwtPayload} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';

/**
 * The signed-in user's access-token claims, or null when there is no session.
 *
 * `getClaims()` verifies the token's signature locally against the project's
 * JWKS (kept in memory for 10 minutes) instead of asking the Auth server on
 * every call the way `getUser()` does. `cache()` runs it once per request, so
 * the root layout, the page and `getCurrentUserId` share one check. The proxy
 * (`updateSession`) has already refreshed an expiring session by the time
 * this runs.
 */
export const getSessionClaims = cache(async (): Promise<JwtPayload | null> => {
  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  return data?.claims ?? null;
});
