'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  ArchiveBoxIcon,
  ChevronLeftIcon,
  FlagIcon,
  InformationCircleIcon,
  MapIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {countDoneSteps, isAllStepsDone, isStepDone} from '@/utils/projectUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {Banner} from '@/components/ui/Banner';
import {EmptyState} from '@/components/ui/EmptyState';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {cn} from '@/components/ui/cn';
import {useProjectsPageContext} from '../ProjectsPageContext';
import {ProjectStep} from './ProjectStep';
import {
  CREATE_PLAN_HREF,
  OUTLINE_BUTTON,
  STEP_LIST_DROPPABLE_ID,
} from '../constants';

interface ProjectDetailProps {
  project: ProjectItem;
  /** Its steps, in step order */
  steps: TaskItem[];
}

const {fill, track} = TASK_KIND_STYLE[TaskKind.PROJECT];

/** Done steps in completion order (step number breaks ties). */
const byDoneAt = (left: TaskItem, right: TaskItem) =>
  (left.doneAt?.getTime() ?? 0) - (right.doneAt?.getTime() ?? 0) ||
  left.instanceIndex - right.instanceIndex;

/**
 * The detail pane: the selected project's header, what the page or the
 * project needs next (no plan this week, all steps done), its path — done
 * steps on top, then the open ones in step order, reordered by dragging the
 * row — and Add step.
 */
export const ProjectDetail = ({project, steps}: ProjectDetailProps) => {
  const t = useTranslations('Projects.Detail');
  const {
    activePlanId,
    showProjectList,
    openEditProject,
    openAddStep,
    moveStep,
    archiveProject,
  } = useProjectsPageContext();
  const [isArchiving, setIsArchiving] = useState(false);
  const doneCount = countDoneSteps(steps);
  const doneSteps = steps.filter(isStepDone).sort(byDoneAt);
  const openSteps = steps.filter(step => !isStepDone(step));

  // All steps done's Archive — one click. The pane goes once the project is
  // archived; on failure it stays
  async function handleArchive() {
    setIsArchiving(true);
    await archiveProject(project.id);
    setIsArchiving(false);
  }

  // Synchronous: the dnd library needs the new order in onDragEnd or the
  // row springs back first. The step lands before whichever open step takes
  // the drop index once it's lifted out; past the last one it goes last
  function handleDragEnd({source, destination}: DropResult) {
    if (!destination || destination.index === source.index) return;
    const otherOpenSteps = [...openSteps];
    const [movedStep] = otherOpenSteps.splice(source.index, 1);
    moveStep(movedStep.id, otherOpenSteps[destination.index]?.id);
  }

  const renderNoPlanBanner = () =>
    activePlanId === null && (
      <Banner
        tone="warning"
        outlined
        icon={<InformationCircleIcon className="size-4 shrink-0" />}
        action={
          <Link
            href={CREATE_PLAN_HREF}
            className="shrink-0 font-semibold underline"
          >
            {t('createPlan')}
          </Link>
        }
      >
        <span className="text-[12.5px]">{t('noPlan')}</span>
      </Banner>
    );

  const renderHeader = () => (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="fx-display text-[19px] font-bold md:text-xl">
          {project.title}
        </h2>
        {project.goal && (
          <p className="mt-1 text-[13px] text-base-content/60">
            {project.goal}
          </p>
        )}
        <div className="fx-num mt-3 flex items-center gap-3 text-[11.5px] text-base-content/60">
          <ProgressBar
            value={steps.length ? (doneCount / steps.length) * 100 : 0}
            fillClassName={fill}
            className={cn('max-w-[360px] flex-1', track)}
          />
          {t('stepsProgress', {done: doneCount, total: steps.length})}
        </div>
      </div>
      <button
        type="button"
        onClick={() => openEditProject(project.id)}
        className={cn(OUTLINE_BUTTON, 'btn-sm shrink-0')}
      >
        <PencilSquareIcon className="size-3" />
        {t('edit')}
      </button>
    </div>
  );

  // A quiet next step, not an alert: archiving here is expected and can be
  // undone from the list, so one click does it
  const renderAllStepsDone = () =>
    isAllStepsDone(steps) && (
      <Banner
        tone="neutral"
        outlined
        className="gap-3 px-3.5 py-3"
        icon={<FlagIcon className="size-5 shrink-0 text-success" />}
        action={
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className={cn(OUTLINE_BUTTON, 'btn-sm shrink-0')}
          >
            <ArchiveBoxIcon className="size-3.5" />
            {t('archive')}
          </button>
        }
      >
        <span className="block text-[13.5px] font-semibold text-base-content">
          {t('allStepsDoneTitle')}
        </span>
        <span className="text-[12.5px]">{t('allStepsDoneDescription')}</span>
      </Banner>
    );

  const renderOpenStep = (step: TaskItem, index: number) => (
    <Draggable key={step.id} draggableId={step.id} index={index}>
      {(provided, snapshot) => (
        // The whole row is the handle (long-press on touch); its buttons
        // never start a drag
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'cursor-grab rounded-lg',
            snapshot.isDragging &&
              'fx-card-lift bg-base-100 ring-1 ring-primary/35',
          )}
        >
          <ProjectStep step={step} />
        </div>
      )}
    </Draggable>
  );

  const renderPath = () => {
    if (steps.length === 0) {
      return (
        <EmptyState
          variant="inline"
          icon={<MapIcon className="size-4" />}
          title={t('noStepsTitle')}
          description={t('noStepsDescription')}
          action={
            <button
              type="button"
              onClick={() => openAddStep(project.id)}
              className="btn btn-primary btn-sm"
            >
              <PlusIcon className="size-4" />
              {t('addFirstStep')}
            </button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-1">
        {doneSteps.map(step => (
          <ProjectStep key={step.id} step={step} />
        ))}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={STEP_LIST_DROPPABLE_ID}>
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-1"
              >
                {openSteps.map(renderOpenStep)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-3.5 px-3.5 py-3 md:px-[22px] md:pt-[18px] md:pb-[22px]">
      <button
        type="button"
        onClick={showProjectList}
        className="fx-num flex cursor-pointer items-center gap-1 self-start text-[11px] text-base-content/50 hover:text-base-content md:hidden"
      >
        <ChevronLeftIcon className="size-3" />
        {t('allProjects')}
      </button>
      {renderNoPlanBanner()}
      {renderHeader()}
      {renderAllStepsDone()}
      {renderPath()}
      {steps.length > 0 && (
        <button
          type="button"
          onClick={() => openAddStep(project.id)}
          className={cn(OUTLINE_BUTTON, 'w-full md:w-auto md:self-start')}
        >
          <PlusIcon className="size-4" />
          {t('addStep')}
        </button>
      )}
    </div>
  );
};
