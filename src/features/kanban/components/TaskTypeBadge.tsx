import { TaskType } from "@/features/kanban/utils/enums";

interface TaskTypeBadgeProps {
  type: string;
}

const BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  [TaskType.DAILY]: { label: "DAILY", className: "bg-info/15 text-info" },
  [TaskType.WEEKLY]: { label: "WEEKLY", className: "bg-secondary/15 text-secondary" },
  [TaskType.AD_HOC]: { label: "Ad-hoc", className: "bg-warning/15 text-warning" },
};

export default function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  const config = BADGE_CONFIG[type] ?? BADGE_CONFIG[TaskType.DAILY];

  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${config.className}`}
    >
      {config.label}
    </span>
  );
}
