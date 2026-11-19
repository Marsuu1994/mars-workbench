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
    note: "Todo · Done with kind-first cards: habits with their plan line and week dots (each card rings its own dot; Workout shows a missed day), project steps with their project, step n/N and the path (the card's own step outlined), one-offs with their quadrant. Backlog collapsed, its strip counting 7 staged tasks.",
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
    note: "A play step opens the backlog: one card per habit and per project, in Habits then Projects. Each shows its next task; Read and Biomedical course sit on a pile of what waits behind, with +N more — only the project's opens. Drag a card's next task out to pull it.",
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
    label: "Backlog — a project's queue (desktop)",
    title: "Backlog — a project's queue (desktop)",
    note: "Play steps open the backlog, then Biomedical course's +2 more: its queue lists the steps behind the next one, in step order, in place of the pile. Read only — only the next step can be pulled.",
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
      {click: {label: 'Board.Backlog.showQueueLabel'}},
    ],
  },
  {
    label: 'Backlog — all on deck (desktop)',
    title: 'Backlog — all on deck (desktop)',
    note: 'Every staged task is on the board: the strip stays and shows 0, and the opened panel shows that everything is on deck, with no drag hint.',
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={BACKLOG_CLEAR_TASKS}
        projects={SCENARIO_PROJECTS}
      />
    ),
    play: [{click: {label: 'Board.Backlog.openLabel'}}],
  },
  {
    label: 'Todo — all clear for the day',
    title: 'Todo — all clear for the day',
    note: 'Everything pulled for today is done and something was finished today: the empty Todo says the day is clear. The backlog still holds the rest of the week.',
    content: (
      <BoardPage
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
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
    note: 'The emptied sheet: the count reads 0 and the box says everything is on deck, with no tap hint. The pill above the tab bar stays, showing 0.',
    display: 'fit',
    content: <MobileBacklogSheetFrame sections={EMPTY_BACKLOG_SECTIONS} />,
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
