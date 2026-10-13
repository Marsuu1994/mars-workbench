import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {LOGIN_PATH, withNextParam} from '@/utils/authRedirect';

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({request});

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const {name, value} of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({request});
          for (const {name, value, options} of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refreshes an expiring session (setAll writes the new cookies) and verifies
  // the token locally against the cached JWKS — no Auth server round trip
  const {data} = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && !request.nextUrl.pathname.startsWith('/auth')) {
    // Carry the requested page through sign-in so the visitor lands back on
    // it (e.g. the OAuth consent page with its authorization_id).
    const {pathname, search} = request.nextUrl;
    const loginPath = withNextParam(LOGIN_PATH, `${pathname}${search}`);
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  return supabaseResponse;
};
