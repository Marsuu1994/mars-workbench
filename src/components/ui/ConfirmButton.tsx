'use client';

import {useState, type ReactNode} from 'react';
import {cn} from './cn';

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
  /** Design gallery/scenario override — defaults to internal triggered state. */
  triggered?: boolean;
  className?: string;
}

/**
 * Two-step destructive action row: a plain button at rest; the first click
 * triggers an inline confirm (cancel / confirm), the second executes. Parents
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
  triggered: triggeredProp,
  className,
}: ConfirmButtonProps) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const triggered = triggeredProp ?? isTriggered;

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  const rowBase =
    'flex w-full items-center gap-2.5 rounded-card border px-3.5 py-3 text-sm font-semibold text-error transition-colors';

  if (!triggered) {
    return (
      <button
        type="button"
        onClick={() => setIsTriggered(true)}
        className={cn(
          rowBase,
          'cursor-pointer justify-center bg-error/5 border-error/25 hover:bg-error/10 hover:border-error',
          className,
        )}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div className={cn(rowBase, 'bg-error/10 border-error', className)}>
      {icon}
      {confirmPrompt}
      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsTriggered(false)}
          disabled={isPending}
          className="cursor-pointer rounded-card border border-base-content/15 px-3 py-1 text-xs font-semibold text-base-content/70 transition-colors hover:border-base-content/40 disabled:opacity-40"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="cursor-pointer rounded-card bg-error px-3 py-1 text-xs font-semibold text-error-content transition-colors hover:bg-error/85 disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </span>
    </div>
  );
};
