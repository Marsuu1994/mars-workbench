'use client';

import {useTranslations} from 'next-intl';
import type {DayRing} from '@/utils/dayRingUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {useBoardPageContext} from '../BoardPageContext';
import {DayList} from './DayList';

interface DayListSheetProps {
  /** The open day's ring; null while no list is open */
  ring: DayRing | null;
  cards: BoardCard[];
}

/**
 * Mobile: a day's list in a sheet from the bottom, at most 70% of the
 * screen's height, with the board dimmed behind it (DAY-2). The dialog moves
 * focus to the close button on open and back to the day's cell on close.
 */
export const DayListSheet = ({ring, cards}: DayListSheetProps) => {
  const t = useTranslations('Board.DayList');
  const {closeDay} = useBoardPageContext();
  const close = () => closeDay({restoreFocus: false});

  return (
    <OverlayShell
      variant="sheet"
      isOpen={ring !== null}
      onClose={close}
      closeLabel={t('closeLabel')}
      boxClassName="flex max-h-[70vh] flex-col p-0"
    >
      {ring && <DayList ring={ring} cards={cards} onClose={close} />}
    </OverlayShell>
  );
};
