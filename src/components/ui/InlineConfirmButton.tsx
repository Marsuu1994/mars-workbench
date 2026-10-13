'use client';

import {useState, type ReactNode} from 'react';
import {cn} from './cn';
import {FOOTER_DANGER_BUTTON} from './form/constants';

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
 * Two-click destructive button for a form footer (ModalFormFooter's
 * `leading`): at rest the footer's danger button; the first click turns it
 * solid with its confirm label; the second click runs it. Below md it fills
 * its row in both states. There is no cancel — leaving (the surrounding
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
        className={cn(FOOTER_DANGER_BUTTON, className)}
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
      className={cn('btn btn-error max-md:w-full', className)}
    >
      {confirmLabel}
    </button>
  );
};
