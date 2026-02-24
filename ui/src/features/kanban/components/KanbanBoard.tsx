"use client";

import { useState, useEffect } from "react";
// DragDropContext is the top-level wrapper that provides drag-and-drop
// functionality to everything inside it. It requires an `onDragEnd` callback
// that fires when the user finishes dragging (releases the mouse/finger).
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../utils/enums";
import { groupAndSortTasks } from "../utils/taskUtils";
import { updateTaskStatusAction } from "../actions/taskActions";
import BoardColumn from "./BoardColumn";

interface KanbanBoardProps {
  tasks: TaskItem[];
}

export default function KanbanBoard({ tasks }: KanbanBoardProps) {
  // --- Optimistic state ---
  // We keep a local copy of tasks so we can instantly move a card to its new
  // column (optimistic update) without waiting for the server round-trip.
  // If the server call fails, we roll back to the previous snapshot.
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  // Re-sync local state whenever the server props change (e.g. after
  // revalidatePath refreshes the page data from the server).
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Group tasks by status and sort within each group.
  const columns = groupAndSortTasks(localTasks);

  /**
   * Called when a drag operation ends (user drops the card).
   *
   * DropResult contains:
   * - `source`: where the card came from (droppableId = column status, index)
   * - `destination`: where the card was dropped (null if dropped outside)
   * - `draggableId`: the task ID being dragged
   */
  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    // Guard 1: Dropped outside any column → card snaps back automatically.
    if (!destination) return;

    // Guard 2: Dropped in the same column → no status change needed.
    // (We don't support reordering within a column.)
    if (destination.droppableId === source.droppableId) return;

    // The droppableId of each column is its TaskStatus (e.g. "TODO", "DOING", "DONE").
    const newStatus = destination.droppableId as TaskStatus;

    // Snapshot current state so we can roll back on server error.
    const snapshot = localTasks;

    // --- Optimistic update ---
    // Immediately update the dragged task's status in local state so the UI
    // reflects the move instantly, before the server responds.
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      )
    );

    // --- Server persist ---
    // Fire the server action in the background. On failure, revert to snapshot.
    updateTaskStatusAction(draggableId, { status: newStatus }).then(
      (result) => {
        if (result.error) {
          console.error("Failed to update task status:", result.error);
          setLocalTasks(snapshot);
        }
      }
    );
  }

  return (
    // DragDropContext wraps the entire board. All Droppable and Draggable
    // components must be descendants of this context provider.
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <BoardColumn status={TaskStatus.TODO} tasks={columns[TaskStatus.TODO]} />
        <BoardColumn status={TaskStatus.DOING} tasks={columns[TaskStatus.DOING]} />
        <BoardColumn status={TaskStatus.DONE} tasks={columns[TaskStatus.DONE]} />
      </div>
    </DragDropContext>
  );
}
