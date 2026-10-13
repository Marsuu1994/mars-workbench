'use client';

import type {ReactNode} from 'react';
import {cn} from './cn';

interface ConfirmBarProps {
  /** Leading glyph, sized by the caller */
  icon?: ReactNode;
  /** The question (e.g. "Sign out?") */
  prompt: ReactNode;
  /** A smaller line under the prompt: what confirming does */
  detail?: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  /** The confirmed action is running: both buttons wait */
  isPending?: boolean;
  className?: string;
}

/**
 * A destructive action's confirm row on the error channel: the question
 * (and what happens) with Cancel and Confirm at the end. With a detail line,
 * below md the icon and question share the first row, the detail sits under
 * the question and the buttons take their own row, right-aligned.
 * ConfirmButton's armed state, and the row a form footer turns into while
 * its destructive action awaits a yes.
 */
export const ConfirmBar = ({
  icon,
  prompt,
  detail,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  isPending,
  className,
}: ConfirmBarProps) => {
  const hasDetail = Boolean(detail);

  const renderButtons = () => (
    <span
      className={cn(
        'flex items-center gap-2 justify-self-end',
        // Below md the buttons drop under the detail; from md up they
        // centre on the prompt and detail
        hasDetail &&
          'col-span-2 mt-1.5 md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1 md:mt-0',
      )}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="cursor-pointer rounded-card border border-base-content/15 px-3 py-1 text-xs font-semibold text-base-content/70 transition-colors hover:border-base-content/40 disabled:opacity-40"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isPending}
        className="cursor-pointer rounded-card bg-error px-3 py-1 text-xs font-semibold text-error-content transition-colors hover:bg-error/85 disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </span>
  );

  return (
    <div
      className={cn(
        'grid w-full items-center gap-x-2.5 gap-y-0.5 rounded-card border border-error bg-error/10 px-3.5 py-3 text-sm font-semibold text-error',
        hasDetail
          ? 'grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto]'
          : 'grid-cols-[auto_minmax(0,1fr)_auto]',
        className,
      )}
    >
      <span className={cn('flex', hasDetail && 'md:row-span-2')}>{icon}</span>
      <span className="min-w-0">{prompt}</span>
      {hasDetail && (
        <span className="col-start-2 text-xs font-normal text-base-content/60">
          {detail}
        </span>
      )}
      {renderButtons()}
    </div>
  );
};
