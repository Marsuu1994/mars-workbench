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

  // Desktop: left border for risk (preserve on hover)
  const desktopRiskClass =
    riskLevel === "danger"
      ? "md:border-l-4 md:border-l-error md:hover:border-l-error"
      : riskLevel === "warning"
        ? "md:border-l-4 md:border-l-warning md:hover:border-l-warning"
        : "md:border-l-4 md:border-l-transparent md:hover:border-l-transparent";

  // Mobile: top border for risk, scoped to < md (preserve on hover)
  const mobileRiskClass =
    riskLevel === "danger"
      ? "max-md:border-t-[3px] max-md:border-t-error max-md:hover:border-t-error"
      : riskLevel === "warning"
        ? "max-md:border-t-[3px] max-md:border-t-warning max-md:hover:border-t-warning"
        : "";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card bg-base-100/70 shadow-sm border border-base-content/10 cursor-grab transition-[box-shadow,border-color,opacity] duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-base-content/25 flex-shrink-0 w-[136px] md:w-auto ${mobileRiskClass} ${desktopRiskClass} ${
            isDone ? "opacity-50" : ""
          } ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 scale-[1.02] z-50"
              : ""
          }`}
        >
          <div className="card-body p-2.5 md:p-3 gap-1.5 md:gap-1">
            {/* Mobile: badge first, then title, then footer */}
            <div className="md:hidden">
              <TaskTypeBadge type={taskType} />
            </div>

            <h3
              className={`card-title text-xs md:text-sm font-medium line-clamp-2 h-[2.6em] md:h-auto md:line-clamp-none ${
                isDone ? "line-through text-base-content/50" : ""
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="hidden md:block text-xs text-base-content/60">
                {task.description}
              </p>
            )}

            {/* Desktop footer */}
            <div className="hidden md:flex items-center gap-2 mt-2">
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

            {/* Mobile footer */}
            <div className="flex md:hidden items-center mt-auto">
              {isRollover && (
                <span className="flex items-center gap-0.5 text-[8px] text-warning font-medium">
                  ↩ {formatShortDate(new Date(task.forDate!))}
                </span>
              )}
              <span className="flex gap-0.5 text-[9px] ml-auto items-center">
                <StarIcon className="size-3 text-warning" />
                <span className="text-base-content/70 font-bold">{task.points}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
