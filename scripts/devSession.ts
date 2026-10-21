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
import {signInAsStorageState} from './localAuth';
import {DEV_USER, assertLocalServices} from './localEnv';

const DEFAULT_OUT_PATH = '.auth/dev-session.json';

const main = async () => {
  assertLocalServices('dev:session');
  const outPath = process.argv[2] ?? DEFAULT_OUT_PATH;
  const storageState = await signInAsStorageState(DEV_USER);
  mkdirSync(dirname(outPath), {recursive: true});
  writeFileSync(outPath, JSON.stringify(storageState, null, 2));

  console.log(
    `Signed in as ${DEV_USER.email}; Playwright storageState: ${outPath}`,
  );
  console.log(
    `Cookie: ${storageState.cookies.map(({name, value}) => `${name}=${value}`).join('; ')}`,
  );
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
