/**
 * The seed's week as plain data: what `test/seedWeek.ts` writes, and what the
 * e2e specs expect to see. No service imports, so Playwright can load it.
 */
import {PriorityQuadrant, TaskSize, TaskType} from '@/utils/enums';

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
    title: 'Morning run',
    description: '30 minutes, easy pace',
    size: TaskSize.SMALL,
    type: TaskType.DAILY,
    frequency: 1,
  },
  flashcards: {
    title: 'Flashcards',
    description: '20 Spanish cards',
    size: TaskSize.EXTRA_SMALL,
    type: TaskType.DAILY,
    frequency: 1,
  },
  review: {
    title: 'Weekly review',
    description: 'Look back at the week and tidy the matrix',
    size: TaskSize.SMALL,
    type: TaskType.WEEKLY,
    // Three, so two instances stay in the backlog: a habit stack (journeys)
    frequency: 3,
  },
} as const;

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

export const SEED_DUMP_ENTRIES = [
  'Maybe the board needs a weekly review ritual on Sundays.',
  'Worried the course is too much on top of work this month.',
  'Idea: a reading list project once the book is done.',
];
