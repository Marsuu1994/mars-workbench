import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {
  LOGIN_PATH,
  NEXT_PARAM,
  getSafeNextPath,
  withNextParam,
} from '@/utils/authRedirect';

export const GET = async (request: NextRequest) => {
  const {searchParams, origin} = request.nextUrl;
  const code = searchParams.get('code');
  const nextPath = getSafeNextPath(searchParams.get(NEXT_PARAM));

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, origin));
    }
  }

  // Back to the sign-in button, still carrying the page to return to.
  return NextResponse.redirect(
    new URL(withNextParam(LOGIN_PATH, nextPath), origin),
  );
};
