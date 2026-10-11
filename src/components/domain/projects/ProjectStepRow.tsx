'use client';

import {useTranslations} from 'next-intl';
import {
  Bars2Icon,
  CheckIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {TaskStatus} from '@/utils/enums';
import {formatDayLabel} from '@/utils/dateUtils';
import {
  ProjectStepState,
  type ProjectStepRowModel,
} from '@/utils/projectViewUtils';
import {TaskKind} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Pill} from '@/components/ui/Pill';
import {cn} from '@/components/ui/cn';
import {ROW_ACTION_BUTTON, ROW_ICON_BUTTON} from './constants';

interface ProjectStepRowProps {
  row: ProjectStepRowModel;
  /** ✎ — every step that isn't done */
  onEdit?: () => void;
  /** + This week — an upcoming step */
  onSchedule?: () => void;
  /** × — this week's step still in the backlog */
  onTakeBack?: () => void;
}

const {tint, fill} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * One step of a project's path, by state: done (locked, with the day it was
 * done), on this week (tinted, with its board status, × while still in the
 * backlog), left on last week's plan, or upcoming (its size and + This
 * week). From md up a drag hint leads the row and the description shows.
 */
export const ProjectStepRow = ({
  row,
  onEdit,
  onSchedule,
  onTakeBack,
}: ProjectStepRowProps) => {
  const t = useTranslations('Projects.Step');
  const {state, step} = row;
  const {title, description, instanceIndex, size, points, status, doneAt} =
    step;
  const isDone = state === ProjectStepState.DONE;
  const isThisWeek = state === ProjectStepState.THIS_WEEK;
  const isInBacklog = status === TaskStatus.BACKLOG;

  const renderStatusMark = () => {
    if (isDone) {
      return (
        <span className="grid size-[18px] place-items-center rounded-full border-[1.5px] border-success bg-success text-base-100">
          <CheckIcon className="size-2.5 stroke-[3]" />
        </span>
      );
    }
    return (
      <span
        className={cn(
          'grid size-[18px] place-items-center rounded-full border-[1.5px]',
          isThisWeek ? 'border-secondary' : 'border-base-content/30',
        )}
      >
        {isThisWeek && <span className={cn('size-2 rounded-full', fill)} />}
      </span>
    );
  };

  // Mobile says less: the board status alone this week, "Last week" before
  const renderWeekPill = () => {
    switch (row.state) {
      case ProjectStepState.THIS_WEEK:
        return (
          <Pill color={isInBacklog ? 'secondary' : 'primary'}>
            <span className="md:hidden">
              {isInBacklog ? t('backlog') : t('todo')}
            </span>
            <span className="hidden md:inline">
              {isInBacklog ? t('thisWeekBacklog') : t('thisWeekTodo')}
            </span>
          </Pill>
        );
      case ProjectStepState.LAST_WEEK:
        return (
          <Pill color="muted">
            <span className="md:hidden">{t('lastWeek')}</span>
            <span className="hidden md:inline">
              {isInBacklog ? t('lastWeekBacklog') : t('lastWeekTodo')}
            </span>
          </Pill>
        );
      default:
        return null;
    }
  };

  const renderSchedule = () =>
    row.state === ProjectStepState.UPCOMING && (
      <>
        <SizeChip size={size} points={points} className="max-md:hidden" />
        <button
          type="button"
          onClick={onSchedule}
          disabled={!row.canSchedule}
          title={t('scheduleLabel')}
          className={ROW_ACTION_BUTTON}
        >
          <PlusIcon className="size-2.5 stroke-2" />
          <span className="md:hidden">{t('scheduleShort')}</span>
          <span className="hidden md:inline">{t('schedule')}</span>
        </button>
      </>
    );

  const renderTakeBack = () =>
    row.state === ProjectStepState.THIS_WEEK &&
    row.canTakeBack && (
      <button
        type="button"
        onClick={onTakeBack}
        aria-label={t('takeBackLabel')}
        title={t('takeBackLabel')}
        className={ROW_ACTION_BUTTON}
      >
        <XMarkIcon className="size-2.5 stroke-2" />
      </button>
    );

  const renderSide = () => {
    if (isDone) return doneAt && formatDayLabel(doneAt);
    return (
      <>
        {renderWeekPill()}
        {renderSchedule()}
        {renderTakeBack()}
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('editLabel')}
          title={t('editLabel')}
          className={ROW_ICON_BUTTON}
        >
          <PencilSquareIcon className="size-3" />
        </button>
      </>
    );
  };

  return (
    <div
      className={cn(
        'grid grid-cols-[20px_18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2 text-[13px] md:grid-cols-[16px_22px_26px_minmax(0,1fr)_auto] md:gap-2.5 md:px-2.5 md:py-[9px] md:text-[13.5px]',
        isThisWeek ? tint : 'border-transparent',
      )}
    >
      <span className="hidden text-base-content/25 md:grid">
        {!isDone && <Bars2Icon className="size-3.5" />}
      </span>
      {renderStatusMark()}
      <span className="fx-num text-[11px] text-base-content/45">
        {instanceIndex}
      </span>
      <span className={cn('min-w-0', isDone && 'text-base-content/50')}>
        {title}
        {description && !isDone && (
          <small className="mt-0.5 hidden text-[11.5px] text-base-content/50 md:block">
            {description}
          </small>
        )}
      </span>
      <span className="fx-num flex items-center gap-1.5 whitespace-nowrap text-[11px] text-base-content/50">
        {renderSide()}
      </span>
    </div>
  );
};
