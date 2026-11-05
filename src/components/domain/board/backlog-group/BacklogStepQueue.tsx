import type {ProjectStepCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {TaskKind} from '@/utils/taskUtils';
import type {BacklogVariant} from './BacklogGroupCard';

interface BacklogStepQueueProps {
  /** The steps behind the project's next, in order */
  steps: ProjectStepCard[];
  variant: BacklogVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const ROW_STYLE: Record<BacklogVariant, string> = {
  desktop: 'py-2 text-[12.5px]',
  mobile: 'py-[11px] text-[13px]',
};

const {text} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * A project's queue, opened from its card's "+N more": the steps behind the
 * next, read-only — so a pull always takes the next step and the order
 * never changes.
 */
export const BacklogStepQueue = ({steps, variant}: BacklogStepQueueProps) => (
  <ol className="mx-2 -mt-1 overflow-hidden rounded-b-card border border-t-0 border-base-content/10 bg-base-100/45 pt-1 fx-queue">
    {steps.map(({task}) => (
      <li
        key={task.id}
        className={`flex items-center gap-2.5 px-3 text-base-content/70 border-t border-base-content/5 first:border-t-0 ${ROW_STYLE[variant]}`}
      >
        <span
          className={`min-w-3.5 fx-num text-[10.5px] font-semibold ${text}`}
        >
          {task.instanceIndex}
        </span>
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
      </li>
    ))}
  </ol>
);
