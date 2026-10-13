'use client';

import type {MouseEvent, ReactNode} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {CheckIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import type {ProjectSummary} from '@/utils/projectViewUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Pill} from '@/components/ui/Pill';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {cn} from '@/components/ui/cn';

interface ProjectListItemProps {
  project: ProjectSummary;
  /** The project shown in the detail pane (desktop) */
  isSelected: boolean;
  /** The project's own page — mobile's detail */
  href: string;
  /** Desktop: show it beside the list without navigating */
  onSelect: () => void;
}

const {text, edge, fill, track, Icon} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * A project in the list. From md up a card — title and done/total, the
 * progress bar, the next step (or All steps done / No steps yet) and how
 * many steps are on this week; on mobile a row with a chevron. A link
 * either way: mobile follows it to the project's page, desktop selects the
 * project in place (same markup on both, so SSR never flashes).
 */
export const ProjectListItem = ({
  project,
  isSelected,
  href,
  onSelect,
}: ProjectListItemProps) => {
  const t = useTranslations('Projects.List');
  const {
    title,
    doneCount,
    stepCount,
    nextStepTitle,
    isAllStepsDone,
    thisWeekCount,
  } = project;

  // Selection is a client-side URL change (see ProjectsContainer)
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onSelect();
  };

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
          {title}
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
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="fx-num flex min-w-0 items-center gap-2 text-[11px] text-base-content/55">
          <span>{progress}</span>
          <span className="truncate">{renderNext(chunks => chunks)}</span>
        </span>
      </div>
      <ChevronRightIcon className="size-3.5 shrink-0 text-base-content/50" />
    </div>
  );

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'fx-card block rounded-box border border-base-content/10 bg-base-100/70 p-3',
        edge,
        isSelected && 'md:ring-[1.5px] md:ring-primary/65',
      )}
    >
      {renderCard()}
      {renderRow()}
    </Link>
  );
};
