import {fetchPriorityMatrixAction} from '@/actions/matrixActions';
import {PrioritiesPage} from '@/components/domain/priorities/PrioritiesPage';
import {getTodayDate} from '@/utils/dateUtils';
import {toPrioritiesPageProps} from '@/utils/oneOffUtils';

export default async function KanbanPrioritiesPage() {
  const matrix = await fetchPriorityMatrixAction();

  return <PrioritiesPage {...toPrioritiesPageProps(matrix, getTodayDate())} />;
}
