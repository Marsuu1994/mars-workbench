import type {BoardCard} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {HabitSignal} from './HabitSignal';
import {StepPath} from './StepPath';

interface TaskCardSignalProps {
  card: BoardCard;
  /** Full card · mini card: the marks' size */
  variant: 'card' | 'mini';
}

/**
 * A card's progress by its kind: a habit's week dots, a step's path, a
 * one-off's nothing — with the card's own mark ringed. Shared by every face:
 * the board's, the mobile mini card's and the backlog's.
 */
export const TaskCardSignal = ({card, variant}: TaskCardSignalProps) => {
  switch (card.kind) {
    case TaskKind.HABIT:
      return card.habitWeek ? (
        <HabitSignal
          habitWeek={card.habitWeek}
          currentSlot={card.currentSlot}
          variant={variant}
        />
      ) : null;
    case TaskKind.PROJECT:
      return card.step ? <StepPath step={card.step} variant={variant} /> : null;
    case TaskKind.ONE_OFF:
      return null;
    default: {
      const unhandled: never = card;
      throw new Error(`Unhandled card: ${JSON.stringify(unhandled)}`);
    }
  }
};
