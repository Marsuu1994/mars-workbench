/**
 * Password users on the local stack's Auth, for the seed, `npm run
 * dev:session` and the e2e setup: create one with a fixed id, and sign one in
 * the way a browser would, as Playwright storageState.
 */
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {getLocalSecretKey} from './localEnv';

interface PasswordUser {
  id: string;
  email: string;
  password: string;
}

const APP_COOKIE_DOMAIN = 'localhost';

/** Create the user, or reset its email and password if it exists. */
export const upsertPasswordUser = async ({
  id,
  email,
  password,
}: PasswordUser) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getLocalSecretKey(),
    {auth: {persistSession: false}},
  );
  const {data: existing} = await supabase.auth.admin.getUserById(id);
  const {error} = existing.user
    ? await supabase.auth.admin.updateUserById(id, {email, password})
    : await supabase.auth.admin.createUser({
        id,
        email,
        password,
        email_confirm: true,
      });
  if (error) throw error;
};

/**
 * Sign in with a password and return the session cookies as Playwright
 * storageState: the same cookie handling as the app's server client, so they
 * are exactly what a browser sign-in would leave.
 */
export const signInAsStorageState = async ({
  email,
  password,
}: Omit<PasswordUser, 'id'>) => {
  const cookieJar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => [...cookieJar].map(([name, value]) => ({name, value})),
        setAll: cookiesToSet => {
          for (const {name, value} of cookiesToSet) cookieJar.set(name, value);
        },
      },
    },
  );
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    throw new Error(
      `Sign-in as ${email} failed (${error.message}); run npm run db:setup first.`,
    );
  }
  const cookies = [...cookieJar].map(([name, value]) => ({
    name,
    value,
    domain: APP_COOKIE_DOMAIN,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }));
  return {cookies, origins: []};
};
