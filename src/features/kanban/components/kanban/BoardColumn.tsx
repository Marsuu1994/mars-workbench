"use client";

import { Droppable } from "@hello-pangea/dnd";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useBreakpoint } from "@/components/common/BreakpointProvider";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../../utils/enums";
import { getTaskFrequency, type RiskLevel } from "../../utils/taskUtils";
import TaskCard from "./TaskCard";

interface BoardColumnProps {
  status: string;
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  /** True while any card is being dragged — faintly outlines all drop targets. */
  isDragActive?: boolean;
  onAddAdhocTask?: (status: string) => void;
}

const COLUMN_CONFIG: Record<string, { label: string; accent: string; dotColor: string }> = {
  [TaskStatus.TODO]: { label: "Todo", accent: "md:border-l-info", dotColor: "bg-info" },
  [TaskStatus.DOING]: { label: "In Progress", accent: "md:border-l-warning", dotColor: "bg-warning" },
  [TaskStatus.DONE]: { label: "Done", accent: "md:border-l-success", dotColor: "bg-success" },
};

export default function BoardColumn({
  status,
  tasks,
  today,
  riskMap,
  templateFreqMap,
  isDragActive = false,
  onAddAdhocTask,
}: BoardColumnProps) {
  const { isMobile } = useBreakpoint();
  const config = COLUMN_CONFIG[status] ?? { label: status, accent: "", dotColor: "bg-base-content" };

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
            className={`flex items-center justify-between md:justify-start gap-2 px-4 py-1.5 md:py-3 md:border-l-4 md:border-b md:border-b-base-content/10 ${config.accent} md:rounded-tl-xl`}
          >
            <div className="flex items-center gap-2">
              <span className={`block md:hidden w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
              <h2 className="font-semibold text-sm">{config.label}</h2>
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
            {onAddAdhocTask && status !== TaskStatus.DONE && (
              <button
                onClick={() => onAddAdhocTask(status)}
                className="hidden md:flex items-center justify-center gap-1.5 w-full p-3 rounded-lg border-2 border-dashed border-base-content/20 bg-transparent text-base-content/40 text-sm font-medium cursor-pointer transition-colors hover:border-info hover:text-info"
              >
                <PlusIcon className="size-4" />
                Add ad-hoc task
              </button>
            )}
          </div>
        </div>
      )}
    </Droppable>
  );
}
