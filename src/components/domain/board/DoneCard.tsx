'use client';

import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {useBoardPageContext} from './BoardPageContext';
import {TaskCardFace} from './TaskCardFace';

interface DoneCardProps {
  card: BoardCard;
}

/**
 * A card in Done (desktop): dimmed, its title struck through, with no
 * description and nothing to press or drag. A card finished on the page
 * glows once as it lands (fx-done-in), and never again.
 */
export const DoneCard = ({card}: DoneCardProps) => {
  const {freshDoneTaskId} = useBoardPageContext();
  const {kind, task} = card;
  const {edge} = TASK_KIND_STYLE[kind];

  return (
    <div
      data-done-card={task.id}
      className={`card fx-card w-full flex-shrink-0 border border-base-content/10 bg-base-100/70 opacity-50 shadow-[inset_0_0_18px_color-mix(in_oklab,var(--color-success)_12%,transparent)] ${edge} ${
        freshDoneTaskId === task.id ? 'fx-done-in' : ''
      }`}
    >
      <TaskCardFace card={card} />
    </div>
  );
};
