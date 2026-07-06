import {fetchPriorityMatrixAction} from '@/actions/matrixActions';
import BoardHeader from '@/components/shared/BoardHeader';
import PriorityMatrixPage from '@/components/priorities/PriorityMatrixPage';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';

export default async function PrioritiesPage() {
  const matrix = await fetchPriorityMatrixAction();
  // With no active plan the header badge falls back to the current ISO week
  const periodKey =
    matrix.activePlan?.periodKey ?? getISOWeekKey(getTodayDate());

  return (
    <div className="flex flex-col h-full">
      {/* Same app header on both breakpoints, like the board page */}
      <BoardHeader periodKey={periodKey} />
      <PriorityMatrixPage tasks={matrix.tasks} activePlan={matrix.activePlan} />
    </div>
  );
}
