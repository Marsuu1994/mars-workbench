'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {TaskStatus} from '@/utils/enums';

interface BoardColumnProps {
  status: BoardColumnStatus;
  /** Cards in the column — the header badge */
  count: number;
  /** The column's cards, rendered by BoardPage */
  children: ReactNode;
}

type BoardColumnStatus = typeof TaskStatus.TODO | typeof TaskStatus.DONE;

interface StatusStyle {
  accent: string;
  ledColor: string;
  tagKey: 'todoTag' | 'doneTag';
  /** On which widths the column shows at all */
  shownOn: string;
}

const STATUS_STYLE: Record<BoardColumnStatus, StatusStyle> = {
  [TaskStatus.TODO]: {
    accent: 'md:border-l-info',
    ledColor: 'text-info',
    tagKey: 'todoTag',
    shownOn: 'flex',
  },
  // Done is desktop's. BoardPage doesn't render it on a phone, but the server
  // renders the desktop page, so until the page knows its width CSS keeps
  // Done off a phone's first paint.
  [TaskStatus.DONE]: {
    accent: 'md:border-l-success',
    ledColor: 'text-success',
    tagKey: 'doneTag',
    shownOn: 'hidden md:flex',
  },
};

/**
 * One kanban column: the header (LED, label, its tag, count) and a list of
 * full-width cards, one under another on both widths. A frame only:
 * BoardPage renders the cards into it, and renders only Todo on mobile.
 * Todo is tagged Today, Done This week.
 */
export const BoardColumn = ({status, count, children}: BoardColumnProps) => {
  const tStatus = useTranslations('Enums.TaskStatus');
  const tColumns = useTranslations('Board.Columns');
  const {accent, ledColor, tagKey, shownOn} = STATUS_STYLE[status];

  return (
    <div
      className={`w-full md:min-w-[280px] md:flex-1 md:rounded-xl md:border md:border-base-content/10 md:bg-base-200/10 ${shownOn} flex-col`}
    >
      <div
        className={`flex items-center justify-between md:justify-start gap-2 px-0.5 py-1.5 md:px-4 md:py-3 md:border-l-4 md:border-b md:border-b-base-content/10 ${accent} md:rounded-tl-xl`}
      >
        <div className="flex items-center gap-2">
          <span className={`fx-led md:hidden ${ledColor}`} />
          <h2 className="fx-label fx-label-bright fx-display font-semibold">
            {tStatus(status)}
          </h2>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <span className="hidden fx-num text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/45 md:inline">
            {tColumns(tagKey)}
          </span>
          <span className="badge badge-ghost badge-sm fx-num">{count}</span>
        </div>
      </div>

      <div
        data-board-column={status}
        className="flex flex-col gap-2 pb-1 md:flex-1 md:overflow-y-auto md:rounded-b-xl md:p-3"
      >
        {children}
      </div>
    </div>
  );
};
