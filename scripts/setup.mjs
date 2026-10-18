/**
 * One command from a fresh checkout to a ready local environment, run as
 * `npm run setup` (safe to rerun):
 *
 * 1. `.env.local` from `.env.example` when missing — the postinstall
 *    `prisma generate` needs its DIRECT_URL;
 * 2. `npm install`;
 * 3. `npm run db:setup` — the local Supabase stack, migrations and seed.
 *
 * `npm run setup -- --no-db` stops after the install, for work that needs
 * neither the database nor a signed-in page. Plain Node with no
 * dependencies, since it runs before `npm install`.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync} from 'node:fs';

const ENV_FILE = '.env.local';
const ENV_TEMPLATE = '.env.example';
const SKIP_DB_FLAG = '--no-db';

/** Run an npm command with inherited output; exits with its code on failure. */
const runNpm = args => {
  const {status} = spawnSync('npm', args, {stdio: 'inherit'});
  if (status !== 0) process.exit(status ?? 1);
};

if (!existsSync(ENV_FILE)) {
  copyFileSync(ENV_TEMPLATE, ENV_FILE);
  console.log(`Created ${ENV_FILE} from ${ENV_TEMPLATE}.`);
}
runNpm(['install']);
if (!process.argv.includes(SKIP_DB_FLAG)) runNpm(['run', 'db:setup']);
