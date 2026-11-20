// Spec: design/specs/board.md
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cdp, commands, page, userEvent} from 'vitest/browser';
import {updateTaskStatusAction} from '@/actions/taskActions';
import type {TaskItem} from '@/lib/db/tasks';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {formatISODate, getISOWeekKey, getTodayDate} from '@/utils/dateUtils';
import {
  BACKLOG_CLEAR_TASKS,
  MID_WEEK_TASKS,
  SCENARIO_PLAN,
  SCENARIO_PROJECTS,
} from '@/app/design/scenarios/board/fixtures';
import {renderPage} from '../../../../test/component/renderPage';
import {BoardPage} from './BoardPage';
import {RING_ARC_GAP} from './day-rings/constants';
import {
  COMPLETE_VIBRATION,
  RING_CLOSE_VIBRATION,
} from './motion/completionMotion';

vi.mock('@/actions/taskActions', () => ({updateTaskStatusAction: vi.fn()}));

// ─── The weeks ─────────────────────────────────────────────────────────────

/**
 * The rings count against the real clock, so each board's week is built
 * around today (in KANBAN_TZ): this week, with every Done task finished
 * today; last week, where every day is past; next week, where none has come.
 */
const NOW = new Date();
const TODAY = getTodayDate();
/** 0 for Monday … 6 for Sunday */
const TODAY_INDEX = (TODAY.getDay() + 6) % 7;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_NAME = DAY_NAMES[TODAY_INDEX];

/** Today's local date moved by `days`, at local midnight. */
const shiftToday = (days: number) =>
  new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + days);

const LAST_MONDAY = shiftToday(-TODAY_INDEX - 7);
/** A moment on last week's day `dayIndex`, `hour` o'clock UTC (morning in LA). */
const onLastWeekDay = (dayIndex: number, hour: number) =>
  new Date(
    Date.UTC(
      LAST_MONDAY.getFullYear(),
      LAST_MONDAY.getMonth(),
      LAST_MONDAY.getDate() + dayIndex,
      hour,
    ),
  );
const lastWeekDate = (dayIndex: number) =>
  formatISODate(
    new Date(
      LAST_MONDAY.getFullYear(),
      LAST_MONDAY.getMonth(),
      LAST_MONDAY.getDate() + dayIndex,
    ),
  );

const withDoneAt = (tasks: TaskItem[], doneAt: (index: number) => Date) => {
  let doneIndex = 0;
  return tasks.map(task =>
    task.status === TaskStatus.DONE
      ? {...task, doneAt: doneAt(doneIndex++)}
      : task,
  );
};

/** The Design Console's mid-week board, every Done task finished today. */
const MID_WEEK_BOARD: BoardData = {
  plan: SCENARIO_PLAN,
  tasks: withDoneAt(MID_WEEK_TASKS, () => NOW),
  projects: SCENARIO_PROJECTS,
  expiredDailyCountByDate: {},
};

/**
 * Today on the mid-week board: Workout twice, LeetCode and a Biomedical
 * lecture done today, with two one-offs; in Todo, Workout, LeetCode, a
 * Protein 3D viewer step and a one-off.
 */
const TODAY_COUNTS = {done: 6, planned: 10};
const TODAY_LABEL = `${TODAY_NAME}: 6 of 10 done — habits 3 of 5, steps 1 of 2, one-offs 2 of 3`;

/**
 * Last week: Monday holds Workout and Call bank, with one Workout expired;
 * Tuesday a Biomedical lecture; Wednesday nothing; Thursday Workout, LeetCode
 * and Return package. The Done tasks come in the fixture's order: Workout,
 * Workout, LeetCode, the lecture, Call bank, Return package.
 */
const LAST_WEEK_DONE_AT = [
  onLastWeekDay(0, 17),
  onLastWeekDay(3, 18),
  onLastWeekDay(3, 19),
  onLastWeekDay(1, 18),
  onLastWeekDay(0, 19),
  onLastWeekDay(3, 20),
];
const LAST_WEEK_BOARD: BoardData = {
  ...MID_WEEK_BOARD,
  plan: {...SCENARIO_PLAN, periodKey: getISOWeekKey(LAST_MONDAY)},
  tasks: withDoneAt(MID_WEEK_TASKS, index => LAST_WEEK_DONE_AT[index]),
  expiredDailyCountByDate: {[lastWeekDate(0)]: 1},
};
const NEXT_WEEK_BOARD: BoardData = {
  ...MID_WEEK_BOARD,
  plan: {...SCENARIO_PLAN, periodKey: getISOWeekKey(shiftToday(7))},
};

/** The fixture's backlog holds seven tasks, in four groups. */
const BACKLOG_COUNT = 7;

// ─── The window ────────────────────────────────────────────────────────────

/** The test runner's window is desktop-sized; a mobile test resizes it. */
const DESKTOP_VIEWPORT = {width: 1280, height: 800};
const MOBILE_VIEWPORT = {width: 390, height: 844};

const useMobileWidth = () =>
  page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height);

/** Chromium's reduced-motion setting, as the user's system would set it. */
const setReducedMotion = (isReduced: boolean) =>
  cdp().send('Emulation.setEmulatedMedia', {
    features: [
      {name: 'prefers-reduced-motion', value: isReduced ? 'reduce' : ''},
    ],
  });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * How long a test gives React to roll a card back before checking it hasn't.
 * A rollback commits within a few frames, so asserting right after a save
 * resolves would pass whether or not the card was going to move.
 */
const ROLLBACK_WINDOW_MS = 200;
const waitForRollbackWindow = () => sleep(ROLLBACK_WINDOW_MS);

/** ✓ Complete ignores presses for 350 ms after it appears (TAP-3). */
const ARM_GUARD_MS = 350;
const waitPastArmGuard = () => sleep(ARM_GUARD_MS + 100);

/** How long a completion's juice and toss may take, with room to spare. */
const MOTION_TIMEOUT = {timeout: 3000};

// ─── Columns and cards ─────────────────────────────────────────────────────

type BoardColumnStatus = 'BACKLOG' | 'TODO' | 'DONE';

/**
 * A column's list of cards, or the desktop backlog's panel. The board's
 * cards are read from the DOM, retried with
 * `expect.poll` — a locator built from an element (`page.elementLocator`)
 * pins its text, which a move changes.
 */
const findColumn = (status: BoardColumnStatus) =>
  document.querySelector<HTMLElement>(
    status === 'BACKLOG'
      ? 'section[aria-label="Backlog"]'
      : `[data-board-column="${status}"]`,
  );

const getColumn = (status: BoardColumnStatus) => {
  const column = findColumn(status);
  if (!column) throw new Error(`No ${status} column`);
  return column;
};

/** A board column's frame: its header over its list of cards. */
const getColumnFrame = (status: 'TODO' | 'DONE') => {
  const frame = getColumn(status).parentElement;
  if (!frame) throw new Error(`No ${status} frame`);
  return frame;
};

/** The card titles shown inside an element, top to bottom. */
const readTitles = (container: Element) =>
  [...container.querySelectorAll('h3')]
    .filter(heading => heading.checkVisibility())
    .map(heading => heading.textContent);

const readColumnTitles = (status: BoardColumnStatus) =>
  readTitles(getColumn(status));

/** The card around a shown title. */
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

const getTodoCard = (title: string) => getCard('TODO', title).card;

/** A column's header count, beside its name and tag. */
const readHeaderCount = (status: 'TODO' | 'DONE') =>
  getColumnFrame(status).querySelector('.badge')?.textContent;

/** An element's box as plain numbers: two DOMRects always look equal to toEqual. */
const boxOf = (element: Element) => element.getBoundingClientRect().toJSON();

/** Resolves once the element's own animations have ended and it is at rest. */
const waitForRest = (element: Element) =>
  Promise.all(element.getAnimations().map(({finished}) => finished));

/** At rest: its animations have ended, and none has left it moved or turned. */
const expectAtRest = async (element: Element) => {
  await waitForRest(element);
  const {transform} = getComputedStyle(element);
  expect(transform === 'none' || new DOMMatrix(transform).isIdentity).toBe(
    true,
  );
};

/** A box's centre, in the viewport. */
const centreOf = (element: Element) => {
  const {left, top, width, height} = element.getBoundingClientRect();
  return {x: left + width / 2, y: top + height / 2};
};

const sum = (numbers: number[]) =>
  numbers.reduce((total, number) => total + number, 0);

/** Whether the card can be dragged: by the browser, or as a drag library's handle. */
const isDraggable = (card: HTMLElement) =>
  card.draggable || card.hasAttribute('data-rfd-drag-handle-draggable-id');

/** How long a card's outline takes to come in or go (daisyUI's 0.2 s). */
const OUTLINE_SETTLE_MS = 300;

/** Whether the element draws the focus ring: an outline with a width and a
    colour that shows. */
const showsFocusRing = (element: HTMLElement) => {
  const {outlineStyle, outlineWidth, outlineColor} = getComputedStyle(element);
  const isTransparent = /, 0\)$|\/ 0\)$/.test(outlineColor);
  return outlineStyle !== 'none' && outlineWidth !== '0px' && !isTransparent;
};

/** The shown element with this title: the backlog's strip and pill share one. */
const getShownByTitle = (title: string) => {
  const element = [
    ...document.querySelectorAll<HTMLElement>(`[title="${title}"]`),
  ].find(candidate => candidate.checkVisibility());
  if (!element) throw new Error(`Nothing shown titled ${title}`);
  return element;
};

const getOpenSheet = () => {
  const sheet = document.querySelector<HTMLElement>('dialog[open]');
  if (!sheet) throw new Error('The sheet is not open');
  return sheet;
};

/** A backlog card's ↑ Todo button, if it has one. */
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

/** A card's kind line's text, before the CSS puts it in upper case, without
    the backlog's +N more on its right. */
const readKindLine = (card: HTMLElement) =>
  [...(card.querySelector('h3')?.previousElementSibling?.children ?? [])]
    .filter(part => !part.classList.contains('ml-auto'))
    .map(part => part.textContent)
    .join('');

/** A card's size chip, as the old cards showed it (XS, S, M, L, XL). */
const SIZE_TEXT = /\b(XS|S|M|L|XL)\b|\bpts?\b/;

/** How long a held press takes to settle into its shrink (fx-press's 0.15s). */
const PRESS_SETTLE_MS = 250;

/** The element's transform while the mouse button is held down on it. */
const readHeldTransform = async (element: HTMLElement) => {
  element.dataset.pressProbe = '';
  try {
    await commands.holdPointer('[data-press-probe]');
    await sleep(PRESS_SETTLE_MS);
    return getComputedStyle(element).transform;
  } finally {
    await commands.releasePointer();
    delete element.dataset.pressProbe;
  }
};

/** Polls until an element let go of stands as it did before the press. */
const expectLetGo = (element: HTMLElement) =>
  expect.poll(() => getComputedStyle(element).transform).toBe('none');

// ─── Tap twice ─────────────────────────────────────────────────────────────

const isSelected = (card: HTMLElement) =>
  card.getAttribute('aria-pressed') === 'true';

const findSelectedCards = () => [
  ...document.querySelectorAll<HTMLElement>('[aria-pressed="true"]'),
];

/** A Todo card's corner: its round mark, or ✓ Complete once selected. */
const getCornerButton = (card: HTMLElement) => {
  const button = card.querySelector<HTMLElement>('button');
  if (!button) throw new Error('No corner button on the card');
  return button;
};

/** ✓ Complete, as a screen reader names it. */
const findCompleteButton = (title: string) =>
  document.querySelector<HTMLElement>(`button[aria-label="Complete ${title}"]`);

const getCompleteButton = (title: string) => {
  const button = findCompleteButton(title);
  if (!button) throw new Error(`No ✓ Complete for ${title}`);
  return button;
};

const selectCard = async (title: string) => {
  await userEvent.click(getTodoCard(title));
  await expect.poll(() => isSelected(getTodoCard(title))).toBe(true);
};

/** Select, wait out the guard, press ✓ Complete. */
const completeByTap = async (title: string) => {
  await selectCard(title);
  await waitPastArmGuard();
  await userEvent.click(getCompleteButton(title));
};

/** Completes a Todo card and waits until it has landed and left Todo. */
const completeAndLand = async (title: string) => {
  await completeByTap(title);
  await expect
    .poll(() => readColumnTitles('TODO'), MOTION_TIMEOUT)
    .not.toContain(title);
};

/** A press outside the Todo cards and the day's list: a column's header,
    Done's where there is one, since an open list can cover Todo's. */
const pressOutside = () =>
  userEvent.click(
    getColumnFrame(findColumn('DONE') ? 'DONE' : 'TODO').querySelector('h2')!,
  );

// ─── The rings ─────────────────────────────────────────────────────────────

const getRingRow = () => {
  const row = document.querySelector<HTMLElement>(
    '[role="group"][aria-label="This week, day by day"]',
  );
  if (!row) throw new Error('No row of rings');
  return row;
};

/** Every shown cell of the row, left to right: a button, or a future day. */
const getCells = () => [
  ...getRingRow().querySelectorAll<HTMLElement>(
    '[data-day-cell], [role="img"]',
  ),
];

const getTodayCell = () => {
  const cell = getRingRow()
    .querySelector('[data-today-ring]')
    ?.closest<HTMLElement>('button');
  if (!cell) throw new Error("No today's cell");
  return cell;
};

const getDayCell = (date: string) => {
  const cell = document.querySelector<HTMLElement>(`[data-day-cell="${date}"]`);
  if (!cell) throw new Error(`No cell for ${date}`);
  return cell;
};

/** Today's count, beside the word Today: "6 of 10 done" or "All 6 done". */
const readTodayCount = () =>
  getTodayCell()
    .textContent.replace(/^Today/, '')
    .trim();

const getRingSvg = (cell: Element) => {
  const svg = cell.querySelector<SVGElement>('.fx-ring-svg');
  if (!svg) throw new Error('No ring in the cell');
  return svg;
};

/**
 * A ring's arcs that show, habits first: their kind, their visible length,
 * and where each starts along the track, clockwise from the ring's start.
 */
const readArcs = (cell: Element) =>
  [...cell.querySelectorAll<SVGCircleElement>('[data-arc]')]
    .map(arc => ({
      kind: arc.dataset.arc,
      length: Number(arc.getAttribute('stroke-dasharray')?.split(' ')[0]),
      // 0 - so that an offset of 0 reads as 0, not -0
      start: 0 - Number(arc.getAttribute('stroke-dashoffset') ?? 0),
      color: getComputedStyle(arc).stroke,
    }))
    .filter(({length}) => length > 0);

const hasCheck = (cell: Element) =>
  cell.querySelector('.fx-ring-check') !== null;

/** The cell's frame colour, to tell closed, open and plain apart. */
const frameOf = (cell: HTMLElement) => getComputedStyle(cell).borderTopColor;

/** The card's left edge, its kind's colour. */
const edgeOf = (card: HTMLElement) => getComputedStyle(card).borderLeftColor;

/** The element whose classes play today's tick and celebration. */
const getTodayMotion = () => {
  const motion = getRingRow().querySelector<HTMLElement>('[data-today-ring]');
  if (!motion) throw new Error("No today's ring");
  return motion;
};

// ─── A day's list ──────────────────────────────────────────────────────────

const findDayListPanel = () =>
  document.querySelector<HTMLElement>('[data-day-list]');

const getDayListPanel = () => {
  const panel = findDayListPanel();
  if (!panel) throw new Error("No day's list is open");
  return panel;
};

/** Each row of a day's list: its title, then a step's project. */
const readDayListRows = (list: Element) =>
  [...list.querySelectorAll('li')].map(row =>
    [...row.querySelectorAll('span > span')].map(part => part.textContent),
  );

const getDayListClose = (list: Element) => {
  const button = list.querySelector<HTMLElement>(
    'button[aria-label="Close the day\'s list"]',
  );
  if (!button) throw new Error("No close button on the day's list");
  return button;
};

// ─── Saves ─────────────────────────────────────────────────────────────────

/** What updateTaskStatusAction resolves to: the saved task, or the error. */
type SaveResult = Awaited<ReturnType<typeof updateTaskStatusAction>>;

/** The action's refusal, as a failed save answers. */
const SAVE_FAILED: SaveResult = {
  error: {formErrors: ['Task not found'], fieldErrors: {}},
};

/** The board's tasks as the server saves them once `taskId` is done. */
const withTaskDone = (tasks: TaskItem[], taskId: string) =>
  tasks.map(task =>
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

/** A save the test answers itself; answered once the test ends anyway, in
    case the test fails before it does. */
const holdSave = () => {
  const save = Promise.withResolvers<SaveResult>();
  unansweredSaves.push(save);
  return save;
};

const findTaskByTitle = (title: string) => {
  const task = MID_WEEK_TASKS.find(candidate => candidate.title === title);
  if (!task) throw new Error(`No ${title} in the fixture`);
  return task;
};

// ─── The backlog ───────────────────────────────────────────────────────────

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
  const group = card.parentElement;
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

/** The old hints under the backlog's header, which BL-20 takes away. */
const OLD_HINTS = [
  'Drag tasks left to Todo to start working',
  'Tap to pull a task onto the board',
];

/** The mid-week board's tasks with only these backlog tasks left in it. */
const withOnlyBacklog = (titles: string[]) =>
  MID_WEEK_BOARD.tasks.filter(
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
const DAY_CLEAR_TITLE = 'All clear for the day';

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

/** A description long enough to run past two lines on any card. */
const LONG_DESCRIPTION = Array.from(
  {length: 12},
  (_, index) => `Sentence ${index + 1} of a long description.`,
).join(' ');

/** The mid-week fixture with every task's description made long. */
const WITH_LONG_DESCRIPTIONS = MID_WEEK_TASKS.map(task => ({
  ...task,
  description: LONG_DESCRIPTION,
}));

/**
 * A card's description is cut off after two lines: it shows exactly two of
 * its lines, the rest hidden behind an ellipsis.
 */
const expectCutOffAfterTwoLines = (card: HTMLElement) => {
  const description = [...card.querySelectorAll<HTMLElement>('p')].find(
    paragraph => paragraph.textContent === LONG_DESCRIPTION,
  );
  if (!description) throw new Error('No description on the card');
  const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
  expect(Math.round(description.clientHeight / lineHeight)).toBe(2);
  expect(description.scrollHeight).toBeGreaterThan(description.clientHeight);
  expect(getComputedStyle(description).webkitLineClamp).toBe('2');
};

const renderBoard = (board: Partial<BoardData> = {}) =>
  renderPage(<BoardFrame board={{...MID_WEEK_BOARD, ...board}} />);

/** The mid-week board with Todo holding only these cards. */
const withOnlyTodo = (titles: string[]) =>
  MID_WEEK_BOARD.tasks.filter(
    task => task.status !== TaskStatus.TODO || titles.includes(task.title),
  );

const openBacklog = () => userEvent.click(getShownByTitle('Open backlog'));

let vibrations: number[][] = [];

beforeEach(() => {
  vi.mocked(updateTaskStatusAction).mockReset();
  vibrations = [];
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: (pattern: number[]) => {
      vibrations.push(pattern);
      return true;
    },
  });
});

afterEach(async () => {
  for (const save of unansweredSaves.splice(0)) save.resolve(SAVE_FAILED);
  await setReducedMotion(false);
  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height);
});

describe('Day rings', () => {
  it("RING-1 on desktop the row shows all seven days; today's cell is wider and framed, with its ring, Today and its count", async () => {
    await renderBoard();

    const cells = getCells();
    expect(cells).toHaveLength(7);
    const today = getTodayCell();
    expect(cells[TODAY_INDEX]).toBe(today);
    expect(today.textContent).toBe(
      `Today${TODAY_COUNTS.done} of ${TODAY_COUNTS.planned} done`,
    );

    const others = cells.filter(cell => cell !== today);
    expect(others.map(cell => cell.textContent)).toEqual(
      DAY_NAMES.filter(name => name !== TODAY_NAME),
    );
    for (const cell of others) {
      expect(today.getBoundingClientRect().width).toBeGreaterThan(
        cell.getBoundingClientRect().width,
      );
      expect(frameOf(cell)).not.toBe(frameOf(today));
      // Each other day holds its name over its ring
      const name = [...cell.querySelectorAll('span')].find(
        span => span.textContent === cell.textContent,
      );
      expect(name!.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        getRingSvg(cell).getBoundingClientRect().top,
      );
    }
  });

  it('RING-1 on mobile the row shows today and as many days before it as fit, the rings keeping their size', async () => {
    await renderBoard();
    const ringSizes = () =>
      getCells().map(cell => getRingSvg(cell).getBoundingClientRect().width);
    const todayRingSize =
      getRingSvg(getTodayCell()).getBoundingClientRect().width;
    const dayRingSize = ringSizes().find(size => size !== todayRingSize);

    // RING-1's widths and how many other days fit at each
    const OTHER_DAYS_BY_WIDTH = [
      {width: 320, others: 2},
      {width: 430, others: 4},
      {width: MOBILE_VIEWPORT.width, others: 3},
    ];
    for (const {width, others} of OTHER_DAYS_BY_WIDTH) {
      await page.viewport(width, MOBILE_VIEWPORT.height);

      // The days before today, and early in the week the days after it
      const first = Math.max(0, TODAY_INDEX - others);
      await expect
        .poll(() =>
          getCells().map(cell =>
            cell === getTodayCell()
              ? TODAY_NAME
              : (cell.getAttribute('aria-label') ?? '').split(':')[0],
          ),
        )
        .toEqual(DAY_NAMES.slice(first, first + others + 1));
    }

    const today = getTodayCell();
    expect(today.getBoundingClientRect().width).toBeGreaterThanOrEqual(132);
    for (const cell of getCells().filter(other => other !== today)) {
      expect(cell.getBoundingClientRect().width).toBeGreaterThanOrEqual(54);
    }
    expect(getRingSvg(today).getBoundingClientRect().width).toBe(todayRingSize);
    for (const size of ringSizes().filter(other => other !== todayRingSize)) {
      expect(size).toBe(dayRingSize);
    }
  });

  it("RING-2 today plans what's done today and every card in Todo, not the backlog", async () => {
    await renderBoard();

    expect(readTodayCount()).toBe(
      `${TODAY_COUNTS.done} of ${TODAY_COUNTS.planned} done`,
    );
  });

  it("RING-2 RING-4 a past day counts what was done on it and its daily habit tasks that expired; a screen reader reads each kind's counts", async () => {
    await renderBoard(LAST_WEEK_BOARD);

    expect(
      getCells()
        .slice(0, 4)
        .map(cell => cell.getAttribute('aria-label')),
    ).toEqual([
      'Mon: 2 of 3 done — habits 1 of 2, one-offs 1 of 1',
      'Tue: 1 of 1 done — steps 1 of 1',
      'Wed: 0 of 0 done',
      'Thu: 3 of 3 done — habits 2 of 2, one-offs 1 of 1',
    ]);
  });

  it("RING-4 a screen reader reads today's cell with its day's name and each kind's counts", async () => {
    await renderBoard();

    expect(getTodayCell().getAttribute('aria-label')).toBe(TODAY_LABEL);
  });

  it("RING-3 a ring's arcs are its done tasks, each its card's kind colour, habits then steps then one-offs; the rest is an empty track", async () => {
    await renderBoard();

    // Today: three habits, a step and two one-offs done, out of ten
    const arcs = readArcs(getTodayCell());
    expect(arcs.map(({kind}) => kind)).toEqual(['HABIT', 'PROJECT', 'ONE_OFF']);
    const [habits, steps, oneOffs] = arcs.map(({length}) => length);
    expect(habits / steps).toBeCloseTo(3, 0);
    expect(oneOffs / steps).toBeCloseTo(2, 0);
    // The ring starts at 12 o'clock, and each arc starts where the one before
    // it ends, less the small gap that keeps the kinds apart
    expect(getComputedStyle(getRingSvg(getTodayCell())).rotate).toBe('-90deg');
    const [first, second, third] = arcs;
    expect(first.start).toBe(0);
    expect(second.start - first.length).toBeCloseTo(RING_ARC_GAP, 1);
    expect(third.start - second.start - second.length).toBeCloseTo(
      RING_ARC_GAP,
      1,
    );
    // Each kind in the colour of its cards' left edge
    expect(arcs.map(({color}) => color)).toEqual([
      edgeOf(getTodoCard('Workout')),
      edgeOf(getTodoCard(PDB_RENDER.title)),
      edgeOf(getTodoCard(TAX_REPORT_TITLE)),
    ]);
    // Six of ten done: the arcs fill a little over half the track
    const circumference =
      Math.PI *
      2 *
      Number(
        getTodayCell().querySelector('[data-arc]')?.getAttribute('r') ?? 0,
      );
    const filled = arcs.reduce((sum, {length}) => sum + length, 0);
    expect(filled / circumference).toBeGreaterThan(0.5);
    expect(filled / circumference).toBeLessThan(0.6);
    expect(hasCheck(getTodayCell())).toBe(false);
  });

  it('RING-3 a day with nothing planned is an empty track, and a closed day holds a ✓', async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const [, tuesday, wednesday] = getCells();

    expect(readArcs(wednesday)).toEqual([]);
    expect(hasCheck(wednesday)).toBe(false);
    expect(readArcs(tuesday).map(({kind}) => kind)).toEqual(['PROJECT']);
    expect(hasCheck(tuesday)).toBe(true);
  });

  it("RING-5 a ring closed when the page loads marks today's cell closed, with no celebration, for as long as it is closed", async () => {
    const screen = await renderBoard({tasks: withOnlyTodo([])});
    const today = getTodayCell();

    expect(readTodayCount()).toBe(`All ${TODAY_COUNTS.done} done`);
    expect(hasCheck(today)).toBe(true);
    expect(getTodayMotion().classList.contains('fx-ring-close')).toBe(false);
    const closedFrame = frameOf(today);

    // Work in Todo again: the cell loses its closed look
    await screen.rerender(<BoardFrame board={MID_WEEK_BOARD} />);

    await expect.poll(() => frameOf(getTodayCell())).not.toBe(closedFrame);
    expect(hasCheck(getTodayCell())).toBe(false);
    expect(readTodayCount()).toBe(
      `${TODAY_COUNTS.done} of ${TODAY_COUNTS.planned} done`,
    );
  });

  it('RING-6 a card pulled after the ring closed opens it again; finishing that card closes it again, with its celebration', async () => {
    keepSaving();
    await renderBoard({tasks: withOnlyTodo([])});
    const closedFrame = frameOf(getTodayCell());
    await openBacklog();

    await userEvent.click(
      getPullButton(getCard('BACKLOG', DESIGN_CASE_TITLE).card),
    );

    await expect
      .poll(readTodayCount)
      .toBe(`${TODAY_COUNTS.done} of ${TODAY_COUNTS.done + 1} done`);
    expect(hasCheck(getTodayCell())).toBe(false);
    // The frame's colour eases to its new one (150 ms)
    await expect.poll(() => frameOf(getTodayCell())).not.toBe(closedFrame);
    expect(readArcs(getTodayCell()).length).toBeGreaterThan(0);

    await userEvent.click(getShownByTitle('Close backlog'));
    await completeByTap(DESIGN_CASE_TITLE);

    await expect
      .poll(readTodayCount, MOTION_TIMEOUT)
      .toBe(`All ${TODAY_COUNTS.done + 1} done`);
    expect(hasCheck(getTodayCell())).toBe(true);
    expect(getTodayMotion().classList.contains('fx-ring-close')).toBe(true);
  });

  it("RING-7 a day after today isn't a button and opens nothing; its ring is an empty track read as the day's name", async () => {
    await renderBoard(NEXT_WEEK_BOARD);

    const cells = getCells();
    expect(cells).toHaveLength(7);
    for (const [index, cell] of cells.entries()) {
      expect(cell.tagName).not.toBe('BUTTON');
      expect(cell.getAttribute('aria-label')).toBe(DAY_NAMES[index]);
      expect(readArcs(cell)).toEqual([]);
    }
    await userEvent.click(cells[0]);
    expect(findDayListPanel()).toBeNull();
  });
});

describe("A day's list", () => {
  it("DAY-1 A13 A14 a past day's cell opens its list and closes it again; one list at a time, its cell drawn selected", async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));
    const thursday = getDayCell(lastWeekDate(3));
    const plainFrame = frameOf(monday);

    await userEvent.click(monday);

    expect(getDayListPanel().textContent).toContain('Mon');
    expect(monday.getAttribute('aria-expanded')).toBe('true');
    await expect.poll(() => frameOf(monday)).not.toBe(plainFrame);

    await userEvent.click(thursday);

    expect(document.querySelectorAll('[data-day-list]')).toHaveLength(1);
    expect(readDayListRows(getDayListPanel())[0]).toEqual(['Workout']);
    expect(getDayListPanel().textContent).toContain('Thu');
    expect(monday.getAttribute('aria-expanded')).toBe('false');
    await expect.poll(() => frameOf(monday)).toBe(plainFrame);

    await userEvent.click(thursday);

    expect(findDayListPanel()).toBeNull();
    expect(thursday.getAttribute('aria-expanded')).toBe('false');
  });

  it("DAY-1 DAY-3 today's cell is a button that opens today's list, headed Today with today's count", async () => {
    await renderBoard();

    await userEvent.click(getTodayCell());

    expect(getDayListPanel().textContent).toContain(
      `Today${TODAY_COUNTS.done} of ${TODAY_COUNTS.planned} done`,
    );
    expect(readDayListRows(getDayListPanel())).toHaveLength(TODAY_COUNTS.done);
  });

  it('DAY-2 on desktop the list floats in a panel under the row, centred below its cell, over a board that stays as it is', async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const todoBox = boxOf(getColumnFrame('TODO'));
    const tuesday = getDayCell(lastWeekDate(1));

    await userEvent.click(tuesday);
    await waitForRest(getDayListPanel());

    const panel = getDayListPanel().getBoundingClientRect();
    const cell = tuesday.getBoundingClientRect();
    expect(getDayListPanel().getAttribute('role')).toBe('dialog');
    expect(page.getByRole('dialog', {name: 'Tue'}).element()).toBe(
      getDayListPanel(),
    );
    expect(panel.top).toBeGreaterThanOrEqual(cell.bottom);
    expect(panel.top).toBeLessThan(cell.bottom + 12);
    expect((panel.left + panel.right) / 2).toBeCloseTo(
      (cell.left + cell.right) / 2,
      0,
    );
    // Over the board, which hasn't moved
    expect(panel.bottom).toBeGreaterThan(todoBox.top);
    expect(boxOf(getColumnFrame('TODO'))).toEqual(todoBox);
  });

  it("DAY-2 on desktop the first day's panel stays inside the row rather than centring off it", async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));

    await userEvent.click(monday);
    await waitForRest(getDayListPanel());

    const panel = getDayListPanel().getBoundingClientRect();
    const cell = monday.getBoundingClientRect();
    const row = getRingRow().getBoundingClientRect();
    expect(panel.left).toBeGreaterThanOrEqual(row.left);
    expect(panel.left).toBeLessThan(cell.left);
    expect((panel.left + panel.right) / 2).toBeGreaterThan(
      (cell.left + cell.right) / 2,
    );
  });

  it('DAY-2 on mobile the list rises in a sheet, at most 70% of the screen, over the dimmed board', async () => {
    await useMobileWidth();
    await renderBoard(LAST_WEEK_BOARD);

    await userEvent.click(getDayCell(lastWeekDate(0)));

    const sheet = getOpenSheet();
    expect(sheet.matches(':modal')).toBe(true);
    const readBox = () =>
      sheet.querySelector('.modal-box')!.getBoundingClientRect();
    // It rises from below the screen, then rests on its bottom edge
    await expect
      .poll(() => readBox().bottom)
      .toBeCloseTo(MOBILE_VIEWPORT.height, 0);
    expect(readBox().height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height * 0.7);
    // The board behind is dimmed, by the dialog or its backdrop
    const isTransparent = (color: string) =>
      color === 'transparent' || /, 0\)$|\/ 0\)$/.test(color);
    expect(
      [
        getComputedStyle(sheet).backgroundColor,
        getComputedStyle(sheet, '::backdrop').backgroundColor,
      ].some(color => !isTransparent(color)),
    ).toBe(true);
    expect(findDayListPanel()).toBeNull();
  });

  it("DAY-3 R7 a day's list shows its name and count, then its finished tasks, habits first, the earliest first, a step with its project; nothing in it can be pressed", async () => {
    await renderBoard(LAST_WEEK_BOARD);

    await userEvent.click(getDayCell(lastWeekDate(0)));
    const monday = getDayListPanel();
    expect(monday.textContent).toContain('Mon2 of 3 done');
    expect(readDayListRows(monday)).toEqual([
      ['Workout'],
      ['Call bank about card'],
    ]);

    await userEvent.click(getDayCell(lastWeekDate(3)));
    expect(readDayListRows(getDayListPanel())).toEqual([
      ['Workout'],
      ['LeetCode'],
      ['Return package'],
    ]);

    await userEvent.click(getDayCell(lastWeekDate(1)));
    const tuesday = getDayListPanel();
    expect(readDayListRows(tuesday)).toEqual([
      ['Lecture 3 — Membranes', 'Biomedical course'],
    ]);
    // Each row has its kind's icon, and nothing to press
    const list = tuesday.querySelector('ul')!;
    expect(list.querySelectorAll('li svg')).toHaveLength(1);
    expect(list.querySelector('button, a, [role="button"]')).toBeNull();
  });

  it('DAY-3 a day with nothing finished reads Nothing yet', async () => {
    await renderBoard(LAST_WEEK_BOARD);
    await userEvent.click(getDayCell(lastWeekDate(2)));

    expect(getDayListPanel().textContent).toContain('Nothing yet');
    expect(getDayListPanel().querySelector('li')).toBeNull();
  });

  it('DAY-4 DAY-5 A14 the list closes from its close button, a press outside it and Esc; a press outside leaves focus where it put it', async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));

    await userEvent.click(monday);
    await userEvent.click(getDayListClose(getDayListPanel()));
    expect(findDayListPanel()).toBeNull();
    expect(document.activeElement).toBe(monday);

    await userEvent.click(monday);
    // A press on a Todo card: focus goes to the card, not back to Monday
    await userEvent.click(getTodoCard(TAX_REPORT_TITLE));
    expect(findDayListPanel()).toBeNull();
    expect(document.activeElement).toBe(getTodoCard(TAX_REPORT_TITLE));
    await userEvent.keyboard('{Escape}');

    await userEvent.click(monday);
    await pressOutside();
    expect(findDayListPanel()).toBeNull();

    await userEvent.click(monday);
    await userEvent.keyboard('{Escape}');
    expect(findDayListPanel()).toBeNull();
  });

  it('DAY-4 TAP-2 A10 A11 opening the backlog or selecting a card closes the list, and opening a list cancels a selected card', async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));

    await userEvent.click(monday);
    await openBacklog();
    expect(findDayListPanel()).toBeNull();
    await userEvent.click(getShownByTitle('Close backlog'));

    await userEvent.click(monday);
    await selectCard(TAX_REPORT_TITLE);
    expect(findDayListPanel()).toBeNull();

    await userEvent.click(monday);
    expect(getDayListPanel()).toBeDefined();
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(false);
  });

  it('DAY-4 on mobile a press on the dimmed board closes the sheet', async () => {
    await useMobileWidth();
    await renderBoard(LAST_WEEK_BOARD);
    await userEvent.click(getDayCell(lastWeekDate(0)));

    await userEvent.click(
      getOpenSheet().querySelector<HTMLElement>('.modal-backdrop button')!,
    );

    await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
  });

  it("DAY-5 A13 A14 a cell is reached with Tab and opened with Enter or Space; a screen reader hears whether its list is open; focus moves to the list's close button and back to the cell", async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));
    const tuesday = getDayCell(lastWeekDate(1));
    expect(monday.tabIndex).toBe(0);

    monday.focus();
    await userEvent.keyboard('{Enter}');
    await expect
      .poll(() => document.activeElement)
      .toBe(getDayListClose(getDayListPanel()));
    expect(monday.getAttribute('aria-expanded')).toBe('true');

    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(monday);
    expect(monday.getAttribute('aria-expanded')).toBe('false');

    tuesday.focus();
    await userEvent.keyboard('[Space]');
    await expect
      .poll(() => document.activeElement)
      .toBe(getDayListClose(getDayListPanel()));
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement).toBe(tuesday);
    expect(findDayListPanel()).toBeNull();
  });

  it('DAY-5 on mobile opening the sheet moves focus to the sheet itself, and closing it moves focus back to the cell', async () => {
    await useMobileWidth();
    await renderBoard(LAST_WEEK_BOARD);
    const monday = getDayCell(lastWeekDate(0));

    await userEvent.click(monday);
    const sheet = getOpenSheet();
    // The sheet, not its close button: a button focused by the page draws
    // its focus ring on a phone
    await expect.poll(() => document.activeElement).toBe(sheet);
    await sleep(100);
    expect(document.activeElement).toBe(sheet);
    await userEvent.click(getDayListClose(sheet));

    await expect.poll(() => document.activeElement).toBe(monday);
  });
});

describe('Columns', () => {
  it("COL-6 on desktop Todo (Today) and Done (This week) stand side by side, as tall as the board; Done holds every day's done work; each header counts its cards", async () => {
    await renderBoard(LAST_WEEK_BOARD);
    const todo = getColumnFrame('TODO');
    const done = getColumnFrame('DONE');

    expect(todo.querySelector('h2')?.textContent).toBe('Todo');
    expect(todo.textContent).toContain('Today');
    expect(done.querySelector('h2')?.textContent).toBe('Done');
    expect(done.textContent).toContain('This week');
    expect(todo.getBoundingClientRect().right).toBeLessThanOrEqual(
      done.getBoundingClientRect().left,
    );
    expect(todo.getBoundingClientRect().height).toBe(
      done.getBoundingClientRect().height,
    );

    // Done tasks from Monday, Tuesday and Thursday
    expect(readColumnTitles('DONE')).toHaveLength(6);
    expect(readHeaderCount('DONE')).toBe('6');
    expect(readColumnTitles('TODO')).toHaveLength(4);
    expect(readHeaderCount('TODO')).toBe('4');
  });

  it("COL-6 COL-7 on mobile the board is Todo alone, a list of full-width cards one under another in Todo's order, each the desktop card", async () => {
    await useMobileWidth();
    await renderBoard();

    expect(findColumn('DONE')).toBeNull();
    // The header has no Today tag on a phone: the name and the count
    expect(getColumnFrame('TODO').innerText).not.toMatch(/\btoday\b/i);
    expect(readHeaderCount('TODO')).toBe('4');
    expect(readColumnTitles('TODO')).toEqual([
      TAX_REPORT_TITLE,
      'Workout',
      'LeetCode',
      PDB_RENDER.title,
    ]);
    const cards = readColumnTitles('TODO').map(getTodoCard);
    const todoWidth = getColumn('TODO').getBoundingClientRect().width;
    for (const [index, card] of cards.entries()) {
      expect(card.getBoundingClientRect().width).toBeCloseTo(todoWidth, 0);
      if (index > 0) {
        expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          cards[index - 1].getBoundingClientRect().bottom,
        );
      }
    }
    // The same card: its description and its corner mark
    const leetcode = getTodoCard('LeetCode');
    expect(leetcode.textContent).toContain('One medium, 45-min timer');
    expect(getCornerButton(leetcode)).toBeDefined();
  });
});

describe('Todo when the day is clear', () => {
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
    return box;
  };

  it('COL-8 an empty Todo, once something was finished today, says the day is clear, on both widths', async () => {
    await renderBoard({tasks: withOnlyTodo([])});

    expect(readColumnTitles('TODO')).toEqual([]);
    const box = expectDayClearBox();
    expect(box.classList.contains('fx-boot-in')).toBe(true);
    expect(box.getAnimations().length).toBeGreaterThan(0);
    // It ends where it rests
    await expectAtRest(box);
    expect(getComputedStyle(box).opacity).toBe('1');

    await useMobileWidth();
    // The pill takes the strip's place once the page has seen the new width
    await expect.poll(() => getShownByTitle('Open backlog')).toBeTruthy();
    expectDayClearBox();
  });

  it('COL-8 an empty Todo shows nothing when nothing was finished today', async () => {
    await renderBoard({
      ...LAST_WEEK_BOARD,
      tasks: LAST_WEEK_BOARD.tasks.filter(
        task => task.status !== TaskStatus.TODO,
      ),
    });

    expect(readColumnTitles('TODO')).toEqual([]);
    expect(getColumn('TODO').textContent).toBe('');
  });

  it('COL-8 FX-2 a last card completed with ✓ Complete shows the box once it has landed in the ring', async () => {
    keepSaving();
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE])});

    await completeByTap(TAX_REPORT_TITLE);

    // In flight: the card is still Todo's
    expect(readHeaderCount('TODO')).toBe('1');
    expect(findDayClearBox()).toBeNull();
    await expect.poll(findDayClearBox, MOTION_TIMEOUT).not.toBeNull();
    expectDayClearBox();
  });

  it('COL-8 under reduced motion the box appears at once', async () => {
    await setReducedMotion(true);
    await renderBoard({tasks: withOnlyTodo([])});

    const box = expectDayClearBox();
    expect(box.getAnimations()).toEqual([]);
  });
});

describe('Task cards', () => {
  it('CARD-9 CARD-10 a habit card shows its kind alone, its title and description, then its dots and the corner mark, with no size', async () => {
    await renderBoard();
    const card = getTodoCard('LeetCode');

    expect(readKindLine(card)).toBe('Habit');
    expectTopToBottom(card, ['LeetCode', 'One medium, 45-min timer']);
    expect(card.innerText).not.toMatch(/× \/ week|Daily|Weekly|1\/3/);
    expect(card.innerText).not.toMatch(SIZE_TEXT);
    expect(readProgressLabel(card)).toBe('1 of 3 done this week');
    // The card's own label names it, and its face describes it, dots and all
    const faceId = card.getAttribute('aria-describedby') ?? '';
    expect(
      document.getElementById(faceId)?.querySelector('[role="img"]'),
    ).toBeTruthy();

    // LeetCode runs three times: one done, this card, one in the backlog
    const dots = getDots(card);
    expect(dots).toHaveLength(3);
    const [done, own, staged] = dots;
    expect(fillOf(done)).not.toBe(fillOf(own));
    expect(fillOf(staged)).toBe(fillOf(own));
    expect(dots.map(isRinged)).toEqual([false, true, false]);

    // The mark sits at the bottom right, beside the dots
    const mark = getCornerButton(card).getBoundingClientRect();
    const box = card.getBoundingClientRect();
    expect(mark.right).toBeGreaterThan(box.right - 24);
    expect(mark.top).toBeGreaterThan(dots[0].getBoundingClientRect().top - 12);
  });

  it("CARD-10 a habit's own dot is ringed in Done too", async () => {
    await renderBoard();
    const {card} = getCard('DONE', 'LeetCode');

    expect(getDots(card).map(isRinged)).toEqual([true, false, false]);
  });

  it("CARD-11 a step's own segment is ringed in Done too", async () => {
    await renderBoard();
    const {card} = getCard('DONE', 'Lecture 3 — Membranes');

    // The third lecture of seven
    expect(getSegments(card).map(isRinged)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('CARD-10 a habit no longer on the plan shows no progress', async () => {
    await renderBoard({
      plan: {
        ...SCENARIO_PLAN,
        planTemplates: SCENARIO_PLAN.planTemplates.filter(
          line => line.templateId !== 'tpl-leetcode',
        ),
      },
    });

    expect(getDots(getTodoCard('LeetCode'))).toHaveLength(0);
  });

  it("CARD-9 CARD-11 a step card shows its project's name, its title and description, then its project's path, with no number and no size", async () => {
    await renderBoard();
    const card = getTodoCard(PDB_RENDER.title);

    expect(readKindLine(card)).toBe('Protein 3D viewer');
    expectTopToBottom(card, [
      PDB_RENDER.title,
      'Rotate + zoom works in the page',
    ]);
    expect(card.innerText).not.toContain('2/4');
    expect(card.innerText).not.toMatch(SIZE_TEXT);

    // Step 1 done, step 2 this card, steps 3 and 4 not done
    const segments = getSegments(card);
    expect(segments).toHaveLength(4);
    const [done, own, next] = segments;
    expect(fillOf(done)).not.toBe(fillOf(own));
    expect(fillOf(next)).toBe(fillOf(own));
    expect(segments.map(isRinged)).toEqual([false, true, false, false]);
  });

  it("CARD-11 a step whose project the board didn't get shows no progress", async () => {
    await renderBoard({projects: []});

    expect(getSegments(getTodoCard(PDB_RENDER.title))).toHaveLength(0);
  });

  it('CARD-9 a one-off card shows ONE-OFF | its quadrant, its title and description, and no progress', async () => {
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);

    expect(readKindLine(card)).toBe('One-off|Do first');
    expectTopToBottom(card, [
      TAX_REPORT_TITLE,
      'Federal + state, receipts in the blue folder',
    ]);
    expect(getDots(card)).toHaveLength(0);
    expect(getSegments(card)).toHaveLength(0);
    expect(card.innerText).not.toMatch(SIZE_TEXT);
  });

  it('CARD-9 a long description is cut off after two lines, in Todo and in the backlog', async () => {
    await renderBoard({tasks: WITH_LONG_DESCRIPTIONS});

    expectCutOffAfterTwoLines(getCard('TODO', TAX_REPORT_TITLE).card);

    await openBacklog();
    expectCutOffAfterTwoLines(getCard('BACKLOG', 'LeetCode').card);
    expectCutOffAfterTwoLines(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card);
  });

  it("CARD-2 CARD-9 R4 a Done card is dimmed, its title struck through, with no description and no action, and a press doesn't select it", async () => {
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
    expect(done.card.querySelector('button')).toBeNull();

    await userEvent.click(done.card);
    await sleep(100);
    expect(findSelectedCards()).toEqual([]);
    expect(done.card.querySelector('button')).toBeNull();
    expect(updateTaskStatusAction).not.toHaveBeenCalled();
  });
});

describe('Tap twice to complete', () => {
  it('TAP-1 A10 a press anywhere on a Todo card selects it: a confirming frame and ✓ Complete, with nothing on the board moving', async () => {
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);
    const before = boxOf(card);
    const workoutTop = getTodoCard('Workout').getBoundingClientRect().top;
    const plainFrame = getComputedStyle(card).borderTopColor;
    expect(findCompleteButton(TAX_REPORT_TITLE)).toBeNull();

    await userEvent.click(card.querySelector('h3')!);

    expect(isSelected(card)).toBe(true);
    expect(getComputedStyle(card).borderTopColor).not.toBe(plainFrame);
    const complete = getCompleteButton(TAX_REPORT_TITLE);
    expect(complete.textContent).toBe('Complete');
    expect(complete.checkVisibility()).toBe(true);
    expect(boxOf(card)).toEqual(before);
    expect(getTodoCard('Workout').getBoundingClientRect().top).toBe(workoutTop);
  });

  it("TAP-1 one card at a time: pressing another Todo card moves the selection; Done and backlog cards can't be selected", async () => {
    await renderBoard();

    await selectCard(TAX_REPORT_TITLE);
    await selectCard('Workout');

    expect(findSelectedCards()).toEqual([getTodoCard('Workout')]);

    await userEvent.click(getCard('DONE', 'LeetCode').card);
    expect(findSelectedCards()).toEqual([]);
    expect(getCard('DONE', 'LeetCode').card.hasAttribute('aria-pressed')).toBe(
      false,
    );

    await openBacklog();
    const {card: backlogCard} = getCard('BACKLOG', 'Read');
    await userEvent.click(backlogCard.querySelector('h3')!);
    expect(findSelectedCards()).toEqual([]);
  });

  it('TAP-2 A11 the selection is cancelled by pressing the card again, a press outside the cards, or Esc, with nothing finished; not by scrolling or time', async () => {
    await renderBoard();

    await selectCard(TAX_REPORT_TITLE);
    await userEvent.click(getTodoCard(TAX_REPORT_TITLE).querySelector('h3')!);
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(false);

    await selectCard(TAX_REPORT_TITLE);
    await pressOutside();
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(false);

    await selectCard(TAX_REPORT_TITLE);
    await userEvent.keyboard('{Escape}');
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(false);

    await selectCard(TAX_REPORT_TITLE);
    getColumn('TODO').dispatchEvent(new Event('scroll'));
    await sleep(1000);
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(true);
    expect(readColumnTitles('TODO')).toContain(TAX_REPORT_TITLE);
    expect(updateTaskStatusAction).not.toHaveBeenCalled();
  });

  it('TAP-2 A11 opening the backlog cancels the selection', async () => {
    await useMobileWidth();
    await renderBoard();
    await selectCard(TAX_REPORT_TITLE);

    await openBacklog();

    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(false);
  });

  it('TAP-3 a quick double press on the round mark selects the card without finishing it; only ✓ Complete finishes it', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);
    const mark = getCornerButton(card).getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const onMark = {
      position: {
        x: mark.left + mark.width / 2 - box.left,
        y: mark.top + mark.height / 2 - box.top,
      },
    };

    await userEvent.click(card, onMark);
    await userEvent.click(card, onMark);
    // Still inside the guard, well after a shorter one would have let go
    await sleep(ARM_GUARD_MS - 150);
    await userEvent.click(card, onMark);

    // Given the time a finish under reduced motion takes, nothing was finished
    await waitPastArmGuard();
    expect(isSelected(card)).toBe(true);
    expect(updateTaskStatusAction).not.toHaveBeenCalled();
    expect(readColumnTitles('TODO')).toContain(TAX_REPORT_TITLE);

    await userEvent.click(getCompleteButton(TAX_REPORT_TITLE));

    await expect
      .poll(() => readColumnTitles('TODO'))
      .not.toContain(TAX_REPORT_TITLE);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle(TAX_REPORT_TITLE).id,
      {status: TaskStatus.DONE},
    );
  });

  it('TAP-4 a Todo card is reached with Tab and Enter does what a press does, after the same guard; a screen reader hears it selected and ✓ Complete named for its task', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);
    expect(card.tabIndex).toBe(0);
    expect(card.getAttribute('aria-pressed')).toBe('false');

    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(isSelected(card)).toBe(true);
    expect(card.getAttribute('aria-label')).toBe(
      `${TAX_REPORT_TITLE}, selected`,
    );
    expect(getCompleteButton(TAX_REPORT_TITLE)).toBeDefined();

    // Within the guard, Enter does nothing: no pulse, and the card stays
    await userEvent.keyboard('{Enter}');
    expect(vibrations).toEqual([]);
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(true);

    await waitPastArmGuard();
    // A key held down repeats, and a repeat isn't a press: it finishes nothing
    card.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', repeat: true, bubbles: true}),
    );
    expect(vibrations).toEqual([]);

    await userEvent.keyboard('{Enter}');

    await expect
      .poll(() => readColumnTitles('TODO'))
      .not.toContain(TAX_REPORT_TITLE);
  });

  it('TAP-4 Space does what Enter does: it selects a card, and completes the selected one after the guard', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);

    card.focus();
    await userEvent.keyboard('[Space]');
    expect(isSelected(card)).toBe(true);

    // Within the guard, Space does nothing either
    await userEvent.keyboard('[Space]');
    expect(vibrations).toEqual([]);
    expect(isSelected(getTodoCard(TAX_REPORT_TITLE))).toBe(true);

    await waitPastArmGuard();
    await userEvent.keyboard('[Space]');

    await expect
      .poll(() => readColumnTitles('TODO'))
      .not.toContain(TAX_REPORT_TITLE);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle(TAX_REPORT_TITLE).id,
      {status: TaskStatus.DONE},
    );
  });

  it('TAP-5 a Todo card pressed with the mouse shows no focus ring, whether the press selects it or cancels its selection; a card reached with Tab shows it', async () => {
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);

    await userEvent.click(card.querySelector('h3')!);
    await expect.poll(() => isSelected(card)).toBe(true);
    // Given the time a ring takes to come in, none has
    await sleep(OUTLINE_SETTLE_MS);
    expect(showsFocusRing(card)).toBe(false);

    await userEvent.click(card.querySelector('h3')!);
    await expect.poll(() => isSelected(card)).toBe(false);
    await sleep(OUTLINE_SETTLE_MS);
    expect(showsFocusRing(card)).toBe(false);

    // By keyboard: Shift+Tab off the card and Tab back onto it
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).not.toBe(card);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(card);
    await expect.poll(() => showsFocusRing(card)).toBe(true);
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

  it("BL-2 on mobile the sheet is at most three quarters of the screen's height, and a longer backlog scrolls inside it under the header", async () => {
    // A screen short enough that the fixture's backlog is taller than the
    // sheet may be
    const screenHeight = 420;
    await page.viewport(MOBILE_VIEWPORT.width, screenHeight);
    await renderBoard();

    await openBacklog();

    const box = getOpenSheet().querySelector<HTMLElement>('.modal-box')!;
    await expect
      .poll(() => box.getBoundingClientRect().bottom)
      .toBeCloseTo(screenHeight, 0);
    expect(box.getBoundingClientRect().height).toBeLessThanOrEqual(
      screenHeight * 0.75,
    );
    // The cards scroll inside the sheet, and the sheet itself doesn't, so
    // its header stays
    const scrollers = [box, ...box.querySelectorAll('*')].filter(
      element =>
        getComputedStyle(element).overflowY === 'auto' &&
        element.scrollHeight > element.clientHeight + 1,
    );
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0]).not.toBe(box);
    expect(scrollers[0].contains(getShownByTitle('Close backlog'))).toBe(false);
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

  it('BL-5 on mobile opening the sheet moves focus to the sheet itself, and closing it moves focus back to the pill', async () => {
    await useMobileWidth();
    await renderBoard();
    const pill = getShownByTitle('Open backlog');

    await userEvent.click(pill);
    const sheet = getOpenSheet();
    await expect.poll(() => document.activeElement).toBe(sheet);
    await userEvent.click(getShownByTitle('Close backlog'));

    await expect.poll(() => document.activeElement).toBe(pill);
  });

  it("BL-5 A2 A3 keyboard focus reaches only the side of the desktop backlog that's showing", async () => {
    await renderBoard();
    const strip = getShownByTitle('Open backlog');
    const closeButton = document.querySelector<HTMLElement>(
      '[title="Close backlog"]',
    );
    if (!closeButton) throw new Error('No close button');
    const pullButton = getPullButton(
      getCard('BACKLOG', DESIGN_CASE_TITLE).card,
    );

    // Closed: the faded-out panel stays mounted but out of reach
    pullButton.focus();
    expect(document.activeElement).not.toBe(pullButton);
    closeButton.focus();
    expect(document.activeElement).not.toBe(closeButton);

    strip.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(closeButton);
    pullButton.focus();
    expect(document.activeElement).toBe(pullButton);
    strip.focus();
    expect(document.activeElement).not.toBe(strip);

    closeButton.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.activeElement).toBe(strip);
  });

  it('BL-19 BL-20 when the backlog is empty on desktop, the strip shows 0 and the panel says everything is on deck, with no hint', async () => {
    await renderBoard({tasks: BACKLOG_CLEAR_TASKS});

    const strip = getShownByTitle('Open backlog');
    expect(readBacklogBadge(strip)).toBe('0');
    await userEvent.click(strip);

    const panel = getColumn('BACKLOG');
    expect(readBacklogBadge(getPanelHeader())).toBe('0');
    expectBacklogFinishBox(panel);
    for (const hint of OLD_HINTS) expect(panel.textContent).not.toContain(hint);
    expect(readTitles(panel)).toEqual([]);
  });

  it('BL-19 on mobile the pill stays at 0; pulling the last task keeps the sheet open and shows that everything is on deck', async () => {
    keepSaving();
    await useMobileWidth();
    await renderBoard({tasks: withOnlyBacklog([DESIGN_CASE_TITLE])});
    await openBacklog();
    const sheet = getOpenSheet();

    await userEvent.click(
      getPullButton(findCard(sheet, DESIGN_CASE_TITLE).card),
    );

    await expect.poll(() => readTitles(sheet)).toEqual([]);
    expect(getOpenSheet()).toBe(sheet);
    expect(readBacklogBadge(sheet)).toBe('0');
    expectBacklogFinishBox(sheet);

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

  it("CARD-9 CARD-10 CARD-11 a backlog card is the board's card for the group's next task: its kind line, title and description, then its progress with the next task ringed, and ↑ Todo at its bottom right", async () => {
    await renderBoard();
    await openBacklog();

    const {card: habit} = getCard('BACKLOG', 'LeetCode');
    expect(readKindLine(habit)).toBe('Habit');
    expectTopToBottom(habit, ['LeetCode', 'One medium, 45-min timer']);
    // LeetCode runs three times: one done, one in Todo, this one ringed
    expect(getDots(habit).map(isRinged)).toEqual([false, false, true]);
    expect(readProgressLabel(habit)).toBe('1 of 3 done this week');
    expect(habit.innerText).not.toMatch(/× \/ week|1\/3/);
    expect(habit.innerText).not.toMatch(SIZE_TEXT);

    const {card: step} = getCard('BACKLOG', BIO_LECTURE_4_TITLE);
    expect(readKindLine(step)).toBe('Biomedical course');
    expectTopToBottom(step, [BIO_LECTURE_4_TITLE, 'Watch + one-page notes']);
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
    expect(step.innerText).not.toMatch(/4\/7/);
    expect(step.innerText).not.toMatch(SIZE_TEXT);

    // ↑ Todo at the bottom right, on desktop too
    const pull = getPullButton(step).getBoundingClientRect();
    const box = step.getBoundingClientRect();
    expect(pull.right).toBeGreaterThan(box.right - 24);
    expect(pull.bottom).toBeGreaterThan(box.bottom - 24);
  });

  it('CARD-9 CARD-12 no card can be dragged on either width: a Todo card and a backlog card move only by their action', async () => {
    await renderBoard();
    await openBacklog();
    const {card: backlog} = getCard('BACKLOG', 'LeetCode');
    expect(isDraggable(getTodoCard(TAX_REPORT_TITLE))).toBe(false);
    expect(isDraggable(getCard('DONE', 'LeetCode').card)).toBe(false);
    expect(isDraggable(backlog)).toBe(false);
    expect(getPullButton(backlog)).toBeDefined();
    await userEvent.click(getShownByTitle('Close backlog'));

    await useMobileWidth();
    // The phone's board, once the page has seen the new width: no Done
    await expect.poll(() => findColumn('DONE')).toBeNull();
    expect(isDraggable(getTodoCard(TAX_REPORT_TITLE))).toBe(false);
    await openBacklog();
    const {card} = findCard(getOpenSheet(), 'Read');
    expect(isDraggable(card)).toBe(false);
    expect(getPullButton(card)).toBeDefined();
  });

  it('BL-20 no hint sits under the header of the panel or the sheet: the sections come straight after it', async () => {
    await renderBoard();
    await openBacklog();
    for (const hint of OLD_HINTS) {
      expect(getColumn('BACKLOG').textContent).not.toContain(hint);
    }

    await userEvent.click(getShownByTitle('Close backlog'));
    await useMobileWidth();
    // The pill takes the strip's place once the page has seen the new width
    await expect.poll(() => getShownByTitle('Open backlog')).toBeTruthy();
    await openBacklog();
    for (const hint of OLD_HINTS) {
      expect(getOpenSheet().textContent).not.toContain(hint);
    }
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
    expect(read.querySelector('[aria-expanded]')).toBeNull();

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

  it("R6 only a group's next task can be pulled: the steps in a project's queue have no ↑ Todo", async () => {
    await useMobileWidth();
    await renderBoard();
    await openBacklog();
    const sheet = getOpenSheet();
    const {card} = findCard(sheet, BIO_LECTURE_4_TITLE);

    await userEvent.click(getQueueToggle(card));

    await expect.poll(() => readQueueRows(getGroupOf(card))).toHaveLength(2);
    const rows = [...getGroupOf(card).querySelectorAll('li')];
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.querySelector('button')).toBeNull();
    expect(getPullButton(card)).toBeDefined();
  });
});

/**
 * The classes among `classNames` that each class change in `records` added.
 * An element's class after a change is the next change's old value, or its
 * class now for its last change: by the time the records arrive, a class
 * taken off and put back (to restart an animation) is already back.
 */
const findClassAdditions = (records: MutationRecord[], classNames: string[]) =>
  records.flatMap(({type, target, oldValue}, index) => {
    if (type !== 'attributes' || !(target instanceof HTMLElement)) return [];
    const next = records
      .slice(index + 1)
      .find(later => later.type === 'attributes' && later.target === target);
    const after = (next ? (next.oldValue ?? '') : target.className).split(
      /\s+/,
    );
    const before = (oldValue ?? '').split(/\s+/);
    return classNames
      .filter(
        className => after.includes(className) && !before.includes(className),
      )
      .map(className => ({element: target, className}));
  });

describe('Motion', () => {
  /**
   * Every time an element gets one of `classNames`, while the test runs: the
   * motion classes come off once they have played, so a poll could miss them.
   */
  const observers: MutationObserver[] = [];
  const watchClasses = (classNames: string[]) => {
    const added: {element: HTMLElement; className: string}[] = [];
    const observer = new MutationObserver(records => {
      const changed = findClassAdditions(records, classNames);
      added.push(...changed);
      // An element can also arrive with the class already on it; one that got
      // the class in this same batch is counted once
      const isCounted = (element: HTMLElement, className: string) =>
        changed.some(
          addition =>
            addition.element === element && addition.className === className,
        );
      for (const {addedNodes} of records) {
        for (const node of addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const className of classNames) {
            const arrived = [
              ...(node.classList.contains(className) ? [node] : []),
              ...node.querySelectorAll<HTMLElement>(`.${className}`),
            ];
            for (const element of arrived) {
              if (!isCounted(element, className)) {
                added.push({element, className});
              }
            }
          }
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
      childList: true,
      subtree: true,
    });
    observers.push(observer);
    return added;
  };

  afterEach(() => {
    for (const observer of observers.splice(0)) observer.disconnect();
  });

  const JUICE_CLASSES = [
    'fx-juice-wobble',
    'fx-juice-shine',
    'fx-juice-burst',
    'fx-juice-flip',
  ];

  it('FX-1 ✓ Complete first plays a juice on a copy of the card where it stands, never the same one twice in a row', async () => {
    keepSaving();
    // The same draw both times: only "not the last one" can tell them apart
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    await renderBoard();
    const juices = watchClasses(JUICE_CLASSES);
    const card = getTodoCard(TAX_REPORT_TITLE);
    const box = card.getBoundingClientRect();

    await completeAndLand(TAX_REPORT_TITLE);
    await completeAndLand('Workout');

    expect(juices).toHaveLength(2);
    const [first, second] = juices;
    expect(first.className).not.toBe(second.className);
    expect(first.element).not.toBe(card);
    expect(first.element.style.position).toBe('fixed');
    expect(first.element.style.width).toBe(`${box.width}px`);
    random.mockRestore();
  });

  it('FX-1 FX-2 under reduced motion no juice plays and nothing flies or slides: the card fades out where it stands', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();
    const played = watchClasses([
      ...JUICE_CLASSES,
      'fx-toss',
      'fx-slide',
      'fx-fade-out',
    ]);

    await completeAndLand(TAX_REPORT_TITLE);

    expect(played.map(({className}) => className)).toEqual(['fx-fade-out']);
    expect(played[0].element.dataset.todoCard).toBe(
      findTaskByTitle(TAX_REPORT_TITLE).id,
    );
  });

  it("FX-2 MV-6 the copy is tossed into today's ring over the board; the card leaves Todo once it lands, and the cards below slide up", async () => {
    keepSaving();
    await renderBoard();
    const played = watchClasses(['fx-toss', 'fx-slide']);
    const card = getTodoCard(TAX_REPORT_TITLE);

    await completeByTap(TAX_REPORT_TITLE);

    await expect
      .poll(() => played.some(({className}) => className === 'fx-toss'))
      .toBe(true);
    const ghost = played[0].element;
    expect(ghost.style.position).toBe('fixed');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(card.style.visibility).toBe('hidden');
    // It flies from the card's place to the middle of today's ring
    const from = centreOf(card);
    const ring = centreOf(getTodayMotion());
    expect(
      from.x + parseFloat(ghost.style.getPropertyValue('--fx-toss-x')),
    ).toBeCloseTo(ring.x, 0);
    expect(
      from.y + parseFloat(ghost.style.getPropertyValue('--fx-toss-y')),
    ).toBeCloseTo(ring.y, 0);
    // In flight, the card is still Todo's
    expect(readColumnTitles('TODO')).toContain(TAX_REPORT_TITLE);
    expect(updateTaskStatusAction).not.toHaveBeenCalled();

    await expect
      .poll(() => readColumnTitles('TODO'), MOTION_TIMEOUT)
      .not.toContain(TAX_REPORT_TITLE);
    expect(ghost.isConnected).toBe(false);
    const slid = played
      .filter(({className}) => className === 'fx-slide')
      .map(({element}) => element.dataset.todoCard);
    expect(slid).toContain(findTaskByTitle('Workout').id);
    // Once it has slid, the card stands in its place like any other
    await expectAtRest(getTodoCard('Workout'));
    await expect
      .poll(() => getTodoCard('Workout').classList.contains('fx-slide'))
      .toBe(false);
  });

  it("FX-3 today's arcs grow to their new lengths, and today's cell gives one small jump, when a card is finished", async () => {
    keepSaving();
    await renderBoard();
    const ticks = watchClasses(['fx-ring-tick']);
    const [arc] = getTodayCell().querySelectorAll<SVGElement>('[data-arc]');
    expect(arc.classList.contains('fx-ring-grow')).toBe(true);
    expect(getComputedStyle(arc).transitionDuration).toMatch(/0\.5s/);

    await completeAndLand(TAX_REPORT_TITLE);

    expect(ticks.map(({element}) => element)).toEqual([getTodayMotion()]);
    await expectAtRest(getTodayMotion());
  });

  it('FX-3 under reduced motion the arcs take their lengths at once and the cell does not jump', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();
    const [arc] = getTodayCell().querySelectorAll<SVGElement>('[data-arc]');
    expect(getComputedStyle(arc).transitionDuration).toBe('0s');

    await completeAndLand(TAX_REPORT_TITLE);

    expect(getTodayMotion().getAnimations()).toEqual([]);
  });

  it("FX-4 closing today's ring celebrates: the ring turns, sparks fly in the shares of today's done kinds, and the ✓ draws itself", async () => {
    keepSaving();
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE])});
    const celebrations = watchClasses(['fx-ring-close']);

    await completeAndLand(TAX_REPORT_TITLE);

    expect(celebrations).toHaveLength(1);
    const motion = getTodayMotion();
    expect(celebrations[0].element).toBe(motion);
    expect(hasCheck(getTodayCell())).toBe(true);
    const names = motion
      .getAnimations({subtree: true})
      .map(animation => (animation as CSSAnimation).animationName);
    expect(names).toContain('fx-ring-spin');
    expect(names).toContain('fx-ring-spark');
    expect(names).toContain('fx-ring-draw');

    // Done today: habits 3, steps 1, one-offs 3, so of twelve sparks six are
    // the habits' colour, one the steps' and five the one-offs'
    const sparkColors = [
      ...motion.querySelectorAll<HTMLElement>('.fx-ring-spark'),
    ].map(spark => getComputedStyle(spark).backgroundColor);
    const arcColors = readArcs(getTodayCell()).map(({color}) => color);
    expect(new Set(sparkColors)).toEqual(new Set(arcColors));
    expect(
      arcColors.map(
        color => sparkColors.filter(spark => spark === color).length,
      ),
    ).toEqual([6, 1, 5]);

    // The ring turns once, from where it rests back to where it rests
    const ring = getTodayCell().querySelector<SVGElement>('.fx-ring-svg')!;
    const spin = ring
      .getAnimations()
      .find(
        animation =>
          (animation as CSSAnimation).animationName === 'fx-ring-spin',
      )!;
    const readTurn = () => {
      const {rotate, transform} = getComputedStyle(ring);
      return {rotate, transform};
    };
    spin.pause();
    spin.currentTime = 0;
    expect(readTurn()).toEqual({rotate: '-90deg', transform: 'none'});
    spin.finish();
    expect(readTurn()).toEqual({rotate: '-90deg', transform: 'none'});
  });

  it('FX-4 a card finished while another is still in Todo closes nothing, so nothing celebrates', async () => {
    keepSaving();
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE, 'Workout'])});
    const celebrations = watchClasses(['fx-ring-close']);

    await completeAndLand('Workout');

    expect(readTodayCount()).toBe('7 of 8 done');
    expect(hasCheck(getTodayCell())).toBe(false);
    expect(celebrations).toEqual([]);
    expect(vibrations).toEqual([COMPLETE_VIBRATION]);
  });

  it('FX-4 a ring already closed when the page loads, and one under reduced motion, plays no celebration', async () => {
    keepSaving();
    const celebrations = watchClasses(['fx-ring-close']);
    const closedOnLoad = await renderBoard({tasks: withOnlyTodo([])});
    expect(readTodayCount()).toBe(`All ${TODAY_COUNTS.done} done`);
    expect(celebrations).toEqual([]);
    await closedOnLoad.unmount();

    await setReducedMotion(true);
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE])});
    await completeAndLand(TAX_REPORT_TITLE);

    expect(readTodayCount()).toBe('All 7 done');
    expect(hasCheck(getTodayCell())).toBe(true);
    expect(getTodayMotion().getAnimations({subtree: true})).toEqual([]);
    for (const spark of getTodayMotion().querySelectorAll('.fx-ring-spark')) {
      expect(getComputedStyle(spark).display).toBe('none');
    }
  });

  it('FX-5 on desktop a card finished on the page lands on top of Done and glows once; a render or a reload does not glow it again', async () => {
    const save = holdSave();
    vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
    const glows = watchClasses(['fx-done-in']);
    const screen = await renderBoard();

    await completeAndLand(TAX_REPORT_TITLE);

    const {card} = getCard('DONE', TAX_REPORT_TITLE);
    expect(readColumnTitles('DONE')[0]).toBe(TAX_REPORT_TITLE);
    expect(glows.map(({element}) => element)).toEqual([card]);
    // The glow starts from the card fully lit inside a success frame
    const [glow] = card.getAnimations();
    glow.pause();
    glow.currentTime = 0;
    expect(getComputedStyle(card).opacity).toBe('1');
    expect(getComputedStyle(card).boxShadow).toMatch(/ 0px 0px 0px 2px/);
    glow.play();
    // The glow ends, and the card is left in Done's look
    await expectAtRest(card);
    expect(getComputedStyle(card).opacity).toBe('0.5');

    const taxReport = findTaskByTitle(TAX_REPORT_TITLE);
    const savedTasks = withTaskDone(MID_WEEK_BOARD.tasks, taxReport.id);
    await screen.rerender(
      <BoardFrame board={{...MID_WEEK_BOARD, tasks: savedTasks}} />,
    );
    save.resolve(savedTaskIn(savedTasks, taxReport.id));
    await sleep(100);
    expect(glows).toHaveLength(1);

    // A reload: the page mounts again with the saved tasks
    await screen.unmount();
    await renderBoard({tasks: savedTasks});
    expect(
      getCard('DONE', TAX_REPORT_TITLE).card.classList.contains('fx-done-in'),
    ).toBe(false);
  });

  it('FX-5 under reduced motion the finished card does not glow', async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard();

    await completeAndLand(TAX_REPORT_TITLE);

    expect(getCard('DONE', TAX_REPORT_TITLE).card.getAnimations()).toEqual([]);
  });

  it('FX-6 selecting a card grows its mark into the ✓ and brings Complete in; cancelling plays it back; under reduced motion both are at once', async () => {
    await renderBoard();
    const card = getTodoCard(TAX_REPORT_TITLE);
    const mark = card.querySelector<HTMLElement>('.fx-arm-mark')!;
    // The mark grows by its scale, so the scale is what moves in 0.15 s
    const {transitionProperty, transitionDuration} = getComputedStyle(mark);
    const scaleIndex = transitionProperty.split(', ').indexOf('scale');
    expect(scaleIndex).toBeGreaterThanOrEqual(0);
    expect(transitionDuration.split(', ')[scaleIndex]).toBe('0.15s');
    const plainScale = getComputedStyle(mark).scale;

    await selectCard(TAX_REPORT_TITLE);

    const word = card.querySelector<HTMLElement>('.fx-arm-word')!;
    expect(word.getAnimations().length).toBeGreaterThan(0);
    await expect.poll(() => getComputedStyle(mark).scale).not.toBe(plainScale);

    await pressOutside();
    await expect.poll(() => getComputedStyle(mark).scale).toBe(plainScale);

    await setReducedMotion(true);
    expect(getComputedStyle(mark).transitionDuration).toBe('0s');
    await selectCard(TAX_REPORT_TITLE);
    expect(
      card.querySelector<HTMLElement>('.fx-arm-word')!.getAnimations(),
    ).toEqual([]);
  });

  it("FX-7 ✓ Complete asks for a short double pulse, and closing today's ring a longer one, under reduced motion too", async () => {
    keepSaving();
    await setReducedMotion(true);
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE, 'Workout'])});

    await completeAndLand('Workout');
    expect(vibrations).toEqual([COMPLETE_VIBRATION]);

    await completeAndLand(TAX_REPORT_TITLE);
    expect(vibrations).toEqual([
      COMPLETE_VIBRATION,
      COMPLETE_VIBRATION,
      RING_CLOSE_VIBRATION,
    ]);
    // A double pulse is on, off, on; the ring's is the longer of the two
    expect(COMPLETE_VIBRATION).toHaveLength(3);
    expect(sum(RING_CLOSE_VIBRATION)).toBeGreaterThan(sum(COMPLETE_VIBRATION));
  });

  it("FX-8 Todo cards and the day's cells that are buttons shrink while held; Done cards, backlog cards and later days don't; under reduced motion nothing shrinks", async () => {
    const lastWeek = await renderBoard(LAST_WEEK_BOARD);
    const shrunkBy = (scale: number) =>
      `matrix(${scale}, 0, 0, ${scale}, 0, 0)`;

    expect(await readHeldTransform(getTodoCard(TAX_REPORT_TITLE))).toBe(
      shrunkBy(0.985),
    );
    await expectLetGo(getTodoCard(TAX_REPORT_TITLE));
    expect(await readHeldTransform(getCard('DONE', 'Workout').card)).toBe(
      'none',
    );
    expect(await readHeldTransform(getCells()[0])).toBe(shrunkBy(0.96));
    await expectLetGo(getCells()[0]);
    await userEvent.keyboard('{Escape}');
    await openBacklog();
    expect(await readHeldTransform(getCard('BACKLOG', 'Read').card)).toBe(
      'none',
    );
    await userEvent.click(getShownByTitle('Close backlog'));

    await setReducedMotion(true);
    expect(await readHeldTransform(getTodoCard('Workout'))).toBe('none');
    expect(await readHeldTransform(getCells()[0])).toBe('none');
    await userEvent.keyboard('{Escape}');

    await setReducedMotion(false);
    await lastWeek.unmount();
    await renderBoard(NEXT_WEEK_BOARD);
    expect(await readHeldTransform(getCells()[0])).toBe('none');
  });
});

describe('A move', () => {
  it("A9 MV-6 BL-13 on desktop ↑ Todo pulls a group's next task into its place in Todo at once and the panel stays open; the card shows the task after it and its open queue stays open until no step is left behind", async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    await userEvent.click(
      getQueueToggle(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card),
    );

    await userEvent.click(
      getPullButton(getCard('BACKLOG', BIO_LECTURE_4_TITLE).card),
    );

    expect(readColumnTitles('TODO')).toEqual([
      TAX_REPORT_TITLE,
      'Workout',
      'LeetCode',
      // Both projects' first tasks were made together: their ids break the tie
      BIO_LECTURE_4_TITLE,
      PDB_RENDER.title,
    ]);
    expect(readHeaderCount('TODO')).toBe('5');
    expect(getColumn('BACKLOG').closest('[inert]')).toBeNull();
    expect(readBacklogBadge(getPanelHeader())).toBe(String(BACKLOG_COUNT - 1));
    // The queue's first row is now on the card, and the queue stays open
    const bio = getCard('BACKLOG', 'Lecture 5 — Immunity basics').card;
    expect(readMoreCount(bio)).toBe('+1 more');
    expect(readQueueRows(getGroupOf(bio))).toEqual(['6Lecture 6 — Neurons']);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(BIO_LECTURE_4_ID, {
      status: TaskStatus.TODO,
    });

    // The task that came up can be pulled in turn
    await userEvent.click(getPullButton(bio));
    await expect
      .poll(() => readColumnTitles('TODO'))
      .toContain(BIO_LECTURE_TITLES[1]);
    // No step is left behind the last one: its queue is gone with the rest
    const lastLecture = getCard('BACKLOG', BIO_LECTURE_TITLES[2]).card;
    expect(readMoreCount(lastLecture)).toBeNull();
    expect(getGroupOf(lastLecture).querySelector('ol')).toBeNull();
  });

  it('A9 MV-6 BL-13 on mobile ↑ Todo pulls the next task at once and the sheet stays open; the pile thins, then the group and its section go', async () => {
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

  it('A12 MV-6 CARD-7 a card completed with ✓ Complete lands on top of Done on desktop, and every card showing its habit fills its dot', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    const backlogDots = () => getDots(getCard('BACKLOG', 'LeetCode').card);
    const [doneFill, todoFill] = backlogDots().map(fillOf);
    expect(doneFill).not.toBe(todoFill);
    await userEvent.click(getShownByTitle('Close backlog'));
    // Done already holds the instance finished earlier in the week
    const taskId = getTodoCard('LeetCode').dataset.todoCard;
    const readTopDoneId = () =>
      document.querySelector<HTMLElement>('[data-done-card]')?.dataset.doneCard;

    await completeByTap('LeetCode');

    await expect.poll(readTopDoneId, MOTION_TIMEOUT).toBe(taskId);
    expect(readColumnTitles('TODO')).not.toContain('LeetCode');
    await openBacklog();
    expect(backlogDots().map(fillOf).slice(0, 2)).toEqual([doneFill, doneFill]);
    expect(readProgressLabel(getCard('BACKLOG', 'LeetCode').card)).toBe(
      '2 of 3 done this week',
    );
    expect(updateTaskStatusAction).toHaveBeenCalledWith(taskId, {
      status: TaskStatus.DONE,
    });
  });

  it("A12 MV-6 on mobile a completed card leaves the board: it shows only in today's list", async () => {
    keepSaving();
    await useMobileWidth();
    await renderBoard();

    await completeByTap(TAX_REPORT_TITLE);

    await expect
      .poll(() => readColumnTitles('TODO'), MOTION_TIMEOUT)
      .not.toContain(TAX_REPORT_TITLE);
    expect(readHeaderCount('TODO')).toBe('3');
    expect(document.body.textContent).not.toContain(TAX_REPORT_TITLE);
    await userEvent.click(getTodayCell());
    await expect
      .poll(() => readDayListRows(getOpenSheet()))
      .toContainEqual([TAX_REPORT_TITLE]);
  });

  it("MV-6 today's ring counts each move at once: a card finished from Todo adds a done, and one pulled in adds a planned", async () => {
    keepSaving();
    await renderBoard();
    const {done, planned} = TODAY_COUNTS;

    await completeAndLand(TAX_REPORT_TITLE);
    expect(readTodayCount()).toBe(`${done + 1} of ${planned} done`);

    await openBacklog();
    await userEvent.click(getPullButton(getCard('BACKLOG', 'Read').card));
    expect(readTodayCount()).toBe(`${done + 1} of ${planned + 1} done`);
  });

  it("A12 MV-6 MV-7 a completed card is on top of Done and counted in today's ring once it has landed; the server's answer leaves the ring as it is", async () => {
    const save = holdSave();
    vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
    const screen = await renderBoard();
    const {done, planned} = TODAY_COUNTS;
    const counted = `${done + 1} of ${planned} done`;

    await completeAndLand(PDB_RENDER.title);

    expect(readColumnTitles('DONE')[0]).toBe(PDB_RENDER.title);
    expect(readTodayCount()).toBe(counted);
    const arcs = readArcs(getTodayCell());
    expect(updateTaskStatusAction).toHaveBeenCalledWith(PDB_RENDER.id, {
      status: TaskStatus.DONE,
    });

    // The server's answer: the revalidated page, then the action resolves
    const savedTasks = withTaskDone(MID_WEEK_BOARD.tasks, PDB_RENDER.id);
    await screen.rerender(
      <BoardFrame board={{...MID_WEEK_BOARD, tasks: savedTasks}} />,
    );
    save.resolve(savedTaskIn(savedTasks, PDB_RENDER.id));
    await sleep(100);

    expect(readTodayCount()).toBe(counted);
    expect(readArcs(getTodayCell())).toEqual(arcs);
    expect(readColumnTitles('DONE')[0]).toBe(PDB_RENDER.title);
  });

  it('MV-4 a refused move puts only its card back, once the other cards have saved', async () => {
    const failedSave = holdSave();
    const otherSave = holdSave();
    vi.mocked(updateTaskStatusAction)
      .mockReturnValueOnce(failedSave.promise)
      .mockReturnValueOnce(otherSave.promise);
    const screen = await renderBoard();

    await completeAndLand(PDB_RENDER.title);
    await completeAndLand(TAX_REPORT_TITLE);
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
    const savedTasks = withTaskDone(MID_WEEK_BOARD.tasks, taxReport.id);
    await screen.rerender(
      <BoardFrame board={{...MID_WEEK_BOARD, tasks: savedTasks}} />,
    );
    otherSave.resolve(savedTaskIn(savedTasks, taxReport.id));

    await expect
      .poll(() => readColumnTitles('TODO'))
      .toContain(PDB_RENDER.title);
    expect(readColumnTitles('DONE')[0]).toBe(TAX_REPORT_TITLE);
  });

  it('MV-8 MV-4 a refused completion that had closed the ring opens it again with no second celebration, and the card comes back into Todo', async () => {
    const save = holdSave();
    vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
    await renderBoard({tasks: withOnlyTodo([TAX_REPORT_TITLE])});
    // Each time today's cell gets fx-ring-close, counted as it is added
    let closes = 0;
    const observer = new MutationObserver(records => {
      closes += findClassAdditions(records, ['fx-ring-close']).length;
    });
    observer.observe(getTodayMotion(), {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });

    await completeByTap(TAX_REPORT_TITLE);
    await expect.poll(readTodayCount, MOTION_TIMEOUT).toBe('All 7 done');

    save.resolve(SAVE_FAILED);

    await expect
      .poll(() => readColumnTitles('TODO'))
      .toEqual([TAX_REPORT_TITLE]);
    expect(readTodayCount()).toBe('6 of 7 done');
    expect(hasCheck(getTodayCell())).toBe(false);
    expect(closes).toBe(1);
    expect(
      vibrations.filter(pattern => pattern === RING_CLOSE_VIBRATION),
    ).toHaveLength(1);
    observer.disconnect();
  });
});
