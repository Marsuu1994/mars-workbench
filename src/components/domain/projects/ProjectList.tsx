'use client';

import {useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {
  CheckIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {countDoneSteps, summarizeProject} from '@/utils/projectUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Pill} from '@/components/ui/Pill';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {cn} from '@/components/ui/cn';
import {OUTLINE_BUTTON} from './constants';

interface ProjectListProps {
  /** Every project, archived ones included (listed apart at the bottom) */
  projects: ProjectItem[];
  stepsByProjectId: ReadonlyMap<string, TaskItem[]>;
  activePlanId: string | null;
  /** The project shown in the detail pane */
  selectedProjectId: string | undefined;
  onSelect: (projectId: string) => void;
  /** Resolves once the project is back (the row waits on it) */
  onUnarchive: (projectId: string) => Promise<void>;
  /** Mobile's New project, under the active projects */
  onNewProject: () => void;
}

const NO_STEPS: TaskItem[] = [];
const {text, edge, fill, track, Icon} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * The list pane: the active projects (from md up a card — done/total, the
 * progress bar, the next step, how many are on this week, ringed when
 * selected; on mobile a row with a chevron), mobile's New project, then the
 * Archived section with Unarchive.
 */
export const ProjectList = ({
  projects,
  stepsByProjectId,
  activePlanId,
  selectedProjectId,
  onSelect,
  onUnarchive,
  onNewProject,
}: ProjectListProps) => {
  const t = useTranslations('Projects');
  const stepsOf = (projectId: string) =>
    stepsByProjectId.get(projectId) ?? NO_STEPS;
  const activeProjects = projects.filter(({isArchived}) => !isArchived);
  const archivedProjects = projects.filter(({isArchived}) => isArchived);

  return (
    <div className="flex flex-col gap-2 p-3.5">
      {activeProjects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          steps={stepsOf(project.id)}
          activePlanId={activePlanId}
          isSelected={project.id === selectedProjectId}
          onSelect={() => onSelect(project.id)}
        />
      ))}
      <button
        type="button"
        onClick={onNewProject}
        className="btn btn-primary w-full md:hidden"
      >
        <PlusIcon className="size-4" />
        {t('newProject')}
      </button>
      {archivedProjects.length > 0 && (
        <>
          <SectionLabel className="mt-2 px-0.5">
            {t('List.archived')}
          </SectionLabel>
          {archivedProjects.map(project => (
            <ArchivedProjectRow
              key={project.id}
              project={project}
              steps={stepsOf(project.id)}
              onUnarchive={() => onUnarchive(project.id)}
            />
          ))}
        </>
      )}
    </div>
  );
};

interface ProjectCardProps {
  project: ProjectItem;
  /** Its steps, in step order */
  steps: TaskItem[];
  activePlanId: string | null;
  isSelected: boolean;
  onSelect: () => void;
}

/** An active project: a card from md up, a row with a chevron on mobile. */
const ProjectCard = ({
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

interface ArchivedProjectRowProps {
  project: ProjectItem;
  steps: TaskItem[];
  onUnarchive: () => Promise<void>;
}

/** An archived project: its title and progress, and Unarchive — which
    waits on the write. */
const ArchivedProjectRow = ({
  project,
  steps,
  onUnarchive,
}: ArchivedProjectRowProps) => {
  const t = useTranslations('Projects.List');
  const [isPending, setIsPending] = useState(false);

  async function handleUnarchive() {
    setIsPending(true);
    await onUnarchive();
    setIsPending(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-box border border-dashed border-base-content/10 px-3 py-[9px] text-[13px] text-base-content/60">
      <span className="min-w-0 flex-1 truncate">
        {t('archivedRow', {
          title: project.title,
          done: countDoneSteps(steps),
          total: steps.length,
        })}
      </span>
      <button
        type="button"
        onClick={handleUnarchive}
        disabled={isPending}
        className={cn(OUTLINE_BUTTON, 'btn-sm')}
      >
        {t('unarchive')}
      </button>
    </div>
  );
};
