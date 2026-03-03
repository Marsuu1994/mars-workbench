"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../utils/enums";
import {
  groupAndSortTasks,
  computeTemplateProgress,
  computeRiskLevel,
  type RiskLevel,
} from "../utils/taskUtils";
import { getTodayDate } from "../utils/dateUtils";
import { updateTaskStatusAction } from "../actions/taskActions";
import BoardColumn from "./BoardColumn";
import TaskModal from "./task-modal/TaskModal";

interface KanbanBoardProps {
  tasks: TaskItem[];
  daysElapsed: number;
  planTemplates: Array<{ templateId: string; frequency: number }>;
}

export default function KanbanBoard({
  tasks,
  daysElapsed,
  planTemplates,
}: KanbanBoardProps) {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);
  const [isAdhocModalOpen, setIsAdhocModalOpen] = useState(false);
  const [adhocInitialStatus, setAdhocInitialStatus] = useState<string>(TaskStatus.TODO);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Compute today and current hour once per render for risk calculations
  const today = useMemo(() => getTodayDate(), []);
  const currentHour = useMemo(() => new Date().getHours(), []);

  const templateFreqMap = useMemo(
    () => new Map(planTemplates.map((pt) => [pt.templateId, pt.frequency])),
    [planTemplates]
  );
  const templateProgressMap = useMemo(
    () => computeTemplateProgress(localTasks),
    [localTasks]
  );
  const riskMap = useMemo(
    () =>
      new Map<string, RiskLevel>(
        localTasks.map((t) => [
          t.id,
          computeRiskLevel(
            t,
            today,
            currentHour,
            daysElapsed,
            templateFreqMap,
            templateProgressMap
          ),
        ])
      ),
    [localTasks, today, currentHour, daysElapsed, templateFreqMap, templateProgressMap]
  );

  const columns = groupAndSortTasks(localTasks, today);

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as TaskStatus;
    const snapshot = localTasks;

    setLocalTasks((prev) =>
      prev.map((task) =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      )
    );

    updateTaskStatusAction(draggableId, { status: newStatus }).then((result) => {
      if (result.error) {
        console.error("Failed to update task status:", result.error);
        setLocalTasks(snapshot);
      }
    });
  }

  const openAdhocModal = (status: string) => {
    setAdhocInitialStatus(status);
    setIsAdhocModalOpen(true);
  };
  const closeAdhocModal = () => setIsAdhocModalOpen(false);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <BoardColumn
          status={TaskStatus.TODO}
          tasks={columns[TaskStatus.TODO]}
          today={today}
          riskMap={riskMap}
          onAddAdhocTask={openAdhocModal}
        />
        <BoardColumn
          status={TaskStatus.DOING}
          tasks={columns[TaskStatus.DOING]}
          today={today}
          riskMap={riskMap}
          onAddAdhocTask={openAdhocModal}
        />
        <BoardColumn
          status={TaskStatus.DONE}
          tasks={columns[TaskStatus.DONE]}
          today={today}
          riskMap={riskMap}
        />
      </div>
      <TaskModal
        isOpen={isAdhocModalOpen}
        onClose={closeAdhocModal}
        onSaved={closeAdhocModal}
        mode="adhoc"
        initialStatus={adhocInitialStatus}
      />
    </DragDropContext>
  );
}
