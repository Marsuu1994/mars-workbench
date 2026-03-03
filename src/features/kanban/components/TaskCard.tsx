"use client";

import { Draggable } from "@hello-pangea/dnd";
import { StarIcon } from "@heroicons/react/24/solid";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus, TaskType } from "../utils/enums";
import { formatShortDate, normalizeForDate } from "../utils/dateUtils";
import type { RiskLevel } from "../utils/taskUtils";
import TaskTypeBadge from "./TaskTypeBadge";

type TaskCardProps = {
  task: TaskItem;
  taskType: string;
  /** Position index within the column — required by Draggable */
  index: number;
  today: Date;
  riskLevel: RiskLevel;
};

export default function TaskCard({
  task,
  taskType,
  index,
  today,
  riskLevel,
}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;

  const isRollover =
    !isDone &&
    task.type === TaskType.DAILY &&
    task.forDate !== null &&
    normalizeForDate(task.forDate) < today;

  const riskBorderClass =
    riskLevel === "danger"
      ? "border-l-4 border-l-error"
      : riskLevel === "warning"
        ? "border-l-4 border-l-warning"
        : "border-l-4 border-l-transparent";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card bg-base-100/70 shadow-sm border border-base-content/10 cursor-grab transition-[box-shadow,border-color,opacity] duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-base-content/25 ${riskBorderClass} ${
            isDone ? "opacity-50" : ""
          } ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 scale-[1.02] z-50"
              : ""
          }`}
        >
          <div className="card-body p-3 gap-1">
            <h3
              className={`card-title text-sm font-medium ${
                isDone ? "line-through text-base-content/50" : ""
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="text-xs text-base-content/60">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <TaskTypeBadge type={taskType} />

              {isRollover && (
                <span className="flex items-center gap-0.5 text-xs text-warning font-medium">
                  ↩ {formatShortDate(new Date(task.forDate!))}
                </span>
              )}

              {riskLevel === "warning" && !isDone && (
                <span className="badge badge-warning badge-sm">⚠ at risk</span>
              )}
              {riskLevel === "danger" && !isDone && (
                <span className="badge badge-error badge-sm">‼ urgent</span>
              )}

              <span className="flex gap-0.5 text-xs ml-auto">
                <StarIcon className="size-4 text-warning" />
                <span className="text-base-content/70 font-bold">{`${task.points} ${task.points === 1 ? "pt" : "pts"}`}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
