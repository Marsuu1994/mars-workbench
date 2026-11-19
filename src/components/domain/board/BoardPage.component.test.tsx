// Spec: design/specs/board.md
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {updateTaskStatusAction} from '@/actions/taskActions';
import type {TaskItem} from '@/lib/db/tasks';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {
  BACKLOG_CLEAR_TASKS,
  MID_WEEK_PROGRESS,
  MID_WEEK_TASKS,
  SCENARIO_PLAN,
  SCENARIO_PROJECTS,
} from '@/app/design/scenarios/board/fixtures';
import {renderPage} from '../../../../test/component/renderPage';
import {BoardPage} from './BoardPage';

vi.mock('@/actions/taskActions', () => ({updateTaskStatusAction: vi.fn()}));

/** The Design Console's mid-week board: every kind, in every column. */
const MID_WEEK_BOARD: BoardData = {
  plan: SCENARIO_PLAN,
  progress: MID_WEEK_PROGRESS,
  tasks: MID_WEEK_TASKS,
  projects: SCENARIO_PROJECTS,
};

/** The fixture's backlog holds seven tasks, in four groups. */
const BACKLOG_COUNT = 7;

/** The test runner's window is desktop-sized; a mobile test resizes it. */
const DESKTOP_VIEWPORT = {width: 1280, height: 800};
const MOBILE_VIEWPORT = {width: 390, height: 844};
/**
 * How long a test gives React to roll a card back before checking it hasn't.
 * A rollback commits within a few frames, so asserting right after a save
 * resolves would pass whether or not the card was going to move.
 */
const ROLLBACK_WINDOW_MS = 200;
const waitForRollbackWindow = () =>
  new Promise(resolve => setTimeout(resolve, ROLLBACK_WINDOW_MS));

type BoardColumnStatus = 'BACKLOG' | 'TODO' | 'DONE';

/**
 * A column's drop zone, which dnd keys by status, or the desktop backlog's
 * panel. The board's cards are read
 * from the DOM, retried with `expect.poll` — a locator built from an element
 * (`page.elementLocator`) pins its text, which a move changes.
 */
const getColumn = (status: BoardColumnStatus) => {
  const column = document.querySelector<HTMLElement>(
    status === 'BACKLOG'
      ? 'section[aria-label="Backlog"]'
      : `[data-rfd-droppable-id="${status}"]`,
  );
  if (!column) throw new Error(`No ${status} column`);
  return column;
};

/** The card titles shown inside an element, top to bottom (one face per width). */
const readTitles = (container: Element) =>
  [...container.querySelectorAll('h3')]
    .filter(heading => heading.checkVisibility())
    .map(heading => heading.textContent);

const readColumnTitles = (status: BoardColumnStatus) =>
  readTitles(getColumn(status));

/** The card around a shown title: the element dnd makes draggable. */
const findCard = (container: Element, title: string) => {
  const heading = [...container.querySelectorAll('h3')].find(
    candidate => candidate.checkVisibility() && candidate.textContent === title,
  );
  const card = heading?.closest<HTMLElement>('.card');
  if (!heading || !card) throw new Error(`No ${title} card`);
  return {heading, card};
};

const getCard = (status: BoardColumnStatus, title: string) =>
  findCard(getColumn(status), title);

/** A column's header count, beside its name. */
const readHeaderCount = (status: BoardColumnStatus) =>
  getColumn(status).parentElement?.querySelector('.badge')?.textContent;

/** Whether dnd made the card a drag handle (it's then a button). */
const isDragHandle = (card: HTMLElement) =>
  card.getAttribute('role') === 'button';

/** The shown element with this title: the backlog's strip and pill share one. */
const getShownByTitle = (title: string) => {
  const element = [
    ...document.querySelectorAll<HTMLElement>(`[title="${title}"]`),
  ].find(candidate => candidate.checkVisibility());
  if (!element) throw new Error(`Nothing shown titled ${title}`);
  return element;
};

const getOpenSheet = () => {
  const sheet = document.querySelector('dialog[open]');
  if (!sheet) throw new Error('The sheet is not open');
  return sheet;
};

/** A sheet card's ↑ Todo button, if it has one. */
const findPullButton = (card: Element) =>
  [...card.querySelectorAll('button')].find(
    candidate => candidate.textContent === 'Todo',
  );

const getPullButton = (card: Element) => {
  const button = findPullButton(card);
  if (!button) throw new Error('No ↑ Todo on the card');
  return button;
};

/** A habit card's dots, or a step card's path segments, in order. */
const getDots = (card: HTMLElement) =>
  [...card.querySelectorAll<HTMLElement>('.fx-pip')].filter(dot =>
    dot.checkVisibility(),
  );
const getSegments = (card: HTMLElement) =>
  [...card.querySelectorAll<HTMLElement>('.flex-1.rounded-selector')].filter(
    segment => segment.checkVisibility(),
  );

/** What a screen reader hears for a card's dots or path. */
const readProgressLabel = (card: HTMLElement) =>
  card.querySelector('[role="img"]')?.getAttribute('aria-label');

const fillOf = (mark: HTMLElement) => getComputedStyle(mark).backgroundColor;
const isRinged = (mark: HTMLElement) =>
  getComputedStyle(mark).boxShadow !== 'none';

/** Where a piece of text sits on the card, to compare top to bottom. */
const topOfText = (card: HTMLElement, text: string) => {
  const element = [...card.querySelectorAll<HTMLElement>('*')].find(
    candidate =>
      candidate.checkVisibility() &&
      candidate.children.length === 0 &&
      candidate.textContent === text,
  );
  if (!element) throw new Error(`No "${text}" on the card`);
  return element.getBoundingClientRect().top;
};

const expectTopToBottom = (card: HTMLElement, texts: string[]) => {
  const tops = texts.map(text => topOfText(card, text));
  expect(tops).toEqual([...tops].sort((above, below) => above - below));
};

/** The page's text, where the desktop dashboard reads "2 of 10 tasks". */
const readProgress = () => document.body.textContent.replace(/\s+/g, ' ');

const readAnnouncement = () =>
  document.querySelector('[id^="rfd-announcement"]')?.textContent ?? '';

/**
 * @hello-pangea/dnd's keyboard drag, as the e2e drags: lift the card, step
 * it across the columns (Todo, Done, then the backlog panel on desktop),
 * drop — each step waiting on dnd's screen-reader announcement.
 */
const dragCard = async (
  from: BoardColumnStatus,
  title: string,
  steps: ('ArrowLeft' | 'ArrowRight')[],
) => {
  getCard(from, title).card.focus();
  await userEvent.keyboard('[Space]');
  await expect.poll(readAnnouncement).toMatch(/lifted/);
  for (const step of steps) {
    const before = readAnnouncement();
    await userEvent.keyboard(`[${step}]`);
    await expect.poll(readAnnouncement).not.toBe(before);
  }
  await userEvent.keyboard('[Space]');
  await expect.poll(readAnnouncement).toMatch(/dropped/);
};

const dragTodoCardOntoDone = (title: string) =>
  dragCard('TODO', title, ['ArrowRight']);

/** "2 of 10 tasks": today's done count on the dashboard. */
const todayDoneText = (doneCount: number) =>
  `${doneCount} of ${MID_WEEK_PROGRESS.todayTotalCount} tasks`;

/** What updateTaskStatusAction resolves to: the saved task, or the error. */
type SaveResult = Awaited<ReturnType<typeof updateTaskStatusAction>>;

/** The action's refusal, as a failed save answers. */
const SAVE_FAILED: SaveResult = {
  error: {formErrors: ['Task not found'], fieldErrors: {}},
};

/** The tasks as the server saves them once `taskId` is done. */
const withTaskDone = (taskId: string) =>
  MID_WEEK_TASKS.map(task =>
    task.id === taskId
      ? {...task, status: TaskStatus.DONE, doneAt: new Date()}
      : task,
  );

/** The saved task, as the action answers a save. */
const savedTaskIn = (tasks: TaskItem[], taskId: string): SaveResult => {
  const task = tasks.find(candidate => candidate.id === taskId);
  if (!task) throw new Error(`No task ${taskId}`);
  return {data: task};
};

/**
 * Saves that don't answer during the test: every move stays in flight. Each
 * is answered once the test ends — React settles every pending transition
 * together, so one left hanging would hold back the next test's rollbacks.
 */
const unansweredSaves: PromiseWithResolvers<SaveResult>[] = [];
const keepSaving = () =>
  vi.mocked(updateTaskStatusAction).mockImplementation(() => {
    const save = Promise.withResolvers<SaveResult>();
    unansweredSaves.push(save);
    return save.promise;
  });

const findTaskByTitle = (title: string) => {
  const task = MID_WEEK_TASKS.find(candidate => candidate.title === title);
  if (!task) throw new Error(`No ${title} in the fixture`);
  return task;
};

/** The shown badge in a backlog entry or header: what the eye reads. */
const readBacklogBadge = (container: Element) =>
  [...container.querySelectorAll<HTMLElement>('.badge')].find(badge =>
    badge.checkVisibility(),
  )?.textContent;

/** The desktop panel's header, beside its close button. */
const getPanelHeader = () => {
  const header = getShownByTitle('Close backlog').parentElement;
  if (!header) throw new Error('No panel header');
  return header;
};

/**
 * The backlog's sections and cards in the order they're shown: each
 * section's label, then the title of each of its groups' cards.
 */
const readBacklogOutline = (container: Element) =>
  [...container.querySelectorAll('h3, h4')]
    .filter(heading => heading.checkVisibility())
    .map(heading => heading.textContent);

/** A group around its card: the card, and its pile or queue under it. */
const getGroupOf = (card: HTMLElement) => {
  const group =
    card.closest('[data-rfd-droppable-id]')?.parentElement ??
    card.parentElement;
  if (!group) throw new Error('The card is in no group');
  return group;
};

/** The thin sheets under a group's card. */
const getPileSheets = (card: HTMLElement) => [
  ...getGroupOf(card).querySelectorAll<HTMLElement>('[aria-hidden="true"] > i'),
];

/** "+N more" on a card, or null without one. */
const readMoreCount = (card: HTMLElement) =>
  [...card.querySelectorAll('span')]
    .map(element => element.textContent)
    .find(text => /^\+\d+ more$/.test(text)) ?? null;

/** A project card's +N more, the toggle of its queue. */
const getQueueToggle = (card: HTMLElement) => {
  const toggle = card.querySelector<HTMLElement>('button[aria-expanded]');
  if (!toggle) throw new Error('No queue toggle on the card');
  return toggle;
};

/** The rows of every open queue in a container: step number, then title. */
const readQueueRows = (container: Element) =>
  [...container.querySelectorAll('ol > li')].map(row => row.textContent);

/** The place dnd keeps for a lifted card. */
const getLiftPlaceholder = (container: Element) => {
  const placeholder = container.querySelector<HTMLElement>(
    '[data-rfd-placeholder-context-id]',
  );
  if (!placeholder) throw new Error('No placeholder in the backlog');
  return placeholder;
};

/**
 * What the backlog shows besides a lifted card: the count, the hint, the
 * other cards and every pile, where each one sits.
 */
const readBacklogLayout = (panel: HTMLElement) => ({
  header: getPanelHeader().textContent,
  hasHint: panel.textContent.includes(DRAG_HINT),
  moreCounts: [...panel.querySelectorAll<HTMLElement>('.card')].map(card =>
    readMoreCount(card),
  ),
  cards: [...panel.querySelectorAll<HTMLElement>('.card')]
    .filter(card => card.style.position !== 'fixed')
    .map(card => ({
      title: card.querySelector('h3')?.textContent,
      top: Math.round(card.getBoundingClientRect().top),
    }))
    .filter(({title}) => title !== 'Read'),
  sheetTops: [...panel.querySelectorAll('[aria-hidden="true"] > i')].map(
    sheet => Math.round(sheet.getBoundingClientRect().top),
  ),
});

/** The emptied backlog's box: a title, two sentences and no button or link. */
const expectBacklogFinishBox = (container: Element) => {
  const title = [...container.querySelectorAll('p')].find(
    paragraph => paragraph.textContent === "Everything's on deck!",
  );
  const box = title?.parentElement;
  if (!box) throw new Error('No finish box');
  expect(box.textContent).toContain("This week's plan is all on the board");
  expect(box.textContent).toContain(
    'Adjust your plan to add more or call it a week',
  );
  expect(box.querySelector('button, a')).toBeNull();
};

/** The mid-week fixture with only these backlog tasks left in the backlog. */
const withOnlyBacklog = (titles: string[]) =>
  MID_WEEK_TASKS.filter(
    task => task.status !== TaskStatus.BACKLOG || titles.includes(task.title),
  );

/** More copies of Read waiting in the backlog, after its first two. */
const extraReadCopies = (count: number): TaskItem[] => {
  const read = findTaskByTitle('Read');
  return Array.from({length: count}, (_, offset) => ({
    ...read,
    id: `extra-read-${offset}`,
    instanceIndex: 2 + offset,
  }));
};

const BIO_LECTURE_4_ID = 'scn-step-bio-4';
const BIO_LECTURE_TITLES = [
  'Lecture 4 — Cell signaling',
  'Lecture 5 — Immunity basics',
  'Lecture 6 — Neurons',
];
const BIO_LECTURE_4_TITLE = 'Lecture 4 — Cell signaling';
const DRAG_HINT = 'Drag tasks left to Todo to start working';
const DAY_CLEAR_TITLE = 'All clear for the day';
const TAP_HINT = 'Tap to pull a task onto the board';

const PDB_RENDER = {id: 'scn-step-pdb-2', title: 'Render it with Mol*'};
const TAX_REPORT_TITLE = 'File tax report';
const DESIGN_CASE_TITLE = 'System design case';

/**
 * The board fills its parent's height, as it fills AppShell's <main>; the
 * frame gives it the window's, so the backlog strip has a size to click.
 */
const BoardFrame = ({board}: {board: BoardData}) => (
  <div className="h-dvh">
    <BoardPage {...board} />
  </div>
);

const renderBoard = (board: Partial<BoardData> = {}) =>
  renderPage(<BoardFrame board={{...MID_WEEK_BOARD, ...board}} />);

const openBacklog = () => userEvent.click(getShownByTitle('Open backlog'));

const useMobileWidth = () =>
  page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height);

beforeEach(() => {
  vi.mocked(updateTaskStatusAction).mockReset();
});

afterEach(async () => {
  for (const save of unansweredSaves.splice(0)) save.resolve(SAVE_FAILED);
  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height);
});

describe('Columns', () => {
  it("COL-1 each column's header shows how many cards it has", async () => {
    await renderBoard();

    expect(readColumnTitles('TODO')).toHaveLength(4);
    expect(readHeaderCount('TODO')).toBe('4');
    expect(readHeaderCount('DONE')).toBe(
      String(readColumnTitles('DONE').length),
    );
  });

  it('COL-4 CARD-6 on mobile the columns stack as rows of mini cards that scroll sideways, showing only kind, title, progress and size', async () => {
    await useMobileWidth();
    await renderBoard();

    const todo = getColumn('TODO');
    const done = getColumn('DONE');
    expect(todo.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      done.getBoundingClientRect().top,
    );
    expect(getComputedStyle(todo).overflowX).toBe('auto');

    const {card} = getCard('TODO', 'LeetCode');
    expect(card.getBoundingClientRect().width).toBeLessThan(
      MOBILE_VIEWPORT.width / 2,
    );
    expect(card.innerText).toContain('HABIT');
    expect(getDots(card)).toHaveLength(3);
    expect(card.innerText).toContain('XS');
    // No details (the plan line) and no description
    expect(card.innerText).not.toContain('× / week');
    expect(card.innerText).not.toContain('One medium, 45-min timer');
  });
});

describe('Todo when the day is clear', () => {
  /** The board with Todo empty: every Todo card finished at `doneAt`. */
  const withTodoFinishedAt = (doneAt: Date) =>
    MID_WEEK_TASKS.map(task =>
      task.status === TaskStatus.TODO
        ? {...task, status: TaskStatus.DONE, doneAt}
        : task,
    );

  const findDayClearBox = () => {
    const title = [...getColumn('TODO').querySelectorAll('p')].find(
      paragraph =>
        paragraph.checkVisibility() &&
        paragraph.textContent === DAY_CLEAR_TITLE,
    );
    return title?.parentElement ?? null;
  };

  const expectDayClearBox = () => {
    const box = findDayClearBox();
    if (!box) throw new Error('Todo shows no box');
    expect(box.textContent).toContain(
      'Everything you pulled for today is done',
    );
    expect(box.textContent).toContain(
      'Pull more from the backlog or call it a day',
    );
    expect(box.querySelector('button, a')).toBeNull();
  };

  it('COL-5 an empty Todo, once something was finished today, says the day is clear', async () => {
    await renderBoard({tasks: withTodoFinishedAt(new Date())});

    expect(readColumnTitles('TODO')).toEqual([]);
    expectDayClearBox();
  });

  it('COL-5 on mobile the box shows in the Todo row', async () => {
    await useMobileWidth();
    await renderBoard({tasks: withTodoFinishedAt(new Date())});

    expectDayClearBox();
  });

  it('COL-5 an empty Todo shows nothing when nothing was finished today', async () => {
    // The fixture's Done tasks were all finished on days long past
    await renderBoard({
      tasks: MID_WEEK_TASKS.filter(task => task.status !== TaskStatus.TODO),
    });

    expect(readColumnTitles('TODO')).toEqual([]);
    expect(getColumn('TODO').textContent).toBe('');
  });

  it('COL-5 the box shows as soon as the last Todo card lands on Done, before the server answers', async () => {
    keepSaving();
    await renderBoard({
      tasks: MID_WEEK_TASKS.filter(
        task =>
          task.status !== TaskStatus.TODO || task.title === TAX_REPORT_TITLE,
      ),
    });
    expect(findDayClearBox()).toBeNull();

    await dragTodoCardOntoDone(TAX_REPORT_TITLE);

    expectDayClearBox();
  });
});

describe('Task cards', () => {
  it('CARD-1 CARD-8 a habit card shows its kind and how often it runs, its title and description, then its dots alone and size', async () => {
    await renderBoard();
    const {card} = getCard('TODO', 'LeetCode');

    expectTopToBottom(card, [
      'Habit',
      'LeetCode',
      'One medium, 45-min timer',
      'XS',
    ]);
    expect(card.innerText).toContain('3× / week');
    // No count beside the dots; a screen reader reads them as one
    expect(card.innerText).not.toContain('1/3');
    expect(readProgressLabel(card)).toBe('1 of 3 done this week');

    // LeetCode runs three times: one done, this card, one in the backlog
    const dots = getDots(card);
    expect(dots).toHaveLength(3);
    const [done, own, staged] = dots;
    expect(fillOf(done)).not.toBe(fillOf(own));
    expect(fillOf(staged)).toBe(fillOf(own));
    expect(dots.map(isRinged)).toEqual([false, true, false]);
  });

  it('CARD-8 a habit no longer on the plan shows no details and no progress', async () => {
    await renderBoard({
      plan: {
        ...SCENARIO_PLAN,
        planTemplates: SCENARIO_PLAN.planTemplates.filter(
          line => line.templateId !== 'tpl-leetcode',
        ),
      },
    });
    const {card} = getCard('TODO', 'LeetCode');

    expect(card.innerText).not.toContain('× / week');
    expect(getDots(card)).toHaveLength(0);
  });

  it("CARD-1 CARD-4 a step card shows its project and number, its title and description, then its project's path and size", async () => {
    await renderBoard();
    const {card} = getCard('TODO', PDB_RENDER.title);

    expectTopToBottom(card, [
      'Protein 3D viewer',
      PDB_RENDER.title,
      'Rotate + zoom works in the page',
    ]);
    expect(card.innerText).toContain('2/4');
    expect(card.innerText).toContain('M');

    // Step 1 done, step 2 this card, steps 3 and 4 not done
    const segments = getSegments(card);
    expect(segments).toHaveLength(4);
    const [done, own, next] = segments;
    expect(fillOf(done)).not.toBe(fillOf(own));
    expect(fillOf(next)).toBe(fillOf(own));
    expect(segments.map(isRinged)).toEqual([false, true, false, false]);
  });

  it("CARD-4 a step whose project the board didn't get shows no details and no progress", async () => {
    await renderBoard({projects: []});
    const {card} = getCard('TODO', PDB_RENDER.title);

    expect(card.innerText).not.toContain('2/4');
    expect(getSegments(card)).toHaveLength(0);
  });

  it('CARD-1 CARD-5 a one-off card shows its kind and quadrant, its title and description, and its size, with no progress', async () => {
    await renderBoard();
    const {card} = getCard('TODO', TAX_REPORT_TITLE);

    expectTopToBottom(card, [
      'One-off',
      TAX_REPORT_TITLE,
      'Federal + state, receipts in the blue folder',
    ]);
    expect(card.innerText).toContain('Do first');
    expect(getDots(card)).toHaveLength(0);
    expect(getSegments(card)).toHaveLength(0);
  });

  it('CARD-2 R4 a Done card is dimmed, its title struck through and its description hidden; it has no drag handle', async () => {
    await renderBoard();

    // The same habit, one task done and one still to do
    const done = getCard('DONE', 'LeetCode');
    const todo = getCard('TODO', 'LeetCode');
    expect(getComputedStyle(done.heading).textDecorationLine).toBe(
      'line-through',
    );
    expect(getComputedStyle(done.card).opacity).toBe('0.5');
    expect(done.card.textContent).not.toContain('One medium, 45-min timer');
    expect(todo.card.textContent).toContain('One medium, 45-min timer');

    expect(isDragHandle(done.card)).toBe(false);
    expect(isDragHandle(todo.card)).toBe(true);
  });
});

describe('Backlog', () => {
  it('BL-2 BL-8 BL-4 on desktop the backlog is a closed strip showing how many tasks wait, opening into a panel that shows it too', async () => {
    await renderBoard();

    const strip = getShownByTitle('Open backlog');
    expect(readBacklogBadge(strip)).toBe(String(BACKLOG_COUNT));
    expect(getColumn('BACKLOG').closest('[inert]')).not.toBeNull();

    await userEvent.click(strip);

    expect(getColumn('BACKLOG').closest('[inert]')).toBeNull();
    expect(readBacklogBadge(getPanelHeader())).toBe(String(BACKLOG_COUNT));
  });

  it('BL-2 BL-8 BL-4 on mobile the backlog is a pill showing how many tasks wait, opening a sheet that shows it too', async () => {
    await useMobileWidth();
    await renderBoard();

    const pill = getShownByTitle('Open backlog');
    expect(readBacklogBadge(pill)).toBe(String(BACKLOG_COUNT));
    expect(document.querySelector('dialog[open]')).toBeNull();

    await userEvent.click(pill);

    expect(readBacklogBadge(getOpenSheet())).toBe(String(BACKLOG_COUNT));
  });

  it('BL-8 at exactly 8 the count shows the number', async () => {
    await renderBoard({tasks: [...MID_WEEK_TASKS, ...extraReadCopies(1)]});

    expect(readBacklogBadge(getShownByTitle('Open backlog'))).toBe('8');
  });

  it('BL-8 past 8 the count shows 8+, and a screen reader hears the real number', async () => {
    // Three more copies of Read: ten tasks wait, in four groups
    await renderBoard({tasks: [...MID_WEEK_TASKS, ...extraReadCopies(3)]});
    const strip = getShownByTitle('Open backlog');

    expect(readBacklogBadge(strip)).toBe('8+');
    expect(strip.textContent).toContain('10 staged tasks');
    await userEvent.click(strip);
    expect(readBacklogBadge(getPanelHeader())).toBe('8+');
    expect(getPanelHeader().textContent).toContain('10 staged tasks');
  });

  it("BL-5 A2 A3 keyboard focus reaches only the side of the desktop backlog that's showing", async () => {
    await renderBoard();
    const strip = getShownByTitle('Open backlog');
    const closeButton = document.querySelector<HTMLElement>(
      '[title="Close backlog"]',
    );
    if (!closeButton) throw new Error('No close button');
    const {card: backlogCard} = getCard('BACKLOG', DESIGN_CASE_TITLE);

    // Closed: the faded-out panel stays mounted but out of reach
    backlogCard.focus();
    expect(document.activeElement).not.toBe(backlogCard);
    closeButton.focus();
    expect(document.activeElement).not.toBe(closeButton);

    strip.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(closeButton);
    backlogCard.focus();
    expect(document.activeElement).toBe(backlogCard);
    strip.focus();
    expect(document.activeElement).not.toBe(strip);

    closeButton.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(strip);
  });

  it('BL-15 when the backlog is empty on desktop, the strip shows 0 and the panel says everything is on deck, with no hint', async () => {
    await renderBoard({tasks: BACKLOG_CLEAR_TASKS});

    const strip = getShownByTitle('Open backlog');
    expect(readBacklogBadge(strip)).toBe('0');
    await userEvent.click(strip);

    const panel = getColumn('BACKLOG');
    expect(readBacklogBadge(getPanelHeader())).toBe('0');
    expectBacklogFinishBox(panel);
    expect(panel.textContent).not.toContain(DRAG_HINT);
    expect(readTitles(panel)).toEqual([]);
  });

  it('BL-15 on mobile the pill stays at 0; pulling the last task keeps the sheet open and shows that everything is on deck', async () => {
    keepSaving();
    await useMobileWidth();
    await renderBoard({tasks: withOnlyBacklog([DESIGN_CASE_TITLE])});
    await openBacklog();
    const sheet = getOpenSheet();
    expect(sheet.textContent).toContain(TAP_HINT);

    await userEvent.click(
      getPullButton(findCard(sheet, DESIGN_CASE_TITLE).card),
    );

    await expect.poll(() => readTitles(sheet)).toEqual([]);
    expect(getOpenSheet()).toBe(sheet);
    expect(readBacklogBadge(sheet)).toBe('0');
    expectBacklogFinishBox(sheet);
    expect(sheet.textContent).not.toContain(TAP_HINT);

    await userEvent.click(sheet.querySelector('[title="Close backlog"]')!);
    await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
    expect(readBacklogBadge(getShownByTitle('Open backlog'))).toBe('0');
  });
});

describe('Backlog groups', () => {
  it('BL-9 BL-16 on desktop each habit and each project is one card showing its next task, in Habits then Projects, by the order they were created', async () => {
    await renderBoard();
    await openBacklog();
    const panel = getColumn('BACKLOG');

    // Read's next is its first copy; Biomedical course's its lowest step
    expect(readBacklogOutline(panel)).toEqual([
      'Habits',
      'LeetCode',
      'Read',
      DESIGN_CASE_TITLE,
      'Projects',
      BIO_LECTURE_4_TITLE,
    ]);
  });

  it('BL-16 the groups follow when their habits were created, whatever their tasks', async () => {
    // The plan lists its habits oldest first; here System design is the oldest
    await renderBoard({
      plan: {
        ...SCENARIO_PLAN,
        planTemplates: SCENARIO_PLAN.planTemplates.toReversed(),
      },
    });
    await openBacklog();

    expect(readTitles(getColumn('BACKLOG'))).toEqual([
      DESIGN_CASE_TITLE,
      'Read',
      'LeetCode',
      BIO_LECTURE_4_TITLE,
    ]);
  });

  it('BL-9 on mobile the sheet shows the same groups in their sections', async () => {
    await useMobileWidth();
    await renderBoard();
    await openBacklog();

    expect(readBacklogOutline(getOpenSheet())).toEqual([
      'Habits',
      'LeetCode',
      'Read',
      DESIGN_CASE_TITLE,
      'Projects',
      BIO_LECTURE_4_TITLE,
    ]);
  });

  it("BL-9 a section with no group in it isn't shown", async () => {
    await renderBoard({tasks: withOnlyBacklog(['Read'])});
    await openBacklog();

    expect(readBacklogOutline(getColumn('BACKLOG'))).toEqual([
      'Habits',
      'Read',
    ]);
  });

  it("BL-10 a backlog card shows its kind, the next task's title and description, then its progress — no details, no size, no count", async () => {
    await renderBoard();
    await openBacklog();

    const {card: habit} = getCard('BACKLOG', 'LeetCode');
    expectTopToBottom(habit, ['Habit', 'LeetCode', 'One medium, 45-min timer']);
    // LeetCode runs three times: one done, one in Todo, this one ringed
    expect(getDots(habit).map(isRinged)).toEqual([false, false, true]);
    expect(readProgressLabel(habit)).toBe('1 of 3 done this week');
    expect(habit.innerText).not.toMatch(/× \/ week|1\/3|XS/);

    const {card: step} = getCard('BACKLOG', BIO_LECTURE_4_TITLE);
    expectTopToBottom(step, [
      'Biomedical course',
      BIO_LECTURE_4_TITLE,
      'Watch + one-page notes',
    ]);
    // Lectures 1–3 done, 4 is next: the fourth segment of seven is ringed
    expect(getSegments(step).map(isRinged)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(readProgressLabel(step)).toBe('3 of 7 steps done');
    expect(step.innerText).not.toMatch(/4\/7|XS/);
    // Desktop drags the card; it has no ↑ Todo
    expect(isDragHandle(step)).toBe(true);
    expect(findPullButton(step)).toBeUndefined();
  });

  it("BL-10 on mobile a backlog card has ↑ Todo and can't be dragged", async () => {
    await useMobileWidth();
    await renderBoard();
    await openBacklog();
    const {card} = findCard(getOpenSheet(), 'Read');

    expect(isDragHandle(card)).toBe(false);
    expect(getPullButton(card)).toBeDefined();
  });

  it('BL-11 a group with tasks behind its next one shows +N more and a sheet for each, at most three; its last task shows neither', async () => {
    // Read gets five copies: four behind its next one
    await renderBoard({tasks: [...MID_WEEK_TASKS, ...extraReadCopies(3)]});
    await openBacklog();

    const read = getCard('BACKLOG', 'Read').card;
    expect(readMoreCount(read)).toBe('+4 more');
    expect(getPileSheets(read)).toHaveLength(3);
    const bio = getCard('BACKLOG', BIO_LECTURE_4_TITLE).card;
    expect(readMoreCount(bio)).toBe('+2 more');
    expect(getPileSheets(bio)).toHaveLength(2);
    const leetcode = getCard('BACKLOG', 'LeetCode').card;
    expect(readMoreCount(leetcode)).toBeNull();
    expect(getPileSheets(leetcode)).toHaveLength(0);

    // The sheets carry no text, and taps go through them
    for (const sheet of getPileSheets(read)) {
      expect(sheet.textContent).toBe('');
      expect(getComputedStyle(sheet).pointerEvents).toBe('none');
    }
  });

  it("BL-12 A8 a project's +N more opens its queue in place of the sheets and closes it again; a habit's opens nothing", async () => {
    await renderBoard();
    await openBacklog();
    const bio = getCard('BACKLOG', BIO_LECTURE_4_TITLE).card;
    const read = getCard('BACKLOG', 'Read').card;
    expect(read.querySelector('button')).toBeNull();

    await userEvent.click(getQueueToggle(bio));

    await expect
      .poll(() => readQueueRows(getGroupOf(bio)))
      .toEqual(['5Lecture 5 — Immunity basics', '6Lecture 6 — Neurons']);
    expect(getPileSheets(bio)).toHaveLength(0);
    expect(getQueueToggle(bio).getAttribute('aria-expanded')).toBe('true');

    await userEvent.click(getQueueToggle(bio));

    await expect.poll(() => readQueueRows(getGroupOf(bio))).toEqual([]);
    expect(getPileSheets(bio)).toHaveLength(2);
  });

  it('BL-12 closing the backlog closes every open queue', async () => {
    await renderBoard();
    await openBacklog();
    await userEvent.click(
      getQueueToggle(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card),
    );
    await expect
      .poll(() => readQueueRows(getColumn('BACKLOG')))
      .toHaveLength(2);

    await userEvent.click(getShownByTitle('Close backlog'));
    await openBacklog();

    const bio = getCard('BACKLOG', BIO_LECTURE_4_TITLE).card;
    expect(readQueueRows(getColumn('BACKLOG'))).toEqual([]);
    expect(getPileSheets(bio)).toHaveLength(2);
  });

  it('BL-12 on mobile closing the sheet closes every open queue', async () => {
    await useMobileWidth();
    await renderBoard();
    await openBacklog();
    const sheet = getOpenSheet();
    await userEvent.click(
      getQueueToggle(findCard(sheet, BIO_LECTURE_4_TITLE).card),
    );
    await expect.poll(() => readQueueRows(sheet)).toHaveLength(2);

    await userEvent.click(
      sheet.querySelector<HTMLElement>('[title="Close backlog"]')!,
    );
    await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
    await openBacklog();

    expect(readQueueRows(getOpenSheet())).toEqual([]);
    expect(
      getPileSheets(findCard(getOpenSheet(), BIO_LECTURE_4_TITLE).card),
    ).toHaveLength(2);
  });

  it("R6 the steps in a project's queue can't be dragged and have no ↑ Todo", async () => {
    await useMobileWidth();
    await renderBoard();
    await openBacklog();
    const sheet = getOpenSheet();
    const {card} = findCard(sheet, BIO_LECTURE_4_TITLE);

    await userEvent.click(getQueueToggle(card));

    await expect.poll(() => readQueueRows(getGroupOf(card))).toHaveLength(2);
    const rows = [...getGroupOf(card).querySelectorAll('li')];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.querySelector('button')).toBeNull();
      expect(row.closest('[data-rfd-drag-handle-draggable-id]')).toBeNull();
    }
  });

  it("R6 on desktop only a group's next task is a drag handle", async () => {
    await renderBoard();
    await openBacklog();
    const panel = getColumn('BACKLOG');
    await userEvent.click(
      getQueueToggle(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card),
    );

    // One drag handle per group, whatever waits behind
    await expect.poll(() => readQueueRows(panel)).toHaveLength(2);
    const handles = [
      ...panel.querySelectorAll('[data-rfd-drag-handle-draggable-id]'),
    ].map(handle => handle.getAttribute('data-rfd-drag-handle-draggable-id'));
    expect(handles).toHaveLength(4);
    expect(handles).toContain(BIO_LECTURE_4_ID);
    expect(handles).not.toContain('scn-step-bio-5');
  });

  it('BL-14 a lifted backlog card leaves a placeholder of its size, and nothing else changes until the drop; a cancelled drag puts it back', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    const panel = getColumn('BACKLOG');
    const {card: read} = getCard('BACKLOG', 'Read');
    const readBox = read.getBoundingClientRect();
    const [sheet] = getPileSheets(read);
    const before = readBacklogLayout(panel);

    read.focus();
    await userEvent.keyboard('[Space]');
    await expect.poll(readAnnouncement).toMatch(/lifted/);
    // Over Done: out of the backlog, where a shared list would close the gap
    await userEvent.keyboard('[ArrowLeft]');
    await expect.poll(readAnnouncement).toMatch(/to list DONE/);
    await waitForRollbackWindow();

    const placeholder = getLiftPlaceholder(panel);
    const placeholderBox = placeholder.getBoundingClientRect();
    expect(placeholderBox.height).toBeCloseTo(readBox.height, 0);
    expect(placeholderBox.top).toBeCloseTo(readBox.top, 0);
    expect(placeholder.textContent).toBe('');
    expect(fillOf(placeholder)).toBe(fillOf(sheet));
    expect(readBacklogLayout(panel)).toEqual(before);

    await userEvent.keyboard('[Escape]');
    await expect.poll(readAnnouncement).toMatch(/cancelled|returned/);
    await expect
      .poll(() => document.querySelector('[data-rfd-placeholder-context-id]'))
      .toBeNull();
    await expect
      .poll(() => getCard('BACKLOG', 'Read').card.getBoundingClientRect().top)
      .toBeCloseTo(readBox.top, 0);
    expect(updateTaskStatusAction).not.toHaveBeenCalled();
  });
});

describe('A move', () => {
  it("A4 MV-5 BL-13 a group's next task dragged onto Todo lands in its place at once; the card shows the task after it and its open queue stays open", async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    await userEvent.click(
      getQueueToggle(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card),
    );

    // From the panel, one column left is Done and two is Todo
    await dragCard('BACKLOG', BIO_LECTURE_4_TITLE, ['ArrowLeft', 'ArrowLeft']);

    expect(readColumnTitles('TODO')).toEqual([
      TAX_REPORT_TITLE,
      'Workout',
      'LeetCode',
      // Both projects' first tasks were made together: their ids break the tie
      BIO_LECTURE_4_TITLE,
      PDB_RENDER.title,
    ]);
    expect(readHeaderCount('TODO')).toBe('5');
    expect(readBacklogBadge(getPanelHeader())).toBe(String(BACKLOG_COUNT - 1));
    // The queue's first row is now on the card, and the queue stays open
    const bio = getCard('BACKLOG', 'Lecture 5 — Immunity basics').card;
    expect(readMoreCount(bio)).toBe('+1 more');
    expect(readQueueRows(getGroupOf(bio))).toEqual(['6Lecture 6 — Neurons']);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(BIO_LECTURE_4_ID, {
      status: TaskStatus.TODO,
    });

    // The task that came up can be dragged out in turn
    await dragCard('BACKLOG', BIO_LECTURE_TITLES[1], [
      'ArrowLeft',
      'ArrowLeft',
    ]);
    expect(readColumnTitles('TODO')).toContain(BIO_LECTURE_TITLES[1]);
    expect(readBacklogOutline(getColumn('BACKLOG'))).toContain(
      BIO_LECTURE_TITLES[2],
    );
  });

  it('A5 MV-5 BL-13 on mobile ↑ Todo pulls the next task at once and the sheet stays open; the pile thins, then the group and its section go', async () => {
    keepSaving();
    await useMobileWidth();
    // Read's four copies, alone in Habits, and Biomedical course's steps
    await renderBoard({
      tasks: [
        ...withOnlyBacklog(['Read', ...BIO_LECTURE_TITLES]),
        ...extraReadCopies(2),
      ],
    });
    await openBacklog();
    const sheet = getOpenSheet();
    const readCard = () => findCard(sheet, 'Read').card;
    expect(readMoreCount(readCard())).toBe('+3 more');
    expect(getPileSheets(readCard())).toHaveLength(3);
    expect(isDragHandle(readCard())).toBe(false);

    // Each tap: +N more goes down by one; the sheets once fewer than three wait
    const expected = [
      {more: '+2 more', sheets: 2},
      {more: '+1 more', sheets: 1},
      {more: null, sheets: 0},
    ];
    for (const [pulled, {more, sheets}] of expected.entries()) {
      await userEvent.click(getPullButton(readCard()));
      await expect
        .poll(() => readHeaderCount('TODO'))
        .toBe(String(4 + pulled + 1));
      expect(readMoreCount(readCard())).toBe(more);
      expect(getPileSheets(readCard())).toHaveLength(sheets);
      expect(getOpenSheet()).toBe(sheet);
    }
    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle('Read').id,
      {status: TaskStatus.TODO},
    );

    await userEvent.click(getPullButton(readCard()));

    await expect
      .poll(() => readBacklogOutline(sheet))
      .toEqual(['Projects', BIO_LECTURE_4_TITLE]);
    expect(readBacklogBadge(sheet)).toBe('3');
  });

  it('A6 CARD-7 MV-5 a backlog card dragged onto Done fills its dot at once, and a screen reader reads one more done', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    const [stagedDot] = getDots(getCard('BACKLOG', DESIGN_CASE_TITLE).card);
    const emptyFill = fillOf(stagedDot);

    await dragCard('BACKLOG', DESIGN_CASE_TITLE, ['ArrowLeft']);

    const {card} = getCard('DONE', DESIGN_CASE_TITLE);
    const [doneDot] = getDots(card);
    expect(fillOf(doneDot)).not.toBe(emptyFill);
    expect(readProgressLabel(card)).toBe('1 of 1 done this week');
    expect(readColumnTitles('DONE')[0]).toBe(DESIGN_CASE_TITLE);
    expect(readBacklogBadge(getPanelHeader())).toBe(String(BACKLOG_COUNT - 1));
    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle(DESIGN_CASE_TITLE).id,
      {status: TaskStatus.DONE},
    );
  });

  it('A7 MV-5 MV-3 a card dragged onto Done is on top of it at once; progress counts it once the server answers', async () => {
    const save = Promise.withResolvers<SaveResult>();
    vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
    const screen = await renderBoard();
    const {todayDoneCount} = MID_WEEK_PROGRESS;
    expect(readProgress()).toContain(todayDoneText(todayDoneCount));

    await dragTodoCardOntoDone(PDB_RENDER.title);

    expect(readColumnTitles('DONE')[0]).toBe(PDB_RENDER.title);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(PDB_RENDER.id, {
      status: TaskStatus.DONE,
    });
    // Progress waits for the server's counts
    expect(readProgress()).toContain(todayDoneText(todayDoneCount));

    // The server's answer: the revalidated page, then the action resolves
    const savedTasks = withTaskDone(PDB_RENDER.id);
    const savedProgress = {
      ...MID_WEEK_PROGRESS,
      todayDoneCount: todayDoneCount + 1,
    };
    await screen.rerender(
      <BoardFrame
        board={{
          ...MID_WEEK_BOARD,
          tasks: savedTasks,
          progress: savedProgress,
        }}
      />,
    );
    save.resolve(savedTaskIn(savedTasks, PDB_RENDER.id));

    await expect
      .poll(readProgress)
      .toContain(todayDoneText(todayDoneCount + 1));
    expect(readColumnTitles('DONE')[0]).toBe(PDB_RENDER.title);
  });

  it('MV-4 a refused move puts only its card back, once the other cards have saved', async () => {
    const failedSave = Promise.withResolvers<SaveResult>();
    const otherSave = Promise.withResolvers<SaveResult>();
    vi.mocked(updateTaskStatusAction)
      .mockReturnValueOnce(failedSave.promise)
      .mockReturnValueOnce(otherSave.promise);
    const screen = await renderBoard();

    await dragTodoCardOntoDone(PDB_RENDER.title);
    await dragTodoCardOntoDone(TAX_REPORT_TITLE);
    expect(readColumnTitles('DONE').slice(0, 2)).toEqual([
      TAX_REPORT_TITLE,
      PDB_RENDER.title,
    ]);

    // The other card is still saving, so the refused card waits for it
    failedSave.resolve(SAVE_FAILED);
    await waitForRollbackWindow();
    expect(readColumnTitles('DONE')).toContain(PDB_RENDER.title);

    // The other card saves: the page revalidated with it, then its action
    const taxReport = findTaskByTitle(TAX_REPORT_TITLE);
    const savedTasks = withTaskDone(taxReport.id);
    await screen.rerender(
      <BoardFrame board={{...MID_WEEK_BOARD, tasks: savedTasks}} />,
    );
    otherSave.resolve(savedTaskIn(savedTasks, taxReport.id));

    await expect
      .poll(() => readColumnTitles('TODO'))
      .toContain(PDB_RENDER.title);
    expect(readColumnTitles('DONE')[0]).toBe(TAX_REPORT_TITLE);
  });

  it('R5 nothing can be dropped into the backlog: a card stepped past Done stays on Done', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();

    getCard('TODO', TAX_REPORT_TITLE).card.focus();
    await userEvent.keyboard('[Space]');
    await expect.poll(readAnnouncement).toMatch(/lifted/);
    await userEvent.keyboard('[ArrowRight]');
    await expect.poll(readAnnouncement).toMatch(/to list DONE/);
    await userEvent.keyboard('[ArrowRight]');
    expect(readAnnouncement()).not.toMatch(/BACKLOG/);
    await userEvent.keyboard('[Space]');
    await expect.poll(readAnnouncement).toMatch(/dropped/);

    expect(readColumnTitles('DONE')[0]).toBe(TAX_REPORT_TITLE);
    expect(readColumnTitles('BACKLOG')).not.toContain(TAX_REPORT_TITLE);
  });
});
