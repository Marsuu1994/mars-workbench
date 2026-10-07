/** Where protected routes send a visitor who has no session. */
export const LOGIN_PATH = '/auth/login';

/** Where Supabase returns after Google sign-in to exchange the code. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/** Query parameter carrying the in-app path to return to after sign-in. */
export const NEXT_PARAM = 'next';

/**
 * Carries `next` from the login page to `/auth/callback` across the Google
 * round trip. A cookie, not a query parameter on `redirectTo`: Supabase
 * matches `redirectTo` against the Redirect URLs allow-list query included,
 * so an exact `…/auth/callback` entry would reject it and send the user to
 * the Site URL instead.
 */
export const AUTH_NEXT_COOKIE = 'mw-auth-next';

/** Long enough for the Google round trip, short enough not to linger. */
const AUTH_NEXT_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/** Stand-in origin for resolving a relative path; never leaves this module. */
const PLACEHOLDER_ORIGIN = 'http://next.invalid';

/**
 * The in-app path to return to after sign-in, or `/` when the value is
 * missing or would leave the site. The value is resolved as a URL so every
 * spelling a browser treats as another origin (`//host`, `/\host`, control
 * characters) is rejected, and the normalized path is returned.
 */
export const getSafeNextPath = (next: string | null | undefined): string => {
  if (!next?.startsWith('/')) return '/';
  try {
    const url = new URL(next, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
};

/**
 * The `document.cookie` string that hands `nextPath` to the callback, scoped
 * to the callback path. For the home page it expires the cookie instead, so
 * an abandoned earlier attempt can never redirect a later sign-in.
 */
export const buildAuthNextCookie = (
  nextPath: string,
  isSecure: boolean,
): string =>
  [
    `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)}`,
    `Path=${AUTH_CALLBACK_PATH}`,
    `Max-Age=${nextPath === '/' ? 0 : AUTH_NEXT_COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    ...(isSecure ? ['Secure'] : []),
  ].join('; ');

/** `path`, carrying `next` unless it is the home page (the default anyway). */
export const withNextParam = (path: string, nextPath: string): string =>
  nextPath === '/'
    ? path
    : `${path}?${new URLSearchParams({[NEXT_PARAM]: nextPath})}`;
