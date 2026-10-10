'use client';

import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {TaskCardFace} from './TaskCardFace';

interface MobileBacklogCardProps {
  card: BoardCard;
  onPull: (taskId: string) => void;
}

/**
 * Full-width card rendered inside the mobile backlog sheet: the board's full
 * kind-first face on a plain (non-draggable) card, with a tap "↑ Todo" pull
 * action beside the title.
 */
export default function MobileBacklogCard({
  card,
  onPull,
}: MobileBacklogCardProps) {
  const t = useTranslations('Board.Backlog');
  const {kind, task} = card;
  const {edge} = TASK_KIND_STYLE[kind];

  const renderPullButton = () => (
    <button
      onClick={() => onPull(task.id)}
      className="flex-shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-field border border-base-content/10 fx-num text-[10.5px] font-semibold text-base-content/60 cursor-pointer hover:text-primary hover:border-primary"
    >
      <ArrowUpIcon className="size-2.5 stroke-2" />
      {t('pullToTodoLabel')}
    </button>
  );

  return (
    <div className={`card bg-base-100 border border-base-content/10 ${edge}`}>
      <TaskCardFace card={card} action={renderPullButton()} />
    </div>
  );
}
