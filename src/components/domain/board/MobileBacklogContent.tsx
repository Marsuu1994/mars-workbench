'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {getTaskFrequency, type RiskLevel} from '@/utils/taskUtils';
import MobileBacklogCard from './MobileBacklogCard';

interface MobileBacklogContentProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  onPull: (taskId: string) => void;
}

/**
 * The scrollable body of the mobile backlog: the staged BACKLOG cards (or an
 * empty state). Extracted from MobileBacklog so the live bottom sheet and the
 * design scenario render the identical list — the scenario shows this inline
 * (no dialog), avoiding the top-layer modal's frame/backdrop issues.
 */
export const MobileBacklogContent = ({
  tasks,
  today,
  riskMap,
  templateFreqMap,
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

  return (
    <div className="flex flex-col gap-2.5">
      {tasks.map(task => (
        <MobileBacklogCard
          key={task.id}
          task={task}
          today={today}
          riskLevel={riskMap.get(task.id) ?? 'normal'}
          frequency={getTaskFrequency(task, templateFreqMap)}
          onPull={onPull}
        />
      ))}
    </div>
  );
};
