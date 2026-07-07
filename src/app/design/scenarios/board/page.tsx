import Link from 'next/link';
import {ArrowLeftIcon} from '@heroicons/react/24/outline';
import BoardHeader from '@/components/shared/BoardHeader';
import ProgressDashboard from '@/components/board/ProgressDashboard';
import KanbanBoard from '@/components/board/KanbanBoard';
import EmptyBoard from '@/components/board/EmptyBoard';
import {ScenarioFrame} from '../ScenarioFrame';
import {
  MID_WEEK_TASKS,
  MID_WEEK_PROGRESS,
  DANGER_TASKS,
  DANGER_PROGRESS,
  SCENARIO_PLAN_TEMPLATES,
} from './fixtures';

const BoardShell = ({
  progress,
  tasks,
}: {
  progress: React.ComponentProps<typeof ProgressDashboard>;
  tasks: React.ComponentProps<typeof KanbanBoard>['tasks'];
}) => (
  <div className="flex flex-col h-full">
    <BoardHeader periodKey="2026-W28" />
    <ProgressDashboard {...progress} />
    <div className="flex-1 min-h-0">
      <KanbanBoard
        tasks={tasks}
        daysElapsed={progress.daysElapsed}
        planTemplates={SCENARIO_PLAN_TEMPLATES}
      />
    </div>
  </div>
);

export default function BoardScenarioPage() {
  return (
    <div className="fx-shell-bg min-h-screen text-base-content">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 md:p-10">
        <div className="flex flex-col gap-1">
          <Link
            href="/design/scenarios"
            className="flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content"
          >
            <ArrowLeftIcon className="size-4" />
            Scenarios
          </Link>
          <h1 className="text-2xl font-bold">Board scenarios</h1>
          <p className="max-w-2xl text-sm text-base-content/60">
            The real board page (BoardHeader + ProgressDashboard + KanbanBoard)
            fed fixture weeks — the states that are hard to reach against live
            data.
          </p>
        </div>

        <ScenarioFrame
          title="New user — no active plan"
          note="First run: the create-your-first-plan prompt."
          height={460}
        >
          <EmptyBoard />
        </ScenarioFrame>

        <ScenarioFrame
          title="Returning user — last period recap"
          note="A finished plan's stats seed the empty state."
          height={460}
        >
          <EmptyBoard
            stats={{
              completionRate: 0.75,
              completedCount: 12,
              totalCount: 16,
              totalPoints: 47,
              dailyCompletionRate: 0.8,
            }}
          />
        </ScenarioFrame>

        <ScenarioFrame
          title="Mid-week, on track"
          note="A balanced spread across Todo / Doing / Done with backlog staged."
        >
          <BoardShell progress={MID_WEEK_PROGRESS} tasks={MID_WEEK_TASKS} />
        </ScenarioFrame>

        <ScenarioFrame
          title="Friday, several at risk"
          note="Large weekly tasks unfinished late in the period, plus an overdue rollover."
        >
          <BoardShell progress={DANGER_PROGRESS} tasks={DANGER_TASKS} />
        </ScenarioFrame>
      </div>
    </div>
  );
}
