"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  StarIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { TaskItem } from "@/lib/db/tasks";
import { PriorityQuadrant } from "@/lib/kanban/enums";
import type { TrackTargetStatus } from "@/lib/kanban/schemas";
import type { MatrixActivePlan } from "../services/matrixService";
import { getWeekNumberFromPeriodKey } from "@/lib/kanban/dateUtils";
import {
  updateTaskQuadrantAction,
  trackTaskAction,
} from "../actions/matrixActions";
import TaskModal from "@/components/kanban/task-modal/TaskModal";
import QuadrantCell from "./QuadrantCell";
import MobileTrackSheet from "./MobileTrackSheet";
import {
  QUADRANT_ORDER,
  FALLBACK_QUADRANT,
  CREATE_PLAN_HREF,
} from "./constants";

interface PriorityMatrixPageProps {
  tasks: TaskItem[];
  activePlan: MatrixActivePlan | null;
  /** Active plan's period, or the current ISO week when there is no plan */
  periodKey: string;
}

export default function PriorityMatrixPage({
  tasks,
  activePlan,
  periodKey,
}: PriorityMatrixPageProps) {
  const t = useTranslations("Priorities");
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);
  const [openPopoverTaskId, setOpenPopoverTaskId] = useState<string | null>(null);
  const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
  const [modalQuadrant, setModalQuadrant] = useState<PriorityQuadrant | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const activePlanId = activePlan?.id ?? null;
  const weekNumber = getWeekNumberFromPeriodKey(periodKey);

  const byQuadrant = useMemo(() => {
    const groups: Record<PriorityQuadrant, TaskItem[]> = {
      [PriorityQuadrant.DO_FIRST]: [],
      [PriorityQuadrant.SCHEDULE]: [],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [],
    };
    for (const task of localTasks) {
      groups[(task.quadrant as PriorityQuadrant | null) ?? FALLBACK_QUADRANT].push(task);
    }
    return groups;
  }, [localTasks]);

  const totalCount = localTasks.length;
  const trackedCount = activePlanId
    ? localTasks.filter((task) => task.planId === activePlanId).length
    : 0;

  // Optimistically patch one task and fire the server action; on failure only
  // that task's previous value is restored — restoring a whole-list snapshot
  // would clobber concurrent optimistic updates that landed in between.
  function runOptimisticTaskUpdate(
    taskId: string,
    patch: Partial<TaskItem>,
    action: () => Promise<{ error?: unknown }>,
    errorLabel: string
  ) {
    const previous = localTasks.find((task) => task.id === taskId);
    if (!previous) return;

    setLocalTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
    );

    action().then((result) => {
      if (result.error) {
        console.error(errorLabel, result.error);
        setLocalTasks((prev) =>
          prev.map((task) => (task.id === taskId ? previous : task))
        );
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newQuadrant = destination.droppableId as PriorityQuadrant;
    runOptimisticTaskUpdate(
      draggableId,
      { quadrant: newQuadrant },
      () => updateTaskQuadrantAction(draggableId, { quadrant: newQuadrant }),
      "Failed to reprioritize task:"
    );
  }

  // Track This Week: optimistic dim + "This Week" tag + count bump, rollback on failure
  function handleTrack(taskId: string, status: TrackTargetStatus) {
    if (!activePlanId) return;
    setOpenPopoverTaskId(null);
    setSheetTask(null);

    runOptimisticTaskUpdate(
      taskId,
      { planId: activePlanId, status },
      () => trackTaskAction(taskId, { status }),
      "Failed to track task:"
    );
  }

  const renderMobileTopBar = () => (
    <div className="md:hidden flex items-end gap-2 px-4 pt-4 pb-2.5 border-b border-base-content/10 flex-shrink-0">
      <div className="flex flex-col gap-px">
        <span className="text-[17px] font-bold">{t("title")}</span>
        <span className="text-[11px] text-base-content/50">
          {t("summaryMobile", { total: totalCount, tracked: trackedCount })}
        </span>
      </div>
      <span className="ml-auto text-[11px] font-semibold text-base-content/60">
        {t("weekBadge", { week: weekNumber })}
      </span>
    </div>
  );

  const renderTitleBar = () => (
    <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-base-content/10 flex-shrink-0">
      <div className="flex size-9 items-center justify-center rounded-[10px] bg-secondary/10 flex-shrink-0">
        <StarIcon className="size-[18px] text-secondary" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold">{t("title")}</span>
        <span className="text-xs text-base-content/50">{t("subtitle")}</span>
      </div>
      <span className="ml-auto text-xs font-semibold text-base-content/60">
        {t.rich("summary", {
          total: totalCount,
          tracked: trackedCount,
          num: (chunks) => (
            <span className="text-[13px] font-bold text-base-content">{chunks}</span>
          ),
        })}
      </span>
    </div>
  );

  const renderHintBar = () => (
    <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-base-200/60 border-b border-base-content/10 text-xs flex-shrink-0">
      {activePlanId ? (
        <>
          <ListBulletIcon className="size-3.5 text-primary flex-shrink-0" />
          <span className="text-base-content/60">
            {t.rich("hint", {
              // Decorative send-button glyph stays in JSX, not the message
              arrow: () => <strong className="text-primary">→</strong>,
            })}
          </span>
        </>
      ) : (
        <>
          <ExclamationTriangleIcon className="size-3.5 text-warning flex-shrink-0" />
          <span className="text-warning">
            {t.rich("hintNoPlan", {
              em: (chunks) => (
                <Link href={CREATE_PLAN_HREF} className="font-bold underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </>
      )}
    </div>
  );

  const renderAxisY = () => (
    <div className="w-4 md:w-7 flex-shrink-0 flex flex-col items-center justify-around bg-base-200/60">
      <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40">
        {t("axisImportant")}
      </span>
      <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40">
        <span className="hidden md:inline">{t("axisNotImportant")}</span>
        <span className="md:hidden">{t("axisNotImportantShort")}</span>
      </span>
    </div>
  );

  const renderAxisX = () => (
    <div className="flex h-3.5 md:h-6 ml-4 md:ml-7 bg-base-200/60 flex-shrink-0">
      <span className="flex-1 text-center text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40 leading-[14px] md:leading-6">
        {t("axisUrgent")}
      </span>
      <span className="flex-1 text-center text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40 leading-[14px] md:leading-6">
        {t("axisNotUrgent")}
      </span>
    </div>
  );

  return (
    <DragDropContext
      onDragStart={() => setOpenPopoverTaskId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {renderMobileTopBar()}
        {renderTitleBar()}
        {renderHintBar()}

        <div className="flex-1 min-h-0 flex">
          {renderAxisY()}
          <div className="flex-1 min-w-0 grid grid-cols-2 grid-rows-2">
            {QUADRANT_ORDER.map((quadrant) => (
              <QuadrantCell
                key={quadrant}
                quadrant={quadrant}
                tasks={byQuadrant[quadrant]}
                activePlanId={activePlanId}
                openPopoverTaskId={openPopoverTaskId}
                onSendToggle={setOpenPopoverTaskId}
                onTrack={handleTrack}
                onCardTap={setSheetTask}
                onAdd={setModalQuadrant}
              />
            ))}
          </div>
        </div>
        {renderAxisX()}
      </div>

      {/* Popover click-away layer — lives outside every Draggable so pressing
          it can never start a drag (the whole card is a drag handle). */}
      {openPopoverTaskId !== null && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setOpenPopoverTaskId(null)}
        />
      )}

      <MobileTrackSheet
        task={sheetTask}
        hasActivePlan={activePlanId !== null}
        onClose={() => setSheetTask(null)}
        onTrack={handleTrack}
      />
      <TaskModal
        isOpen={modalQuadrant !== null}
        onClose={() => setModalQuadrant(null)}
        onSaved={() => setModalQuadrant(null)}
        mode="adhoc"
        quadrant={modalQuadrant ?? undefined}
      />
    </DragDropContext>
  );
}
