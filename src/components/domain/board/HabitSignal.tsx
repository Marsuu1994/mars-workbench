'use client';

import {useTranslations} from 'next-intl';
import type {HabitWeek} from '@/utils/taskUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

interface HabitSignalProps {
  habitWeek: HabitWeek;
  /** This card's own slot, ringed; absent when it has none */
  currentSlot?: number;
}

const {fill, outline, current} = TASK_KIND_STYLE[TaskKind.HABIT];

/**
 * A habit card's signal: one dot per instance this week in order, filled
 * when that instance is done, with this card's own dot ringed — so each card
 * shows where it sits in the week. The dots carry no count on screen; a
 * screen reader reads them as how many are done out of the total.
 */
export const HabitSignal = ({habitWeek, currentSlot}: HabitSignalProps) => {
  const tCard = useTranslations('Board.Card');
  const {slots, done, target} = habitWeek;

  const renderDot = (isDone: boolean, slot: number) => {
    const isCurrent = slot === currentSlot;
    return (
      <span
        key={slot}
        className={`fx-pip size-2 border-[1.5px] ${isDone ? fill : outline} ${
          isCurrent ? `ring-2 ${current}` : ''
        }`}
      />
    );
  };

  return (
    <span
      role="img"
      aria-label={tCard('habitProgressLabel', {done, total: target})}
      className="inline-flex items-center gap-1.5"
    >
      {slots.map(renderDot)}
    </span>
  );
};
