"use client";

import { useEffect, useRef, useState } from "react";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";
import {
  createTaskTemplateAction,
  updateTaskTemplateAction,
} from "@/features/kanban/actions/templateActions";
import TemplateModalHeader from "./TemplateModalHeader";
import TemplateModalFooter from "./TemplateModalFooter";
import IconNumberField from "./IconNumberField";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  template?: TaskTemplateItem | null;
}

export default function TemplateModal({
  isOpen,
  onClose,
  onSaved,
  template,
}: TemplateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mode = template ? "edit" : "create";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or template changes
  useEffect(() => {
    if (isOpen) {
      setTitle(template?.title ?? "");
      setDescription(template?.description ?? "");
      setPoints(template?.points ?? 3);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, template]);

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
        result = await createTaskTemplateAction({ title, description, points });
        break;
      case "edit":
        result = await updateTaskTemplateAction(template!.id, {
          title,
          description,
          points,
        });
        break;
    }

    if (result.error) {
      const err = result.error;
      const message =
        "formErrors" in err ? err.formErrors.join(", ") : JSON.stringify(err);
      setError(message);
      setIsSubmitting(false);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box max-w-lg">
        <TemplateModalHeader mode={mode} onClose={onClose} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                Title <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Solve 3 LeetCode problems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                Description{" "}
                <span className="text-base-content/40">(used by AI for task generation)</span>
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="e.g. Focus on dynamic programming and graph problems"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Points */}
          <IconNumberField
            label="Points"
            value={points}
            onChange={setPoints}
            icon={<StarIconSolid className="size-4 text-warning" />}
            placeholder="10"
            helperText="Points earned when completed"
            required
          />

          <TemplateModalFooter
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
