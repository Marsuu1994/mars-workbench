'use client';

import {Draggable} from '@hello-pangea/dnd';
import {TaskStatus} from '@/utils/enums';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {TaskCardFace} from './TaskCardFace';
import {TaskCardMiniFace} from './TaskCardMiniFace';

type TaskCardProps = {
  card: BoardCard;
  /** Position index within the column — required by Draggable */
  index: number;
};

/**
 * The draggable board card: the full kind-first face from md up, the 136px
 * mini face in the mobile rows. Done cards dim and stay put.
 */
export default function TaskCard({card, index}: TaskCardProps) {
  const {kind, task} = card;
  const isDone = task.status === TaskStatus.DONE;
  const {edge} = TASK_KIND_STYLE[kind];

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDone}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card fx-card bg-base-100/70 border border-base-content/10 hover:-translate-y-0.5 flex-shrink-0 w-[136px] h-[92px] md:w-auto md:h-auto ${edge} ${
            isDone ? 'opacity-50 cursor-default' : 'cursor-grab'
          } ${snapshot.isDragging ? 'fx-card-lift scale-[1.02] z-50' : ''}`}
        >
          <TaskCardMiniFace card={card} className="md:hidden" />
          <TaskCardFace card={card} className="hidden md:flex" />
        </div>
      )}
    </Draggable>
  );
}
