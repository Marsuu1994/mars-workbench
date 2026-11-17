// Spec: design/flows/board.md
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {updateTaskStatusAction} from '@/actions/taskActions';
import type {TaskItem} from '@/lib/db/tasks';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {
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

/** The fixture's backlog holds five tasks. */
const BACKLOG_COUNT = 5;

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
 * A column's drop zone: dnd keys them by status. The board's cards are read
 * from the DOM, retried with `expect.poll` — a locator built from an element
 * (`page.elementLocator`) pins its text, which a move changes.
 */
const getColumn = (status: BoardColumnStatus) => {
  const column = document.querySelector<HTMLElement>(
    `[data-rfd-droppable-id="${status}"]`,
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

const countShownByTitle = (title: string) =>
  [...document.querySelectorAll(`[title="${title}"]`)].filter(element =>
    element.checkVisibility(),
  ).length;

const getOpenSheet = () => {
  const sheet = document.querySelector('dialog[open]');
  if (!sheet) throw new Error('The sheet is not open');
  return sheet;
};

/** A sheet card's ↑ Todo button. */
const getPullButton = (card: Element) => {
  const button = [...card.querySelectorAll('button')].find(
    candidate => candidate.textContent === 'Todo',
  );
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

const PDB_RENDER = {id: 'scn-step-pdb-2', title: 'Render it with Mol*'};
const TAX_REPORT_TITLE = 'File tax report';
const DESIGN_CASE_TITLE = 'System design case';
const EMPTY_BACKLOG_MESSAGE = "You're all caught up — no staged tasks.";

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

describe('Task cards', () => {
  it('CARD-1 CARD-3 a habit card shows its kind and how often it runs, its title and description, then its dots and size', async () => {
    await renderBoard();
    const {card} = getCard('TODO', 'LeetCode');

    expectTopToBottom(card, [
      'Habit',
      'LeetCode',
      'One medium, 45-min timer',
      '1/3',
    ]);
    expect(card.innerText).toContain('3× / week');
    expect(card.innerText).toContain('XS');

    // LeetCode runs three times: one done, this card, one in the backlog
    const dots = getDots(card);
    expect(dots).toHaveLength(3);
    const [done, own, staged] = dots;
    expect(fillOf(done)).not.toBe(fillOf(own));
    expect(fillOf(staged)).toBe(fillOf(own));
    expect(dots.map(isRinged)).toEqual([false, true, false]);
  });

  it('CARD-3 a habit no longer on the plan shows no details and no progress', async () => {
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
  it('BL-2 BL-3 BL-4 on desktop the backlog is a closed strip showing how many tasks wait, opening into a panel that shows it too', async () => {
    await renderBoard();

    const strip = getShownByTitle('Open backlog');
    expect(strip.textContent).toContain(String(BACKLOG_COUNT));
    expect(getColumn('BACKLOG').closest('[inert]')).not.toBeNull();

    await userEvent.click(strip);

    expect(getColumn('BACKLOG').closest('[inert]')).toBeNull();
    const header = getShownByTitle('Close backlog').parentElement;
    expect(header?.textContent).toContain(String(BACKLOG_COUNT));
  });

  it('BL-2 BL-3 BL-4 on mobile the backlog is a pill showing how many tasks wait, opening a sheet that shows it too', async () => {
    await useMobileWidth();
    await renderBoard();

    const pill = getShownByTitle('Open backlog');
    expect(pill.textContent).toContain(String(BACKLOG_COUNT));
    expect(document.querySelector('dialog[open]')).toBeNull();

    await userEvent.click(pill);

    const sheet = getOpenSheet();
    expect(sheet.textContent).toContain(String(BACKLOG_COUNT));
    expect(readTitles(sheet)).toHaveLength(BACKLOG_COUNT);
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

  it("BL-6 A5 MV-1 on mobile a backlog card has ↑ Todo and can't be dragged; tapping it pulls the card into Todo, and the sheet stays open", async () => {
    keepSaving();
    await useMobileWidth();
    await renderBoard();
    await openBacklog();
    const sheet = getOpenSheet();
    const {card} = findCard(sheet, DESIGN_CASE_TITLE);
    expect(isDragHandle(card)).toBe(false);

    await userEvent.click(getPullButton(card));

    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle(DESIGN_CASE_TITLE).id,
      {status: TaskStatus.TODO},
    );
    await expect.poll(() => readTitles(sheet)).not.toContain(DESIGN_CASE_TITLE);
    expect(getOpenSheet()).toBe(sheet);
    expect(sheet.textContent).toContain(String(BACKLOG_COUNT - 1));
    expect(readColumnTitles('TODO')).toContain(DESIGN_CASE_TITLE);
  });

  it('BL-7 when the backlog is empty, the desktop strip shows 0 and the panel an empty message', async () => {
    await renderBoard({
      tasks: MID_WEEK_TASKS.filter(task => task.status !== TaskStatus.BACKLOG),
    });

    const strip = getShownByTitle('Open backlog');
    expect(strip.textContent).toContain('0');
    await userEvent.click(strip);
    expect(getColumn('BACKLOG').textContent).toContain(EMPTY_BACKLOG_MESSAGE);
  });

  it('BL-7 on mobile an empty backlog has no pill; the sheet shows its empty message once its last task is pulled', async () => {
    keepSaving();
    await useMobileWidth();
    await renderBoard({
      tasks: MID_WEEK_TASKS.filter(
        task =>
          task.status !== TaskStatus.BACKLOG ||
          task.title === DESIGN_CASE_TITLE,
      ),
    });
    await openBacklog();
    const sheet = getOpenSheet();

    await userEvent.click(
      getPullButton(findCard(sheet, DESIGN_CASE_TITLE).card),
    );

    await expect.poll(() => sheet.textContent).toContain(EMPTY_BACKLOG_MESSAGE);
    expect(countShownByTitle('Open backlog')).toBe(0);
  });
});

describe('A move', () => {
  it('A4 BL-6 MV-1 a backlog card dragged out of the panel onto Todo lands in its place by kind, and the count drops', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();

    // From the panel, one column left is Done and two is Todo
    await dragCard('BACKLOG', 'LeetCode', ['ArrowLeft', 'ArrowLeft']);

    expect(readColumnTitles('TODO')).toEqual([
      TAX_REPORT_TITLE,
      'Workout',
      'LeetCode',
      'LeetCode',
      PDB_RENDER.title,
    ]);
    expect(
      getShownByTitle('Close backlog').parentElement?.textContent,
    ).toContain(String(BACKLOG_COUNT - 1));
    expect(updateTaskStatusAction).toHaveBeenCalledWith(expect.any(String), {
      status: TaskStatus.TODO,
    });
  });

  it('A6 CARD-7 a backlog card dragged onto Done fills its dot at once, before the server answers', async () => {
    keepSaving();
    await renderBoard();
    await openBacklog();
    const [stagedDot] = getDots(getCard('BACKLOG', DESIGN_CASE_TITLE).card);
    const emptyFill = fillOf(stagedDot);

    await dragCard('BACKLOG', DESIGN_CASE_TITLE, ['ArrowLeft']);

    const [doneDot] = getDots(getCard('DONE', DESIGN_CASE_TITLE).card);
    expect(fillOf(doneDot)).not.toBe(emptyFill);
    expect(readColumnTitles('DONE')[0]).toBe(DESIGN_CASE_TITLE);
    expect(updateTaskStatusAction).toHaveBeenCalledWith(
      findTaskByTitle(DESIGN_CASE_TITLE).id,
      {status: TaskStatus.DONE},
    );
  });

  it('A7 MV-1 MV-3 a card dragged onto Done is on top of it at once; progress counts it once the server answers', async () => {
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
