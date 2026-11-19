'use client';

import {useTranslations} from 'next-intl';
import type {HabitWeek} from '@/utils/taskUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

type HabitSignalVariant = 'card' | 'mini';

interface HabitSignalProps {
  habitWeek: HabitWeek;
  /** This card's own slot, ringed; absent when it has none */
  currentSlot?: number;
  /** Full card · mini card: the dots' size */
  variant: HabitSignalVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<
  HabitSignalVariant,
  {row: string; dot: string; ring: string}
> = {
  card: {row: 'gap-1.5', dot: 'size-2 border-[1.5px]', ring: 'ring-2'},
  mini: {row: 'gap-0.5', dot: 'size-1.5 border-[1.2px]', ring: 'ring-[1.5px]'},
};

const {fill, outline, current} = TASK_KIND_STYLE[TaskKind.HABIT];

/**
 * A habit card's signal: one dot per instance this week in order, filled
 * when that instance is done, with this card's own dot ringed — so each card
 * shows where it sits in the week. The dots carry no count on screen; a
 * screen reader reads them as how many are done out of the total.
 */
export const HabitSignal = ({
  habitWeek,
  currentSlot,
  variant,
}: HabitSignalProps) => {
  const tCard = useTranslations('Board.Card');
  const {slots, done, target} = habitWeek;
  const {row, dot, ring} = VARIANT_STYLE[variant];

  const renderDot = (isDone: boolean, slot: number) => {
    const isCurrent = slot === currentSlot;
    return (
      <span
        key={slot}
        className={`fx-pip ${dot} ${isDone ? fill : outline} ${
          isCurrent ? `${ring} ${current}` : ''
        }`}
      />
    );
  };

  return (
    <span
      role="img"
      aria-label={tCard('habitProgressLabel', {done, total: target})}
      className={`inline-flex items-center ${row}`}
    >
      {slots.map(renderDot)}
    </span>
  );
};
