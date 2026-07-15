'use client';

import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {getTaskFrequency, type RiskLevel} from '@/utils/taskUtils';
import BacklogSheetCard from './BacklogSheetCard';

interface BacklogSheetContentProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  onPull: (taskId: string) => void;
}

/**
 * The scrollable body of the mobile backlog sheet: the staged BACKLOG cards
 * (or an empty state). Extracted from MobileBacklogSheet so the live bottom
 * sheet and the design scenario render the identical list — the scenario shows
 * this inline (no dialog), avoiding the top-layer modal's frame/backdrop issues.
 */
export const BacklogSheetContent = ({
  tasks,
  today,
  riskMap,
  templateFreqMap,
  onPull,
}: BacklogSheetContentProps) => {
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
        <BacklogSheetCard
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
