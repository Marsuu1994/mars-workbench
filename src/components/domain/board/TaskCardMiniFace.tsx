'use client';

import {TaskStatus} from '@/utils/enums';
import {TaskKind} from '@/utils/taskUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {cn} from '@/components/ui/cn';
import {TaskCardHead} from './TaskCardHead';
import {HabitSignal} from './HabitSignal';

interface TaskCardMiniFaceProps {
  card: BoardCard;
  /** Visibility from the host card (TaskCard swaps faces at md) */
  className?: string;
}

/**
 * The 136px card face in the mobile board rows: kind label, the title
 * (two lines), then the signal — a habit's week dots, its own ringed — and
 * the size. Fills its host's height so the signal row sits at the bottom.
 */
export const TaskCardMiniFace = ({card, className}: TaskCardMiniFaceProps) => {
  const {task} = card;
  const isDone = task.status === TaskStatus.DONE;

  const renderSignal = () => {
    switch (card.kind) {
      case TaskKind.HABIT:
        return card.habitWeek ? (
          <HabitSignal
            habitWeek={card.habitWeek}
            currentSlot={card.currentSlot}
            variant="mini"
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex h-full flex-col gap-1 px-[9px] py-2', className)}>
      <TaskCardHead kind={card.kind} variant="mini" />

      <h3
        className={`text-xs font-medium leading-tight line-clamp-2 ${
          isDone ? 'line-through text-base-content/50' : ''
        }`}
      >
        {task.title}
      </h3>

      <div className="mt-auto flex items-center gap-1">
        {renderSignal()}
        <SizeChip
          size={task.size}
          points={task.points}
          className="ml-auto text-[8px] px-1.5 py-px"
        />
      </div>
    </div>
  );
};
