'use client';

import {Draggable} from '@hello-pangea/dnd';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {isRolloverTask, type RiskLevel} from '@/utils/taskUtils';
import {SizeChip} from '@/components/ui/SizeChip';
import {TaskTypeBadge} from '@/components/ui/TaskTypeBadge';
import {InstanceBadge} from '@/components/ui/InstanceBadge';
import {RiskBadge} from '@/components/ui/RiskBadge';
import {RolloverTag} from '@/components/ui/RolloverTag';
import {
  RISK_BORDER_DESKTOP_LEFT,
  RISK_BORDER_MOBILE_TOP,
} from '@/components/ui/riskBorder';

type TaskCardProps = {
  task: TaskItem;
  taskType: string;
  /** Position index within the column — required by Draggable */
  index: number;
  today: Date;
  riskLevel: RiskLevel;
  /** Template generation frequency; the instance badge only shows when > 1 */
  frequency: number;
};

export default function TaskCard({
  task,
  taskType,
  index,
  today,
  riskLevel,
  frequency,
}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;

  // instanceIndex is 0-based; only meaningful when the template has siblings
  const showInstance = frequency > 1;

  const isRollover = isRolloverTask(task, today);

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDone}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card fx-card bg-base-100/70 border border-base-content/10 hover:-translate-y-0.5 flex-shrink-0 w-[136px] md:w-auto ${RISK_BORDER_MOBILE_TOP[riskLevel]} ${RISK_BORDER_DESKTOP_LEFT[riskLevel]} ${
            isDone ? 'opacity-50 cursor-default' : 'cursor-grab'
          } ${snapshot.isDragging ? 'fx-card-lift scale-[1.02] z-50' : ''}`}
        >
          <div className="card-body p-2.5 md:p-3 gap-1.5 md:gap-1">
            {/* Mobile: badge first, then title, then footer */}
            <div className="md:hidden flex items-center gap-1.5">
              <TaskTypeBadge type={taskType} />
              {showInstance && (
                <InstanceBadge index={task.instanceIndex} size="xs" />
              )}
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
            <div className="hidden md:flex items-center gap-2 mt-2">
              <TaskTypeBadge type={taskType} />

              {showInstance && <InstanceBadge index={task.instanceIndex} />}

              {isRollover && <RolloverTag date={new Date(task.forDate!)} />}

              {!isDone && <RiskBadge level={riskLevel} />}

              <SizeChip
                size={task.size}
                points={task.points}
                className="ml-auto"
              />
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
        </div>
      )}
    </Draggable>
  );
}
