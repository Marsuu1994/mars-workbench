'use client';

import type {CSSProperties, ReactNode} from 'react';
import {cn} from './cn';

export type ToastTone = 'success' | 'neutral';

interface ToastProps {
  /** Message content — icon + text composed by the caller */
  children: ReactNode;
  /** Optional action button (e.g. Undo); the countdown bar shows only with one */
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-dismiss window in ms; omit for a toast the caller dismisses itself */
  durationMs?: number;
  /** Fires once the window elapses */
  onDismiss?: () => void;
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

/**
 * Bottom-anchored transient message: fixed at the bottom-center on desktop
 * and above the mobile dock, with an optional action button. With
 * `durationMs` it runs an `fx-countdown` clock — a CSS animation that holds
 * while the toast is hovered and wherever time is frozen (scenario frames,
 * gallery specimens) — and calls `onDismiss` when the clock ends. The clock
 * shows as a draining bar only when there is an action to aim at; without
 * one it still runs, invisibly. Inside a [contain:layout] box `fixed`
 * anchors to that box instead of the viewport.
 */
export const Toast = ({
  children,
  actionLabel,
  onAction,
  durationMs,
  onDismiss,
  tone = 'neutral',
  className,
}: ToastProps) => {
  const {box, fill} = TONE_STYLE[tone];

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

  // The clock's animationend is the dismissal. The duration is a dynamic
  // value, so it travels as a custom property (the same exception
  // ProgressBar makes for its width); `invisible` keeps the animation
  // running when no bar should show.
  const renderClock = () =>
    durationMs !== undefined && (
      <span
        aria-hidden
        onAnimationEnd={onDismiss}
        style={{'--fx-countdown-ms': `${durationMs}ms`} as CSSProperties}
        className={cn(
          'fx-countdown absolute inset-x-0 bottom-0 h-0.5',
          fill,
          !actionLabel && 'invisible',
        )}
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
        className={cn(
          'fx-boot-in relative flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm',
          box,
        )}
      >
        {children}
        {renderAction()}
        {renderClock()}
      </div>
    </div>
  );
};
