'use client';

import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {isRolloverTask, type RiskLevel} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskTypeBadge} from '@/components/domain/shared/TaskTypeBadge';
import {InstanceBadge} from '@/components/ui/InstanceBadge';
import {RiskBadge} from '@/components/domain/shared/RiskBadge';
import {RolloverTag} from '@/components/domain/shared/RolloverTag';
import {RISK_BORDER_LEFT} from '@/components/domain/shared/riskBorder';

interface MobileBacklogCardProps {
  task: TaskItem;
  today: Date;
  riskLevel: RiskLevel;
  /** Template generation frequency; the instance badge only shows when > 1 */
  frequency: number;
  onPull: (taskId: string) => void;
}

/**
 * Full-width row card rendered inside the mobile backlog. Mirrors the board
 * TaskCard's badge / instance / rollover / risk language, but is a plain
 * (non-draggable) presentational card with a tap "↑ Todo" pull action.
 */
export default function MobileBacklogCard({
  task,
  today,
  riskLevel,
  frequency,
  onPull,
}: MobileBacklogCardProps) {
  const t = useTranslations('Board.Backlog');
  const showInstance = frequency > 1;
  const isRollover = isRolloverTask(task, today);

  return (
    <div
      className={`card bg-base-100 border border-base-content/10 ${RISK_BORDER_LEFT[riskLevel]}`}
    >
      <div className="card-body flex-row items-stretch gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TaskTypeBadge type={task.type} />
            {showInstance && <InstanceBadge index={task.instanceIndex} />}
            {isRollover && <RolloverTag date={new Date(task.forDate!)} />}
            <RiskBadge level={riskLevel} />
          </div>

          <h3 className="text-sm font-semibold line-clamp-2">{task.title}</h3>

          {task.description && (
            <p className="text-xs text-base-content/60 line-clamp-2 break-all">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
          <SizeChip size={task.size} points={task.points} />
          <button
            onClick={() => onPull(task.id)}
            className="btn btn-primary btn-sm gap-1"
          >
            <ArrowUpIcon className="size-3.5" />
            {t('pullToTodoLabel')}
          </button>
        </div>
      </div>
    </div>
  );
}
