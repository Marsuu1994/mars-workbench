'use client';

import {useEffect, useId, useLayoutEffect, useRef} from 'react';
import type {DayRing} from '@/utils/dayRingUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {useBoardPageContext} from '../BoardPageContext';
import {DayList} from './DayList';
import {DAY_LIST_ROW_INSET} from './constants';

interface DayListPanelProps {
  ring: DayRing;
  cards: BoardCard[];
}

/**
 * Desktop: a day's list in a panel floating under the row of rings, over the
 * board (DAY-2). It sits centred under its day's cell, moved only as far as
 * it takes to stay inside the row, so the first and last days' lists don't
 * run off it. It takes focus on its close button when it opens (DAY-5); a
 * press outside it closes it (BoardPage listens). The row is its offset
 * parent.
 */
export const DayListPanel = ({ring, cards}: DayListPanelProps) => {
  const {closeDay} = useBoardPageContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const {date} = ring;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const row = panel?.offsetParent;
    const cell = row?.querySelector(`[data-day-cell="${date}"]`);
    if (!panel || !row || !cell) return;

    const place = () => {
      const rowBox = row.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      const centred =
        cellBox.left - rowBox.left + cellBox.width / 2 - panel.offsetWidth / 2;
      const furthest = row.clientWidth - panel.offsetWidth - DAY_LIST_ROW_INSET;
      panel.style.left = `${Math.max(DAY_LIST_ROW_INSET, Math.min(centred, furthest))}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(row);
    return () => observer.disconnect();
  }, [date]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      ref={panelRef}
      data-day-list
      role="dialog"
      aria-labelledby={titleId}
      className="absolute top-[calc(100%-4px)] z-40 flex w-[320px] flex-col overflow-hidden rounded-box border border-base-content/10 bg-base-100 shadow-xl fx-boot-in"
    >
      <DayList
        ring={ring}
        cards={cards}
        onClose={() => closeDay({restoreFocus: true})}
        closeButtonRef={closeButtonRef}
        bodyClassName="max-h-[320px]"
        titleId={titleId}
      />
    </div>
  );
};
