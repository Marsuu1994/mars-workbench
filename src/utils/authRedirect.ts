/** Where protected routes send a visitor who has no session. */
export const LOGIN_PATH = '/auth/login';

/** Where Supabase returns after Google sign-in to exchange the code. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/** Query parameter carrying the in-app path to return to after sign-in. */
export const NEXT_PARAM = 'next';

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

/** `path`, carrying `next` unless it is the home page (the default anyway). */
export const withNextParam = (path: string, nextPath: string): string =>
  nextPath === '/'
    ? path
    : `${path}?${new URLSearchParams({[NEXT_PARAM]: nextPath})}`;
