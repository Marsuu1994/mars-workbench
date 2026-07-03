"use client";

import { Droppable } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { PlusIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import type { TaskItem } from "@/lib/db/tasks";
import { PriorityQuadrant } from "@/lib/kanban/enums";
import type { TrackTargetStatus } from "@/lib/kanban/schemas";
import { QUADRANT_CONFIG } from "./constants";
import MatrixTaskCard from "./MatrixTaskCard";

interface QuadrantCellProps {
  quadrant: PriorityQuadrant;
  tasks: TaskItem[];
  activePlanId: string | null;
  openPopoverTaskId: string | null;
  onSendToggle: (taskId: string | null) => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
  onCardTap: (task: TaskItem) => void;
  onAdd: (quadrant: PriorityQuadrant) => void;
}

/**
 * One cell of the 2×2 Eisenhower grid: accent header (● label — sublabel,
 * count), a droppable scrollable card list with a drop-hint banner while
 * hovered, and a desktop-only dashed Add button pinned to the bottom.
 */
export default function QuadrantCell({
  quadrant,
  tasks,
  activePlanId,
  openPopoverTaskId,
  onSendToggle,
  onTrack,
  onCardTap,
  onAdd,
}: QuadrantCellProps) {
  const t = useTranslations("Priorities");
  const tQuadrant = useTranslations("Enums.PriorityQuadrant");
  const tQuadrantShort = useTranslations("Priorities.QuadrantShort");
  const config = QUADRANT_CONFIG[quadrant];

  const renderHeader = (isDraggingOver: boolean) => (
    <div
      className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 pt-1.5 md:pt-2.5 pb-1 md:pb-1.5 border-t-[3px] flex-shrink-0 ${config.accentBorder}`}
    >
      <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${config.dotClass}`} />
      <span
        className={`text-[9px] md:text-[13px] font-bold uppercase tracking-wide ${
          isDraggingOver ? "text-primary" : ""
        }`}
      >
        <span className="hidden md:inline">{tQuadrant(quadrant)}</span>
        <span className="md:hidden">{tQuadrantShort(quadrant)}</span>
      </span>
      {config.sublabelKey && (
        <span className="hidden md:inline text-[11px] text-base-content/50">
          — {t(config.sublabelKey)}
        </span>
      )}
      <span className="ml-auto text-[9px] md:text-[11px] font-semibold text-base-content/50">
        {tasks.length}
      </span>
    </div>
  );

  const renderDropHint = () => (
    <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-[11px] font-semibold text-primary bg-primary/5 border-[1.5px] border-dashed border-primary/40 mb-0.5">
      <ArrowDownIcon className="size-3" />
      {t("dropHint", { quadrant })}
    </div>
  );

  const renderAddButton = () => (
    <button
      type="button"
      onClick={() => onAdd(quadrant)}
      className="hidden md:flex items-center justify-center gap-1 w-full mt-auto p-2 rounded-lg border-[1.5px] border-dashed border-base-content/20 text-base-content/40 text-xs font-medium cursor-pointer transition-colors hover:border-primary hover:text-primary flex-shrink-0"
    >
      <PlusIcon className="size-3.5" />
      {t("add")}
    </button>
  );

  return (
    <Droppable droppableId={quadrant}>
      {(provided, snapshot) => (
        // NOTE: no opacity treatment while dragging — the in-flight dnd clone
        // stays a DOM descendant of its source quadrant, and an ancestor with
        // opacity < 1 both dims the clone and traps its z-index in a new
        // stacking context (the board uses border highlighting for the same
        // reason).
        <div
          className={`relative flex flex-col min-h-0 border border-base-content/10 transition-colors duration-150 ${
            snapshot.isDraggingOver ? "bg-primary/5" : ""
          }`}
        >
          {renderHeader(snapshot.isDraggingOver)}
          {/* Overlaid (absolute + pointer-events-none) so mounting it mid-drag
              never changes the droppable list's dimensions. */}
          {snapshot.isDraggingOver && (
            <div className="absolute top-8 md:top-11 left-2 right-2 md:left-4 md:right-4 z-10 pointer-events-none">
              {renderDropHint()}
            </div>
          )}
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto px-2 md:px-4 pb-2 md:pb-4 pt-1 rounded-xl ${
              snapshot.isDraggingOver ? "outline-2 outline-dashed outline-primary -outline-offset-8" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <MatrixTaskCard
                key={task.id}
                task={task}
                index={index}
                isTracked={activePlanId !== null && task.planId === activePlanId}
                hasActivePlan={activePlanId !== null}
                isPopoverOpen={openPopoverTaskId === task.id}
                onSendToggle={onSendToggle}
                onTrack={onTrack}
                onTap={onCardTap}
              />
            ))}
            {provided.placeholder}
            {renderAddButton()}
          </div>
        </div>
      )}
    </Droppable>
  );
}
