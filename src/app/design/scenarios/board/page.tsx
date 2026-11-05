import {BoardPage} from '@/components/domain/board/BoardPage';
import {EmptyBoard} from '@/components/domain/board/EmptyBoard';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileBacklogSheetFrame} from './MobileBacklogSheetFrame';
import {
  MID_WEEK_TASKS,
  MID_WEEK_PROGRESS,
  SCENARIO_PLAN,
  SCENARIO_PROJECTS,
  BACKLOG_GROUPS,
  BACKLOG_TASK_COUNT,
  BIO_QUEUE_TOGGLE_NAME,
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
        stats={{
          completionRate: 0.75,
          completedCount: 12,
          totalCount: 16,
          totalPoints: 47,
          dailyCompletionRate: 0.8,
        }}
      />
    ),
  },
  {
    label: 'Board',
    title: 'Board — active plan',
    note: "Todo · Done with kind-first cards: habits with their plan line and week dots (each card rings its own dot; Workout shows a missed day; no done / total), project steps with their project, step n/N and the path (the card's own step outlined), one-offs with their quadrant. Backlog collapsed, its badge capped at 8+ for ten staged tasks.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
  },
  {
    label: 'Board — backlog open (desktop)',
    title: 'Board — backlog open (desktop)',
    note: 'A play step opens the backlog, grouped: one row per habit (its dots, +N more for the instances behind the next), then each project as its next step on a thin pile (+N more ⌄). Drag a card onto Todo: its next one rises in.',
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {label: 'Board.Backlog.openLabel'}}],
  },
  {
    label: 'Board — backlog queue open (desktop)',
    title: 'Board — backlog queue open (desktop)',
    note: "Play steps open the backlog and Biomedical course's +2 more ⌄: its queue lists the steps behind the next, read-only, in place of the pile. Opening grows the list below; closing keeps the scrollbar where it is.",
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [
      {click: {label: 'Board.Backlog.openLabel'}},
      {click: {name: BIO_QUEUE_TOGGLE_NAME}},
    ],
  },
  {
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: "The mobile backlog bottom sheet, grouped like the desktop panel, with each group's ↑ Todo at its bottom right — shown inline (not as a top-layer modal).",
    display: 'fit',
    content: (
      <MobileBacklogSheetFrame
        count={BACKLOG_TASK_COUNT}
        groups={BACKLOG_GROUPS}
      />
    ),
  },
  {
    label: 'Backlog (mobile) — queue open',
    title: 'Backlog (mobile) — queue open',
    note: "A play step taps Biomedical course's +2 more ⌄: the queue opens under its card and the sheet's content grows below it.",
    display: 'fit',
    content: (
      <MobileBacklogSheetFrame
        count={BACKLOG_TASK_COUNT}
        groups={BACKLOG_GROUPS}
      />
    ),
    play: [{click: {name: BIO_QUEUE_TOGGLE_NAME}}],
  },
];

export default function BoardScenarioPage() {
  return (
    <ScenarioPage
      title="Board scenarios"
      description="The real board page (BoardPage: header, progress dashboard and board)
        fed fixture weeks — the states that are hard to reach against live
        data."
    >
      <ScenarioTabs tabs={BOARD_SCENARIOS} />
    </ScenarioPage>
  );
}
