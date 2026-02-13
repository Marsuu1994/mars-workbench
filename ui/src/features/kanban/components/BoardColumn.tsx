"use client";

import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../utils/enums";
import TaskCard from "./TaskCard";

type BoardColumnProps = {
  status: string;
  tasks: TaskItem[];
  templateTypeMap: Record<string, string>;
};

const COLUMN_CONFIG: Record<string, { label: string; accent: string }> = {
  [TaskStatus.TODO]: { label: "Todo", accent: "border-l-info" },
  [TaskStatus.DOING]: { label: "In Progress", accent: "border-l-warning" },
  [TaskStatus.DONE]: { label: "Done", accent: "border-l-success" },
};

export default function BoardColumn({
  status,
  tasks,
  templateTypeMap,
}: BoardColumnProps) {
  const config = COLUMN_CONFIG[status] ?? { label: status, accent: "" };

  return (
    <div className="flex flex-col bg-base-200/60 backdrop-blur-xl rounded-xl border border-base-content/10 min-w-[280px] flex-1">
      <div
        className={`flex items-center gap-2 px-4 py-3 border-l-4 border-b border-base-content/10 ${config.accent} rounded-tl-xl`}
      >
        <h2 className="font-semibold text-sm">{config.label}</h2>
        <span className="badge badge-ghost badge-sm">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            taskType={templateTypeMap[task.templateId] ?? "WEEKLY"}
          />
        ))}
      </div>
    </div>
  );
}
