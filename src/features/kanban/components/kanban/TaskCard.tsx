"use client";

import { Draggable } from "@hello-pangea/dnd";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../../utils/enums";
import { SizeChip } from "../shared/SizeChip";
import { formatShortDate } from "../../utils/dateUtils";
import { isRolloverTask, type RiskLevel } from "../../utils/taskUtils";
import TaskTypeBadge from "../shared/TaskTypeBadge";

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

  // Desktop: left border for risk (preserve on hover). Normal cards keep the
  // base 1px border on all sides — no override, so the left edge stays visible.
  const desktopRiskClass =
    riskLevel === "danger"
      ? "md:border-l-4 md:border-l-error md:hover:border-l-error"
      : riskLevel === "warning"
        ? "md:border-l-4 md:border-l-warning md:hover:border-l-warning"
        : "";

  // Mobile: top border for risk, scoped to < md (preserve on hover)
  const mobileRiskClass =
    riskLevel === "danger"
      ? "max-md:border-t-[3px] max-md:border-t-error max-md:hover:border-t-error"
      : riskLevel === "warning"
        ? "max-md:border-t-[3px] max-md:border-t-warning max-md:hover:border-t-warning"
        : "";

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDone}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card bg-base-100/70 shadow-sm border border-base-content/10 transition-[box-shadow,border-color,opacity] duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-base-content/25 flex-shrink-0 w-[136px] md:w-auto ${mobileRiskClass} ${desktopRiskClass} ${
            isDone ? "opacity-50 cursor-default" : "cursor-grab"
          } ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 scale-[1.02] z-50"
              : ""
          }`}
        >
          <div className="card-body p-2.5 md:p-3 gap-1.5 md:gap-1">
            {/* Mobile: badge first, then title, then footer */}
            <div className="md:hidden flex items-center gap-1.5">
              <TaskTypeBadge type={taskType} />
              {showInstance && (
                <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-primary/10 text-primary">
                  #{task.instanceIndex + 1}
                </span>
              )}
            </div>

            <h3
              className={`card-title text-xs md:text-sm font-medium line-clamp-2 h-[2.6em] md:h-auto md:line-clamp-none ${
                isDone ? "line-through text-base-content/50" : ""
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

              {showInstance && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  #{task.instanceIndex + 1}
                </span>
              )}

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

              <SizeChip size={task.size} points={task.points} className="ml-auto" />
            </div>

            {/* Mobile footer */}
            <div className="flex md:hidden items-center mt-auto">
              {isRollover && (
                <span className="flex items-center gap-0.5 text-[8px] text-warning font-medium">
                  ↩ {formatShortDate(new Date(task.forDate!))}
                </span>
              )}
              <SizeChip size={task.size} points={task.points} className="ml-auto text-[8px]" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
