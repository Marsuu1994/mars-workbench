/**
 * Seed the local Supabase stack with the dev user and a week of data dated
 * from today (`test/seedWeek.ts`, shared with the e2e setup), written through
 * the app's services and DAL — the same paths the pages and MCP tools take.
 *
 * Run by `npm run db:seed` (and `db:setup` / `db:reset`); refuses to run
 * against anything but the local stack, and leaves a dev user that already
 * has data alone.
 */
import {prisma} from '@/lib/prisma';
import {getPlanningContext} from '@/services/planningService';
import {seedWeek} from '../test/seedWeek';
import {upsertPasswordUser} from './localAuth';
import {DEV_USER, assertLocalServices} from './localEnv';

const hasData = async (userId: string) => {
  const {activePlan, templates, projects} = await getPlanningContext(userId);
  return activePlan !== null || templates.length > 0 || projects.length > 0;
};

const main = async () => {
  assertLocalServices('The seed');
  await upsertPasswordUser(DEV_USER);
  const {id: userId, email} = DEV_USER;
  if (await hasData(userId)) {
    console.log(`${email} already has data; npm run db:reset starts over.`);
    return;
  }
  await seedWeek(userId);
  console.log(`Seeded ${email} (${userId}).`);
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
