"use client";

import { useTranslations } from "next-intl";
import { getWeekDateRange } from "@/features/kanban/utils/dateUtils";

interface BoardHeaderProps {
  periodKey: string;
}

export default function BoardHeader({ periodKey }: BoardHeaderProps) {
  const t = useTranslations("Board.Header");
  const dateRange = getWeekDateRange(periodKey);

  return (
    <div className="flex items-center px-4 py-2 md:py-3 border-b border-base-content/10">
      <div className="flex items-center justify-between flex-1 md:flex-initial md:justify-start gap-3">
        <h1 className="text-lg md:text-xl font-bold">
          <span className="text-primary md:text-success">{t("titlePrefix")}</span>{t("titleSuffix")}
        </h1>
        <span className="bg-primary/15 text-primary md:bg-success/15 md:text-success text-xs font-medium px-3 py-1 rounded-full font-semibold">
          {dateRange}
        </span>
      </div>
    </div>
  );
}
