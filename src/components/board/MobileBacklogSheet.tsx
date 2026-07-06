'use client';

import {useRef} from 'react';
import {useTranslations} from 'next-intl';
import {
  InboxStackIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {getTaskFrequency, type RiskLevel} from '@/utils/taskUtils';
import BacklogSheetCard from './BacklogSheetCard';

interface MobileBacklogSheetProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
  onPull: (taskId: string) => void;
}

/**
 * Mobile-only backlog entry: a peeking pill docked above the bottom tab bar that
 * opens a daisyUI `modal-bottom` sheet. The sheet stages BACKLOG tasks; tapping
 * a card's "↑ Todo" button pulls it onto the board (BACKLOG → TODO). The desktop
 * equivalent is BacklogDrawer (drag-based). Hidden at `md` and above.
 */
export default function MobileBacklogSheet({
  tasks,
  today,
  riskMap,
  templateFreqMap,
  onPull,
}: MobileBacklogSheetProps) {
  const t = useTranslations('Board.Backlog');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  const countBadge = (
    <span className="badge badge-primary badge-sm font-bold">
      {tasks.length}
    </span>
  );

  const renderPill = () => (
    <button
      onClick={open}
      title={t('openLabel')}
      className="md:hidden fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 flex items-center gap-2.5 h-11 px-3.5 rounded-2xl bg-base-100 border border-base-content/10 shadow-lg cursor-pointer"
    >
      <InboxStackIcon className="size-[18px] text-primary" />
      <span className="text-sm font-semibold">{t('title')}</span>
      {countBadge}
      <ChevronUpIcon className="size-4 text-base-content/40 ml-auto" />
    </button>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-base-content/10 flex-shrink-0">
      <div className="flex items-center gap-2 text-base font-bold">
        <InboxStackIcon className="size-5 text-primary" />
        {t('title')}
        {countBadge}
      </div>
      <button
        onClick={close}
        title={t('closeLabel')}
        className="size-8 rounded-lg flex items-center justify-center text-base-content/60 hover:bg-base-300 hover:text-base-content cursor-pointer"
      >
        <ChevronDownIcon className="size-5" />
      </button>
    </div>
  );

  const renderHint = () => (
    <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-base-content/50 border-b border-base-content/10 flex-shrink-0">
      <ArrowUpIcon className="size-3.5 text-primary flex-shrink-0" />
      {t('hintTapToTodo')}
    </div>
  );

  const renderBody = () => (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
      {tasks.length === 0 ? (
        <p className="text-center text-sm text-base-content/40 mt-10 px-6">
          {t('emptyState')}
        </p>
      ) : (
        tasks.map(task => (
          <BacklogSheetCard
            key={task.id}
            task={task}
            today={today}
            riskLevel={riskMap.get(task.id) ?? 'normal'}
            frequency={getTaskFrequency(task, templateFreqMap)}
            onPull={onPull}
          />
        ))
      )}
    </div>
  );

  return (
    <>
      {/* Hide the entry entirely when nothing is staged */}
      {tasks.length > 0 && renderPill()}

      <dialog ref={dialogRef} className="modal modal-bottom md:hidden">
        <div className="modal-box max-h-[80vh] p-0 flex flex-col">
          {renderHeader()}
          {renderHint()}
          {renderBody()}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t('closeLabel')}</button>
        </form>
      </dialog>
    </>
  );
}
