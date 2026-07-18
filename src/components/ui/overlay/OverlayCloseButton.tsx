'use client';

import {ChevronDownIcon, XMarkIcon} from '@heroicons/react/24/outline';

interface OverlayCloseButtonProps {
  onClick: () => void;
  /** Accessible label — copy comes from the caller's namespace */
  label?: string;
}

/**
 * The one overlay close affordance, used by every sheet/modal header: a
 * down-chevron on mobile (bottom-sheet dismissal language) that becomes an
 * ✕ from md up (centered-modal language). Never reimplement per overlay.
 */
export const OverlayCloseButton = ({
  onClick,
  label,
}: OverlayCloseButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="btn btn-ghost btn-sm btn-square text-base-content/60"
  >
    <ChevronDownIcon className="size-5 md:hidden" />
    <XMarkIcon className="hidden size-5 md:block" />
  </button>
);
