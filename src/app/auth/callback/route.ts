import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {
  AUTH_CALLBACK_PATH,
  AUTH_NEXT_COOKIE,
  LOGIN_PATH,
  getSafeNextPath,
  withNextParam,
} from '@/utils/authRedirect';

/** Trades the sign-in round trip's code for a session cookie; false on failure. */
const isCodeExchangedForSession = async (code: string | null) => {
  if (!code) return false;
  const supabase = await createClient();
  const {error} = await supabase.auth.exchangeCodeForSession(code);
  return !error;
};

export const GET = async (request: NextRequest) => {
  const {searchParams, origin} = request.nextUrl;
  // Set by the login page right before the Google round trip.
  const nextPath = getSafeNextPath(
    request.cookies.get(AUTH_NEXT_COOKIE)?.value,
  );

  const isSignedIn = await isCodeExchangedForSession(searchParams.get('code'));
  // On failure, back to the sign-in button, still carrying the page to return to.
  const redirectPath = isSignedIn
    ? nextPath
    : withNextParam(LOGIN_PATH, nextPath);

  const response = NextResponse.redirect(new URL(redirectPath, origin));
  response.cookies.delete({name: AUTH_NEXT_COOKIE, path: AUTH_CALLBACK_PATH});
  return response;
};
