'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import type {PriorityQuadrant} from '@/utils/enums';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

interface TaskCardHeadProps {
  kind: TaskKind;
  /** Shown in place of the kind label, in normal case: a step's project */
  name?: string;
  /** A one-off's quadrant, after a bar: ONE-OFF | DO FIRST */
  quadrant?: PriorityQuadrant | null;
  /** On the right: the backlog's +N more, and nothing else */
  extra?: ReactNode;
}

/**
 * A card's kind line: what kind of work this is, its icon and label in the
 * kind's colour. A project step names its project instead, and a one-off adds
 * its quadrant of the priority matrix. The kind colour never changes on a
 * card.
 */
export const TaskCardHead = ({
  kind,
  name,
  quadrant,
  extra,
}: TaskCardHeadProps) => {
  const tKind = useTranslations('Enums.TaskKind');
  const tCard = useTranslations('Board.Card');
  const {text, Icon} = TASK_KIND_STYLE[kind];

  const renderLabel = () => {
    if (name) {
      return (
        <span className="truncate text-[11px] normal-case tracking-[0.02em]">
          {name}
        </span>
      );
    }
    return (
      <>
        <span className="truncate">{tKind(kind)}</span>
        {kind === TaskKind.ONE_OFF && quadrant && (
          <>
            <span className="font-medium text-base-content/45">|</span>
            <span className="truncate">{tCard(`Quadrant.${quadrant}`)}</span>
          </>
        )}
      </>
    );
  };

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 fx-num text-[10px] font-semibold uppercase tracking-[0.1em] ${text}`}
    >
      <Icon className="size-3 flex-shrink-0 stroke-2" />
      {renderLabel()}
      {extra && <span className="ml-auto flex-shrink-0">{extra}</span>}
    </div>
  );
};
