'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  countOtherDayCells,
  DayState,
  getMobileDayRange,
  toDayListCards,
  type DayRing,
} from '@/utils/dayRingUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {useBoardPageContext} from '../BoardPageContext';
import {DayCell} from './DayCell';
import {DayListPanel} from './DayListPanel';
import {DayListSheet} from './DayListSheet';

interface DayRingRowProps {
  /** The week's rings, Monday to Sunday (toDayRings) */
  rings: DayRing[];
  /** Every done card, for the open day's list */
  doneCards: BoardCard[];
}

/** Other days a mobile row shows before it has been measured (390 px) */
const MOBILE_OTHER_DAYS_BEFORE_MEASURE = 3;

/**
 * The top of the board: a row of rings, one for each day of the plan's week
 * (RING-1). Desktop shows all seven days; mobile shows today and as many
 * days before it as fit its width, measured as it resizes. The open day's
 * list floats under the row on desktop and rises in a sheet on mobile.
 */
export const DayRingRow = ({rings, doneCards}: DayRingRowProps) => {
  const t = useTranslations('Board.Rings');
  const {isMobile} = useBreakpoint();
  const {openDayDate} = useBoardPageContext();
  const rowRef = useRef<HTMLDivElement>(null);
  const [otherDayCount, setOtherDayCount] = useState(
    MOBILE_OTHER_DAYS_BEFORE_MEASURE,
  );

  useEffect(() => {
    const row = rowRef.current;
    if (!isMobile || !row) return;
    const observer = new ResizeObserver(([entry]) => {
      setOtherDayCount(countOtherDayCells(entry.contentRect.width));
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [isMobile]);

  const todayIndex = rings.findIndex(({state}) => state === DayState.TODAY);
  // The days a phone's row shows. The server renders the desktop row, so
  // until the page knows its width the other days are in the markup, and CSS
  // keeps them off a phone's first paint (DayCell's isOffPhoneRow).
  const phoneRange = getMobileDayRange(
    Math.max(todayIndex, 0),
    isMobile ? otherDayCount : MOBILE_OTHER_DAYS_BEFORE_MEASURE,
  );
  const {first, last} = isMobile
    ? phoneRange
    : {first: 0, last: rings.length - 1};
  const shownRings = rings.slice(first, last + 1);
  const openRing = rings.find(({date}) => date === openDayDate) ?? null;
  const openCards = openRing ? toDayListCards(doneCards, openRing.date) : [];

  return (
    <>
      <div
        ref={rowRef}
        role="group"
        aria-label={t('rowLabel')}
        className="relative flex flex-shrink-0 items-end gap-1 border-b border-base-content/10 bg-base-200/50 px-5 py-2 md:gap-1.5 md:px-4 md:py-2.5"
      >
        {shownRings.map(ring => (
          <DayCell
            key={ring.date}
            ring={ring}
            isOffPhoneRow={
              ring.dayIndex < phoneRange.first ||
              ring.dayIndex > phoneRange.last
            }
          />
        ))}
        {!isMobile && openRing && (
          <DayListPanel key={openRing.date} ring={openRing} cards={openCards} />
        )}
      </div>
      {isMobile && <DayListSheet ring={openRing} cards={openCards} />}
    </>
  );
};
