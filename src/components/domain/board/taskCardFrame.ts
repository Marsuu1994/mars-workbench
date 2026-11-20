import type {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

/**
 * The classes every board card's frame shares, in Todo, Done and the
 * backlog: the card surface, its border and its kind's left edge. Each card
 * adds what is its own: its fill, its border's colour and what it does.
 */
export const taskCardFrameClass = (kind: TaskKind): string =>
  `card fx-card border ${TASK_KIND_STYLE[kind].edge}`;
