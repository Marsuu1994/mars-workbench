import BoardHeader from '@/components/domain/shared/BoardHeader';
import ProgressDashboard from '@/components/domain/board/ProgressDashboard';
import KanbanBoard from '@/components/domain/board/KanbanBoard';
import EmptyBoard from '@/components/domain/board/EmptyBoard';
import {ScenarioTabs, type ScenarioTab} from '../ScenarioTabs';
import {ScenarioPage} from '../ScenarioPage';
import {MobileBacklogPanel} from './MobileBacklogPanel';
import {
  MID_WEEK_TASKS,
  MID_WEEK_PROGRESS,
  SCENARIO_PLAN_TEMPLATES,
  SCENARIO_TODAY,
  BACKLOG_TASKS,
  BACKLOG_RISK_MAP,
  SCENARIO_TEMPLATE_FREQ_MAP,
} from './fixtures';

const BoardShell = ({
  progress,
  tasks,
  backlogOpen = false,
}: {
  progress: React.ComponentProps<typeof ProgressDashboard>;
  tasks: React.ComponentProps<typeof KanbanBoard>['tasks'];
  /** Render the board with the backlog expanded (desktop). */
  backlogOpen?: boolean;
}) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey="2026-W28" />
    <ProgressDashboard {...progress} />
    <div className="flex-1 min-h-0">
      <KanbanBoard
        tasks={tasks}
        daysElapsed={progress.daysElapsed}
        planTemplates={SCENARIO_PLAN_TEMPLATES}
        defaultBacklogOpen={backlogOpen}
      />
    </div>
  </div>
);

const BOARD_SCENARIOS: ScenarioTab[] = [
  {
    label: 'New user',
    title: 'New user — no active plan',
    note: 'First run: the create-your-first-plan prompt.',
    content: <EmptyBoard />,
  },
  {
    label: 'Returning',
    title: 'Returning user — last period recap',
    note: "A finished plan's stats seed the empty state.",
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
    content: <BoardShell progress={MID_WEEK_PROGRESS} tasks={MID_WEEK_TASKS} />,
  },
  {
    label: 'Board — backlog open (desktop)',
    title: 'Board — backlog open (desktop)',
    note: 'The backlog expanded, staging template instances ready to pull onto the board.',
    content: (
      <BoardShell
        progress={MID_WEEK_PROGRESS}
        tasks={MID_WEEK_TASKS}
        backlogOpen
      />
    ),
  },
  {
    label: 'Backlog (mobile)',
    title: 'Backlog (mobile)',
    note: 'The mobile backlog bottom sheet — staged instances with a tap-to-pull action — shown inline (not as a top-layer modal).',
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
