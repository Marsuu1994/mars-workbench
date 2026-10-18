/**
 * The local environment in one command, safe to rerun:
 *
 * - `npm run up` — everything, then the dev server: the one-click start;
 * - `npm run setup` — everything without the dev server;
 * - `npm run setup -- --no-db` — stops after the install, for work that needs
 *   neither the database nor a signed-in page.
 *
 * Everything is:
 * 1. `.env.local` from `.env.example` when missing — the postinstall
 *    `prisma generate` needs its DIRECT_URL;
 * 2. `npm install`, skipped while `node_modules` is newer than the manifests;
 * 3. `npm run db:setup` — the local Supabase stack, migrations and seed.
 *
 * Plain Node with no dependencies, since it runs before `npm install`.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, statSync} from 'node:fs';

const ENV_FILE = '.env.local';
const ENV_TEMPLATE = '.env.example';
const MANIFESTS = ['package.json', 'package-lock.json'];
// Written by every npm install: its mtime says when node_modules last synced.
const INSTALLED_LOCKFILE = 'node_modules/.package-lock.json';
const SKIP_DB_FLAG = '--no-db';
const START_DEV_FLAG = '--dev';

/** Run an npm command with inherited output; exits with its code on failure. */
const runNpm = args => {
  const {status} = spawnSync('npm', args, {stdio: 'inherit'});
  if (status !== 0) process.exit(status ?? 1);
};

const isInstallCurrent = () =>
  existsSync(INSTALLED_LOCKFILE) &&
  MANIFESTS.every(
    manifest =>
      statSync(manifest).mtimeMs <= statSync(INSTALLED_LOCKFILE).mtimeMs,
  );

if (!existsSync(ENV_FILE)) {
  copyFileSync(ENV_TEMPLATE, ENV_FILE);
  console.log(`Created ${ENV_FILE} from ${ENV_TEMPLATE}.`);
}
if (isInstallCurrent()) {
  console.log('Dependencies are up to date; skipping npm install.');
} else {
  runNpm(['install']);
}
if (!process.argv.includes(SKIP_DB_FLAG)) runNpm(['run', 'db:setup']);
if (process.argv.includes(START_DEV_FLAG)) runNpm(['run', 'dev']);
