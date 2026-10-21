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
import {
  PlanMode,
  PriorityQuadrant,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/utils/enums';
import {
  createOneOff,
  createProjectWithSteps,
  createWeek,
  moveTasks,
  newHabit,
} from './factories';

export const SEED_ONE_OFFS = [
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

export const SEED_HABITS = {
  run: {
    ...newHabit('Morning run', TaskType.DAILY),
    description: '30 minutes, easy pace',
  },
  flashcards: {
    ...newHabit('Flashcards', TaskType.DAILY, 1, TaskSize.EXTRA_SMALL),
    description: '20 Spanish cards',
  },
  review: {
    ...newHabit('Weekly review', TaskType.WEEKLY, 2),
    description: 'Look back at the week and tidy the matrix',
  },
};

export const SEED_PROJECTS = {
  course: {
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
  },
  book: {
    title: 'Read Deep Work',
    goal: 'Read it and keep one page of notes',
    steps: [
      {title: 'Part 1 — The idea', size: TaskSize.SMALL},
      {title: 'Part 2 — The rules', size: TaskSize.MEDIUM},
      {title: 'One page of notes', size: TaskSize.EXTRA_SMALL},
    ],
  },
};

const SEED_DUMP_ENTRIES = [
  'Maybe the board needs a weekly review ritual on Sundays.',
  'Worried the course is too much on top of work this month.',
  'Idea: a reading list project once the book is done.',
];

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
