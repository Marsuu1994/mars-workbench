import Link from "next/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { getWeekDateRange } from "@/features/kanban/utils/dateUtils";

interface BoardHeaderProps {
  periodKey: string;
  planId: string;
}

export default function BoardHeader({ periodKey, planId }: BoardHeaderProps) {
  const dateRange = getWeekDateRange(periodKey);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">
          <span className="text-success">Kanban</span> Planner
        </h1>
        <span className="bg-success/15 text-success text-xs font-medium px-3 py-1 rounded-full">
          {dateRange}
        </span>
      </div>

      <Link href={`/kanban/plans/${planId}`} className="btn btn-ghost btn-sm text-sm gap-1 border border-base-content/15">
        <PencilSquareIcon className="w-4 h-4" />
        Edit Plan
      </Link>
    </div>
  );
}
