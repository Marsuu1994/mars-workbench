import {cn} from './cn';

interface ProgressBarProps {
  /** Completion percentage, 0–100 */
  value: number;
  /** Fill color/gradient classes (e.g. "bg-success" or a gradient) */
  fillClassName?: string;
  /** Track height + any track overrides (defaults to h-1.5) */
  className?: string;
}

/** Linear progress track with an animated fill. */
export const ProgressBar = ({
  value,
  fillClassName = 'bg-success',
  className,
}: ProgressBarProps) => (
  <div
    className={cn('bg-base-300 rounded-full overflow-hidden h-1.5', className)}
  >
    <div
      className={cn(
        'h-full rounded-full transition-all duration-500',
        fillClassName,
      )}
      style={{width: `${value}%`}}
    />
  </div>
);
