"use client";

// Droppable marks a region as a valid drop target for draggable items.
// It uses the "render props" pattern: you pass a function as its child,
// and that function receives `provided` (refs and props to attach to the DOM)
// and `snapshot` (current drag state, e.g. is something hovering over this?).
import { Droppable } from "@hello-pangea/dnd";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../utils/enums";
import TaskCard from "./TaskCard";

type BoardColumnProps = {
  status: string;
  tasks: TaskItem[];
};

const COLUMN_CONFIG: Record<string, { label: string; accent: string }> = {
  [TaskStatus.TODO]: { label: "Todo", accent: "border-l-info" },
  [TaskStatus.DOING]: { label: "In Progress", accent: "border-l-warning" },
  [TaskStatus.DONE]: { label: "Done", accent: "border-l-success" },
};

export default function BoardColumn({ status, tasks }: BoardColumnProps) {
  const config = COLUMN_CONFIG[status] ?? { label: status, accent: "" };

  return (
    <div className="flex flex-col bg-base-200/60 rounded-xl border border-base-content/10 min-w-[280px] flex-1">
      <div
        className={`flex items-center gap-2 px-4 py-3 border-l-4 border-b border-base-content/10 ${config.accent} rounded-tl-xl`}
      >
        <h2 className="font-semibold text-sm">{config.label}</h2>
        <span className="badge badge-ghost badge-sm">{tasks.length}</span>
      </div>

      {/*
        Droppable requires a unique `droppableId` — we use the column's status
        string (e.g. "TODO") so that `onDragEnd` can read `destination.droppableId`
        to know which column the card was dropped into.

        The render-props function receives:
        - `provided.innerRef`: must be attached to the scrollable container element
        - `provided.droppableProps`: spread onto the same element (data attributes)
        - `provided.placeholder`: invisible spacer that reserves room for the
          dragged item — must be the last child inside the droppable container
        - `snapshot.isDraggingOver`: true when a card is hovering over this column
      */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 p-3 overflow-y-auto flex-1 rounded-b-xl transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-base-300/40" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                taskType={task.type}
                index={index}
              />
            ))}
            {/* Placeholder keeps the column height stable while dragging */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
