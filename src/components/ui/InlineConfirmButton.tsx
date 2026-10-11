'use client';

import {useState, type ReactNode} from 'react';
import {cn} from './cn';

type InlineConfirmButtonSize = 'sm' | 'md';
type InlineConfirmHintSide = 'start' | 'end';

interface InlineConfirmButtonProps {
  /** Rest-state label (e.g. "Archive") */
  label: ReactNode;
  /** Armed-state label (e.g. "Archive?") — the second click confirms */
  confirmLabel: ReactNode;
  /** What confirming does, shown beside the armed button */
  hint?: ReactNode;
  /** Which side of the button the hint sits on */
  hintSide?: InlineConfirmHintSide;
  size?: InlineConfirmButtonSize;
  onConfirm: () => void | Promise<void>;
  className?: string;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const SIZE_CLASS: Record<InlineConfirmButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
};

/**
 * Two-click destructive button that fits a footer or a row: at rest an
 * outlined error button; the first click turns it solid with its confirm
 * label (and an optional hint of what happens); the second click runs it.
 * There is no cancel — leaving (the surrounding Cancel, closing) is the
 * cancel, and a parent resets a stale armed state by remounting (key). For a
 * full-width confirm row with its own cancel, use ConfirmButton.
 */
export const InlineConfirmButton = ({
  label,
  confirmLabel,
  hint,
  hintSide = 'end',
  size = 'md',
  onConfirm,
  className,
}: InlineConfirmButtonProps) => {
  const [isArmed, setIsArmed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  if (!isArmed) {
    return (
      <button
        type="button"
        onClick={() => setIsArmed(true)}
        className={cn(
          'btn border-error/35 bg-transparent text-error hover:border-error hover:bg-transparent',
          SIZE_CLASS[size],
          className,
        )}
      >
        {label}
      </button>
    );
  }

  const renderHint = () =>
    hint && (
      <span className="max-w-40 text-[11.5px] leading-snug text-error">
        {hint}
      </span>
    );

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {hintSide === 'start' && renderHint()}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className={cn('btn btn-error', SIZE_CLASS[size])}
      >
        {confirmLabel}
      </button>
      {hintSide === 'end' && renderHint()}
    </span>
  );
};
