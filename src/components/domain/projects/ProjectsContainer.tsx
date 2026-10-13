'use client';

import {useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import {MapIcon, PlusIcon} from '@heroicons/react/24/outline';
import type {ProjectsPageData} from '@/types/projects';
import {assignStepNumbers} from '@/utils/projectUtils';
import {toProjectsView} from '@/utils/projectViewUtils';
import {
  archiveProjectAction,
  reorderProjectStepsAction,
  scheduleProjectStepAction,
  unarchiveProjectAction,
  unscheduleProjectStepAction,
} from '@/actions/projectActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import {EmptyState} from '@/components/ui/EmptyState';
import {cn} from '@/components/ui/cn';
import {AllStepsDoneBanner} from './AllStepsDoneBanner';
import {ArchivedProjectRow} from './ArchivedProjectRow';
import {DraggableStepRow} from './DraggableStepRow';
import {NoActivePlanBanner} from './NoActivePlanBanner';
import {ProjectDetail} from './ProjectDetail';
import {ProjectDetailHeader} from './ProjectDetailHeader';
import {ProjectList} from './ProjectList';
import {ProjectListItem} from './ProjectListItem';
import {ProjectModal} from './ProjectModal';
import {ProjectStepList} from './ProjectStepList';
import {ProjectStepRow} from './ProjectStepRow';
import {ProjectsHeader} from './ProjectsHeader';
import {ProjectsPanes} from './ProjectsPanes';
import {StepModal, type StepModalTarget} from './StepModal';
import {getProjectHref, OUTLINE_BUTTON, PROJECTS_HREF} from './constants';

type ProjectsContainerProps = ProjectsPageData;

/** Which modal is open, and on what. */
type OpenModal =
  | {kind: 'newProject'}
  | {kind: 'editProject'; projectId: string}
  | {kind: 'addStep'; projectId: string}
  | {kind: 'editStep'; stepId: string};

/**
 * The Projects page's container: keeps the steps as client state (patched
 * optimistically by + This week, × and reorder), the desktop selection and
 * the open modal, derives the view with toProjectsView and renders it into
 * the page's frames. Project rows only change through the modals, so they
 * wait for revalidation instead of becoming state.
 */
export const ProjectsContainer = ({
  projects,
  steps,
  activePlanId,
}: ProjectsContainerProps) => {
  const t = useTranslations('Projects');
  // The selected project lives in the URL (?project=): refresh keeps it,
  // back steps through earlier selections; mobile shows its detail
  const selectedProjectId = useSearchParams().get('project');
  const {
    localTasks: localSteps,
    runOptimisticTaskUpdate,
    runOptimisticTasksUpdate,
  } = useOptimisticTasks(steps);
  const [openModal, setOpenModal] = useState<OpenModal | null>(null);

  const {activeProjects, archivedProjects, selectedProject} = useMemo(
    () =>
      toProjectsView(projects, localSteps, {activePlanId, selectedProjectId}),
    [projects, localSteps, activePlanId, selectedProjectId],
  );

  const closeModal = () => setOpenModal(null);

  // Client-side only: Next's router follows pushState without a request
  const showProject = (projectId: string) =>
    window.history.pushState(null, '', getProjectHref(projectId));

  const handleProjectSaved = (projectId: string) => {
    if (openModal?.kind === 'newProject') showProject(projectId);
  };

  // Back to the list: the first active project takes the selection
  const handleArchived = () =>
    window.history.replaceState(null, '', PROJECTS_HREF);

  const handleArchive = async (projectId: string) => {
    const result = await archiveProjectAction(projectId);
    if (result.error) {
      console.error('Failed to archive project:', result.error);
      return;
    }
    handleArchived();
  };

  const handleUnarchive = async (projectId: string) => {
    const result = await unarchiveProjectAction(projectId);
    if (result.error) {
      console.error('Failed to unarchive project:', result.error);
      return;
    }
    showProject(projectId);
  };

  const handleSchedule = (stepId: string) =>
    runOptimisticTaskUpdate(
      stepId,
      {planId: activePlanId},
      () => scheduleProjectStepAction(stepId),
      'Failed to schedule step:',
    );

  const handleTakeBack = (stepId: string) =>
    runOptimisticTaskUpdate(
      stepId,
      {planId: null},
      () => unscheduleProjectStepAction(stepId),
      'Failed to take step off the week:',
    );

  // Optimistic, and synchronous here: the dnd library needs the new order in
  // onDragEnd or the row springs back first. The open steps take over the
  // numbers they hold, exactly as the server renumbers them.
  function handleDragEnd({source, destination}: DropResult) {
    if (!selectedProject || !destination) return;
    if (destination.index === source.index) return;

    const {header, openSteps} = selectedProject;
    const orderedStepIds = openSteps.map(({step}) => step.id);
    const [movedStepId] = orderedStepIds.splice(source.index, 1);
    orderedStepIds.splice(destination.index, 0, movedStepId);

    const numberByStepId = assignStepNumbers(
      orderedStepIds,
      openSteps.map(({step}) => step.instanceIndex),
    );
    runOptimisticTasksUpdate(
      Object.fromEntries(
        [...numberByStepId].map(([stepId, number]) => [
          stepId,
          {instanceIndex: number},
        ]),
      ),
      () => reorderProjectStepsAction(header.id, {stepIds: orderedStepIds}),
      'Failed to reorder steps:',
    );
  }

  // Full width at the foot of the mobile list; compact everywhere else
  const renderNewProjectButton = (isBlock = false) => (
    <button
      type="button"
      onClick={() => setOpenModal({kind: 'newProject'})}
      className={isBlock ? 'btn btn-primary w-full' : 'btn btn-primary btn-sm'}
    >
      <PlusIcon className="size-4" />
      {t('newProject')}
    </button>
  );

  const renderEmptyState = () => (
    <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-6 py-15">
      <EmptyState
        variant="inline"
        className="max-w-[460px]"
        icon={<MapIcon className="size-4" />}
        title={t('Empty.title')}
        description={t('Empty.description')}
        action={
          <>
            {renderNewProjectButton()}
            <span className="fx-num text-[11px]">{t('Empty.claudeHint')}</span>
          </>
        }
      />
    </div>
  );

  const renderList = () => (
    <ProjectList
      mobileFooter={renderNewProjectButton(true)}
      archived={
        archivedProjects.length > 0 &&
        archivedProjects.map(project => (
          <ArchivedProjectRow
            key={project.id}
            project={project}
            onUnarchive={() => handleUnarchive(project.id)}
          />
        ))
      }
    >
      {activeProjects.map(project => (
        <ProjectListItem
          key={project.id}
          project={project}
          isSelected={project.id === selectedProject?.header.id}
          href={getProjectHref(project.id)}
          onSelect={() => showProject(project.id)}
        />
      ))}
    </ProjectList>
  );

  const renderNoActiveProjects = () => (
    <div className="p-3.5 md:p-[22px]">
      <EmptyState
        variant="inline"
        icon={<MapIcon className="size-4" />}
        title={t('Empty.noActiveTitle')}
        description={t('Empty.noActiveDescription')}
        action={renderNewProjectButton()}
      />
    </div>
  );

  const renderAddStepButton = (isFirstStep: boolean) => (
    <button
      type="button"
      onClick={() =>
        selectedProject &&
        setOpenModal({kind: 'addStep', projectId: selectedProject.header.id})
      }
      className={
        isFirstStep
          ? 'btn btn-primary btn-sm'
          : cn(OUTLINE_BUTTON, 'w-full md:w-auto md:self-start')
      }
    >
      <PlusIcon className="size-4" />
      {isFirstStep ? t('Detail.addFirstStep') : t('Detail.addStep')}
    </button>
  );

  const renderPath = () => {
    if (!selectedProject) return null;
    const {header, doneSteps, openSteps} = selectedProject;

    if (header.stepCount === 0) {
      return (
        <EmptyState
          variant="inline"
          icon={<MapIcon className="size-4" />}
          title={t('Detail.noStepsTitle')}
          description={t('Detail.noStepsDescription')}
          action={renderAddStepButton(true)}
        />
      );
    }

    const openEditStep = (stepId: string) =>
      setOpenModal({kind: 'editStep', stepId});

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <ProjectStepList
          doneRows={doneSteps.map(row => (
            <ProjectStepRow key={row.step.id} row={row} />
          ))}
        >
          {openSteps.map((row, index) => (
            <DraggableStepRow
              key={row.step.id}
              stepId={row.step.id}
              index={index}
            >
              <ProjectStepRow
                row={row}
                onEdit={() => openEditStep(row.step.id)}
                onSchedule={() => handleSchedule(row.step.id)}
                onTakeBack={() => handleTakeBack(row.step.id)}
              />
            </DraggableStepRow>
          ))}
        </ProjectStepList>
      </DragDropContext>
    );
  };

  const renderDetail = () => {
    if (!selectedProject) return renderNoActiveProjects();
    const {header, isAllStepsDone} = selectedProject;

    return (
      <ProjectDetail
        backHref={PROJECTS_HREF}
        pageNotice={activePlanId === null && <NoActivePlanBanner />}
        header={
          <ProjectDetailHeader
            project={header}
            onEdit={() =>
              setOpenModal({kind: 'editProject', projectId: header.id})
            }
          />
        }
        projectNotice={
          isAllStepsDone && (
            <AllStepsDoneBanner
              key={header.id}
              onArchive={() => handleArchive(header.id)}
            />
          )
        }
        footer={header.stepCount > 0 && renderAddStepButton(false)}
      >
        {renderPath()}
      </ProjectDetail>
    );
  };

  const renderProjectModal = () => {
    const editedProject =
      openModal?.kind === 'editProject'
        ? projects.find(({id}) => id === openModal.projectId)
        : undefined;
    return (
      <ProjectModal
        isOpen={openModal?.kind === 'newProject' || editedProject !== undefined}
        mode={editedProject ? 'edit' : 'create'}
        project={editedProject}
        onClose={closeModal}
        onSaved={handleProjectSaved}
        onArchived={handleArchived}
      />
    );
  };

  const getStepModalTarget = (): StepModalTarget | null => {
    switch (openModal?.kind) {
      case 'addStep': {
        if (selectedProject?.header.id !== openModal.projectId) return null;
        const {header, nextStepNumber} = selectedProject;
        return {
          mode: 'add',
          project: {id: header.id, title: header.title},
          stepNumber: nextStepNumber,
        };
      }
      case 'editStep': {
        const step = localSteps.find(({id}) => id === openModal.stepId);
        const project = projects.find(({id}) => id === step?.projectId);
        if (!step || !project) return null;
        return {
          mode: 'edit',
          project: {id: project.id, title: project.title},
          stepNumber: step.instanceIndex,
          step,
        };
      }
      default:
        return null;
    }
  };

  return (
    <>
      <ProjectsHeader action={renderNewProjectButton()} />
      {projects.length === 0 ? (
        renderEmptyState()
      ) : (
        <ProjectsPanes
          list={renderList()}
          detail={renderDetail()}
          mobilePane={
            selectedProject?.header.id === selectedProjectId ? 'detail' : 'list'
          }
        />
      )}
      {renderProjectModal()}
      <StepModal
        target={getStepModalTarget()}
        onClose={closeModal}
        onSaved={closeModal}
      />
    </>
  );
};
