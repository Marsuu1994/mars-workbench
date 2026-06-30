"use client";

import { useTranslations } from "next-intl";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import type { TaskItem } from "@/lib/db/tasks";
import { SizeChip } from "../shared/SizeChip";
import TaskTypeBadge from "../shared/TaskTypeBadge";
import { formatShortDate } from "../../utils/dateUtils";
import { isRolloverTask, type RiskLevel } from "../../utils/taskUtils";

interface BacklogSheetCardProps {
  task: TaskItem;
  today: Date;
  riskLevel: RiskLevel;
  /** Template generation frequency; the instance badge only shows when > 1 */
  frequency: number;
  onPull: (taskId: string) => void;
}

/**
 * Full-width row card rendered inside the mobile backlog bottom sheet. Mirrors
 * the board TaskCard's badge / instance / rollover / risk language, but is a
 * plain (non-draggable) presentational card with a tap "↑ Todo" pull action.
 */
export default function BacklogSheetCard({
  task,
  today,
  riskLevel,
  frequency,
  onPull,
}: BacklogSheetCardProps) {
  const t = useTranslations("Board.Backlog");
  const showInstance = frequency > 1;
  const isRollover = isRolloverTask(task, today);

  const riskBorder =
    riskLevel === "danger"
      ? "border-l-4 border-l-error"
      : riskLevel === "warning"
        ? "border-l-4 border-l-warning"
        : "border-l-4 border-l-transparent";

  return (
    <div className={`card bg-base-100 border border-base-content/10 ${riskBorder}`}>
      <div className="card-body flex-row items-stretch gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TaskTypeBadge type={task.type} />
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
            {riskLevel === "warning" && (
              <span className="badge badge-warning badge-sm">⚠ at risk</span>
            )}
            {riskLevel === "danger" && (
              <span className="badge badge-error badge-sm">‼ urgent</span>
            )}
          </div>

          <h3 className="text-sm font-semibold line-clamp-2">{task.title}</h3>

          {task.description && (
            <p className="text-xs text-base-content/60 line-clamp-2 break-all">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
          <SizeChip size={task.size} points={task.points} />
          <button
            onClick={() => onPull(task.id)}
            className="btn btn-primary btn-sm gap-1"
          >
            <ArrowUpIcon className="size-3.5" />
            {t("pullToTodoLabel")}
          </button>
        </div>
      </div>
    </div>
  );
}
