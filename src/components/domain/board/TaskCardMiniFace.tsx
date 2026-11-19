'use client';

import {TaskStatus} from '@/utils/enums';
import {TaskKind} from '@/utils/taskUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {cn} from '@/components/ui/cn';
import {TaskCardHead} from './TaskCardHead';
import {TaskCardSignal} from './TaskCardSignal';

interface TaskCardMiniFaceProps {
  card: BoardCard;
  /** Visibility from the host card (TaskCard swaps faces at md) */
  className?: string;
}

/**
 * The 136px card face in the mobile board rows: kind label (a step's
 * project name), the title (two lines), then the signal — a habit's week
 * dots or a step's path, its own mark outlined — and the size. Fills its
 * host's height so the signal row sits at the bottom.
 */
export const TaskCardMiniFace = ({card, className}: TaskCardMiniFaceProps) => {
  const {task} = card;
  const isDone = task.status === TaskStatus.DONE;

  // A step names its project in place of the kind label
  const renderName = () =>
    card.kind === TaskKind.PROJECT ? card.step?.projectTitle : undefined;

  return (
    <div className={cn('flex h-full flex-col gap-1 px-[9px] py-2', className)}>
      <TaskCardHead kind={card.kind} variant="mini" name={renderName()} />

      <h3
        className={`text-xs font-medium leading-tight line-clamp-2 ${
          isDone ? 'line-through text-base-content/50' : ''
        }`}
      >
        {task.title}
      </h3>

      <div className="mt-auto flex items-center gap-1">
        <TaskCardSignal card={card} variant="mini" />
        <SizeChip
          size={task.size}
          points={task.points}
          className="ml-auto text-[8px] px-1.5 py-px"
        />
      </div>
    </div>
  );
};
