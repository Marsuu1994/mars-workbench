"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { TaskType, TaskStatus, PeriodType } from "@/features/kanban/utils/enums";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";
import {
  createPlanAction,
  updatePlanAction,
  countIncompleteByTemplateAction,
} from "@/features/kanban/actions/planActions";
import TemplateItem from "./TemplateItem";
import TaskModal from "./task-modal/TaskModal";
import { ReviewChangesModal } from "./ReviewChangesModal";

interface PlanTemplateConfig {
  type: TaskType;
  frequency: number;
}

interface InitialPlanTemplate {
  templateId: string;
  type: TaskType;
  frequency: number;
}

export interface AdhocTaskItem {
  id: string;
  planId: string | null;
  title: string;
  points: number;
  status: string;
}

interface PlanFormProps {
  templates: TaskTemplateItem[];
  mode: "create" | "edit";
  planId?: string;
  initialPlanTemplates?: InitialPlanTemplate[];
  initialDescription?: string;
  adhocTasks?: AdhocTaskItem[];
  initialAdhocTaskIds?: string[];
}

export default function PlanForm({
  templates,
  mode,
  planId,
  initialPlanTemplates = [],
  initialDescription = "",
  adhocTasks = [],
  initialAdhocTaskIds = [],
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
  const [incompleteCounts, setIncompleteCounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedAdhocIds, setSelectedAdhocIds] = useState<Set<string>>(
    new Set(initialAdhocTaskIds)
  );

  // Cache configs when templates are unchecked so re-checking restores them
  const configCache = useRef(new Map<string, PlanTemplateConfig>());

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        configCache.current.set(id, next.get(id)!);
        next.delete(id);
      } else {
        const cached = configCache.current.get(id);
        const initial = initialPlanTemplates.find((pt) => pt.templateId === id);
        next.set(
          id,
          cached ??
            (initial
              ? { type: initial.type, frequency: initial.frequency }
              : { type: TaskType.DAILY, frequency: 1 })
        );
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

  function toggleAdhocTask(id: string) {
    setSelectedAdhocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Compute diff between initial and current state (edit mode only)
  function computeDiff() {
    const initialMap = new Map(
      initialPlanTemplates.map((pt) => [pt.templateId, pt])
    );
    const templateTitleMap = new Map(templates.map((t) => [t.id, t.title]));
    const templatePointsMap = new Map(templates.map((t) => [t.id, t.points]));

    const added = Array.from(selectedTemplates.entries())
      .filter(([id]) => !initialMap.has(id))
      .map(([id, cfg]) => ({
        templateId: id,
        title: templateTitleMap.get(id) ?? "",
        points: templatePointsMap.get(id) ?? 0,
        type: cfg.type,
        frequency: cfg.frequency,
      }));

    const removed = initialPlanTemplates
      .filter((pt) => !selectedTemplates.has(pt.templateId))
      .map((pt) => ({
        templateId: pt.templateId,
        title: templateTitleMap.get(pt.templateId) ?? "",
        points: templatePointsMap.get(pt.templateId) ?? 0,
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

    // Ad-hoc diff
    const initialAdhocSet = new Set(initialAdhocTaskIds);
    const addedAdhoc = adhocTasks.filter(
      (t) => selectedAdhocIds.has(t.id) && !initialAdhocSet.has(t.id)
    );
    const removedAdhoc = adhocTasks.filter(
      (t) => !selectedAdhocIds.has(t.id) && initialAdhocSet.has(t.id)
    );

    return { added, removed, modified, addedAdhoc, removedAdhoc };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "edit") {
      const { added, removed, modified, addedAdhoc, removedAdhoc } = computeDiff();
      const hasChanges =
        added.length > 0 || removed.length > 0 || modified.length > 0 ||
        addedAdhoc.length > 0 || removedAdhoc.length > 0;
      if (hasChanges) {
        // Fetch incomplete task counts for removed + modified templates
        const affectedIds = [
          ...removed.map((t) => t.templateId),
          ...modified.map((t) => t.templateId),
        ];
        if (affectedIds.length > 0) {
          const counts = await countIncompleteByTemplateAction(
            planId!,
            affectedIds
          );
          setIncompleteCounts(counts);
        } else {
          setIncompleteCounts({});
        }
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
          adhocTaskIds: Array.from(selectedAdhocIds),
        });
        break;
      case "edit":
        result = await updatePlanAction(planId!, {
          description: description.trim() || undefined,
          templates: templatesPayload,
          adhocTaskIds: Array.from(selectedAdhocIds),
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

  const diff = mode === "edit"
    ? computeDiff()
    : { added: [], removed: [], modified: [], addedAdhoc: [], removedAdhoc: [] };

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

        {/* Ad-hoc Tasks */}
        {adhocTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-base-content/60">
                Ad-hoc Tasks
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                {adhocTasks.length} task{adhocTasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {adhocTasks.map((task) => {
                const isSelected = selectedAdhocIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleAdhocTask(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleAdhocTask(task.id);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-info/50 bg-info/5"
                        : "border-base-content/10 bg-base-200"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        isSelected
                          ? "border-info bg-info"
                          : "border-base-content/30 bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <CheckIcon className="size-3 stroke-[3] text-info-content" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{task.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <StarIconSolid className="size-3 text-warning" />
                          <span className="text-xs text-base-content/60">{task.points}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-base-300 text-base-content/50 uppercase tracking-wider shrink-0">
                      {task.status === TaskStatus.DOING ? "Doing" : "Todo"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="alert alert-error text-sm">{error}</div>}

        {/* Summary + Actions */}
        <div className="flex items-center justify-between border-t border-base-content/10 pt-5">
          <div className="text-sm text-base-content/50">
            {selectedTemplates.size} template
            {selectedTemplates.size !== 1 ? "s" : ""}
            {adhocTasks.length > 0 && (
              <>, {selectedAdhocIds.size} ad-hoc task
              {selectedAdhocIds.size !== 1 ? "s" : ""}</>
            )}
            {" "}selected
          </div>
          <div className="flex gap-2">
            <Link href="/kanban" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                (selectedTemplates.size === 0 && selectedAdhocIds.size === 0) ||
                isSubmitting
              }
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

      <TaskModal
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
        addedAdhoc={diff.addedAdhoc}
        removedAdhoc={diff.removedAdhoc}
        incompleteCounts={incompleteCounts}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
