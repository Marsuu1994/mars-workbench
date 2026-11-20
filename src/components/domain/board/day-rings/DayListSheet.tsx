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
 * screen's height as it shows now, with the board dimmed behind it (DAY-2).
 * Focus goes to the sheet itself on open, as it does in every sheet
 * (useDialogSync), and the dialog gives it back to the day's cell on close
 * (DAY-5).
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
      boxClassName="flex max-h-[70dvh] flex-col p-0"
    >
      {ring && <DayList ring={ring} cards={cards} onClose={close} />}
    </OverlayShell>
  );
};
