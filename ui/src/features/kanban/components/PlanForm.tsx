"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/24/outline";
import { TaskType, PeriodType } from "@/features/kanban/utils/enums";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";
import { createPlanAction, updatePlanAction } from "@/features/kanban/actions/planActions";
import TemplateItem from "./TemplateItem";
import TemplateModal from "./template-modal/TemplateModal";
import ReviewChangesModal from "./RemoveInstancesModal";

interface PlanTemplateConfig {
  type: TaskType;
  frequency: number;
}

interface InitialPlanTemplate {
  templateId: string;
  type: TaskType;
  frequency: number;
}

interface PlanFormProps {
  templates: TaskTemplateItem[];
  mode: "create" | "edit";
  planId?: string;
  initialPlanTemplates?: InitialPlanTemplate[];
  initialDescription?: string;
}

export default function PlanForm({
  templates,
  mode,
  planId,
  initialPlanTemplates = [],
  initialDescription = "",
}: PlanFormProps) {
  const router = useRouter();

  // Map from templateId → {type, frequency} for selected templates
  const [selectedTemplates, setSelectedTemplates] = useState<
    Map<string, PlanTemplateConfig>
  >(
    new Map(
      initialPlanTemplates.map((pt) => [
        pt.templateId,
        { type: pt.type, frequency: pt.frequency },
      ])
    )
  );
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<TaskTemplateItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, { type: TaskType.DAILY, frequency: 1 });
      }
      return next;
    });
  }

  function updateConfig(id: string, config: PlanTemplateConfig) {
    setSelectedTemplates((prev) => {
      const next = new Map(prev);
      next.set(id, config);
      return next;
    });
  }

  // Compute diff between initial and current state (edit mode only)
  function computeDiff() {
    const initialMap = new Map(
      initialPlanTemplates.map((pt) => [pt.templateId, pt])
    );
    const templateTitleMap = new Map(templates.map((t) => [t.id, t.title]));

    const added = Array.from(selectedTemplates.entries())
      .filter(([id]) => !initialMap.has(id))
      .map(([id, cfg]) => ({
        templateId: id,
        title: templateTitleMap.get(id) ?? "",
        type: cfg.type,
        frequency: cfg.frequency,
      }));

    const removed = initialPlanTemplates
      .filter((pt) => !selectedTemplates.has(pt.templateId))
      .map((pt) => ({
        templateId: pt.templateId,
        title: templateTitleMap.get(pt.templateId) ?? "",
        type: pt.type,
        frequency: pt.frequency,
      }));

    const modified = Array.from(selectedTemplates.entries())
      .filter(([id, cfg]) => {
        const init = initialMap.get(id);
        return init && (init.type !== cfg.type || init.frequency !== cfg.frequency);
      })
      .map(([id, cfg]) => {
        const init = initialMap.get(id)!;
        return {
          templateId: id,
          title: templateTitleMap.get(id) ?? "",
          fromType: init.type,
          fromFrequency: init.frequency,
          toType: cfg.type,
          toFrequency: cfg.frequency,
        };
      });

    return { added, removed, modified };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "edit") {
      const { added, removed, modified } = computeDiff();
      const hasChanges =
        added.length > 0 || removed.length > 0 || modified.length > 0;
      if (hasChanges) {
        setIsReviewModalOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    await submitPlan();
  }

  async function handleReviewConfirm() {
    setIsSubmitting(true);
    await submitPlan();
  }

  async function submitPlan() {
    const templatesPayload = Array.from(selectedTemplates.entries()).map(
      ([templateId, cfg]) => ({
        templateId,
        type: cfg.type,
        frequency: cfg.frequency,
      })
    );

    let result;
    switch (mode) {
      case "create":
        result = await createPlanAction({
          periodType: PeriodType.WEEKLY,
          description: description.trim() || undefined,
          templates: templatesPayload,
        });
        break;
      case "edit":
        result = await updatePlanAction(planId!, {
          description: description.trim() || undefined,
          templates: templatesPayload,
        });
        break;
    }

    if (result.error) {
      const err = result.error;
      const message =
        "formErrors" in err
          ? err.formErrors.join(", ")
          : JSON.stringify(err);
      setError(message);
      setIsSubmitting(false);
      setIsReviewModalOpen(false);
      return;
    }

    router.push("/kanban");
  }

  const diff = mode === "edit" ? computeDiff() : { added: [], removed: [], modified: [] };

  return (
    <>
      <h2 className="text-2xl font-bold mb-1">
        {mode === "create" ? "Create Weekly Plan" : "Update Weekly Plan"}
      </h2>
      {mode === "create" && (
        <p className="text-base-content/50 mb-7">
          Set up your task templates and start a new week.
        </p>
      )}
      {mode === "edit" && <div className="mb-6" />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content/60 text-xs font-medium">
              Description (optional)
            </span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. Focus on interview prep this week"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Template picker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-base-content/60">
              Task Templates
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs border border-base-content/15 hover:bg-base-content/5"
              onClick={() => {
                setEditingTemplate(null);
                setIsModalOpen(true);
              }}
            >
              + New Template
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <TemplateItem
                key={t.id}
                template={t}
                isSelected={selectedTemplates.has(t.id)}
                config={selectedTemplates.get(t.id)}
                onToggle={() => toggleTemplate(t.id)}
                onConfigChange={(cfg) => updateConfig(t.id, cfg)}
                onEdit={() => {
                  setEditingTemplate(t);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>

          {templates.length === 0 && (
            <p className="text-sm text-base-content/50 text-center py-8">
              No templates yet. Create a template to get started.
            </p>
          )}
        </div>

        {/* Error */}
        {error && <div className="alert alert-error text-sm">{error}</div>}

        {/* Summary + Actions */}
        <div className="flex items-center justify-between border-t border-base-content/10 pt-5">
          <div className="text-sm text-base-content/50">
            {selectedTemplates.size} template
            {selectedTemplates.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex gap-2">
            <Link href="/kanban" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={selectedTemplates.size === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              {mode === "create" ? "Start Week" : "Update Plan"}
            </button>
          </div>
        </div>
      </form>

      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => router.refresh()}
        template={editingTemplate}
      />
      <ReviewChangesModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleReviewConfirm}
        added={diff.added}
        removed={diff.removed}
        modified={diff.modified}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
