import type {HabitWeek} from '@/utils/taskUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {HABIT_DOTS_MAX} from './taskCardConstants';

type HabitSignalVariant = 'card' | 'mini';

interface HabitSignalProps {
  habitWeek: HabitWeek;
  /** This card's own slot, ringed; absent when it has none */
  currentSlot?: number;
  /** Full card: dots + done / target · mini card: dots alone */
  variant: HabitSignalVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<
  HabitSignalVariant,
  {row: string; dot: string; ring: string; count: string}
> = {
  card: {
    row: 'gap-1.5',
    dot: 'size-2 border-[1.5px]',
    ring: 'ring-2',
    count: 'text-[11px]',
  },
  mini: {
    row: 'gap-0.5',
    dot: 'size-1.5 border-[1.2px]',
    ring: 'ring-[1.5px]',
    count: 'text-[9px]',
  },
};

const {fill, outline, current} = TASK_KIND_STYLE[TaskKind.HABIT];

/**
 * A habit card's signal: one dot per instance this week in order, filled
 * when that instance is done, with this card's own dot ringed — so each card
 * shows where it sits in the week. Past HABIT_DOTS_MAX the dots give way to
 * the done / target count alone.
 */
export const HabitSignal = ({
  habitWeek,
  currentSlot,
  variant,
}: HabitSignalProps) => {
  const {slots, done, target} = habitWeek;
  const {row, dot, ring, count} = VARIANT_STYLE[variant];
  const showDots = target <= HABIT_DOTS_MAX;
  const showCount = variant === 'card' || !showDots;

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
    <span className="inline-flex items-center gap-2">
      {showDots && (
        <span className={`inline-flex items-center ${row}`}>
          {slots.map(renderDot)}
        </span>
      )}
      {showCount && (
        <span
          className={`fx-num text-base-content/55 whitespace-nowrap ${count}`}
        >
          {done}/{target}
        </span>
      )}
    </span>
  );
};
