import {beforeEach, describe, expect, it, vi} from 'vitest';
import {userEvent} from 'vitest/browser';
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

/** The card titles a column shows, top to bottom (one face per width). */
const readColumnTitles = (status: BoardColumnStatus) =>
  [...getColumn(status).querySelectorAll('h3')]
    .filter(heading => heading.checkVisibility())
    .map(heading => heading.textContent);

/** The card around a shown title: the element dnd makes draggable. */
const getCard = (status: BoardColumnStatus, title: string) => {
  const heading = [...getColumn(status).querySelectorAll('h3')].find(
    candidate => candidate.checkVisibility() && candidate.textContent === title,
  );
  const card = heading?.closest<HTMLElement>('.card');
  if (!heading || !card) throw new Error(`No ${title} card in ${status}`);
  return {heading, card};
};

/** Whether dnd made the card a drag handle (it's then a button). */
const isDragHandle = (card: HTMLElement) =>
  card.getAttribute('role') === 'button';

/** The page's text, where the desktop dashboard reads "2 of 10 tasks". */
const readProgress = () => document.body.textContent.replace(/\s+/g, ' ');

const readAnnouncement = () =>
  document.querySelector('[id^="rfd-announcement"]')?.textContent ?? '';

/**
 * @hello-pangea/dnd's keyboard drag, as the e2e drags: lift a Todo card,
 * one column right onto Done, drop — each step waiting on dnd's
 * screen-reader announcement.
 */
const dragTodoCardOntoDone = async (title: string) => {
  getCard('TODO', title).card.focus();
  await userEvent.keyboard('[Space]');
  await expect.poll(readAnnouncement).toMatch(/lifted/);
  await userEvent.keyboard('[ArrowRight]');
  await expect.poll(readAnnouncement).toMatch(/to list DONE/);
  await userEvent.keyboard('[Space]');
  await expect.poll(readAnnouncement).toMatch(/dropped/);
};

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

const PDB_RENDER = {id: 'scn-step-pdb-2', title: 'Render it with Mol*'};
const TAX_REPORT_TITLE = 'File tax report';

beforeEach(() => {
  vi.mocked(updateTaskStatusAction).mockReset();
});

describe('Task cards', () => {
  it('CARD-2 R4 a Done card is dimmed, its title struck through and its description hidden; it has no drag handle', async () => {
    await renderPage(<BoardPage {...MID_WEEK_BOARD} />);

    // The same habit, one instance done and one still to do
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

describe('A move', () => {
  it('A7 MV-1 MV-3 a card dragged onto Done is on top of it at once; progress counts it once the server answers', async () => {
    const save = Promise.withResolvers<SaveResult>();
    vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
    const screen = await renderPage(<BoardPage {...MID_WEEK_BOARD} />);
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
      <BoardPage
        {...MID_WEEK_BOARD}
        tasks={savedTasks}
        progress={savedProgress}
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
    const screen = await renderPage(<BoardPage {...MID_WEEK_BOARD} />);

    await dragTodoCardOntoDone(PDB_RENDER.title);
    await dragTodoCardOntoDone(TAX_REPORT_TITLE);
    expect(readColumnTitles('DONE').slice(0, 2)).toEqual([
      TAX_REPORT_TITLE,
      PDB_RENDER.title,
    ]);

    // The other card is still saving, so the refused card waits for it
    failedSave.resolve(SAVE_FAILED);
    expect(readColumnTitles('DONE')).toContain(PDB_RENDER.title);

    // The other card saves: the page revalidated with it, then its action
    const taxReport = MID_WEEK_TASKS.find(
      task => task.title === TAX_REPORT_TITLE,
    );
    if (!taxReport) throw new Error('No tax report in the fixture');
    const savedTasks = withTaskDone(taxReport.id);
    await screen.rerender(<BoardPage {...MID_WEEK_BOARD} tasks={savedTasks} />);
    otherSave.resolve(savedTaskIn(savedTasks, taxReport.id));

    await expect
      .poll(() => readColumnTitles('TODO'))
      .toContain(PDB_RENDER.title);
    expect(readColumnTitles('DONE')[0]).toBe(TAX_REPORT_TITLE);
  });
});
