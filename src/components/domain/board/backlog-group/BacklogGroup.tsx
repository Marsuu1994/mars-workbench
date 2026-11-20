'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import {TaskKind} from '@/utils/taskUtils';
import type {BacklogGroup as BacklogGroupModel} from '@/utils/backlogGroupUtils';
import {useBoardPageContext} from '../BoardPageContext';
import {TaskCardFace} from '../TaskCardFace';
import {TaskCardFrame} from '../TaskCardFrame';
import {BacklogMoreCount} from './BacklogMoreCount';
import {BacklogPile} from './BacklogPile';
import {BacklogQueue} from './BacklogQueue';

/** desktop: in the panel · mobile: in the sheet, where a queue's rows are taller */
export type BacklogGroupVariant = 'desktop' | 'mobile';

interface BacklogGroupProps {
  group: BacklogGroupModel;
  variant: BacklogGroupVariant;
}

/**
 * One habit's or one project's tasks in the backlog: a card showing the next
 * one, on a pile of the rest — or, for a project whose queue is open, over
 * the rows of its steps behind. Only the next task can leave, pulled with its
 * ↑ Todo.
 */
export const BacklogGroup = ({group, variant}: BacklogGroupProps) => {
  const t = useTranslations('Board.Backlog');
  const {pullToTodo} = useBoardPageContext();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const {next, behind} = group;
  // The queue closes for good once no step is left behind the next one
  const showsQueue = isQueueOpen && behind.length > 0;
  const queue =
    next.kind === TaskKind.PROJECT
      ? {isOpen: showsQueue, onToggle: () => setIsQueueOpen(!showsQueue)}
      : undefined;

  const renderPullButton = () => (
    <button
      type="button"
      onClick={() => pullToTodo(next.task.id)}
      className="inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-1 rounded-field border border-base-content/10 px-3 fx-num text-[11.5px] font-semibold text-base-content/60 hover:border-primary hover:text-primary"
    >
      <ArrowUpIcon className="size-2.5 stroke-2" />
      {t('pullToTodoLabel')}
    </button>
  );

  const renderMoreCount = () =>
    behind.length > 0 ? (
      <BacklogMoreCount
        kind={next.kind}
        behindCount={behind.length}
        queue={queue}
      />
    ) : null;

  return (
    <div className="flex flex-col">
      <TaskCardFrame
        kind={next.kind}
        className="relative z-[1] border-base-content/10 bg-base-100"
      >
        <TaskCardFace
          card={next}
          headExtra={renderMoreCount()}
          action={renderPullButton()}
        />
      </TaskCardFrame>
      {showsQueue ? (
        <BacklogQueue cards={behind} variant={variant} />
      ) : (
        <BacklogPile behindCount={behind.length} />
      )}
    </div>
  );
};
