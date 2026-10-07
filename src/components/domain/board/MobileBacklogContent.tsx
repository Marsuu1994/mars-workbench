'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {groupTasksIntoStacks, type RiskLevel} from '@/utils/taskUtils';
import MobileBacklogCard from './MobileBacklogCard';

interface MobileBacklogContentProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  onPull: (taskId: string) => void;
}

/**
 * The scrollable body of the mobile backlog: the staged BACKLOG cards, one per
 * stack of identical instances (or an empty state). Extracted from
 * MobileBacklog so the live bottom sheet and the design scenario render the
 * identical list — the scenario shows this inline (no dialog), avoiding the
 * top-layer modal's frame/backdrop issues.
 */
export const MobileBacklogContent = ({
  tasks,
  today,
  riskMap,
  onPull,
}: MobileBacklogContentProps) => {
  const t = useTranslations('Board.Backlog');

  if (tasks.length === 0) {
    return (
      <p className="text-center text-sm text-base-content/40 mt-10 px-6">
        {t('emptyState')}
      </p>
    );
  }

  // gap-4 leaves room for the stack lips hanging below each card
  return (
    <div className="flex flex-col gap-4">
      {groupTasksIntoStacks(tasks).map(({key, tasks: stackTasks}) => {
        const [topTask] = stackTasks;
        return (
          <MobileBacklogCard
            key={key}
            task={topTask}
            stackCount={stackTasks.length}
            today={today}
            riskLevel={riskMap.get(topTask.id) ?? 'normal'}
            onPull={onPull}
          />
        );
      })}
    </div>
  );
};
