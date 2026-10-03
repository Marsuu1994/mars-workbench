'use client';

import type {ReactNode, Ref, SyntheticEvent} from 'react';
import {cn} from '@/components/ui/cn';

interface InteractionShieldProps {
  className?: string;
  /** Lets a scenario frame's PlayRunner reach the shield (scope + gate). */
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/** Attribute @hello-pangea/dnd stamps on every drag handle. */
const DND_HANDLE_SELECTOR = '[data-rfd-drag-handle-draggable-id]';

const block = (event: SyntheticEvent) => {
  // A play step is clicking inside this subtree: PlayRunner opens the gate
  // on its scope element for exactly that synchronous dispatch.
  if ((event.target as Element).closest('[data-playing]')) return;
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Swallows activation without deadening the UI: clicks, form submits and
 * drag starts are stopped in the capture phase (so wired handlers — server
 * actions, navigation, dnd drops — can never fire against fixture ids), but
 * hover states and scrolling keep working. Clicking *looks* possible and
 * simply does nothing, unlike `inert` which freezes the subtree.
 *
 * The one way through is a play step: PlayRunner sets `data-playing` on its
 * scope element (the shield itself in a scenario frame) around its own
 * synchronous `click()`, so a scripted click reaches the component while
 * human clicks stay blocked.
 */
export const InteractionShield = ({
  className,
  ref,
  children,
}: InteractionShieldProps) => (
  <div
    ref={ref}
    className={cn(className)}
    onClickCapture={block}
    onSubmitCapture={block}
    onPointerDownCapture={event => {
      // No blanket preventDefault here — it can break scrollbar dragging.
      // dnd sensors abort on defaultPrevented, so only drag handles get it.
      event.stopPropagation();
      if ((event.target as Element).closest(DND_HANDLE_SELECTOR)) {
        event.preventDefault();
      }
    }}
    onMouseDownCapture={event => event.stopPropagation()}
    onTouchStartCapture={event => event.stopPropagation()}
  >
    {children}
  </div>
);
