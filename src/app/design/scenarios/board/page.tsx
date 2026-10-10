import {BoardScreen} from '@/components/domain/board/BoardScreen';
import EmptyBoard from '@/components/domain/board/EmptyBoard';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileBacklogPanel} from './MobileBacklogPanel';
import {
  MID_WEEK_TASKS,
  MID_WEEK_PROGRESS,
  SCENARIO_PLAN,
  BACKLOG_TASKS,
  SCENARIO_HABIT_WEEKS,
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
    note: 'Todo · Done with kind-first cards: habits with their plan line and week dots (each card rings its own dot; Workout shows a missed day), one-offs with their quadrant. Backlog collapsed.',
    content: (
      <BoardScreen
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
      />
    ),
  },
  {
    label: 'Board — backlog open (desktop)',
    title: 'Board — backlog open (desktop)',
    note: 'A play step opens the backlog: habit instances staged, ready to pull onto the board.',
    content: (
      <BoardScreen
        plan={SCENARIO_PLAN}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
      />
    ),
    play: [{click: {label: 'Board.Backlog.openLabel'}}],
  },
  {
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: 'The mobile backlog bottom sheet — staged habit instances on the full card face with a tap-to-pull action — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: (
      <MobileBacklogPanel
        tasks={BACKLOG_TASKS}
        habitWeeks={SCENARIO_HABIT_WEEKS}
      />
    ),
  },
];

export default function BoardScenarioPage() {
  return (
    <ScenarioPage
      title="Board scenarios"
      description="The real board page (BoardHeader + ProgressDashboard + KanbanBoard)
        fed fixture weeks — the states that are hard to reach against live
        data."
    >
      <ScenarioTabs tabs={BOARD_SCENARIOS} />
    </ScenarioPage>
  );
}
