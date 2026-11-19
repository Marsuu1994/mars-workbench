import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import type {BacklogGroupVariant} from './BacklogGroup';

interface BacklogQueueProps {
  /** The steps behind the project's next one, in step order */
  cards: BoardCard[];
  variant: BacklogGroupVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it. The sheet's
// rows are taller, for a finger.
const ROW_STYLE: Record<BacklogGroupVariant, string> = {
  desktop: 'py-2 text-[12.5px]',
  mobile: 'py-[11px] text-[13px]',
};

/**
 * A project's queue, opened from its card's +N more: one row per step behind
 * the next one, its number and title. Read only — only the next step can be
 * pulled.
 */
export const BacklogQueue = ({cards, variant}: BacklogQueueProps) => (
  <ol className="fx-tucked mx-2 -mt-1 overflow-hidden rounded-b-box border border-t-0 border-base-content/10 bg-base-100/45 pt-1">
    {cards.map(({kind, task}) => (
      <li
        key={task.id}
        className={`flex items-center gap-2.5 border-t border-base-content/6 px-3 text-base-content/72 first:border-t-0 ${ROW_STYLE[variant]}`}
      >
        <span
          className={`min-w-3.5 fx-num text-[10.5px] font-semibold ${TASK_KIND_STYLE[kind].text}`}
        >
          {task.instanceIndex}
        </span>
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
      </li>
    ))}
  </ol>
);
