"use client";

import { useTranslations } from "next-intl";
import { TaskType } from "@/utils/enums";

interface TaskTypeBadgeProps {
  type: string;
}

const CLASS_CONFIG: Record<string, string> = {
  [TaskType.DAILY]: "text-info",
  [TaskType.WEEKLY]: "text-secondary",
  [TaskType.AD_HOC]: "text-warning",
};

export default function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  const t = useTranslations("Enums.TaskType");
  const key: TaskType = type in CLASS_CONFIG ? (type as TaskType) : TaskType.DAILY;

  return (
    <span
      className={`fx-chip text-[8px] md:text-[10px] font-semibold px-1.5 py-px md:px-2 md:py-0.5 rounded ${CLASS_CONFIG[key]}`}
    >
      {t(key)}
    </span>
  );
}
