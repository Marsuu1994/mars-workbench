"use client";

import { useEffect, useRef } from "react";
import {
  ArrowPathIcon,
  BoltIcon,
  InformationCircleIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { TaskType } from "@/features/kanban/utils/enums";

interface AddedTemplate {
  templateId: string;
  title: string;
  points: number;
  type: TaskType;
  frequency: number;
}

interface RemovedTemplate {
  templateId: string;
  title: string;
  points: number;
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

export interface AdhocTaskChange {
  id: string;
  title: string;
  points: number;
}

interface ReviewChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  added: AddedTemplate[];
  removed: RemovedTemplate[];
  modified: ModifiedTemplate[];
  addedAdhoc?: AdhocTaskChange[];
  removedAdhoc?: AdhocTaskChange[];
  incompleteCounts: Record<string, number>;
  isSubmitting: boolean;
}

function typeLabel(type: TaskType) {
  return type === TaskType.DAILY ? "Daily" : "Weekly";
}

function freqLabel(type: TaskType, frequency: number) {
  return `${frequency}\u00d7 per ${type === TaskType.DAILY ? "day" : "week"}`;
}

export function ReviewChangesModal({
  isOpen,
  onClose,
  onConfirm,
  added,
  removed,
  modified,
  addedAdhoc = [],
  removedAdhoc = [],
  incompleteCounts,
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

  const totalAdhocChanges = addedAdhoc.length + removedAdhoc.length;

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box max-w-lg">
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
          {/* Added */}
          {added.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PlusIcon className="size-3.5 text-success" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-success">
                  Added
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                  {added.length} template{added.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {added.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-success/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-success shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-base-content/50 mt-0.5">
                        <StarIconSolid className="size-2.5 text-warning" />
                        <span>{t.points} pts</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{typeLabel(t.type)}</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{freqLabel(t.type, t.frequency)}</span>
                      </div>
                      <div className="text-[11px] italic text-success mt-1">
                        New {typeLabel(t.type).toLowerCase()} tasks will be generated starting today
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed */}
          {removed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MinusIcon className="size-3.5 text-error" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-error">
                  Removed
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-error/15 text-error">
                  {removed.length} template{removed.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {removed.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-error/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-error shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-base-content/50 mt-0.5">
                        <StarIconSolid className="size-2.5 text-warning" />
                        <span>{t.points} pts</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{typeLabel(t.type)}</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{freqLabel(t.type, t.frequency)}</span>
                      </div>
                      <div className="text-[11px] italic text-error mt-1">
                        {(() => {
                          const count = incompleteCounts[t.templateId] ?? 0;
                          return count > 0
                            ? `${count} Todo / In Progress task${count !== 1 ? "s" : ""} will be deleted from the board`
                            : "No active tasks on the board";
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified */}
          {modified.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PencilSquareIcon className="size-3.5 text-warning" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-warning">
                  Modified
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                  {modified.length} template{modified.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {modified.map((t) => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-warning/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-warning shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <span className="text-base-content/30 line-through">
                          {typeLabel(t.fromType)} &middot; {freqLabel(t.fromType, t.fromFrequency)}
                        </span>
                        <span className="text-warning mx-0.5">&rarr;</span>
                        <span className="text-warning">
                          {typeLabel(t.toType)} &middot; {freqLabel(t.toType, t.toFrequency)}
                        </span>
                      </div>
                      <div className="text-[11px] italic text-warning mt-1">
                        {(() => {
                          const count = incompleteCounts[t.templateId] ?? 0;
                          const prefix = count > 0
                            ? `Existing Todo / In Progress tasks deleted`
                            : `No active tasks to remove`;
                          return `${prefix} \u2014 ${t.toFrequency} new ${typeLabel(t.toType).toLowerCase()} instance${t.toFrequency !== 1 ? "s" : ""} will be generated`;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad-hoc Tasks */}
          {totalAdhocChanges > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BoltIcon className="size-3.5 text-warning" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-warning">
                  Ad-hoc Tasks
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                  {totalAdhocChanges} task{totalAdhocChanges !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Added to board */}
              {addedAdhoc.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold text-info mb-1 pl-0.5">
                    Added to board
                  </div>
                  <div className="flex flex-col gap-1.5 mb-2">
                    {addedAdhoc.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-info/30 rounded-lg"
                      >
                        <div className="size-[7px] rounded-full bg-info shrink-0 mt-[5px]" />
                        <div>
                          <div className="text-sm font-medium text-base-content">
                            {t.title}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-base-content/50 mt-0.5">
                            <StarIconSolid className="size-2.5 text-warning" />
                            <span>{t.points} pts</span>
                          </div>
                          <div className="text-[11px] italic text-info mt-1">
                            Will appear on the board
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Removed from board */}
              {removedAdhoc.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold text-error mb-1 pl-0.5">
                    Removed from board
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {removedAdhoc.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-error/30 rounded-lg"
                      >
                        <div className="size-[7px] rounded-full bg-error shrink-0 mt-[5px]" />
                        <div>
                          <div className="text-sm font-medium text-base-content">
                            {t.title}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-base-content/50 mt-0.5">
                            <StarIconSolid className="size-2.5 text-warning" />
                            <span>{t.points} pts</span>
                          </div>
                          <div className="text-[11px] italic text-error mt-1">
                            Will be moved to unassigned pool
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Global note */}
        <div className="flex gap-2 items-start px-3.5 py-3 rounded-lg bg-base-300 border border-dashed border-base-content/20 mt-4">
          <InformationCircleIcon className="size-3.5 text-base-content/40 shrink-0 mt-0.5" />
          <span className="text-xs text-base-content/50 leading-relaxed">
            Done and Expired tasks are never affected by any change — your
            completed work is always preserved.
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
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <ArrowPathIcon className="size-4" />
            )}
            Confirm &amp; Regenerate
          </button>
        </div>
      </div>
    </dialog>
  );
}
