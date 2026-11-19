'use client';

import {useTranslations} from 'next-intl';
import {ChevronDownIcon, ChevronUpIcon} from '@heroicons/react/24/outline';
import type {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

interface BacklogMoreCountProps {
  kind: TaskKind;
  /** How many tasks wait behind the group's next one */
  behindCount: number;
  /** A project's queue: open or closed. A habit's count opens nothing. */
  queue?: {isOpen: boolean; onToggle: () => void};
}

/**
 * "+N more" on a backlog card: how many tasks wait behind its next one. A
 * project's carries a chevron and opens its queue; a habit's is text only.
 */
export const BacklogMoreCount = ({
  kind,
  behindCount,
  queue,
}: BacklogMoreCountProps) => {
  const t = useTranslations('Board.Backlog');
  const {text} = TASK_KIND_STYLE[kind];

  // The space after the number collapses in the flex row: the gap spaces
  // them on screen, and a screen reader hears two words
  const count = (
    <span className="inline-flex items-baseline gap-[3px] fx-num text-[11px] font-semibold tracking-normal whitespace-nowrap text-base-content/55">
      {t.rich('moreCount', {
        count: behindCount,
        number: chunks => <b className={`font-bold ${text}`}>{chunks}</b>,
      })}
    </span>
  );

  if (!queue) return count;

  const {isOpen, onToggle} = queue;
  const Chevron = isOpen ? ChevronUpIcon : ChevronDownIcon;
  return (
    // The ::before widens the tap target 8px around the text, as the mockup's
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      title={t(isOpen ? 'hideQueueLabel' : 'showQueueLabel')}
      className="group/more relative inline-flex cursor-pointer items-center gap-1 before:absolute before:-inset-x-1.5 before:-inset-y-2 before:content-['']"
    >
      {count}
      <Chevron className={`size-3 stroke-2 ${text}`} />
    </button>
  );
};
