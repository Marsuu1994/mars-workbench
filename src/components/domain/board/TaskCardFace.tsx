'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {TaskStatus, TaskType} from '@/utils/enums';
import {TaskKind, type HabitWeek} from '@/utils/taskUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {cn} from '@/components/ui/cn';
import {TaskCardHead} from './TaskCardHead';
import {HabitSignal} from './HabitSignal';

interface TaskCardFaceProps {
  card: BoardCard;
  /** Optional action beside the title (the mobile sheet's ↑ Todo) */
  action?: ReactNode;
  /** Visibility from the host card (TaskCard swaps faces at md) */
  className?: string;
}

/**
 * The full kind-first card face — desktop board, desktop backlog and the
 * mobile backlog sheet. Line 1: kind + context. Then the title (and its
 * description until done). Last line: the kind's signal and a neutral size.
 */
export const TaskCardFace = ({card, action, className}: TaskCardFaceProps) => {
  const tCard = useTranslations('Board.Card');
  const {task} = card;
  const isDone = task.status === TaskStatus.DONE;

  const renderPlanLine = ({type, frequency}: HabitWeek) =>
    type === TaskType.DAILY
      ? tCard('planLineDaily', {frequency})
      : tCard('planLineWeekly', {frequency});

  const renderContext = (): ReactNode => {
    switch (card.kind) {
      case TaskKind.HABIT:
        return card.habitWeek ? renderPlanLine(card.habitWeek) : null;
      case TaskKind.ONE_OFF:
        return task.quadrant ? tCard(`Quadrant.${task.quadrant}`) : null;
      default:
        return null;
    }
  };

  const renderSignal = (): ReactNode => {
    switch (card.kind) {
      case TaskKind.HABIT:
        return card.habitWeek ? (
          <HabitSignal
            habitWeek={card.habitWeek}
            currentSlot={card.currentSlot}
            variant="card"
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5 px-3 py-2.5', className)}>
      <TaskCardHead kind={card.kind} variant="card" context={renderContext()} />

      <div className="flex items-start gap-2.5">
        <h3
          className={`flex-1 min-w-0 text-sm font-medium leading-snug ${
            isDone ? 'line-through text-base-content/50' : ''
          }`}
        >
          {task.title}
        </h3>
        {action}
      </div>

      {task.description && !isDone && (
        <p className="-mt-0.5 text-xs leading-snug text-base-content/60 line-clamp-2 break-words">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 min-h-[18px]">
        {renderSignal()}
        <SizeChip size={task.size} points={task.points} className="ml-auto" />
      </div>
    </div>
  );
};
