"use client";

import { useEffect, useRef } from "react";
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { TaskType } from "@/features/kanban/utils/enums";

interface AddedTemplate {
  templateId: string;
  title: string;
  type: TaskType;
  frequency: number;
}

interface RemovedTemplate {
  templateId: string;
  title: string;
  type: TaskType;
  frequency: number;
}

interface ModifiedTemplate {
  templateId: string;
  title: string;
  fromType: TaskType;
  fromFrequency: number;
  toType: TaskType;
  toFrequency: number;
}

interface ReviewChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  added: AddedTemplate[];
  removed: RemovedTemplate[];
  modified: ModifiedTemplate[];
  isSubmitting: boolean;
}

function configLabel(type: TaskType, frequency: number) {
  return `${frequency}x / ${type === TaskType.DAILY ? "day" : "week"}`;
}

export default function ReviewChangesModal({
  isOpen,
  onClose,
  onConfirm,
  added,
  removed,
  modified,
  isSubmitting,
}: ReviewChangesModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between -mx-6 px-6 pb-4 mb-4 border-b border-base-content/10">
          <h3 className="text-lg font-semibold">Review Plan Changes</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-4">
          {added.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-success uppercase tracking-wide mb-2">
                Added ({added.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {added.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-center gap-3 px-3 py-2 bg-success/10 rounded-lg border border-success/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    <span className="text-sm font-medium flex-1">{t.title}</span>
                    <span className="text-xs text-base-content/50">
                      {configLabel(t.type, t.frequency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {removed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-error uppercase tracking-wide mb-2">
                Removed ({removed.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {removed.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-center gap-3 px-3 py-2 bg-error/10 rounded-lg border border-error/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                    <span className="text-sm font-medium flex-1">{t.title}</span>
                    <span className="text-xs text-base-content/50">
                      {configLabel(t.type, t.frequency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modified.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-2">
                Modified ({modified.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {modified.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-center gap-3 px-3 py-2 bg-warning/10 rounded-lg border border-warning/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                    <span className="text-sm font-medium flex-1">{t.title}</span>
                    <span className="text-xs text-base-content/50">
                      {configLabel(t.fromType, t.fromFrequency)}
                      {" → "}
                      {configLabel(t.toType, t.toFrequency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global note */}
        <div className="flex gap-2 items-start p-3 rounded-lg bg-base-200 mt-4">
          <InformationCircleIcon className="size-4 text-base-content/40 shrink-0 mt-0.5" />
          <span className="text-xs text-base-content/50 leading-relaxed">
            Done and Expired tasks are never affected.
          </span>
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Confirm &amp; Regenerate
          </button>
        </div>
      </div>
    </dialog>
  );
}
