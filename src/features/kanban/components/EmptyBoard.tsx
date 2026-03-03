import Link from "next/link";
import { PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

export default function EmptyBoard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-10">
      <Squares2X2Icon className="size-20 text-base-content/15" />
      <h1 className="text-2xl font-semibold">No active plan</h1>
      <p className="text-base-content/60 text-center max-w-md">
        Create a weekly plan to start tracking your tasks. Set up templates,
        assign points, and visualize your progress.
      </p>
      <Link href="/kanban/plans/new" className="btn btn-primary mt-2">
        <PlusIcon className="size-5" />
        Create Your First Plan
      </Link>
    </div>
  );
}
