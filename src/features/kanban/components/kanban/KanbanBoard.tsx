"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus } from "../../utils/enums";
import {
  groupAndSortTasks,
  computeTemplateProgress,
  computeRiskLevel,
  type RiskLevel,
} from "../../utils/taskUtils";
import { getTodayDate } from "../../utils/dateUtils";
import { updateTaskStatusAction } from "../../actions/taskActions";
import BoardColumn from "./BoardColumn";
import BacklogDrawer from "./BacklogDrawer";
import MobileBacklogSheet from "./MobileBacklogSheet";
import TaskModal from "../shared/task-modal/TaskModal";

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

    // Backlog is a drag source only — no un-pull back into the drawer.
    if (destination.droppableId === TaskStatus.BACKLOG) return;

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

  // Mobile tap-to-pull: BACKLOG → TODO. Same optimistic pattern as handleDragEnd.
  function handlePullToTodo(taskId: string) {
    const snapshot = localTasks;

    setLocalTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: TaskStatus.TODO } : task
      )
    );

    updateTaskStatusAction(taskId, { status: TaskStatus.TODO }).then((result) => {
      if (result.error) {
        console.error("Failed to pull task to Todo:", result.error);
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
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col gap-3.5 md:flex-row md:gap-4 overflow-y-auto md:overflow-x-auto md:overflow-y-visible p-4 max-md:pb-32">
          <BoardColumn
            status={TaskStatus.TODO}
            tasks={columns[TaskStatus.TODO]}
            today={today}
            riskMap={riskMap}
            templateFreqMap={templateFreqMap}
            onAddAdhocTask={openAdhocModal}
          />
          <BoardColumn
            status={TaskStatus.DOING}
            tasks={columns[TaskStatus.DOING]}
            today={today}
            riskMap={riskMap}
            templateFreqMap={templateFreqMap}
            onAddAdhocTask={openAdhocModal}
          />
          <BoardColumn
            status={TaskStatus.DONE}
            tasks={columns[TaskStatus.DONE]}
            today={today}
            riskMap={riskMap}
            templateFreqMap={templateFreqMap}
          />
        </div>
        <BacklogDrawer
          tasks={columns[TaskStatus.BACKLOG]}
          today={today}
          riskMap={riskMap}
          templateFreqMap={templateFreqMap}
        />
      </div>
      <MobileBacklogSheet
        tasks={columns[TaskStatus.BACKLOG]}
        today={today}
        riskMap={riskMap}
        templateFreqMap={templateFreqMap}
        onPull={handlePullToTodo}
      />
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
