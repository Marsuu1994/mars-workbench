import {fetchPriorityMatrixAction} from '@/actions/matrixActions';
import {PrioritiesScreen} from '@/components/domain/priorities/PrioritiesScreen';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';

export default async function PrioritiesPage() {
  const matrix = await fetchPriorityMatrixAction();
  // With no active plan the header badge falls back to the current ISO week
  const periodKey =
    matrix.activePlan?.periodKey ?? getISOWeekKey(getTodayDate());

  return (
    <PrioritiesScreen
      periodKey={periodKey}
      tasks={matrix.tasks}
      activePlan={matrix.activePlan}
    />
  );
}
