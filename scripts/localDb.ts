/**
 * The local Supabase stack (Postgres + Auth in Docker, `supabase/config.toml`):
 *
 * - `npm run db:setup` — start it, apply the Prisma migrations and seed. Safe
 *   to rerun: a stack already up stays up, and the seed leaves existing data.
 * - `npm run db:reset` — wipe it (app tables and Auth users), migrate and seed.
 * - `npm run db:stop` — stop it; the data is kept for the next `db:setup`.
 *
 * Setup and reset refuse to run unless `.env.local` points at the local stack.
 */
import {spawn, spawnSync} from 'node:child_process';
import {copyFileSync, existsSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
import {config} from 'dotenv';
import {SUPABASE_CLI, assertLocalServices} from './localEnv';

const ENV_FILE = '.env.local';
const ENV_TEMPLATE = '.env.example';
const DOCKER_START_TIMEOUT_MS = 60_000;
const DOCKER_POLL_INTERVAL_MS = 1_000;

/** Run a command with inherited output; throws when it fails. */
const run = (command: string, args: string[], env = process.env) => {
  const {status} = spawnSync(command, args, {stdio: 'inherit', env});
  if (status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${status}`);
  }
};

const runSupabase = (args: string[], env = process.env) =>
  run('npx', ['--yes', SUPABASE_CLI, ...args], env);

const isDockerRunning = () =>
  spawnSync('docker', ['info'], {stdio: 'ignore'}).status === 0;

const canStartDockerDaemon = () =>
  process.platform === 'linux' &&
  process.getuid?.() === 0 &&
  spawnSync('which', ['dockerd'], {stdio: 'ignore'}).status === 0;

/**
 * Docker must be up for `supabase start`. A cloud agent's container ships
 * dockerd but doesn't run it, so it is started here; on a Mac, OrbStack or
 * Docker Desktop runs it.
 */
const ensureDocker = async () => {
  if (isDockerRunning()) return;
  if (!canStartDockerDaemon()) {
    throw new Error(
      'Docker is not running: start OrbStack or Docker Desktop, then rerun.',
    );
  }
  console.log('Starting the Docker daemon…');
  spawn('dockerd', [], {detached: true, stdio: 'ignore'}).unref();
  for (
    let waited = 0;
    waited < DOCKER_START_TIMEOUT_MS;
    waited += DOCKER_POLL_INTERVAL_MS
  ) {
    if (isDockerRunning()) return;
    await sleep(DOCKER_POLL_INTERVAL_MS);
  }
  throw new Error('The Docker daemon did not start within a minute.');
};

/** Prisma migrations, then the seed. */
const migrateAndSeed = () => {
  run('npx', ['prisma', 'migrate', 'deploy']);
  run('npm', ['run', 'db:seed']);
};

const setup = async () => {
  if (!existsSync(ENV_FILE)) {
    copyFileSync(ENV_TEMPLATE, ENV_FILE);
    console.log(`Created ${ENV_FILE} from ${ENV_TEMPLATE}.`);
  }
  config({path: ENV_FILE, quiet: true});
  assertLocalServices('db:setup');
  await ensureDocker();
  // The CLI pulls from public.ecr.aws by default, which refuses anonymous
  // pulls past its data limit from shared cloud IPs; Docker Hub serves the
  // same images.
  runSupabase(['start'], {
    ...process.env,
    SUPABASE_INTERNAL_IMAGE_REGISTRY:
      process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY ?? 'docker.io',
  });
  migrateAndSeed();
};

const reset = () => {
  config({path: ENV_FILE, quiet: true});
  assertLocalServices('db:reset');
  runSupabase(['db', 'reset']);
  migrateAndSeed();
};

const stop = () => runSupabase(['stop']);

const COMMANDS: Record<string, () => void | Promise<void>> = {
  setup,
  reset,
  stop,
};

const main = async () => {
  const command = COMMANDS[process.argv[2]];
  if (!command) {
    throw new Error(`Usage: tsx scripts/localDb.ts <setup|reset|stop>`);
  }
  await command();
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
