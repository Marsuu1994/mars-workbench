import {BoardScreen} from '@/components/domain/board/BoardScreen';
import EmptyBoard from '@/components/domain/board/EmptyBoard';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileBacklogPanel} from './MobileBacklogPanel';
import {
  MID_WEEK_TASKS,
  MID_WEEK_PROGRESS,
  SCENARIO_PLAN_TEMPLATES,
  SCENARIO_PERIOD_KEY,
  SCENARIO_TODAY,
  BACKLOG_TASKS,
  BACKLOG_RISK_MAP,
  SCENARIO_TEMPLATE_FREQ_MAP,
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
    note: 'A balanced spread across Todo / In Progress / Done, backlog collapsed.',
    content: (
      <BoardScreen
        periodKey={SCENARIO_PERIOD_KEY}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        planTemplates={SCENARIO_PLAN_TEMPLATES}
      />
    ),
  },
  {
    label: 'Board — backlog open (desktop)',
    title: 'Board — backlog open (desktop)',
    note: 'The backlog expanded, staging template instances ready to pull onto the board.',
    content: (
      <BoardScreen
        periodKey={SCENARIO_PERIOD_KEY}
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        planTemplates={SCENARIO_PLAN_TEMPLATES}
        defaultBacklogOpen
      />
    ),
  },
  {
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: 'The mobile backlog bottom sheet — staged instances with a tap-to-pull action — shown inline (not as a top-layer modal).',
    display: 'fit',
    content: (
      <MobileBacklogPanel
        tasks={BACKLOG_TASKS}
        today={SCENARIO_TODAY}
        riskMap={BACKLOG_RISK_MAP}
        templateFreqMap={SCENARIO_TEMPLATE_FREQ_MAP}
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
