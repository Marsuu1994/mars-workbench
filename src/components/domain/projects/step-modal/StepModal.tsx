'use client';

import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {StepFormPanel, type StepFormPanelProps} from './StepFormPanel';

/** What the open step modal acts on. */
export type StepModalTarget = Pick<
  StepFormPanelProps,
  'mode' | 'project' | 'stepNumber' | 'step'
>;

interface StepModalProps extends Pick<
  StepFormPanelProps,
  'freshData' | 'onClose' | 'onSaved'
> {
  /** The step to add or edit; null: closed */
  target: StepModalTarget | null;
}

/** Add / Edit Step as a modal — a bottom sheet on mobile. */
export const StepModal = ({
  target,
  freshData,
  onClose,
  onSaved,
}: StepModalProps) => (
  // Backdrop-dismiss stays off: a stray tap must not discard form input
  <OverlayShell
    variant="responsive"
    isOpen={target !== null}
    onClose={onClose}
    dismissOnBackdrop={false}
    corners
    boxClassName="max-w-lg p-0"
  >
    {/* Mounted only while open, so every open starts a fresh form */}
    {target && (
      <StepFormPanel
        {...target}
        freshData={freshData}
        onClose={onClose}
        onSaved={onSaved}
      />
    )}
  </OverlayShell>
);
