import type {ReactNode} from 'react';
import {cn} from './cn';

interface StatBlockProps {
  /** The measured value — rendered in the telemetry (fx-num) face */
  value: ReactNode;
  /** The micro-label beneath (or above) the value */
  label: ReactNode;
  /** Color + size classes for the value (e.g. "text-lg text-success") */
  valueClassName?: string;
  /** Center the stack (empty-state recap) vs left-align (dashboard) */
  align?: 'start' | 'center';
  className?: string;
}

/** Big telemetry value over a HUD micro-label — the app's stat unit. */
export const StatBlock = ({
  value,
  label,
  valueClassName,
  align = 'start',
  className,
}: StatBlockProps) => (
  <div
    className={cn(
      'flex flex-col',
      align === 'center' ? 'items-center gap-0.5' : 'gap-px',
      className,
    )}
  >
    <div className={cn('fx-num font-bold', valueClassName)}>{value}</div>
    <div className="fx-label">{label}</div>
  </div>
);
