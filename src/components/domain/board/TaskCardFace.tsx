'use client';

import type {HTMLAttributes, Ref} from 'react';
import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {isRolloverTask, type RiskLevel} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskTypeBadge} from '@/components/domain/shared/TaskTypeBadge';
import {InstanceBadge} from '@/components/ui/InstanceBadge';
import {StackCountBadge} from '@/components/ui/StackCountBadge';
import {StackLips} from '@/components/ui/StackLips';
import {RiskBadge} from '@/components/domain/shared/RiskBadge';
import {RolloverTag} from '@/components/domain/shared/RolloverTag';
import {cn} from '@/components/ui/cn';
import {
  RISK_BORDER_DESKTOP_LEFT,
  RISK_BORDER_MOBILE_TOP,
} from '@/components/domain/shared/riskBorder';

interface TaskCardFaceProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  task: TaskItem;
  taskType: string;
  today: Date;
  riskLevel: RiskLevel;
  /** Template generation frequency; the instance badge only shows when > 1 */
  frequency: number;
  /**
   * Backlog stacks only: how many identical instances this card stands for.
   * Replaces the `#n` badge — a `×n` chip plus paper lips when > 1, nothing
   * at 1.
   */
  stackCount?: number;
  /** Mid-drag lift styling */
  isLifted?: boolean;
}

/**
 * The board task card's presentation. TaskCard wraps it in a Draggable; the
 * desktop backlog also renders it bare, as the rest of a stack that stays in
 * place while its top card is dragged away.
 */
export const TaskCardFace = ({
  ref,
  task,
  taskType,
  today,
  riskLevel,
  frequency,
  stackCount,
  isLifted = false,
  className,
  ...rest
}: TaskCardFaceProps) => {
  const t = useTranslations('Board.Backlog');
  const isDone = task.status === TaskStatus.DONE;
  const isRollover = isRolloverTask(task, today);

  // A stacked card speaks for every instance under it, so it never shows a
  // single instance's #n; the lifted card is one instance again.
  const isStacked = stackCount !== undefined;
  const showInstance = !isStacked && frequency > 1;
  const showStackCount = isStacked && stackCount > 1;

  const renderStackCount = (size?: 'xs') => (
    <StackCountBadge
      count={stackCount ?? 1}
      label={t('stackCountLabel', {count: stackCount ?? 1})}
      size={size}
    />
  );

  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        `card fx-card bg-base-100/70 border border-base-content/10 hover:-translate-y-0.5 flex-shrink-0 w-[136px] md:w-auto ${RISK_BORDER_MOBILE_TOP[riskLevel]} ${RISK_BORDER_DESKTOP_LEFT[riskLevel]}`,
        isDone ? 'opacity-50 cursor-default' : 'cursor-grab',
        isLifted && 'fx-card-lift scale-[1.02] z-50',
        className,
      )}
    >
      <div className="card-body p-2.5 md:p-3 gap-1.5 md:gap-1">
        {/* Mobile: badge first, then title, then footer */}
        <div className="md:hidden flex items-center gap-1.5">
          <TaskTypeBadge type={taskType} />
          {showInstance && (
            <InstanceBadge index={task.instanceIndex} size="xs" />
          )}
          {showStackCount && renderStackCount('xs')}
        </div>

        <h3
          className={`card-title text-xs md:text-sm font-medium line-clamp-2 h-[2.6em] md:h-auto md:line-clamp-none ${
            isDone ? 'line-through text-base-content/50' : ''
          }`}
        >
          {task.title}
        </h3>

        {task.description && (
          <p className="hidden md:block text-xs text-base-content/60 line-clamp-2 break-all">
            {task.description}
          </p>
        )}

        {/* Desktop footer */}
        <div className="hidden md:flex flex-wrap items-center gap-2 mt-2">
          <TaskTypeBadge type={taskType} />

          {showInstance && <InstanceBadge index={task.instanceIndex} />}

          {showStackCount && renderStackCount()}

          {isRollover && <RolloverTag date={new Date(task.forDate!)} />}

          {!isDone && <RiskBadge level={riskLevel} />}

          <SizeChip size={task.size} points={task.points} className="ml-auto" />
        </div>

        {/* Mobile footer */}
        <div className="flex md:hidden items-center mt-auto">
          {isRollover && (
            <RolloverTag
              date={new Date(task.forDate!)}
              className="text-[8px]"
            />
          )}
          <SizeChip
            size={task.size}
            points={task.points}
            className="ml-auto text-[8px]"
          />
        </div>
      </div>

      {showStackCount && <StackLips count={stackCount} />}
    </div>
  );
};
