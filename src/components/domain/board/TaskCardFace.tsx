'use client';

import type {ReactNode} from 'react';
import {TaskStatus} from '@/utils/enums';
import {TaskKind} from '@/utils/taskUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TaskCardDescription} from './TaskCardDescription';
import {TaskCardHead} from './TaskCardHead';
import {TaskCardSignal} from './TaskCardSignal';

interface TaskCardFaceProps {
  card: BoardCard;
  /** On the kind line's right: the backlog's +N more */
  headExtra?: ReactNode;
  /** Bottom right: Todo's round mark or ✓ Complete, the backlog's ↑ Todo */
  action?: ReactNode;
}

/**
 * The board's one card face, in Todo, Done and the backlog: the kind line,
 * the title, the description cut off after two lines (none once done), then
 * the kind's progress with the card's action at the bottom right. No size,
 * no points.
 */
export const TaskCardFace = ({card, headExtra, action}: TaskCardFaceProps) => {
  const {kind, task} = card;
  const isDone = task.status === TaskStatus.DONE;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <TaskCardHead
        kind={kind}
        name={kind === TaskKind.PROJECT ? card.step?.projectTitle : undefined}
        quadrant={task.quadrant}
        extra={headExtra}
      />
      <h3
        className={`text-sm font-medium leading-snug ${
          isDone ? 'line-through text-base-content/55' : ''
        }`}
      >
        {task.title}
      </h3>
      {!isDone && <TaskCardDescription description={task.description} />}
      <div className="flex min-h-[18px] flex-wrap items-center gap-2">
        <TaskCardSignal card={card} />
        {action && <span className="ml-auto flex items-center">{action}</span>}
      </div>
    </div>
  );
};
