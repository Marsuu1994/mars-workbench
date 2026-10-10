'use client';

import {Draggable} from '@hello-pangea/dnd';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {getTaskKind, type HabitWeek} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {TaskCardFace} from './TaskCardFace';
import {TaskCardMiniFace} from './TaskCardMiniFace';

type TaskCardProps = {
  task: TaskItem;
  /** Position index within the column — required by Draggable */
  index: number;
  /** The habit's plan line and week dots; absent for other kinds */
  habitWeek?: HabitWeek;
};

/**
 * The draggable board card: the full kind-first face from md up, the 136px
 * mini face in the mobile rows. Done cards dim and stay put.
 */
export default function TaskCard({task, index, habitWeek}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;
  const {edge} = TASK_KIND_STYLE[getTaskKind(task.type)];

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
          <div className="md:hidden flex h-full flex-col gap-1 px-[9px] py-2">
            <TaskCardMiniFace task={task} habitWeek={habitWeek} />
          </div>
          <div className="hidden md:flex flex-col gap-1.5 px-3 py-2.5">
            <TaskCardFace task={task} habitWeek={habitWeek} />
          </div>
        </div>
      )}
    </Draggable>
  );
}
