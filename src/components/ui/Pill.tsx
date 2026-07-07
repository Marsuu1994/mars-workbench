import type {ReactNode} from 'react';
import {cn} from './cn';

export type PillColor =
  'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

export type PillSize = 'xs' | 'sm' | 'md';

interface PillProps {
  color: PillColor;
  /** Base size; xs/sm are badge-glyph sizes, md is the capsule size */
  size?: PillSize;
  /** Optional size override from the md breakpoint up */
  mdSize?: PillSize;
  className?: string;
  children: ReactNode;
}

/* fx-chip derives border/fill/highlight from currentColor, so the color
   axis is purely the text token. */
const COLOR_CLASS: Record<PillColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

const SIZE_CLASS: Record<PillSize, string> = {
  xs: 'text-[8px] px-1.5 py-px',
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-3 py-1',
};

const MD_SIZE_CLASS: Record<PillSize, string> = {
  xs: 'md:text-[8px] md:px-1.5 md:py-px',
  sm: 'md:text-[10px] md:px-1.5 md:py-0.5',
  md: 'md:text-xs md:px-3 md:py-1',
};

/**
 * Console chip: the one tinted-pill primitive. Composes the fx-chip
 * recipe (mono face, currentColor border/fill) with a text token and a
 * size preset — never restyle a pill by hand, extend this instead.
 */
export const Pill = ({
  color,
  size = 'sm',
  mdSize,
  className,
  children,
}: PillProps) => (
  <span
    className={cn(
      'fx-chip inline-flex items-center gap-1 rounded font-semibold whitespace-nowrap',
      COLOR_CLASS[color],
      SIZE_CLASS[size],
      mdSize && MD_SIZE_CLASS[mdSize],
      className,
    )}
  >
    {children}
  </span>
);
