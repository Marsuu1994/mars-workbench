import type {ReactNode} from 'react';
import {cn} from './cn';

export type BannerTone = 'secondary' | 'success' | 'warning';

interface BannerProps {
  /** Wash and text colour */
  tone: BannerTone;
  /** Leading glyph, sized by the caller */
  icon: ReactNode;
  /** A hairline border in the tone — for banners on a page rather than
      inside a form */
  outlined?: boolean;
  /** Trailing control (a link or a button) */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const TONE_STYLE: Record<BannerTone, {wash: string; border: string}> = {
  secondary: {
    wash: 'bg-secondary/10 text-secondary',
    border: 'border border-secondary/30',
  },
  success: {
    wash: 'bg-success/10 text-success',
    border: 'border border-success/30',
  },
  warning: {
    wash: 'bg-warning/10 text-warning',
    border: 'border border-warning/30',
  },
};

/**
 * An inline message on a tinted wash: what a form is about to create, a
 * state worth knowing, or what's missing — with an optional action at the
 * end. The message takes the remaining width.
 */
export const Banner = ({
  tone,
  icon,
  outlined,
  action,
  className,
  children,
}: BannerProps) => {
  const {wash, border} = TONE_STYLE[tone];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm',
        wash,
        outlined && border,
        className,
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
};
