import {formatShortDate} from '@/utils/dateUtils';
import {cn} from '@/components/ui/cn';

interface RolloverTagProps {
  /** The task's original forDate */
  date: Date;
  className?: string;
}

/** `↩ date` marker for a task rolled over from an earlier day. */
export const RolloverTag = ({date, className}: RolloverTagProps) => (
  <span
    className={cn(
      'fx-num flex items-center gap-0.5 whitespace-nowrap text-xs text-warning font-medium',
      className,
    )}
  >
    ↩ {formatShortDate(date)}
  </span>
);
