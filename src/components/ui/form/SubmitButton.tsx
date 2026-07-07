'use client';

import type {ReactNode} from 'react';
import {cn} from '../cn';

interface SubmitButtonProps {
  isSubmitting: boolean;
  /** Leading icon shown when idle (the spinner replaces it while submitting) */
  icon?: ReactNode;
  disabled?: boolean;
  /** Defaults to a form submit; pass button + onClick for modal confirms */
  type?: 'submit' | 'button';
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

/** Primary action button with the spinner-swap submitting state. */
export const SubmitButton = ({
  isSubmitting,
  icon,
  disabled,
  type = 'submit',
  onClick,
  className,
  children,
}: SubmitButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    className={cn('btn btn-primary', className)}
    disabled={disabled || isSubmitting}
  >
    {isSubmitting ? (
      <span className="loading loading-spinner loading-sm" />
    ) : (
      icon
    )}
    {children}
  </button>
);
