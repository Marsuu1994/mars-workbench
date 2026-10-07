'use client';

import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {isRolloverTask, type RiskLevel} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskTypeBadge} from '@/components/domain/shared/TaskTypeBadge';
import {StackCountBadge} from '@/components/ui/StackCountBadge';
import {StackLips} from '@/components/ui/StackLips';
import {RiskBadge} from '@/components/domain/shared/RiskBadge';
import {RolloverTag} from '@/components/domain/shared/RolloverTag';
import {RISK_BORDER_LEFT} from '@/components/domain/shared/riskBorder';

interface MobileBacklogCardProps {
  /** The stack's top instance — the one a tap pulls */
  task: TaskItem;
  /** Identical instances this card stands for; `×n` chip + lips when > 1 */
  stackCount: number;
  today: Date;
  riskLevel: RiskLevel;
  onPull: (taskId: string) => void;
}

/**
 * Full-width row card rendered inside the mobile backlog, one per stack of
 * identical instances. Mirrors the board TaskCard's badge / rollover / risk
 * language, but is a plain (non-draggable) presentational card with a tap
 * "↑ Todo" action that pulls one instance.
 */
export default function MobileBacklogCard({
  task,
  stackCount,
  today,
  riskLevel,
  onPull,
}: MobileBacklogCardProps) {
  const t = useTranslations('Board.Backlog');
  const isStacked = stackCount > 1;
  const isRollover = isRolloverTask(task, today);

  return (
    <div
      className={`card bg-base-100 border border-base-content/10 ${RISK_BORDER_LEFT[riskLevel]}`}
    >
      <div className="card-body flex-row items-stretch gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TaskTypeBadge type={task.type} />
            {isStacked && (
              <StackCountBadge
                count={stackCount}
                label={t('stackCountLabel', {count: stackCount})}
              />
            )}
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

      <StackLips count={stackCount} />
    </div>
  );
}
