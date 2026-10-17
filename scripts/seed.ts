/**
 * Seed the local Supabase stack with the dev user and a week of data, dated
 * from today: habits on an active plan, cards in Todo and Done, two projects
 * (one with steps on the week, one with every step done), one-offs in every
 * quadrant and a few dump entries. Writes through the app's services and DAL,
 * the same paths the pages and MCP tools take.
 *
 * Run by `npm run db:seed` (and `db:setup` / `db:reset`); refuses to run
 * against anything but the local stack, and leaves a dev user that already
 * has data alone.
 */
import {createClient} from '@supabase/supabase-js';
import {createDumpEntry} from '@/lib/db/dumpEntries';
import {
  createTask,
  getBoardTasksByPlanId,
  updateTaskStatus,
} from '@/lib/db/tasks';
import {prisma} from '@/lib/prisma';
import {completeMatrixTask, trackTaskThisWeek} from '@/services/matrixService';
import {
  createPlanFromSpec,
  getPlanningContext,
} from '@/services/planningService';
import {createProject} from '@/services/projectService';
import {planSpecSchema} from '@/schemas';
import {
  PlanMode,
  PriorityQuadrant,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/utils/enums';
import {sizeToPoints} from '@/utils/sizeUtils';
import {DEV_USER, assertLocalServices, getLocalSecretKey} from './localEnv';

const ONE_OFFS = [
  {
    title: 'Renew passport',
    size: TaskSize.SMALL,
    quadrant: PriorityQuadrant.DO_FIRST,
  },
  {
    title: 'Book dentist appointment',
    size: TaskSize.EXTRA_SMALL,
    quadrant: PriorityQuadrant.DO_FIRST,
  },
  {
    title: 'Set up a retirement account',
    size: TaskSize.MEDIUM,
    quadrant: PriorityQuadrant.SCHEDULE,
  },
  {
    title: 'Reply to the landlord',
    size: TaskSize.EXTRA_SMALL,
    quadrant: PriorityQuadrant.SQUEEZE_IN,
  },
  {
    title: 'Sort old photos',
    size: TaskSize.LARGE,
    quadrant: PriorityQuadrant.MAYBE_LATER,
  },
];

const DUMP_ENTRIES = [
  'Maybe the board needs a weekly review ritual on Sundays.',
  'Worried the course is too much on top of work this month.',
  'Idea: a reading list project once the book is done.',
];

/** Create the dev user, or reset its email and password if it exists. */
const upsertDevUser = async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getLocalSecretKey(),
    {auth: {persistSession: false}},
  );
  const {id, email, password} = DEV_USER;
  const {data: existing} = await supabase.auth.admin.getUserById(id);
  const {error} = existing.user
    ? await supabase.auth.admin.updateUserById(id, {email, password})
    : await supabase.auth.admin.createUser({
        id,
        email,
        password,
        email_confirm: true,
      });
  if (error) throw error;
};

const hasData = async (userId: string) => {
  const {activePlan, templates, projects} = await getPlanningContext(userId);
  return activePlan !== null || templates.length > 0 || projects.length > 0;
};

/** Two projects: a course part-way through, and a book with every step done. */
const seedProjects = async (userId: string) => {
  const course = await createProject(userId, {
    title: 'Spanish A2 course',
    goal: 'Finish the A2 units and pass the end-of-course quiz',
    steps: [
      {title: 'Unit 1 — Daily routines', size: TaskSize.SMALL},
      {title: 'Unit 2 — Past tense', size: TaskSize.MEDIUM},
      {title: 'Unit 3 — Travel', size: TaskSize.SMALL},
      {title: 'Unit 4 — Health', size: TaskSize.SMALL},
      {title: 'Unit 5 — Work', size: TaskSize.MEDIUM},
      {title: 'End-of-course quiz', size: TaskSize.EXTRA_SMALL},
    ],
  });
  const book = await createProject(userId, {
    title: 'Read Deep Work',
    goal: 'Read it and keep one page of notes',
    steps: [
      {title: 'Part 1 — The idea', size: TaskSize.SMALL},
      {title: 'Part 2 — The rules', size: TaskSize.MEDIUM},
      {title: 'One page of notes', size: TaskSize.EXTRA_SMALL},
    ],
  });
  return {courseSteps: course.steps, bookSteps: book.steps};
};

const seedWeek = async (userId: string) => {
  const {courseSteps, bookSteps} = await seedProjects(userId);
  const [unitOne, unitTwo, unitThree] = courseSteps;

  // EXTREME so today's daily instances exist whatever the weekday.
  const {plan} = await createPlanFromSpec(
    userId,
    planSpecSchema.parse({
      description: 'Seeded week',
      mode: PlanMode.EXTREME,
      newTemplates: [
        {
          title: 'Morning run',
          description: '30 minutes, easy pace',
          size: TaskSize.SMALL,
          type: TaskType.DAILY,
          frequency: 1,
        },
        {
          title: 'Flashcards',
          description: '20 Spanish cards',
          size: TaskSize.EXTRA_SMALL,
          type: TaskType.DAILY,
          frequency: 1,
        },
        {
          title: 'Weekly review',
          description: 'Look back at the week and tidy the matrix',
          size: TaskSize.SMALL,
          type: TaskType.WEEKLY,
          frequency: 2,
        },
      ],
      addProjectStepIds: [unitOne, unitTwo, unitThree, ...bookSteps].map(
        step => step.id,
      ),
    }),
  );

  // Templates generate into the backlog; move a few cards across the board.
  const tasks = await getBoardTasksByPlanId(userId, plan.planId);
  const byTitle = (title: string) => tasks.filter(task => task.title === title);
  const [run] = byTitle('Morning run');
  const [flashcards] = byTitle('Flashcards');
  const [firstReview] = byTitle('Weekly review');
  const moves: [string, TaskStatus][] = [
    [run.id, TaskStatus.DONE],
    [flashcards.id, TaskStatus.TODO],
    [firstReview.id, TaskStatus.TODO],
    [unitOne.id, TaskStatus.DONE],
    [unitTwo.id, TaskStatus.TODO],
    ...bookSteps.map((step): [string, TaskStatus] => [
      step.id,
      TaskStatus.DONE,
    ]),
  ];
  for (const [taskId, status] of moves) {
    await updateTaskStatus(userId, taskId, status);
  }
};

const seedOneOffs = async (userId: string) => {
  const created = [];
  for (const {title, size, quadrant} of ONE_OFFS) {
    created.push(
      await createTask(userId, {
        planId: null,
        type: TaskType.AD_HOC,
        title,
        size,
        points: sizeToPoints(size),
        status: TaskStatus.BACKLOG,
        quadrant,
        instanceIndex: 1,
      }),
    );
  }
  const [passport, dentist] = created;
  await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);
  await completeMatrixTask(userId, dentist.id);
};

const seedDump = async (userId: string) => {
  for (const content of DUMP_ENTRIES) {
    await createDumpEntry(userId, {content});
  }
};

const main = async () => {
  assertLocalServices('The seed');
  await upsertDevUser();
  const {id: userId, email} = DEV_USER;
  if (await hasData(userId)) {
    console.log(`${email} already has data; npm run db:reset starts over.`);
    return;
  }
  await seedWeek(userId);
  await seedOneOffs(userId);
  await seedDump(userId);
  console.log(`Seeded ${email} (${userId}).`);
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
