import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <Link
            href="/kanban"
            className="p-1.5 rounded-md text-base-content hover:bg-base-content/8 transition-colors"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">
            <span className="text-success">Kanban</span> Planner
          </h1>
          <span className="bg-error/15 text-error text-xs font-medium px-3 py-1 rounded-full">
            Planning Mode
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
