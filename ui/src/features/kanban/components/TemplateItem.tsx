"use client";

import { CheckIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { TaskType } from "@/features/kanban/utils/enums";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";

interface TemplateItemProps {
  template: TaskTemplateItem;
  isSelected: boolean;
  onToggle: () => void;
}

export default function TemplateItem({
  template,
  isSelected,
  onToggle,
}: TemplateItemProps) {
  const periodLabel = template.type === TaskType.DAILY ? "day" : "week";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-success/50 bg-success/10"
          : "border-base-content/10 bg-base-200"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isSelected
            ? "border-success bg-success"
            : "border-base-content/30 bg-transparent"
        }`}
      >
        {isSelected && <CheckIcon className="size-3 stroke-[3] text-success-content" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{template.title}</div>
        <div className="text-xs text-base-content/50 mt-0.5">
          {template.points} pts &middot; {template.frequency}x per {periodLabel}
        </div>
      </div>

      {/* Edit icon (placeholder) */}
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square shrink-0"
        onClick={(e) => e.stopPropagation()}
        disabled
      >
        <PencilSquareIcon className="size-4" />
      </button>
    </div>
  );
}
