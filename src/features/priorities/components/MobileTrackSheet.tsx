"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { TaskItem } from "@/lib/db/tasks";
import type { TrackTargetStatus } from "@/lib/kanban/schemas";
import { TRACK_TARGETS } from "./constants";

interface MobileTrackSheetProps {
  /** Task the sheet is open for; null = closed */
  task: TaskItem | null;
  hasActivePlan: boolean;
  onClose: () => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
}

/**
 * Mobile track-this-week bottom sheet (daisyUI `modal-bottom`), opened by
 * tapping an untracked matrix card. Shows the card summary and the two board
 * target columns. With no active plan the buttons render disabled with a
 * "No active plan yet" note (the desktop equivalent disables the send button).
 */
export default function MobileTrackSheet({
  task,
  hasActivePlan,
  onClose,
  onTrack,
}: MobileTrackSheetProps) {
  const t = useTranslations("Priorities");
  const tStatus = useTranslations("Enums.TaskStatus");
  const tSize = useTranslations("Enums.TaskSize");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (task) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [task]);

  const renderSummary = (current: TaskItem) => {
    const meta = [
      current.description,
      tSize(current.size),
      t("sheetPoints", { points: current.points }),
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <>
        <h3 className="text-[15px] font-bold">{current.title}</h3>
        <p className="text-xs text-base-content/60 mt-0.5 mb-4">{meta}</p>
      </>
    );
  };

  const renderTrackButton = (status: TrackTargetStatus, dotClass: string) => (
    <button
      key={status}
      type="button"
      disabled={!hasActivePlan}
      onClick={() => task && onTrack(task.id, status)}
      className="flex items-center gap-2.5 w-full px-3.5 py-3 mb-2 rounded-[10px] border border-base-content/10 bg-base-100 text-sm font-medium transition-colors enabled:cursor-pointer enabled:hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${dotClass}`} />
      {tStatus(status)}
      <ArrowRightIcon className="size-4 ml-auto text-base-content/40" />
    </button>
  );

  return (
    <dialog ref={dialogRef} className="modal modal-bottom md:hidden" onClose={onClose}>
      <div className="modal-box pt-1.5 pb-6 px-4">
        <div className="w-[38px] h-1 rounded-full bg-base-content/20 mx-auto mt-1.5 mb-3.5" />
        {task && renderSummary(task)}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 mb-2">
          {t("trackTitle")}
        </p>
        {!hasActivePlan && (
          <p className="flex items-center gap-1.5 text-xs text-warning mb-2">
            <ExclamationTriangleIcon className="size-3.5 flex-shrink-0" />
            {t("noPlanTooltip")}
          </p>
        )}
        {TRACK_TARGETS.map(({ status, dotClass }) => renderTrackButton(status, dotClass))}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>{t("closeLabel")}</button>
      </form>
    </dialog>
  );
}
