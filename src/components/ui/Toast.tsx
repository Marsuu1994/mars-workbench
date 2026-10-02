'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {cn} from './cn';
import {ProgressBar} from './ProgressBar';

export type ToastTone = 'success' | 'neutral';

interface ToastProps {
  /** Message content — icon + text composed by the caller */
  children: ReactNode;
  /** Optional action button (e.g. Undo); the countdown bar renders only with one */
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-dismiss window in ms; omit for a toast the caller dismisses itself */
  durationMs?: number;
  /** Fires once the window elapses (hover and `paused` hold the clock) */
  onDismiss?: () => void;
  /** Freeze the countdown — scenario pins, gallery specimens */
  paused?: boolean;
  tone?: ToastTone;
  /** Extra classes on the positioned wrapper (e.g. a breakpoint gate) */
  className?: string;
}

interface ToneStyle {
  box: string;
  fill: string;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const TONE_STYLE: Record<ToastTone, ToneStyle> = {
  success: {
    box: 'border-success/30 bg-success/15 text-success',
    fill: 'bg-success/70',
  },
  neutral: {
    box: 'border-base-content/15 bg-base-100/90 text-base-content',
    fill: 'bg-base-content/40',
  },
};

/** Countdown resolution — the bar redraws this often. */
const TICK_MS = 100;

/**
 * Bottom-anchored transient message: fixed at the bottom-center on desktop
 * and above the mobile dock, with an optional action button and a countdown
 * bar draining over `durationMs`. The clock pauses while hovered (or when
 * `paused`) so the action can be aimed at; the caller owns mount/unmount via
 * `onDismiss`. Inside a [contain:layout] box (scenario frames, the gallery)
 * `fixed` anchors to that box instead of the viewport.
 */
export const Toast = ({
  children,
  actionLabel,
  onAction,
  durationMs,
  onDismiss,
  paused = false,
  tone = 'neutral',
  className,
}: ToastProps) => {
  const [remainingMs, setRemainingMs] = useState(durationMs ?? 0);
  const [isHovered, setIsHovered] = useState(false);
  const onDismissRef = useRef(onDismiss);
  // Wall-clock accounting: elapsed time banked across pauses, so a throttled
  // timer (background tab) still measures the true window instead of ticks.
  const elapsedBeforePauseRef = useRef(0);
  const {box, fill} = TONE_STYLE[tone];
  const isCounting = durationMs !== undefined && !paused && !isHovered;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!isCounting || durationMs === undefined) return;
    const resumedAt = performance.now();
    const elapsed = () =>
      elapsedBeforePauseRef.current + (performance.now() - resumedAt);
    const timer = setInterval(
      () => setRemainingMs(Math.max(0, durationMs - elapsed())),
      TICK_MS,
    );
    return () => {
      clearInterval(timer);
      elapsedBeforePauseRef.current = elapsed();
    };
  }, [isCounting, durationMs]);

  useEffect(() => {
    if (durationMs === undefined || remainingMs > 0) return;
    onDismissRef.current?.();
  }, [durationMs, remainingMs]);

  const renderAction = () =>
    actionLabel && (
      <button
        type="button"
        onClick={onAction}
        className="ml-1 rounded-md border border-base-content/15 bg-base-content/10 px-2.5 py-1 text-xs font-bold text-base-content transition-colors hover:border-base-content/40 cursor-pointer"
      >
        {actionLabel}
      </button>
    );

  const renderCountdown = () =>
    actionLabel &&
    durationMs !== undefined && (
      <ProgressBar
        value={(remainingMs / durationMs) * 100}
        fillClassName={cn(
          'rounded-none transition-[width] duration-100 ease-linear',
          fill,
        )}
        className="absolute inset-x-0 bottom-0 h-0.5 rounded-none bg-transparent"
      />
    );

  return (
    <div
      className={cn(
        'fixed left-1/2 z-50 -translate-x-1/2 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:bottom-4',
        className,
      )}
    >
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fx-boot-in relative flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm',
          box,
        )}
      >
        {children}
        {renderAction()}
        {renderCountdown()}
      </div>
    </div>
  );
};
