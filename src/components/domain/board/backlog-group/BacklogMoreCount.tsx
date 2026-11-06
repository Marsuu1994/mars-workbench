'use client';

import {useTranslations} from 'next-intl';
import type {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {cn} from '@/components/ui/cn';

interface BacklogMoreCountProps {
  kind: TaskKind;
  /** The staged ones behind the group's next */
  count: number;
  className?: string;
}

/** "+N more" at a backlog card's top right: how many wait behind the next
    (its number bumps as a pull brings the next one up). */
export const BacklogMoreCount = ({
  kind,
  count,
  className,
}: BacklogMoreCountProps) => {
  const t = useTranslations('Board.Backlog');
  const {text} = TASK_KIND_STYLE[kind];

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-baseline gap-[3px] whitespace-nowrap fx-num text-[11px] font-semibold text-base-content/55',
        className,
      )}
    >
      {t.rich('moreCount', {
        count,
        mark: chunks => (
          <b className={`fx-more-mark font-bold ${text}`}>{chunks}</b>
        ),
      })}
    </span>
  );
};
