/**
 * The local Supabase stack (Postgres + Auth in Docker, `supabase/config.toml`):
 *
 * - `npm run db:setup` — start it, apply the Prisma migrations and seed. Safe
 *   to rerun: a stack already up stays up, and the seed leaves existing data.
 * - `npm run db:reset` — wipe it (app tables and Auth users), migrate and seed.
 * - `npm run db:stop` — stop it; the data is kept for the next `db:setup`.
 *
 * Setup and reset refuse to run unless `.env.local` (created by `npm run setup`)
 * points at the local stack.
 */
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, openSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {config} from 'dotenv';
import {SUPABASE_CLI, assertLocalServices} from './localEnv';

const ENV_FILE = '.env.local';
const DOCKER_START_TIMEOUT_MS = 60_000;
const DOCKER_POLL_INTERVAL_MS = 1_000;
const DOCKERD_LOG = join(tmpdir(), 'mars-workbench-dockerd.log');

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

/** Containers the daemon restarted on boot whose health checks haven't passed. */
const hasStartingContainers = () =>
  spawnSync('docker', ['ps', '--quiet', '--filter', 'health=starting'], {
    encoding: 'utf8',
  }).stdout.trim() !== '';

/** Poll until `isDone` holds; throws `failure` after DOCKER_START_TIMEOUT_MS. */
const waitUntil = async (isDone: () => boolean, failure: string) => {
  for (
    let waited = 0;
    waited < DOCKER_START_TIMEOUT_MS;
    waited += DOCKER_POLL_INTERVAL_MS
  ) {
    if (isDone()) return;
    await sleep(DOCKER_POLL_INTERVAL_MS);
  }
  throw new Error(failure);
};

const canStartDockerDaemon = () =>
  process.platform === 'linux' &&
  process.getuid?.() === 0 &&
  spawnSync('which', ['dockerd'], {stdio: 'ignore'}).status === 0;

/**
 * Docker must be up for `supabase start`. A cloud agent's container ships
 * dockerd but doesn't run it, so it is started here; on a Mac, OrbStack or
 * Docker Desktop runs it. A daemon started here also restarts the stack's
 * containers from before, and `supabase start` fails rather than waits while
 * they are still starting, so their health checks are awaited too.
 */
const ensureDocker = async () => {
  if (isDockerRunning()) return;
  if (!canStartDockerDaemon()) {
    throw new Error(
      'Docker is not running: start OrbStack or Docker Desktop, then rerun.',
    );
  }
  console.log(`Starting the Docker daemon (log: ${DOCKERD_LOG})…`);
  const log = openSync(DOCKERD_LOG, 'a');
  spawn('dockerd', [], {detached: true, stdio: ['ignore', log, log]}).unref();
  await waitUntil(
    isDockerRunning,
    `The Docker daemon did not start within a minute; see ${DOCKERD_LOG}.`,
  );
  await waitUntil(
    () => !hasStartingContainers(),
    'Containers restarted with the Docker daemon are still starting after a minute.',
  );
};

/** Prisma migrations, then the seed. */
const migrateAndSeed = () => {
  run('npx', ['prisma', 'migrate', 'deploy']);
  run('npm', ['run', 'db:seed']);
};

/** Load `.env.local` and refuse anything but the local stack. */
const loadLocalEnv = (context: string) => {
  if (!existsSync(ENV_FILE)) {
    throw new Error(`${context}: no ${ENV_FILE} yet — run npm run setup.`);
  }
  config({path: ENV_FILE, quiet: true});
  assertLocalServices(context);
};

/**
 * Where `supabase start` pulls its images from, in order. Both serve the same
 * images and both refuse anonymous pulls from a shared cloud IP past their own
 * limit — Docker Hub answers 429 after a few pulls an hour, ECR stops at a
 * data cap — so when one refuses, the other usually still serves.
 */
const IMAGE_REGISTRIES = ['docker.io', 'public.ecr.aws'];

/** `supabase start`, trying the next registry when a pull is refused. */
const startStack = () => {
  const pinnedRegistry = process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY;
  const registries = pinnedRegistry ? [pinnedRegistry] : IMAGE_REGISTRIES;
  for (const [index, registry] of registries.entries()) {
    const nextRegistry = registries[index + 1];
    try {
      runSupabase(['start'], {
        ...process.env,
        SUPABASE_INTERNAL_IMAGE_REGISTRY: registry,
      });
      return;
    } catch (error) {
      if (!nextRegistry) throw error;
      console.warn(
        `supabase start failed pulling from ${registry}; retrying from ${nextRegistry}.`,
      );
    }
  }
};

const setup = async () => {
  loadLocalEnv('db:setup');
  await ensureDocker();
  startStack();
  migrateAndSeed();
};

const reset = () => {
  loadLocalEnv('db:reset');
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
