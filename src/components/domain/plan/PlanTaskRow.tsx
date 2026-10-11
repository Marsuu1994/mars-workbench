'use client';

import {useTranslations} from 'next-intl';
import {CheckIcon} from '@heroicons/react/24/outline';
import type {TaskSize, TaskStatus} from '@/utils/enums';
import type {TaskKind} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Pill} from '@/components/ui/Pill';

/** Where an unfinished task on a plan sits: staged, or on the board. */
export type PlanTaskStatus = typeof TaskStatus.BACKLOG | typeof TaskStatus.TODO;

interface PlanTaskRowProps {
  /** One-off or project step — colours the checkbox and the selected row */
  kind: TaskKind;
  title: string;
  /** Muted lead-in before the title — a step's project */
  context?: string;
  size: TaskSize;
  points: number;
  status: PlanTaskStatus;
  isSelected: boolean;
  /** Where the task goes when deselected, shown while it is */
  returnsTo: string;
  onToggle: () => void;
}

/**
 * A task already on the plan that the plan form can only keep or let go: a
 * one-off or a project step. Selected, it carries over (create) or stays
 * (edit); deselected, the row says where the task goes instead.
 */
export const PlanTaskRow = ({
  kind,
  title,
  context,
  size,
  points,
  status,
  isSelected,
  returnsTo,
  onToggle,
}: PlanTaskRowProps) => {
  const tStatus = useTranslations('Enums.TaskStatus');
  const {fill, fillText, tint} = TASK_KIND_STYLE[kind];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
        isSelected ? tint : 'border-base-content/10 bg-base-200'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isSelected ? fill : 'border-base-content/30 bg-transparent'
        }`}
      >
        {isSelected && (
          <CheckIcon className={`size-3 stroke-[3] ${fillText}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">
            {context && (
              <span className="font-normal text-base-content/50">
                {context} ·{' '}
              </span>
            )}
            {title}
          </span>
          <SizeChip size={size} points={points} className="shrink-0" />
        </div>
        {!isSelected && (
          <div className="mt-0.5 text-[11.5px] text-base-content/50">
            → {returnsTo}
          </div>
        )}
      </div>

      {/* Status badge */}
      <Pill
        color="muted"
        className="rounded-full uppercase tracking-wider shrink-0"
      >
        {tStatus(status)}
      </Pill>
    </div>
  );
};
