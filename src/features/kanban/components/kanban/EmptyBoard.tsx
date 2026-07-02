import Link from "next/link";
import {
  ClockIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import type { OverallStats } from "../../types/aiChat";
import {
  CREATE_PLAN_HREF,
  NEW_USER_CTA,
  NEW_USER_DESC,
  NEW_USER_TITLE,
  RETURNING_CTA,
  RETURNING_DESC,
  RETURNING_PROMPT,
  RETURNING_TITLE,
  STAT_LABEL_COMPLETED,
  STAT_LABEL_POINTS_EARNED,
  STAT_LABEL_TASKS_DONE,
} from "./emptyBoardConstants";

interface EmptyBoardProps {
  /** Present for returning users (a finished plan's recap); absent for new users. */
  stats?: OverallStats;
}

const renderStatChip = (value: string, label: string, accent?: boolean) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className={`text-2xl font-bold ${accent ? "text-warning" : "text-primary"}`}>
      {value}
    </div>
    <div className="text-xs text-base-content/50">{label}</div>
  </div>
);

const renderNewUser = () => (
  <>
    <Squares2X2Icon className="size-20 text-base-content/15" />
    <h1 className="text-2xl font-semibold">{NEW_USER_TITLE}</h1>
    <p className="text-base-content/60 text-center max-w-md">{NEW_USER_DESC}</p>
    <Link href={CREATE_PLAN_HREF} className="btn btn-primary mt-2">
      <PlusIcon className="size-5" />
      {NEW_USER_CTA}
    </Link>
  </>
);

const renderReturningUser = (stats: OverallStats) => (
  <>
    <ClockIcon className="size-20 text-base-content/15" />
    <h1 className="text-2xl font-semibold">{RETURNING_TITLE}</h1>
    <p className="text-base-content/60 text-center max-w-md">{RETURNING_DESC}</p>
    <div className="flex justify-center gap-6">
      {renderStatChip(`${Math.round(stats.completionRate * 100)}%`, STAT_LABEL_COMPLETED)}
      {renderStatChip(`${stats.completedCount}/${stats.totalCount}`, STAT_LABEL_TASKS_DONE)}
      {renderStatChip(`${stats.totalPoints}`, STAT_LABEL_POINTS_EARNED, true)}
    </div>
    <p className="text-base-content/60 text-center">{RETURNING_PROMPT}</p>
    <Link href={CREATE_PLAN_HREF} className="btn btn-primary mt-2">
      <PlusIcon className="size-5" />
      {RETURNING_CTA}
    </Link>
  </>
);

export default function EmptyBoard({ stats }: EmptyBoardProps) {
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
