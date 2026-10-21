/**
 * Integration tests' database: `mars_test`, beside the dev database in a local
 * Postgres, so the dev user's seeded week is never touched. Before a run it is
 * created when missing, migrated and emptied; tests isolate themselves with a
 * fresh userId each, so nothing is cleaned up afterwards.
 *
 * The Postgres, in order: `TEST_DATABASE_URL` (CI's service container), the
 * local Supabase stack, then — in a cloud agent container — the preinstalled
 * system Postgres, started here when it is down.
 */
import {execFileSync, spawnSync} from 'node:child_process';
import pg from 'pg';
import {isLocalUrl} from '../../scripts/localEnv';

const TEST_DATABASE = 'mars_test';
const STACK_POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:54322';
const SYSTEM_POSTGRES_URL = 'postgresql://postgres:postgres@127.0.0.1:5432';
const MIGRATIONS_TABLE = '_prisma_migrations';
/** Set once the database is ready, so each project's setup runs it once. */
const READY_FLAG = 'MARS_TEST_DATABASE_READY';

/** The server's URL pointed at one database (any database in it is replaced). */
const withDatabase = (serverUrl: string, database: string) => {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  return url.toString();
};

const canConnect = async (serverUrl: string) => {
  const client = new pg.Client({
    connectionString: withDatabase(serverUrl, 'postgres'),
    connectionTimeoutMillis: 1000,
  });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
};

/**
 * A cloud agent's container ships Postgres but doesn't run it; its postgres
 * role gets the same password as the local stack's.
 */
const startSystemPostgres = () => {
  const canStart =
    process.platform === 'linux' &&
    process.getuid?.() === 0 &&
    spawnSync('which', ['pg_ctlcluster'], {stdio: 'ignore'}).status === 0;
  if (!canStart) return false;
  spawnSync('service', ['postgresql', 'start'], {stdio: 'ignore'});
  spawnSync(
    'su',
    ['postgres', '-c', `psql -c "ALTER USER postgres PASSWORD 'postgres'"`],
    {stdio: 'ignore'},
  );
  return true;
};

const findServerUrl = async (): Promise<string> => {
  const configured = process.env.TEST_DATABASE_URL;
  if (configured) return configured;
  if (await canConnect(STACK_POSTGRES_URL)) return STACK_POSTGRES_URL;
  if (startSystemPostgres() && (await canConnect(SYSTEM_POSTGRES_URL))) {
    return SYSTEM_POSTGRES_URL;
  }
  throw new Error(
    'Integration tests need a local Postgres: start the stack with npm run db:setup, or set TEST_DATABASE_URL.',
  );
};

const createDatabaseIfMissing = async (serverUrl: string) => {
  const client = new pg.Client(withDatabase(serverUrl, 'postgres'));
  await client.connect();
  try {
    const {rowCount} = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DATABASE],
    );
    if (rowCount === 0) await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } finally {
    await client.end();
  }
};

const migrate = (databaseUrl: string) =>
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: {...process.env, DIRECT_URL: databaseUrl},
    stdio: 'ignore',
  });

const emptyTables = async (databaseUrl: string) => {
  const client = new pg.Client(databaseUrl);
  await client.connect();
  try {
    const {rows} = await client.query<{tablename: string}>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> $1`,
      [MIGRATIONS_TABLE],
    );
    const tables = rows.map(({tablename}) => `"${tablename}"`).join(', ');
    if (tables) await client.query(`TRUNCATE ${tables} CASCADE`);
  } finally {
    await client.end();
  }
};

export default async function setup() {
  if (process.env[READY_FLAG]) return;
  const serverUrl = await findServerUrl();
  if (!isLocalUrl(serverUrl)) {
    throw new Error(
      `Integration tests refuse a database off this machine: ${new URL(serverUrl).host}`,
    );
  }
  const databaseUrl = withDatabase(serverUrl, TEST_DATABASE);
  await createDatabaseIfMissing(serverUrl);
  migrate(databaseUrl);
  await emptyTables(databaseUrl);
  // Test workers start after this, so they inherit it (src/lib/prisma.ts).
  process.env.DATABASE_URL = databaseUrl;
  process.env[READY_FLAG] = 'true';
}
