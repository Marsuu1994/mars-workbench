"use client";

import { Droppable } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { useBreakpoint } from "@/components/common/BreakpointProvider";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "@/lib/kanban/enums";
import { getTaskFrequency, type RiskLevel } from "../utils/taskUtils";
import TaskCard from "./TaskCard";

interface BoardColumnProps {
  status: string;
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  /** True while any card is being dragged — faintly outlines all drop targets. */
  isDragActive?: boolean;
}

const STATUS_STYLE: Record<string, { accent: string; dotColor: string }> = {
  [TaskStatus.TODO]: { accent: "md:border-l-info", dotColor: "bg-info" },
  [TaskStatus.DOING]: { accent: "md:border-l-warning", dotColor: "bg-warning" },
  [TaskStatus.DONE]: { accent: "md:border-l-success", dotColor: "bg-success" },
};

export default function BoardColumn({
  status,
  tasks,
  today,
  riskMap,
  templateFreqMap,
  isDragActive = false,
}: BoardColumnProps) {
  const { isMobile } = useBreakpoint();
  const tStatus = useTranslations("Enums.TaskStatus");
  const style = STATUS_STYLE[status] ?? { accent: "", dotColor: "bg-base-content" };
  const label =
    status === TaskStatus.TODO || status === TaskStatus.DOING || status === TaskStatus.DONE
      ? tStatus(status)
      : status;

  // Only one border-color utility is active at a time, so highlights override
  // the base color cleanly (no Tailwind class-ordering ambiguity).
  const columnBorder = (isDraggingOver: boolean): string => {
    if (isDraggingOver) return "md:border md:border-dashed md:border-info";
    if (isDragActive) return "md:border md:border-dashed md:border-info/30";
    return "md:border md:border-base-content/10";
  };

  return (
    <Droppable droppableId={status} direction={isMobile ? "horizontal" : "vertical"}>
      {(provided, snapshot) => (
        <div
          className={`w-full md:min-w-[280px] md:flex-1 md:bg-base-200/60 md:rounded-xl flex flex-col transition-colors duration-200 ${columnBorder(
            snapshot.isDraggingOver
          )}`}
        >
          <div
            className={`flex items-center justify-between md:justify-start gap-2 px-4 py-1.5 md:py-3 md:border-l-4 md:border-b md:border-b-base-content/10 ${style.accent} md:rounded-tl-xl`}
          >
            <div className="flex items-center gap-2">
              <span className={`block md:hidden w-1.5 h-1.5 rounded-full ${style.dotColor}`} />
              <h2 className="font-semibold text-sm">{label}</h2>
            </div>
            <span className="badge badge-ghost badge-sm">{tasks.length}</span>
          </div>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:flex-col md:p-3 md:overflow-y-auto md:overflow-x-visible md:flex-1 md:rounded-b-xl transition-colors duration-200 ${
              snapshot.isDraggingOver ? "max-md:bg-base-300/40" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                taskType={task.type}
                index={index}
                today={today}
                riskLevel={riskMap.get(task.id) ?? "normal"}
                frequency={getTaskFrequency(task, templateFreqMap)}
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}
