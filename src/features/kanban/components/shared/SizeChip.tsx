"use client";

import { useTranslations } from "next-intl";
import type { TaskSize } from "@/features/kanban/utils/enums";

interface SizeChipProps {
  size: TaskSize;
  points: number;
  className?: string;
  /** Compact variant (mobile matrix cards): size label only, no points */
  labelOnly?: boolean;
}

export const SizeChip = ({ size, points, className, labelOnly }: SizeChipProps) => {
  const t = useTranslations("Enums.TaskSize");

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success ${className ?? ""}`}
    >
      <span>{t(size)}</span>
      {!labelOnly && (
        <>
          <span className="opacity-40">&middot;</span>
          <span className="font-semibold opacity-70">{points}</span>
        </>
      )}
    </span>
  );
};
