'use client';

import {ChevronDownIcon} from '@heroicons/react/24/outline';

interface SheetCloseButtonProps {
  onClick: () => void;
  /** Accessible label — copy comes from the caller's namespace */
  label?: string;
}

/**
 * The standard overlay close affordance: a down-chevron on the right of a
 * sheet/modal header (the mobile bottom-sheet dismissal language, applied
 * across all overlays for consistency). Replaces the old ✕ close.
 */
export const SheetCloseButton = ({onClick, label}: SheetCloseButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="btn btn-ghost btn-sm btn-square text-base-content/60"
  >
    <ChevronDownIcon className="size-5" />
  </button>
);
