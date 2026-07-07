import type {ReactNode} from 'react';
import {cn} from './cn';

interface SectionLabelProps {
  /** Full-strength text color instead of the muted default */
  bright?: boolean;
  className?: string;
  children: ReactNode;
}

/** HUD micro-label (mono, uppercase, wide tracking) for section headers. */
export const SectionLabel = ({
  bright,
  className,
  children,
}: SectionLabelProps) => (
  <span className={cn('fx-label', bright && 'fx-label-bright', className)}>
    {children}
  </span>
);
