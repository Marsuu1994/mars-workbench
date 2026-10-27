import type {MatrixData} from '@/services/matrixService';

/**
 * What the Priorities page takes: the matrix as the server shapes it — the
 * one-offs the page keeps as state, and the plan tracking moves them onto —
 * and the week its header shows.
 */
export interface PrioritiesPageData extends MatrixData {
  periodKey: string;
}
