"use client";

import { StarIcon } from "@heroicons/react/24/solid";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus, TaskType } from "../utils/enums";

type TaskCardProps = {
  task: TaskItem;
  taskType: string;
};

export default function TaskCard({ task, taskType }: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;
  const isDaily = taskType === TaskType.DAILY;

  return (
    <div
      className={`card bg-base-100/70 backdrop-blur-md shadow-sm border border-base-content/10 cursor-grab transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-base-content/25 ${
        isDone ? "opacity-50" : ""
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
          <p className="text-xs text-base-content/60">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span
            className={`badge badge-xs font-bold uppercase ${
              isDaily ? "badge-info" : "badge-secondary"
            }`}
          >
            {isDaily ? "DAILY" : "WEEKLY"}
          </span>

          <span className="inline-flex items-center gap-0.5 text-xs text-base-content/70 ml-auto leading-none">
            <StarIcon className="size-3 text-warning shrink-0" />
            {task.points} {task.points === 1 ? "pt" : "pts"}
          </span>
        </div>
      </div>
    </div>
  );
}
