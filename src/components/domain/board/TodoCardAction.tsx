'use client';

import type {MouseEvent} from 'react';
import {useTranslations} from 'next-intl';
import {CheckIcon} from '@heroicons/react/24/outline';
import {useBoardPageContext} from './BoardPageContext';

/** ✓ Complete takes presses a little past its 22 px, so a thumb finds it */
const PRESS_AREA_CLASS =
  "after:absolute after:-inset-x-2 after:-inset-y-[11px] after:content-['']";

interface TodoCardActionProps {
  taskId: string;
  title: string;
  isSelected: boolean;
}

/**
 * A Todo card's corner: a round mark, which grows into ✓ Complete once the
 * card is selected (fx-arm). One button in both states, so the mark is the
 * same element and its growth can play both ways; until the card is
 * selected it is hidden from assistive tech and a press on it reaches the
 * card, which selects it.
 */
export const TodoCardAction = ({
  taskId,
  title,
  isSelected,
}: TodoCardActionProps) => {
  const t = useTranslations('Board.Card');
  const {completeCard} = useBoardPageContext();

  const handleClick = (event: MouseEvent) => {
    if (!isSelected) return;
    event.stopPropagation();
    completeCard(taskId);
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden={!isSelected}
      aria-label={isSelected ? t('completeLabel', {title}) : undefined}
      onClick={handleClick}
      className={`fx-arm relative inline-flex items-center gap-1 ${
        isSelected
          ? `cursor-pointer ${PRESS_AREA_CLASS}`
          : 'pointer-events-none'
      }`}
    >
      {isSelected && (
        <span className="fx-arm-word mr-1 fx-num text-xs font-semibold tracking-[0.04em] text-success">
          {t('completeWord')}
        </span>
      )}
      <span
        className={`fx-arm-mark grid size-[22px] flex-shrink-0 place-items-center rounded-full border-[1.5px] ${
          isSelected
            ? 'scale-[1.45] border-success bg-success text-success-content shadow-[0_0_10px] shadow-success/40'
            : 'border-base-content/30 text-transparent'
        }`}
      >
        <CheckIcon className="size-3 stroke-3" />
      </span>
    </button>
  );
};
