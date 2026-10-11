'use client';

import type {ReactNode} from 'react';
import {ChevronDownIcon, XMarkIcon} from '@heroicons/react/24/outline';
import {cn} from '../cn';

interface OverlayHeaderProps {
  /** Leading decoration before the title (icon, icon chip, …) */
  icon?: ReactNode;
  title: ReactNode;
  /** Trailing decoration next to the title (count badge, beta pill, …) */
  badge?: ReactNode;
  /** A small line under the title (what the overlay acts on) */
  subtitle?: ReactNode;
  onClose: () => void;
  /** Accessible close label — copy comes from the caller's namespace */
  closeLabel?: string;
  /** Horizontal gutter (match the overlay's body) + any extra chrome */
  className?: string;
}

/**
 * The one overlay header, used by every sheet/modal: icon/title/badge
 * cluster plus the standard close affordance — a down-chevron on mobile
 * (bottom-sheet dismissal language) that becomes an ✕ from md up
 * (centered-modal language). Owns the header's vertical rhythm and divider;
 * callers pass the horizontal gutter so it lines up with the body. Never
 * hand-roll an overlay header or close button.
 */
export const OverlayHeader = ({
  icon,
  title,
  badge,
  subtitle,
  onClose,
  closeLabel,
  className,
}: OverlayHeaderProps) => {
  const renderTitleRow = () => (
    <div className="fx-display flex items-center gap-2 text-base font-bold md:text-lg">
      {icon}
      {title}
      {badge}
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-shrink-0 justify-between border-b border-base-content/10 pt-4 pb-3 md:pt-5 md:pb-4',
        subtitle ? 'items-start' : 'items-center',
        className,
      )}
    >
      {subtitle ? (
        <div className="min-w-0">
          {renderTitleRow()}
          <div className="fx-num mt-0.5 flex items-center gap-1.5 text-[11px] text-base-content/50">
            {subtitle}
          </div>
        </div>
      ) : (
        renderTitleRow()
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
        className="btn btn-ghost btn-sm btn-square text-base-content/60"
      >
        <ChevronDownIcon className="size-5 md:hidden" />
        <XMarkIcon className="hidden size-5 md:block" />
      </button>
    </div>
  );
};
