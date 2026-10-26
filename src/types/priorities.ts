import type {MatrixData} from '@/services/matrixService';

/**
 * What the Priorities page renders from, shaped by the route: the matrix's
 * tasks and active plan, plus the week its header shows.
 */
export interface PrioritiesPageData extends MatrixData {
  periodKey: string;
}
