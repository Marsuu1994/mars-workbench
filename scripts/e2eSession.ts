/**
 * The e2e user's fresh start, run by the e2e global setup before every
 * `npm run test:e2e`: the user exists with a password, its data is replaced
 * by the seed's week (dated from today), and its session cookies are written
 * as Playwright storageState. Only the e2e user's rows are touched — the dev
 * user shares the database.
 *
 * Run as `npm run e2e:session -- <out path>`; a tsx script rather than code in
 * the global setup because Playwright loads TypeScript as CommonJS, and the
 * generated Prisma client is ESM-only.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {prisma} from '@/lib/prisma';
import {seedWeek} from '../test/seedWeek';
import {signInAsStorageState, upsertPasswordUser} from './localAuth';
import {E2E_USER, assertLocalServices} from './localEnv';

/** Every app row of one user, children first (plan templates cascade). */
const deleteUserData = (userId: string) =>
  prisma.$transaction([
    prisma.task.deleteMany({where: {userId}}),
    prisma.plan.deleteMany({where: {userId}}),
    prisma.taskTemplate.deleteMany({where: {userId}}),
    prisma.project.deleteMany({where: {userId}}),
    prisma.dumpEntry.deleteMany({where: {userId}}),
  ]);

const main = async () => {
  assertLocalServices('The e2e setup');
  const [outPath] = process.argv.slice(2);
  if (!outPath) throw new Error('Usage: tsx scripts/e2eSession.ts <out path>');

  await upsertPasswordUser(E2E_USER);
  await deleteUserData(E2E_USER.id);
  await seedWeek(E2E_USER.id);

  const storageState = await signInAsStorageState(E2E_USER);
  mkdirSync(dirname(outPath), {recursive: true});
  writeFileSync(outPath, JSON.stringify(storageState, null, 2));
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
