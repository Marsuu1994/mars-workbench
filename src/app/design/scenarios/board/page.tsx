import {BoardPage} from '@/components/domain/board/BoardPage';
import {EmptyBoard} from '@/components/domain/board/EmptyBoard';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileBacklogSheetFrame} from './MobileBacklogSheetFrame';
import {DayListSheetFrame} from './DayListSheetFrame';
import {
  MID_WEEK_TASKS,
  MID_WEEK_EXPIRED_DAILY_COUNTS,
  TAX_REPORT_ID,
  SCENARIO_PLAN,
  SCENARIO_PROJECTS,
  DAY_CLEAR_TASKS,
  BACKLOG_CLEAR_TASKS,
  BACKLOG_SECTIONS,
  EMPTY_BACKLOG_SECTIONS,
} from './fixtures';

const BOARD_SCENARIOS: ScenarioTab[] = [
  {
    label: 'New user',
    title: 'New user — no active plan',
    note: 'First run: the create-your-first-plan prompt.',
    display: 'fit',
    content: <EmptyBoard />,
  },
  {
    label: 'Returning',
    title: 'Returning user — last period recap',
    note: "A finished plan's stats seed the empty state.",
    display: 'fit',
    content: (
      <EmptyBoard
        recap={{
          completionRate: 0.75,
          doneCount: 12,
          totalCount: 16,
          donePoints: 47,
        }}
      />
    ),
  },
  {
    label: 'Board',
    title: 'Board — active plan',
    note: "The viewer's current week. Desktop: a ring for each day, Monday to Sunday — the days before today counting what was done and the daily habits missed, today counting what's done against what's done and in Todo, the days after it empty tracks. Phones show today and the days before it that fit. Then Todo (Today) and Done (This week; desktop only) with the shared card: habits with their week dots (Workout shows missed days), project steps with their project and path, one-offs with their quadrant in the kind line. Backlog collapsed, its strip counting 7 staged tasks.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
  },
  {
    label: 'Board — a card selected',
    title: 'Board — a card selected',
    note: 'A play step taps File tax report: the selected card glows green and its corner mark grows into ✓ Complete, the only control that finishes it. A second tap on the card, or a tap anywhere else, cancels.',
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {selector: `[data-todo-card="${TAX_REPORT_ID}"]`}}],
  },
  {
    label: "Today's list (desktop)",
    title: "Today's list (desktop)",
    note: "A play step opens today's cell: its list floats under the cell, read only — the day's finished tasks, habits then steps then one-offs, each struck through. The cell's frame turns primary while it is open.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {selector: '[data-today-ring]'}}],
  },
  {
    label: "Today's list (mobile)",
    title: "Today's list (mobile)",
    note: "On phones a day's list rises in a sheet from the bottom, at most 70% of the screen — shown inline (not as a top-layer modal).",
    display: 'fit',
    content: <DayListSheetFrame />,
  },
  {
    label: 'Board — backlog open (desktop)',
    title: 'Board — backlog open (desktop)',
    note: "A play step opens the backlog: one card per habit and per project, in Habits then Projects. Each shows its next task; Read and Biomedical course sit on a pile of what waits behind, with +N more — only the project's opens. Each card is the board's shared card: ↑ Todo pulls its next task, and on desktop it can be dragged out too.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {label: 'Board.Backlog.openLabel'}}],
  },
  {
    label: "Backlog — a project's queue (desktop)",
    title: "Backlog — a project's queue (desktop)",
    note: "Play steps open the backlog, then Biomedical course's +2 more: its queue lists the steps behind the next one, in step order, in place of the pile. Read only — only the next step can be pulled.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [
      {click: {label: 'Board.Backlog.openLabel'}},
      {click: {label: 'Board.Backlog.showQueueLabel'}},
    ],
  },
  {
    label: 'Backlog — all on deck (desktop)',
    title: 'Backlog — all on deck (desktop)',
    note: 'Every staged task is on the board: the strip stays and shows 0, and the opened panel shows that everything is on deck.',
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={BACKLOG_CLEAR_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {label: 'Board.Backlog.openLabel'}}],
  },
  {
    label: 'Todo — all clear for the day',
    title: 'Todo — all clear for the day',
    note: "Everything pulled for today is done: today's ring is closed with its ✓ and reads All 6 done, and the empty Todo says the day is clear. The backlog still holds the rest of the week.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        expiredDailyCountByDate={MID_WEEK_EXPIRED_DAILY_COUNTS}
        tasks={DAY_CLEAR_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
  },
  {
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: 'The mobile backlog bottom sheet — the same groups as the desktop panel, each card with ↑ Todo at its bottom right — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: <MobileBacklogSheetFrame sections={BACKLOG_SECTIONS} />,
  },
  {
    label: 'Backlog — all on deck (mobile)',
    title: 'Backlog — all on deck (mobile)',
    note: 'The emptied sheet: the count reads 0 and the box says everything is on deck. The pill above the tab bar stays, showing 0.',
    display: 'fit',
    content: <MobileBacklogSheetFrame sections={EMPTY_BACKLOG_SECTIONS} />,
  },
];

export default function BoardScenarioPage() {
  return (
    <ScenarioPage
      title="Board scenarios"
      description="The real board page (BoardPage: header, the row of day rings and the board)
        fed fixture weeks — the states that are hard to reach against live
        data."
    >
      <ScenarioTabs tabs={BOARD_SCENARIOS} />
    </ScenarioPage>
  );
}
