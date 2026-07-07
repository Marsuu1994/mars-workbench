'use client';

import type {ReactNode} from 'react';
import {cn} from '../cn';

interface PopoverProps {
  /** Which edge of the (position:relative) anchor to hug */
  align?: 'right' | 'left';
  className?: string;
  children: ReactNode;
}

/**
 * Anchored popover panel: renders below a `relative` parent with an arrow
 * notch, and swallows clicks so the anchor's handlers don't fire. The
 * click-away layer stays page-level (outside any Draggable) per the
 * matrix pattern — this component only owns the panel chrome.
 */
export const Popover = ({
  align = 'right',
  className,
  children,
}: PopoverProps) => (
  <div
    className={cn(
      'absolute top-full mt-1.5 z-50 rounded-card border border-base-content/10 bg-base-100 p-3 shadow-xl',
      align === 'right' ? 'right-0' : 'left-0',
      className,
    )}
    onClick={e => e.stopPropagation()}
  >
    <span
      className={cn(
        'absolute -top-[6px] size-2.5 rotate-45 bg-base-100 border-l border-t border-base-content/10',
        align === 'right' ? 'right-5' : 'left-5',
      )}
    />
    {children}
  </div>
);
