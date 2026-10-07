'use client';

import {Draggable} from '@hello-pangea/dnd';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import type {RiskLevel} from '@/utils/taskUtils';
import {TaskCardFace} from './TaskCardFace';

type TaskCardProps = {
  task: TaskItem;
  taskType: string;
  /** Position index within the column — required by Draggable */
  index: number;
  today: Date;
  riskLevel: RiskLevel;
  /** Template generation frequency; the instance badge only shows when > 1 */
  frequency: number;
  /** Backlog stacks only — see TaskCardFace */
  stackCount?: number;
};

export default function TaskCard({
  task,
  taskType,
  index,
  today,
  riskLevel,
  frequency,
  stackCount,
}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDone}>
      {(provided, snapshot) => (
        <TaskCardFace
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          task={task}
          taskType={taskType}
          today={today}
          riskLevel={riskLevel}
          frequency={frequency}
          // Lifting a stacked card deals out one instance: it travels as a
          // plain card with its #n, and the backlog keeps the rest in place.
          stackCount={snapshot.isDragging ? undefined : stackCount}
          isLifted={snapshot.isDragging}
        />
      )}
    </Draggable>
  );
}
