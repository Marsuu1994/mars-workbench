'use client';

import {useCallback, useRef, type UIEvent} from 'react';

/** What a scroll container wires up to hold its scroll height. */
interface ScrollHold {
  /** The scrolling element */
  scrollRef: (element: HTMLElement | null) => void;
  /** Its content box — the element whose min-height holds the space */
  contentRef: (element: HTMLElement | null) => void;
  /** The scrolling element's onScroll */
  onScroll: (event: UIEvent<HTMLElement>) => void;
  /** Call before content shrinks: the scroll height stays where it is */
  holdScrollHeight: () => void;
}

/**
 * Keeps a scroll container's scrollbar where the user left it while its
 * content changes height. Content that grows extends below and is reached by
 * scrolling; content that shrinks would otherwise pull the scroll height
 * under the viewport, and the browser would clamp the scroll position — the
 * scrollbar jumps. So `holdScrollHeight`, called before the change, gives the
 * content box a min-height that keeps the viewport's bottom edge on content
 * (nothing at all while the view sits above the change), and only the user's
 * own scrolling gives that space back: each scroll shrinks the hold to what
 * the view still needs. Pair with `overflow-anchor: none` on the
 * scroller, so scroll anchoring doesn't move the scrollbar either.
 */
export const useScrollHold = (): ScrollHold => {
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const contentElementRef = useRef<HTMLElement | null>(null);
  // The held min-height in px; null while nothing is held
  const heldHeightRef = useRef<number | null>(null);

  const scrollRef = useCallback((element: HTMLElement | null) => {
    scrollElementRef.current = element;
  }, []);
  const contentRef = useCallback((element: HTMLElement | null) => {
    contentElementRef.current = element;
  }, []);

  const setHeldHeight = (height: number | null) => {
    heldHeightRef.current = height;
    const content = contentElementRef.current;
    if (content) content.style.minHeight = height === null ? '' : `${height}px`;
  };

  // The content box's height that keeps the viewport's bottom edge on
  // content: the scroll extent in view, less what isn't the box (padding)
  const getNeededHeight = (scroller: HTMLElement, content: HTMLElement) =>
    scroller.scrollTop +
    scroller.clientHeight -
    (scroller.scrollHeight - content.offsetHeight);

  const holdScrollHeight = () => {
    const scroller = scrollElementRef.current;
    const content = contentElementRef.current;
    if (!scroller || !content) return;
    setHeldHeight(
      Math.max(getNeededHeight(scroller, content), heldHeightRef.current ?? 0),
    );
  };

  const onScroll = () => {
    const scroller = scrollElementRef.current;
    const content = contentElementRef.current;
    const heldHeight = heldHeightRef.current;
    if (!scroller || !content || heldHeight === null) return;
    const neededHeight = getNeededHeight(scroller, content);
    if (neededHeight >= heldHeight) return;
    // Shrinks with the view; once below the content's own height it holds
    // nothing (min-height), so there is no need to measure that height
    setHeldHeight(neededHeight > 0 ? neededHeight : null);
  };

  return {scrollRef, contentRef, onScroll, holdScrollHeight};
};
