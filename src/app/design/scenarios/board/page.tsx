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
  BACKLOG_CARDS,
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
    note: "Todo · Done with kind-first cards: habits with their plan line and week dots (each card rings its own dot; Workout shows a missed day), project steps with their project, step n/N and the path (the card's own step outlined), one-offs with their quadrant. Backlog collapsed.",
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
    note: 'A play step opens the backlog: habit instances and a scheduled project step staged, ready to pull onto the board.',
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
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: 'The mobile backlog bottom sheet — staged habit instances and a project step on the full card face with a tap-to-pull action — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: <MobileBacklogSheetFrame cards={BACKLOG_CARDS} />,
  },
];

export default function BoardScenarioPage() {
  return (
    <ScenarioPage
      title="Board scenarios"
      description="The real board page (BoardPage: header, progress dashboard, board)
        fed fixture weeks — the states that are hard to reach against live
        data."
    >
      <ScenarioTabs tabs={BOARD_SCENARIOS} />
    </ScenarioPage>
  );
}
