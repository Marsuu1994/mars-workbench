import type {HabitWeek} from '@/utils/taskUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {HABIT_DOTS_MAX} from './taskCardConstants';

type HabitSignalVariant = 'card' | 'mini';

interface HabitSignalProps {
  habitWeek: HabitWeek;
  /** Full card: dots + done / target · mini card: dots alone */
  variant: HabitSignalVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<
  HabitSignalVariant,
  {row: string; dot: string; count: string}
> = {
  card: {row: 'gap-1', dot: 'size-2 border-[1.5px]', count: 'text-[11px]'},
  mini: {row: 'gap-[3px]', dot: 'size-1.5 border-[1.2px]', count: 'text-[9px]'},
};

const {fill, outline} = TASK_KIND_STYLE[TaskKind.HABIT];

/**
 * A habit card's signal: one dot per instance this week, filled when done.
 * Past HABIT_DOTS_MAX the dots give way to the done / target count alone.
 */
export const HabitSignal = ({habitWeek, variant}: HabitSignalProps) => {
  const {done, target} = habitWeek;
  const {row, dot, count} = VARIANT_STYLE[variant];
  const showDots = target <= HABIT_DOTS_MAX;
  const showCount = variant === 'card' || !showDots;

  return (
    <span className="inline-flex items-center gap-2">
      {showDots && (
        <span className={`inline-flex items-center ${row}`}>
          {Array.from({length: target}, (_, index) => (
            <span
              key={index}
              className={`fx-pip ${dot} ${index < done ? fill : outline}`}
            />
          ))}
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
