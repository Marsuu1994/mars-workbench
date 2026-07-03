import { sizeToPoints } from "@/lib/kanban/enums";
import type { DraftTemplate } from "@/features/plan/types/aiChat";
import { SizeChip } from "@/components/kanban/SizeChip";
import TaskTypeBadge from "@/components/kanban/TaskTypeBadge";

interface DraftPlanCardsProps {
  templates: DraftTemplate[];
}

/** The proposed task templates inside an assistant draft bubble. */
export const DraftPlanCards = ({ templates }: DraftPlanCardsProps) => (
  <div className="mt-3 flex flex-col gap-1.5">
    {templates.map((template, index) => (
      <div
        key={`${template.templateId ?? "new"}-${index}`}
        className="rounded-lg border border-base-content/10 bg-base-100 px-3 py-2.5"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold">{template.title}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <TaskTypeBadge type={template.type} />
            {template.frequency > 1 && (
              <span className="text-[10px] font-semibold text-base-content/50">
                &times;{template.frequency}
              </span>
            )}
            <SizeChip size={template.size} points={sizeToPoints(template.size)} />
          </div>
        </div>
        <p className="text-xs leading-snug text-base-content/60">{template.description}</p>
      </div>
    ))}
  </div>
);
