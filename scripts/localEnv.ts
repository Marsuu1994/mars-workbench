import {execFileSync} from 'node:child_process';

/**
 * The Supabase CLI, pinned and run through npx rather than installed as a
 * dependency, so `npm install` on Vercel and in CI never downloads it.
 */
export const SUPABASE_CLI = 'supabase@2.121.0';

/**
 * The seeded dev user: what `npm run dev:session` signs in as and, through
 * `.env.example`, what `MCP_DEV_USER_ID` acts as. The id is fixed so that
 * file can name it.
 */
export const DEV_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  // A local Google sign-in lands on the seeded user when SEED_EMAIL is its
  // Gmail address: Supabase links identities that share a verified email.
  email: process.env.SEED_EMAIL || 'dev@mars.local',
  password: 'mars-dev-password',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// What would point local work at a database or Auth server.
const SERVICE_URL_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
] as const;

/** The service URL variables that point anywhere but this machine. */
const getRemoteServiceVars = () =>
  SERVICE_URL_VARS.filter(name => {
    const url = process.env[name];
    return url !== undefined && !LOCAL_HOSTS.has(new URL(url).hostname);
  });

/**
 * Throws when the database or Supabase URLs point off this machine, so local
 * work never reaches production by accident (production credentials live in
 * `.env.prod`, read only by `npm run db:deploy:prod`).
 */
export const assertLocalServices = (context: string) => {
  const remoteVars = getRemoteServiceVars();
  if (remoteVars.length === 0) return;
  throw new Error(
    `${context} refuses to run: ${remoteVars.join(', ')} point${remoteVars.length === 1 ? 's' : ''} off this machine. ` +
      'Point .env.local at the local Supabase stack (npm run setup creates it from .env.example); production credentials belong in .env.prod.',
  );
};

/** The local stack's secret key (admin API), read from `supabase status`. */
export const getLocalSecretKey = (): string => {
  try {
    const status = JSON.parse(
      execFileSync(
        'npx',
        ['--yes', SUPABASE_CLI, 'status', '--output', 'json'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ),
    );
    return status.SECRET_KEY;
  } catch {
    throw new Error(
      'The local Supabase stack is not running: start it with npm run db:setup.',
    );
  }
};
