'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {CheckIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {summarizeProject} from '@/utils/projectUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Pill} from '@/components/ui/Pill';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {cn} from '@/components/ui/cn';

interface ProjectCardProps {
  project: ProjectItem;
  /** Its steps, in step order */
  steps: TaskItem[];
  activePlanId: string | null;
  isSelected: boolean;
  onSelect: () => void;
}

const {text, edge, fill, track, Icon} = TASK_KIND_STYLE[TaskKind.PROJECT];

/** An active project: a card from md up, a row with a chevron on mobile. */
export const ProjectCard = ({
  project,
  steps,
  activePlanId,
  isSelected,
  onSelect,
}: ProjectCardProps) => {
  const t = useTranslations('Projects.List');
  const {doneCount, stepCount, nextStepTitle, isAllStepsDone, thisWeekCount} =
    summarizeProject(steps, activePlanId);
  const progress = t('progress', {done: doneCount, total: stepCount});

  const renderAllStepsDone = () => (
    <Pill color="success">
      <CheckIcon className="size-2.5 stroke-[2.5]" />
      {t('allStepsDone')}
    </Pill>
  );

  // The next step's title is emphasized on the card, plain in the row
  const renderNext = (renderStepTitle: (chunks: ReactNode) => ReactNode) => {
    if (nextStepTitle !== null) {
      return t.rich('next', {title: nextStepTitle, step: renderStepTitle});
    }
    return isAllStepsDone ? renderAllStepsDone() : t('noStepsYet');
  };

  const renderCard = () => (
    <div className="hidden flex-col gap-[7px] md:flex">
      <div className="flex items-center gap-2">
        <Icon className={cn('size-3.5 shrink-0', text)} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {project.title}
        </span>
        <span className="fx-num text-[11px] text-base-content/55">
          {progress}
        </span>
      </div>
      <ProgressBar
        value={stepCount ? (doneCount / stepCount) * 100 : 0}
        fillClassName={fill}
        className={track}
      />
      <div className="text-xs text-base-content/60">
        {renderNext(chunks => (
          <span className="font-medium text-base-content/85">{chunks}</span>
        ))}
      </div>
      {thisWeekCount > 0 && (
        <div className="flex">
          <Pill color="secondary">
            {t('thisWeekCount', {count: thisWeekCount})}
          </Pill>
        </div>
      )}
    </div>
  );

  const renderRow = () => (
    <div className="flex items-center gap-2.5 md:hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="truncate text-sm font-semibold">{project.title}</span>
        <span className="fx-num flex min-w-0 items-center gap-2 text-[11px] text-base-content/55">
          <span>{progress}</span>
          <span className="truncate">{renderNext(chunks => chunks)}</span>
        </span>
      </div>
      <ChevronRightIcon className="size-3.5 shrink-0 text-base-content/50" />
    </div>
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'fx-card block w-full cursor-pointer rounded-box border border-base-content/10 bg-base-100/70 p-3 text-left',
        edge,
        isSelected && 'md:ring-[1.5px] md:ring-primary/65',
      )}
    >
      {renderCard()}
      {renderRow()}
    </button>
  );
};
