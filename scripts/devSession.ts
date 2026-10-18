/**
 * Sign in as the seeded dev user without Google, for agents and Playwright:
 * writes the session cookies as Playwright storageState and prints them as a
 * Cookie header (`curl -H "Cookie: …" http://localhost:3000/kanban`).
 *
 * Run by `npm run dev:session [-- <out path>]` against the local stack, after
 * `npm run db:setup`.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createServerClient} from '@supabase/ssr';
import {DEV_USER, assertLocalServices} from './localEnv';

const DEFAULT_OUT_PATH = '.auth/dev-session.json';
const APP_COOKIE_DOMAIN = 'localhost';

const main = async () => {
  assertLocalServices('dev:session');
  const outPath = process.argv[2] ?? DEFAULT_OUT_PATH;

  // The same cookie handling as the app's server client, so the cookies are
  // exactly what a browser sign-in would leave.
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
  const {email, password} = DEV_USER;
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
  mkdirSync(dirname(outPath), {recursive: true});
  writeFileSync(outPath, JSON.stringify({cookies, origins: []}, null, 2));

  console.log(`Signed in as ${email}; Playwright storageState: ${outPath}`);
  console.log(
    `Cookie: ${cookies.map(({name, value}) => `${name}=${value}`).join('; ')}`,
  );
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
