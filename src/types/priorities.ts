import type {MatrixData} from '@/services/matrixService';

/** What the Priorities page renders from: the matrix and the header's week. */
export interface PrioritiesPageProps extends MatrixData {
  /** The active plan's week, or today's when there is no plan */
  periodKey: string;
}
