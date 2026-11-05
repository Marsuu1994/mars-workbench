'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import type {OneOffBacklogGroup} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

interface BacklogOneOffFaceProps {
  group: OneOffBacklogGroup;
  /** The mobile sheet's ↑ Todo, at the bottom right */
  action?: ReactNode;
}

const {text, Icon} = TASK_KIND_STYLE[TaskKind.ONE_OFF];

/**
 * A one-off in the backlog: nothing sits behind it, so its top right keeps
 * its quadrant. Then the title and description. No size.
 */
export const BacklogOneOffFace = ({group, action}: BacklogOneOffFaceProps) => {
  const tKind = useTranslations('Enums.TaskKind');
  const tCard = useTranslations('Board.Card');
  const {task} = group.next;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`size-3 flex-shrink-0 stroke-2 ${text}`} />
        <span
          className={`min-w-0 flex-1 truncate fx-num text-[10px] font-semibold uppercase tracking-[0.1em] ${text}`}
        >
          {tKind(TaskKind.ONE_OFF)}
        </span>
        {task.quadrant && (
          <span className="whitespace-nowrap fx-num text-[10px] text-base-content/50">
            {tCard(`Quadrant.${task.quadrant}`)}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium leading-[1.3]">{task.title}</h3>
      {task.description && (
        <p className="-mt-0.5 line-clamp-2 break-words text-xs leading-[1.4] text-base-content/58">
          {task.description}
        </p>
      )}
      {action && (
        <div className="flex min-h-[18px] items-center gap-2">
          <span className="flex-1" />
          {action}
        </div>
      )}
    </div>
  );
};
