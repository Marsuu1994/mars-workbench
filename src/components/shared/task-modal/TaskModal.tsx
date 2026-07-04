"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon } from "@heroicons/react/24/outline";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";
import {
  TaskSize,
  sizeToPoints,
  type PriorityQuadrant,
} from "@/utils/enums";
import {
  createTaskTemplateAction,
  updateTaskTemplateAction,
} from "@/actions/templateActions";
import { createAdhocTaskAction } from "@/actions/taskActions";
import TaskModalHeader from "./TaskModalHeader";
import TaskModalFooter from "./TaskModalFooter";

type ModalMode = "create" | "edit" | "adhoc";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode?: ModalMode;
  template?: TaskTemplateItem | null;
  /** Source quadrant for adhoc mode — the created matrix task lands there */
  quadrant?: PriorityQuadrant;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSaved,
  mode: modeProp,
  template,
  quadrant,
}: TaskModalProps) {
  const t = useTranslations("TaskModal");
  const tSize = useTranslations("Enums.TaskSize");
  const tEnums = useTranslations("Enums");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mode: ModalMode = modeProp ?? (template ? "edit" : "create");

  const initialTitle = mode === "adhoc" ? "" : (template?.title ?? "");
  const initialDescription = mode === "adhoc" ? "" : (template?.description ?? "");
  const initialSize =
    mode === "adhoc" ? TaskSize.EXTRA_SMALL : ((template?.size as TaskSize) ?? TaskSize.MEDIUM);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [size, setSize] = useState<TaskSize>(initialSize);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when the modal opens or the target template/mode changes.
  // Done during render (not in an effect) to avoid cascading re-renders.
  // Mirrors the previous effect's [isOpen, template, mode] dependencies.
  const [formSource, setFormSource] = useState({ isOpen, template, mode });
  if (
    formSource.isOpen !== isOpen ||
    formSource.template !== template ||
    formSource.mode !== mode
  ) {
    setFormSource({ isOpen, template, mode });
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setSize(initialSize);
      setError(null);
      setIsSubmitting(false);
    }
  }

  // Dialog open/close control
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let result;
    switch (mode) {
      case "create":
        result = await createTaskTemplateAction({ title, description, size });
        break;
      case "edit":
        result = await updateTaskTemplateAction(template!.id, {
          title,
          description,
          size,
        });
        break;
      case "adhoc":
        result = await createAdhocTaskAction({ title, description, size, quadrant });
        break;
    }

    if (result.error) {
      const err = result.error;
      let message: string;
      if ("formErrors" in err) {
        // Include fieldErrors so a validation failure with empty formErrors
        // (e.g. a missing required field) never renders as a blank error.
        const fieldMessages = Object.values(err.fieldErrors ?? {}).flatMap(
          (messages) => messages ?? []
        );
        message = [...err.formErrors, ...fieldMessages].join(", ");
      } else {
        message = JSON.stringify(err);
      }
      setError(message);
      setIsSubmitting(false);
      return;
    }

    onSaved();
    onClose();
  }

  const isAdhoc = mode === "adhoc";

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box fx-panel-solid fx-corners fx-boot-in max-w-lg">
        <TaskModalHeader mode={mode} onClose={onClose} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Ad-hoc info banner */}
          {isAdhoc && (
            <div className="flex items-center gap-2 bg-warning/10 text-warning text-sm px-3.5 py-2.5 rounded-lg">
              <BoltIcon className="size-4.5 shrink-0" />
              {t("adhocBanner")}
            </div>
          )}

          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                {t("titleLabel")} <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={isAdhoc ? t("titlePlaceholderAdhoc") : t("titlePlaceholderTemplate")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                {t("descriptionLabel")}{" "}
                {!isAdhoc && (
                  <span className="text-base-content/40">{t("descriptionAiHint")}</span>
                )}
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={
                isAdhoc
                  ? t("descriptionPlaceholderAdhoc")
                  : t("descriptionPlaceholderTemplate")
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Size */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                {t("sizeLabel")} <span className="text-error">*</span>
              </span>
            </label>
            <div className="flex gap-1.5 w-full">
              {Object.values(TaskSize).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full border text-xs font-bold transition-colors ${
                    size === s
                      ? "bg-secondary/10 border-secondary text-secondary"
                      : "bg-base-200 border-base-300 text-base-content/50 hover:border-base-content/30"
                  }`}
                >
                  <span>{tSize(s)}</span>
                  <span className={`text-[10px] font-semibold ${size === s ? "opacity-70" : "opacity-50"}`}>
                    {sizeToPoints(s)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary mt-1.5">
              {tEnums("sizeEffort", { hours: sizeToPoints(size) })}
            </p>
            {(size === TaskSize.LARGE || size === TaskSize.EXTRA_LARGE) && (
              <p className="text-xs text-warning mt-0.5">{t("sizeWarning")}</p>
            )}
          </div>

          <TaskModalFooter
            mode={mode}
            isSubmitting={isSubmitting}
            error={error}
            onClose={onClose}
          />
        </form>
      </div>
    </dialog>
  );
}
