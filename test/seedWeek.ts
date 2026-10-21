/**
 * A week of data dated from today, for one user: habits on an active plan,
 * cards in Todo and Done, two projects (one with steps on the week, one with
 * every step done), one-offs in every quadrant and a few dump entries. The
 * dev seed (`npm run db:seed`) writes it for the dev user, the e2e setup for
 * the e2e user.
 */
import {createDumpEntry} from '@/lib/db/dumpEntries';
import {getBoardTasksByPlanId} from '@/lib/db/tasks';
import {completeMatrixTask, trackTaskThisWeek} from '@/services/matrixService';
import {PlanMode, TaskStatus} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  moveTasks,
} from './factories';
import {
  SEED_DUMP_ENTRIES,
  SEED_HABITS,
  SEED_ONE_OFFS,
  SEED_PROJECTS,
} from './seedData';

const seedProjects = async (userId: string) => {
  const {course, book} = SEED_PROJECTS;
  const courseProject = await createProjectWithSteps(
    userId,
    course.title,
    course.steps,
    course.goal,
  );
  const bookProject = await createProjectWithSteps(
    userId,
    book.title,
    book.steps,
    book.goal,
  );
  return {courseSteps: courseProject.steps, bookSteps: bookProject.steps};
};

const seedPlan = async (userId: string) => {
  const {courseSteps, bookSteps} = await seedProjects(userId);
  const [unitOne, unitTwo, unitThree] = courseSteps;
  const {run, flashcards, review} = SEED_HABITS;

  // EXTREME so today's daily instances exist whatever the weekday.
  const {plan} = await createWeek(userId, {
    description: 'Seeded week',
    mode: PlanMode.EXTREME,
    newTemplates: [run, flashcards, review],
    addProjectStepIds: [unitOne, unitTwo, unitThree, ...bookSteps].map(
      step => step.id,
    ),
  });

  // Templates generate into the backlog; move a few cards across the board.
  const tasks = await getBoardTasksByPlanId(userId, plan.planId);
  const findByTitle = (title: string) =>
    tasks.filter(task => task.title === title);
  const [runToday] = findByTitle(run.title);
  const [flashcardsToday] = findByTitle(flashcards.title);
  const [firstReview] = findByTitle(review.title);
  await moveTasks(userId, [
    [runToday.id, TaskStatus.DONE],
    [flashcardsToday.id, TaskStatus.TODO],
    [firstReview.id, TaskStatus.TODO],
    [unitOne.id, TaskStatus.DONE],
    [unitTwo.id, TaskStatus.TODO],
    ...bookSteps.map((step): [string, TaskStatus] => [
      step.id,
      TaskStatus.DONE,
    ]),
  ]);
};

const seedOneOffs = async (userId: string) => {
  const created = [];
  for (const oneOff of SEED_ONE_OFFS) {
    created.push(await createOneOff(userId, oneOff));
  }
  const [passport, dentist] = created;
  await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
  await completeMatrixTask(userId, dentist.id);
};

const seedDump = async (userId: string) => {
  for (const content of SEED_DUMP_ENTRIES) {
    await createDumpEntry(userId, {content});
  }
};

export const seedWeek = async (userId: string) => {
  await seedPlan(userId);
  await seedOneOffs(userId);
  await seedDump(userId);
};
