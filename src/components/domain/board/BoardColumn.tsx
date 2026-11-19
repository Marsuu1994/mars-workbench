'use client';

import type {ReactNode} from 'react';
import {Droppable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {TaskStatus} from '@/utils/enums';

interface BoardColumnProps {
  status: BoardColumnStatus;
  /** Cards in the column — the header badge */
  count: number;
  /** The column's cards, rendered by BoardPage */
  children: ReactNode;
  /** True while any card is being dragged — faintly outlines all drop targets. */
  isDragActive?: boolean;
}

type BoardColumnStatus = typeof TaskStatus.TODO | typeof TaskStatus.DONE;

const STATUS_STYLE: Record<
  BoardColumnStatus,
  {accent: string; ledColor: string; tagKey: 'todoTag' | 'doneTag'}
> = {
  [TaskStatus.TODO]: {
    accent: 'md:border-l-info',
    ledColor: 'text-info',
    tagKey: 'todoTag',
  },
  [TaskStatus.DONE]: {
    accent: 'md:border-l-success',
    ledColor: 'text-success',
    tagKey: 'doneTag',
  },
};

/**
 * One kanban column: the header (LED, label, its tag, count) and a droppable
 * list of full-width cards, one under another on both widths. A frame only:
 * BoardPage renders the cards into it, and renders only Todo on mobile.
 * Todo is tagged Today, Done This week.
 */
export const BoardColumn = ({
  status,
  count,
  children,
  isDragActive = false,
}: BoardColumnProps) => {
  const tStatus = useTranslations('Enums.TaskStatus');
  const tColumns = useTranslations('Board.Columns');
  const {accent, ledColor, tagKey} = STATUS_STYLE[status];

  // Only one border-color utility is active at a time, so highlights override
  // the base color cleanly (no Tailwind class-ordering ambiguity). Drop
  // targets speak the mars-signal-orange channel (fx-target).
  const columnBorder = (isDraggingOver: boolean): string => {
    if (isDraggingOver) return 'md:fx-target md:border md:border-transparent';
    if (isDragActive) return 'md:border md:border-dashed md:border-accent/30';
    return 'md:border md:border-base-content/10';
  };

  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div
          className={`w-full md:min-w-[280px] md:flex-1 md:bg-base-200/10 md:rounded-xl flex flex-col transition-colors duration-200 ${columnBorder(
            snapshot.isDraggingOver,
          )}`}
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
              <span className="fx-num text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/45">
                {tColumns(tagKey)}
              </span>
              <span className="badge badge-ghost badge-sm fx-num">{count}</span>
            </div>
          </div>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2 pb-1 md:flex-1 md:overflow-y-auto md:rounded-b-xl md:p-3"
          >
            {children}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
};
