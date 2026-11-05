'use client';

import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import {useBoardPageContext} from '../BoardPageContext';

interface BacklogPullButtonProps {
  /** The group's next task — the one a pull takes */
  taskId: string;
}

/** The mobile sheet's "↑ Todo": pulls the group's next task onto the board. */
export const BacklogPullButton = ({taskId}: BacklogPullButtonProps) => {
  const t = useTranslations('Board.Backlog');
  const {pullToTodo} = useBoardPageContext();

  return (
    <button
      onClick={() => pullToTodo(taskId)}
      className="flex-shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-field border border-base-content/10 fx-num text-[11.5px] font-semibold text-base-content/60 cursor-pointer hover:text-primary hover:border-primary"
    >
      <ArrowUpIcon className="size-2.5 stroke-2" />
      {t('pullToTodoLabel')}
    </button>
  );
};
