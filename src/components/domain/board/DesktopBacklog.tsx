'use client';

import {Fragment, useEffect, useRef, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {
  InboxStackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {FinishBox} from '@/components/ui/FinishBox';
import {BacklogCountBadge} from './BacklogCountBadge';

interface DesktopBacklogProps {
  /** Every task waiting — the count, and the finish box at zero */
  count: number;
  /** The backlog's groups, rendered by BoardPage */
  children: ReactNode;
}

/**
 * Desktop-only collapsible right-edge backlog that stages BACKLOG tasks. The
 * user pulls a group's card with its ↑ Todo. BoardPage renders the groups
 * into it. Emptied, the strip stays and shows 0, and the panel shows that
 * everything is on deck.
 */
export const DesktopBacklog = ({count, children}: DesktopBacklogProps) => {
  const t = useTranslations('Board.Backlog');
  const [isOpen, setIsOpen] = useState(false);
  // Bumped on every close: the groups remount, so their queues open closed
  const [closeCount, setCloseCount] = useState(0);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Set by the toggles, so the first render leaves focus where it is
  const hasToggledRef = useRef(false);

  // The side that fades out turns inert, so focus moves to the toggle that
  // just appeared — once committed, since it is inert until then
  useEffect(() => {
    if (!hasToggledRef.current) return;
    (isOpen ? closeButtonRef : openButtonRef).current?.focus();
  }, [isOpen]);

  const toggle = (nextIsOpen: boolean) => {
    hasToggledRef.current = true;
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) setCloseCount(prev => prev + 1);
  };

  const countPill = <BacklogCountBadge count={count} />;

  const renderCollapsed = () => (
    <button
      ref={openButtonRef}
      onClick={() => toggle(true)}
      inert={isOpen}
      className={`absolute inset-y-0 left-0 w-12 bg-base-200/30 flex flex-col items-center gap-3.5 pt-4 cursor-pointer transition-opacity duration-200 hover:bg-base-300 ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      title={t('openLabel')}
    >
      <ChevronLeftIcon className="size-4 text-base-content/40" />
      {countPill}
      <span className="[writing-mode:vertical-rl] rotate-180 text-sm font-semibold text-base-content/60 tracking-wide">
        {t('title')}
      </span>
    </button>
  );

  const renderHeader = () => (
    <div className="px-4 py-3 border-b border-base-content/10 bg-base-200/30 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm font-bold">
        <InboxStackIcon className="size-[18px] text-primary" />
        {t('title')}
        {countPill}
      </div>
      <button
        ref={closeButtonRef}
        onClick={() => toggle(false)}
        className="size-7 rounded-md flex items-center justify-center text-base-content/60 hover:bg-base-300 hover:text-base-content cursor-pointer"
        title={t('closeLabel')}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );

  const renderEmpty = () => (
    <FinishBox
      title={t('Empty.title')}
      lines={[t('Empty.fact'), t('Empty.nextStep')]}
    />
  );

  const renderBody = () => (
    <div className="flex-1 overflow-y-auto p-3">
      {count === 0 ? (
        renderEmpty()
      ) : (
        <Fragment key={closeCount}>{children}</Fragment>
      )}
    </div>
  );

  return (
    <div
      className={`hidden md:block relative h-full flex-shrink-0 overflow-hidden bg-base-100/10 border-l border-base-content/10 transition-[width] duration-200 ${
        isOpen ? 'w-[300px]' : 'w-12'
      }`}
    >
      {/* Both states stay mounted and cross-fade so width + content animate
          together — instant content swaps would otherwise read as a jump. */}
      {renderCollapsed()}
      <section
        aria-label={t('title')}
        inert={!isOpen}
        className={`absolute inset-y-0 right-0 w-[300px] flex flex-col bg-base-100/10 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {renderHeader()}
        {renderBody()}
      </section>
    </div>
  );
};
