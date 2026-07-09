'use client';

import {useRef, type ReactNode} from 'react';
import {cn} from '../cn';
import {useDialogSync} from './useDialogSync';

export type OverlayVariant = 'sheet' | 'responsive' | 'center';

interface OverlayShellProps {
  isOpen: boolean;
  /** Fires on every close path: Esc, backdrop tap, programmatic close */
  onClose: () => void;
  /** sheet = bottom sheet · responsive = sheet that centers at md · center = centered */
  variant?: OverlayVariant;
  /** Restrict a sheet to mobile (desktop has its own affordance) */
  mobileOnly?: boolean;
  /** Tap-outside dismissal. Keep false for forms so a stray tap can't
      discard input — an explicit decision, not a per-modal accident. */
  dismissOnBackdrop?: boolean;
  /** Backdrop button label for screen readers (required when dismissable) */
  closeLabel?: string;
  /** Targeting-reticle corner brackets from md up */
  corners?: boolean;
  /** Extra classes on the modal-box */
  boxClassName?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<OverlayVariant, string> = {
  sheet: 'modal modal-bottom',
  responsive: 'modal modal-bottom md:modal-middle',
  center: 'modal',
};

/**
 * The one <dialog> shell behind every overlay: daisyUI modal skeleton,
 * HUD panel chrome (fx-panel-solid + fx-boot-in), prop-driven open state
 * via useDialogSync, and an explicit backdrop-dismiss contract.
 */
export const OverlayShell = ({
  isOpen,
  onClose,
  variant = 'center',
  mobileOnly,
  dismissOnBackdrop = true,
  closeLabel,
  corners,
  boxClassName,
  children,
}: OverlayShellProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useDialogSync(dialogRef, isOpen);

  return (
    <dialog
      ref={dialogRef}
      className={cn(VARIANT_CLASS[variant], mobileOnly && 'md:hidden')}
      onClose={onClose}
    >
      <div
        className={cn(
          'modal-box fx-panel-solid fx-boot-in',
          corners && 'md:fx-corners',
          boxClassName,
        )}
      >
        {children}
      </div>
      {dismissOnBackdrop && (
        <form method="dialog" className="modal-backdrop">
          <button>{closeLabel}</button>
        </form>
      )}
    </dialog>
  );
};
