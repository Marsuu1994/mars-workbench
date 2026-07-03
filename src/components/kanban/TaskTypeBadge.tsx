"use client";

import { useTranslations } from "next-intl";
import { TaskType } from "@/lib/kanban/enums";

interface TaskTypeBadgeProps {
  type: string;
}

const CLASS_CONFIG: Record<string, string> = {
  [TaskType.DAILY]: "bg-info/15 text-info",
  [TaskType.WEEKLY]: "bg-secondary/15 text-secondary",
  // Displayed as "Todo" in blue per the priority-matrix design (the type
  // stays AD_HOC internally — only the user-facing badge is renamed)
  [TaskType.AD_HOC]: "bg-primary/10 text-primary",
};

export default function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  const t = useTranslations("Enums.TaskType");
  const key: TaskType = type in CLASS_CONFIG ? (type as TaskType) : TaskType.DAILY;

  return (
    <span
      className={`text-[8px] md:text-[11px] font-semibold px-1.5 py-px md:px-2 md:py-0.5 rounded ${CLASS_CONFIG[key]}`}
    >
      {t(key)}
    </span>
  );
}
