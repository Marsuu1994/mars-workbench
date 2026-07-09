'use client';

import type {ReactNode} from 'react';
import {cn} from '../cn';
import {OverlayShell} from './OverlayShell';
import {SheetCloseButton} from './SheetCloseButton';

interface BottomSheetHeader {
  icon?: ReactNode;
  title: ReactNode;
  /** Trailing decoration next to the title (e.g. a count badge) */
  badge?: ReactNode;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Close/backdrop label — copy comes from the caller's namespace */
  closeLabel: string;
  /** Optional pinned title bar with a chevron-down close button */
  header?: BottomSheetHeader;
  /** Optional pinned strip under the header (hints, filters, …) */
  subheader?: ReactNode;
  /** Cap the sheet at 80vh and make the body its scroll region */
  scrollable?: boolean;
  /** Restrict to mobile (defaults on — desktop has its own affordances) */
  mobileOnly?: boolean;
  dismissOnBackdrop?: boolean;
  /** Classes for the body region (padding lives here, not on the box) */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * The uniform mobile bottom-sheet container: optional pinned
 * header/subheader, optional internal scroll region. Content goes in
 * children; the shell owns the dialog/backdrop/animation chrome.
 */
export const BottomSheet = ({
  isOpen,
  onClose,
  closeLabel,
  header,
  subheader,
  scrollable,
  mobileOnly = true,
  dismissOnBackdrop = true,
  bodyClassName,
  children,
}: BottomSheetProps) => {
  const renderHeader = ({icon, title, badge}: BottomSheetHeader) => (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-content/10 flex-shrink-0">
      <div className="flex items-center gap-2 text-base font-bold">
        {icon}
        {title}
        {badge}
      </div>
      <SheetCloseButton onClick={onClose} label={closeLabel} />
    </div>
  );

  return (
    <OverlayShell
      variant="sheet"
      isOpen={isOpen}
      onClose={onClose}
      mobileOnly={mobileOnly}
      dismissOnBackdrop={dismissOnBackdrop}
      closeLabel={closeLabel}
      boxClassName={cn('p-0', scrollable && 'max-h-[80vh] flex flex-col')}
    >
      {header && renderHeader(header)}
      {subheader && <div className="flex-shrink-0">{subheader}</div>}
      <div
        className={cn(scrollable && 'flex-1 overflow-y-auto', bodyClassName)}
      >
        {children}
      </div>
    </OverlayShell>
  );
};
