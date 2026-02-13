"use client";

import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../utils/enums";
import { sortTasks } from "../utils/taskSort";
import BoardColumn from "./BoardColumn";

type KanbanBoardProps = {
  tasks: TaskItem[];
  templateTypeMap: Record<string, string>;
};

export default function KanbanBoard({
  tasks,
  templateTypeMap,
}: KanbanBoardProps) {
  const grouped: Record<string, TaskItem[]> = {
    [TaskStatus.TODO]: [],
    [TaskStatus.DOING]: [],
    [TaskStatus.DONE]: [],
  };

  for (const task of tasks) {
    const bucket = grouped[task.status];
    if (bucket) {
      bucket.push(task);
    }
  }

  const sortedGroups: Record<string, TaskItem[]> = {
    [TaskStatus.TODO]: sortTasks(grouped[TaskStatus.TODO], templateTypeMap),
    [TaskStatus.DOING]: sortTasks(grouped[TaskStatus.DOING], templateTypeMap),
    [TaskStatus.DONE]: sortTasks(grouped[TaskStatus.DONE], templateTypeMap),
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      <BoardColumn
        status={TaskStatus.TODO}
        tasks={sortedGroups[TaskStatus.TODO]}
        templateTypeMap={templateTypeMap}
      />
      <BoardColumn
        status={TaskStatus.DOING}
        tasks={sortedGroups[TaskStatus.DOING]}
        templateTypeMap={templateTypeMap}
      />
      <BoardColumn
        status={TaskStatus.DONE}
        tasks={sortedGroups[TaskStatus.DONE]}
        templateTypeMap={templateTypeMap}
      />
    </div>
  );
}
