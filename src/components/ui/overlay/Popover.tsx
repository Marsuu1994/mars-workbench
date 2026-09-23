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
 *
 * Positioning is a two-box trick so the panel escapes an ancestor's scroll
 * clipping (a quadrant's overflow-y-auto card list) without a portal: a
 * zero-width absolute anchor marks the spot under the parent's edge, and the
 * panel inside it is `position: fixed` with no offsets, so it lands at its
 * static position — exactly the anchor — while only the viewport (or a
 * [contain:layout] ancestor such as a Design Console frame) can clip it.
 * Staying in the tree keeps it inside the frame's InteractionShield.
 */
export const Popover = ({
  align = 'right',
  className,
  children,
}: PopoverProps) => (
  <div
    className={cn(
      'absolute top-full mt-1.5 w-0 z-50',
      align === 'right' ? 'right-0' : 'left-0',
    )}
  >
    <div
      className={cn(
        'fixed rounded-card border border-base-content/10 bg-base-100 p-3 shadow-xl',
        align === 'right' && '-translate-x-full',
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
  </div>
);
