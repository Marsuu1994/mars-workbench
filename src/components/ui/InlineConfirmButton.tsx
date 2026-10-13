'use client';

import {useState, type ReactNode} from 'react';
import {cn} from './cn';

interface InlineConfirmButtonProps {
  /** Rest-state label (e.g. "Delete step") */
  label: ReactNode;
  /** Armed-state label (e.g. "Delete step?") — the second click confirms */
  confirmLabel: ReactNode;
  /** Awaited: the armed button waits while it runs */
  onConfirm: () => void | Promise<void>;
  className?: string;
}

/**
 * Two-click destructive button that fits a footer: at rest an outlined
 * error button; the first click turns it solid with its confirm label; the
 * second click runs it. There is no cancel — leaving (the surrounding
 * Cancel, closing) is the cancel. For a confirm that needs to say what
 * happens, use ConfirmBar.
 */
export const InlineConfirmButton = ({
  label,
  confirmLabel,
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
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={isPending}
      className={cn('btn btn-error', className)}
    >
      {confirmLabel}
    </button>
  );
};
