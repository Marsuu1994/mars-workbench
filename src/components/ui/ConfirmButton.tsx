'use client';

import {useState, type ReactNode} from 'react';
import {cn} from './cn';
import {ConfirmBar} from './ConfirmBar';

interface ConfirmButtonProps {
  /** Leading icon for the rest-state row */
  icon?: ReactNode;
  /** Rest-state row text (e.g. "Sign out") */
  label: ReactNode;
  /** Triggered-state prompt text (e.g. "Sign out?") */
  confirmPrompt: ReactNode;
  /** Triggered-state confirm button text */
  confirmLabel: ReactNode;
  /** Triggered-state cancel button text */
  cancelLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  className?: string;
}

/**
 * Two-step destructive action row: a plain button at rest; the first click
 * turns it into a ConfirmBar (cancel / confirm), the second executes. Parents
 * reset a stale triggered state by remounting (key). Styled on the error
 * channel; theme-agnostic and reusable for any confirm-before-doing action.
 */
export const ConfirmButton = ({
  icon,
  label,
  confirmPrompt,
  confirmLabel,
  cancelLabel,
  onConfirm,
  className,
}: ConfirmButtonProps) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  if (!isTriggered) {
    return (
      <button
        type="button"
        onClick={() => setIsTriggered(true)}
        className={cn(
          'flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-card border border-error/25 bg-error/5 px-3.5 py-3 text-sm font-semibold text-error transition-colors hover:border-error hover:bg-error/10',
          className,
        )}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <ConfirmBar
      icon={icon}
      prompt={confirmPrompt}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      onCancel={() => setIsTriggered(false)}
      onConfirm={handleConfirm}
      isPending={isPending}
      className={className}
    />
  );
};
