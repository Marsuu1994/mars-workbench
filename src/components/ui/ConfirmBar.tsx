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
 * (and what happens) with Cancel and Confirm at the end. Below md, when the
 * message doesn't fit beside them, they drop under it, right-aligned.
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
}: ConfirmBarProps) => (
  <div
    className={cn(
      'flex w-full flex-wrap items-center gap-x-2.5 gap-y-2 rounded-card border border-error bg-error/10 px-3.5 py-3 text-sm font-semibold text-error md:flex-nowrap',
      className,
    )}
  >
    {icon}
    <div className="min-w-0 flex-[1_1_auto]">
      {prompt}
      {detail && (
        <div className="mt-0.5 text-xs font-normal text-base-content/60">
          {detail}
        </div>
      )}
    </div>
    <span className="ml-auto flex items-center gap-2">
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
  </div>
);
