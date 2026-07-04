"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ClockIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import type { OverallStats } from "@/types/aiChat";
import { CREATE_PLAN_HREF } from "./emptyBoardConstants";

interface EmptyBoardProps {
  /** Present for returning users (a finished plan's recap); absent for new users. */
  stats?: OverallStats;
}

const renderStatChip = (value: string, label: string, accent?: boolean) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className={`fx-num text-2xl font-bold ${accent ? "text-warning" : "text-primary"}`}>
      {value}
    </div>
    <div className="fx-label">{label}</div>
  </div>
);

export default function EmptyBoard({ stats }: EmptyBoardProps) {
  const t = useTranslations("Board.Empty");

  const renderNewUser = () => (
    <>
      <Squares2X2Icon className="size-20 text-base-content/15" />
      <h1 className="text-2xl font-semibold">{t("newTitle")}</h1>
      <p className="text-base-content/60 text-center max-w-md">{t("newDesc")}</p>
      <Link href={CREATE_PLAN_HREF} className="btn btn-primary fx-glow mt-2">
        <PlusIcon className="size-5" />
        {t("newCta")}
      </Link>
    </>
  );

  const renderReturningUser = (recap: OverallStats) => (
    <>
      <ClockIcon className="size-20 text-base-content/15" />
      <h1 className="text-2xl font-semibold">{t("returningTitle")}</h1>
      <p className="text-base-content/60 text-center max-w-md">{t("returningDesc")}</p>
      <div className="flex justify-center gap-6">
        {renderStatChip(`${Math.round(recap.completionRate * 100)}%`, t("statCompleted"))}
        {renderStatChip(`${recap.completedCount}/${recap.totalCount}`, t("statTasksDone"))}
        {renderStatChip(`${recap.totalPoints}`, t("statPointsEarned"), true)}
      </div>
      <p className="text-base-content/60 text-center">{t("returningPrompt")}</p>
      <Link href={CREATE_PLAN_HREF} className="btn btn-primary fx-glow mt-2">
        <PlusIcon className="size-5" />
        {t("returningCta")}
      </Link>
    </>
  );

  return (
    // <main> is overflow-hidden on /kanban, so this screen scrolls itself;
    // the min-h-full inner wrapper keeps content centered yet reachable on
    // short viewports (no Droppables here, so an extra scroller is fine).
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-10">
        {stats ? renderReturningUser(stats) : renderNewUser()}
      </div>
    </div>
  );
}
