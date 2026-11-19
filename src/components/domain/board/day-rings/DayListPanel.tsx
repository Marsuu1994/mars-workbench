'use client';

import {useEffect, useRef} from 'react';
import type {DayRing} from '@/utils/dayRingUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {useBoardPageContext} from '../BoardPageContext';
import {DayList} from './DayList';
import {DAY_LIST_ALIGN_RIGHT_FROM} from './constants';

interface DayListPanelProps {
  ring: DayRing;
  cards: BoardCard[];
}

/**
 * Desktop: a day's list in a panel floating under the row, below the day's
 * cell, over the board (DAY-2). It takes focus on its close button when it
 * opens (DAY-5); a press outside it closes it (BoardPage listens).
 */
export const DayListPanel = ({ring, cards}: DayListPanelProps) => {
  const {closeDay} = useBoardPageContext();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      data-day-list
      className={`absolute top-full z-40 mt-1.5 flex w-[320px] flex-col overflow-hidden rounded-box border border-base-content/10 bg-base-100 shadow-xl fx-boot-in ${
        ring.dayIndex >= DAY_LIST_ALIGN_RIGHT_FROM ? 'right-0' : 'left-0'
      }`}
    >
      <DayList
        ring={ring}
        cards={cards}
        onClose={() => closeDay({restoreFocus: true})}
        closeButtonRef={closeButtonRef}
        bodyClassName="max-h-[320px]"
      />
    </div>
  );
};
