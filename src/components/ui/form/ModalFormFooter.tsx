'use client';

import type {ReactNode} from 'react';
import {cn} from '../cn';
import {FormErrorAlert} from './FormErrorAlert';
import {SubmitButton} from './SubmitButton';

interface ModalFormFooterProps {
  /** Submit error shown above the buttons */
  error: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
  submitIcon: ReactNode;
  /** Off until the form can be sent (e.g. a required title is empty) */
  submitDisabled?: boolean;
  /** Left-aligned control before Cancel (e.g. a destructive confirm) */
  leading?: ReactNode;
}

/**
 * The modal form's footer: the submit error, then Cancel + submit on the
 * right, with an optional destructive control on the left (on its own row
 * on mobile). Cancel and submit share their row on mobile (1 : 2); from md
 * they size to their labels.
 */
export const ModalFormFooter = ({
  error,
  isSubmitting,
  onCancel,
  cancelLabel,
  submitLabel,
  submitIcon,
  submitDisabled,
  leading,
}: ModalFormFooterProps) => (
  <>
    <FormErrorAlert error={error} />
    <div className={cn('modal-action', leading ? 'flex-wrap' : undefined)}>
      {leading && (
        // Own row on mobile, so Cancel + submit stay paired 1 : 2 below it
        <div className="mr-auto flex items-center max-md:basis-full">
          {leading}
        </div>
      )}
      <button
        type="button"
        className="btn btn-ghost flex-1 md:flex-none"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelLabel}
      </button>
      <SubmitButton
        isSubmitting={isSubmitting}
        disabled={submitDisabled}
        icon={submitIcon}
        className="flex-[2] md:flex-none"
      >
        {submitLabel}
      </SubmitButton>
    </div>
  </>
);
