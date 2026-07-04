import { fetchPriorityMatrixAction } from "@/actions/matrixActions";
import BoardHeader from "@/components/shared/BoardHeader";
import PriorityMatrixPage from "@/components/priorities/PriorityMatrixPage";
import { getISOWeekKey, getTodayDate } from "@/utils/dateUtils";

export default async function PrioritiesPage() {
  const matrix = await fetchPriorityMatrixAction();
  // With no active plan the header badge falls back to the current ISO week
  const periodKey = matrix.activePlan?.periodKey ?? getISOWeekKey(getTodayDate());

  return (
    <div className="flex flex-col h-full">
      {/* Mobile renders its own top bar inside PriorityMatrixPage */}
      <div className="hidden md:block">
        <BoardHeader periodKey={periodKey} />
      </div>
      <PriorityMatrixPage
        tasks={matrix.tasks}
        activePlan={matrix.activePlan}
        periodKey={periodKey}
      />
    </div>
  );
}
