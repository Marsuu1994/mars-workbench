'use client';

import type {Ref} from 'react';
import {useTranslations} from 'next-intl';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {TaskKind} from '@/utils/taskUtils';
import {DayState, type DayRing} from '@/utils/dayRingUtils';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {DAY_NAME_KEYS} from './constants';

interface DayListProps {
  ring: DayRing;
  /** The day's finished tasks, in the list's order (toDayListCards) */
  cards: BoardCard[];
  onClose: () => void;
  /** The close button, which takes focus when the list opens (DAY-5) */
  closeButtonRef?: Ref<HTMLButtonElement>;
  /** The body's height cap: the desktop panel's, or the sheet's */
  bodyClassName?: string;
}

/**
 * A day's list (DAY-3): its header (the day, its count, a close button), then
 * a row for each task finished that day, or Nothing yet. Read only (R7).
 * Shell-free, so the desktop panel, the mobile sheet and the Design Console
 * show the same list.
 */
export const DayList = ({
  ring,
  cards,
  onClose,
  closeButtonRef,
  bodyClassName,
}: DayListProps) => {
  const t = useTranslations('Board.DayList');
  const tRings = useTranslations('Board.Rings');
  const {dayIndex, state, doneCount, plannedCount} = ring;
  const dayName =
    state === DayState.TODAY
      ? tRings('today')
      : tRings(`Days.${DAY_NAME_KEYS[dayIndex]}`);

  const renderHeader = () => (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-base-content/10 px-3 py-2.5 fx-num text-[10.5px] uppercase tracking-[0.1em] text-base-content/55">
      <b className="font-semibold tracking-[0.04em] text-base-content">
        {dayName}
      </b>
      <span>{t('count', {done: doneCount, planned: plannedCount})}</span>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label={t('closeLabel')}
        title={t('closeLabel')}
        className="ml-auto grid size-6 cursor-pointer place-items-center rounded-md text-base-content/45 hover:bg-base-content/10 hover:text-base-content"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );

  const renderRow = (card: BoardCard) => {
    const {kind, task} = card;
    const {text, Icon} = TASK_KIND_STYLE[kind];
    const projectTitle =
      card.kind === TaskKind.PROJECT ? card.step?.projectTitle : undefined;
    return (
      <li key={task.id} className="flex items-start gap-2.5 px-3 py-2">
        <Icon className={`mt-0.5 size-3.5 flex-shrink-0 stroke-2 ${text}`} />
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] leading-snug text-base-content/80 line-through">
            {task.title}
          </span>
          {projectTitle && (
            <span className={`truncate text-[11px] ${text}`}>
              {projectTitle}
            </span>
          )}
        </span>
      </li>
    );
  };

  return (
    <>
      {renderHeader()}
      <div className={`min-h-0 overflow-y-auto ${bodyClassName ?? ''}`}>
        {cards.length === 0 ? (
          <p className="px-3 py-3 text-[12.5px] text-base-content/45">
            {t('nothingYet')}
          </p>
        ) : (
          <ul className="flex flex-col py-1">{cards.map(renderRow)}</ul>
        )}
      </div>
    </>
  );
};
