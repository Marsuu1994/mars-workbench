"use client";

import { CheckIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { TaskType } from "@/features/kanban/utils/enums";
import type { TaskTemplateItem } from "@/lib/db/taskTemplates";

interface TemplateItemConfig {
  type: TaskType;
  frequency: number;
}

interface TemplateItemProps {
  template: TaskTemplateItem;
  isSelected: boolean;
  config?: TemplateItemConfig;
  onToggle: () => void;
  onConfigChange: (config: TemplateItemConfig) => void;
  onEdit: () => void;
}

export default function TemplateItem({
  template,
  isSelected,
  config,
  onToggle,
  onConfigChange,
  onEdit,
}: TemplateItemProps) {
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
      className={`group flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-success/50 bg-success/10"
          : "border-base-content/10 bg-base-200"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors mt-0.5 ${
          isSelected
            ? "border-success bg-success"
            : "border-base-content/30 bg-transparent"
        }`}
      >
        {isSelected && (
          <CheckIcon className="size-3 stroke-[3] text-success-content" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{template.title}</span>
          <div className="flex items-center gap-1 shrink-0">
            <StarIconSolid className="size-3 text-warning" />
            <span className="text-xs text-base-content/60">{template.points}</span>
          </div>
        </div>

        {isSelected && config && (
          <div
            className="flex items-center gap-3 mt-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Type pills */}
            <div className="flex gap-1">
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
                  config.type === TaskType.DAILY
                    ? "bg-info text-info-content"
                    : "bg-base-content/10 text-base-content/50 hover:bg-base-content/15"
                }`}
                onClick={() => onConfigChange({ ...config, type: TaskType.DAILY })}
              >
                DAILY
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
                  config.type === TaskType.WEEKLY
                    ? "bg-secondary text-secondary-content"
                    : "bg-base-content/10 text-base-content/50 hover:bg-base-content/15"
                }`}
                onClick={() => onConfigChange({ ...config, type: TaskType.WEEKLY })}
              >
                WEEKLY
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-base-content/15" />

            {/* Frequency */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={10}
                value={config.frequency}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    frequency: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="input input-xs w-12 text-center"
              />
              <span className="text-xs text-base-content/50">
                / {config.type === TaskType.DAILY ? "day" : "week"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit icon */}
      <button
        type="button"
        title="Edit template (title, description, points)"
        className="btn btn-ghost btn-xs btn-square shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <PencilSquareIcon className="size-4" />
      </button>
    </div>
  );
}
