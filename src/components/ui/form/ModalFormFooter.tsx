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
  /** A destructive control (styled with FOOTER_DANGER_BUTTON): left of
      Cancel from md, its own full-width row under them below md */
  leading?: ReactNode;
}

/**
 * The modal form's footer: the submit error, then Cancel + submit on the
 * right, with an optional destructive control on the left. Below md, Cancel
 * (outlined, so the pair reads as one row) and submit share their row 1 : 2,
 * and the destructive control sits under them past a hairline, away from
 * the primary action. From md, everything sizes to its label on one row.
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
        <div className="flex items-center max-md:order-last max-md:basis-full max-md:border-t max-md:border-base-content/10 max-md:pt-2 md:mr-auto">
          {leading}
        </div>
      )}
      <button
        type="button"
        className="btn btn-ghost flex-1 max-md:border-base-content/20 md:flex-none"
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
