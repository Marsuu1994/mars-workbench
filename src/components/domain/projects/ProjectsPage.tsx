'use client';

import {useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {MapIcon, PlusIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import type {ProjectsPageData} from '@/types/projects';
import {
  applyStepPatch,
  getNextStepNumber,
  groupStepsByProjectId,
  numberStepPath,
} from '@/utils/projectUtils';
import {
  archiveProjectAction,
  moveProjectStepAction,
  scheduleProjectStepAction,
  unarchiveProjectAction,
  unscheduleProjectStepAction,
} from '@/actions/projectActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import {useWaitForFreshData} from '@/hooks/useWaitForFreshData';
import {EmptyState} from '@/components/ui/EmptyState';
import {cn} from '@/components/ui/cn';
import {ProjectDetail} from './project-detail/ProjectDetail';
import {ProjectList} from './project-list/ProjectList';
import {ProjectModal} from './project-modal/ProjectModal';
import {StepModal, type StepModalTarget} from './step-modal/StepModal';
import {getProjectHref, PROJECTS_HREF} from './constants';

/** Which modal is open, and on what. */
type OpenModal =
  | {kind: 'newProject'}
  | {kind: 'editProject'; projectId: string}
  | {kind: 'addStep'; projectId: string}
  | {kind: 'editStep'; stepId: string};

const NO_STEPS: TaskItem[] = [];

/**
 * The Projects page (/kanban/projects): the list beside the selected
 * project's path from md up, one of the two on mobile. Owns the page's
 * state — the steps as client state (+ This week, × and moves patch them
 * optimistically), the open modal — and every write. The selected project
 * is the URL's `?project=`, changed on the client: refresh keeps it, back
 * steps through earlier selections, and nothing waits on the server.
 */
export const ProjectsPage = ({
  projects,
  steps,
  activePlanId,
}: ProjectsPageData) => {
  const t = useTranslations('Projects');
  const projectParam = useSearchParams().get('project');
  const {
    localTasks: localSteps,
    runOptimisticTaskUpdate,
    runOptimisticTasksUpdate,
  } = useOptimisticTasks(steps);
  const [openModal, setOpenModal] = useState<OpenModal | null>(null);
  const waitForFreshProjects = useWaitForFreshData(projects);

  const stepsByProjectId = useMemo(
    () => groupStepsByProjectId(localSteps),
    [localSteps],
  );
  const stepsOf = (projectId: string) =>
    stepsByProjectId.get(projectId) ?? NO_STEPS;

  const activeProjects = projects.filter(({isArchived}) => !isArchived);
  // Desktop falls back to the newest active project; mobile shows the
  // detail only when the URL names one
  const selectedProject =
    activeProjects.find(({id}) => id === projectParam) ?? activeProjects[0];
  const isDetailOpen =
    selectedProject !== undefined && selectedProject.id === projectParam;

  const closeModal = () => setOpenModal(null);

  // Next's router follows pushState / replaceState without a request
  const showProject = (projectId: string) =>
    window.history.pushState(null, '', getProjectHref(projectId));
  const showProjectList = () =>
    window.history.pushState(null, '', PROJECTS_HREF);

  const handleProjectSaved = (projectId: string) => {
    if (openModal?.kind === 'newProject') showProject(projectId);
  };

  // An archived project leaves the URL; the first active one takes over
  const handleArchived = () =>
    window.history.replaceState(null, '', PROJECTS_HREF);

  // Awaited by the banner and the archived row, so their buttons wait until
  // the saved list has landed and the project has moved
  const handleArchive = async (projectId: string) => {
    const freshProjectsArrived = waitForFreshProjects();
    const result = await archiveProjectAction(projectId);
    if (result.error) {
      console.error('Failed to archive project:', result.error);
      return;
    }
    await freshProjectsArrived;
    handleArchived();
  };

  const handleUnarchive = async (projectId: string) => {
    const freshProjectsArrived = waitForFreshProjects();
    const result = await unarchiveProjectAction(projectId);
    if (result.error) {
      console.error('Failed to unarchive project:', result.error);
      return;
    }
    await freshProjectsArrived;
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

  // The path is renumbered by the same applyStepPatch the server runs, so the
  // optimistic numbers are the ones that land
  function handleMove(stepId: string, beforeStepId: string | undefined) {
    if (!selectedProject) return;
    const {path} = applyStepPatch(stepsOf(selectedProject.id), {
      addSteps: [],
      moveSteps: [{stepId, beforeStepId}],
      updateStepIds: [],
      removeStepIds: [],
    });
    const {numberByStepId} = numberStepPath(path);
    runOptimisticTasksUpdate(
      Object.fromEntries(
        [...numberByStepId].map(([pathStepId, number]) => [
          pathStepId,
          {instanceIndex: number},
        ]),
      ),
      () => moveProjectStepAction(selectedProject.id, {stepId, beforeStepId}),
      'Failed to move step:',
    );
  }

  const openNewProject = () => setOpenModal({kind: 'newProject'});

  const renderHeader = () => (
    <div className="flex flex-shrink-0 items-center gap-4 border-b border-base-content/10 px-4 py-3 md:px-5 md:py-4">
      <h1 className="fx-display text-[22px] font-bold md:text-xl">
        {t('title')}
      </h1>
      {/* An empty page has one way in: its own New project */}
      {projects.length > 0 && (
        <button
          type="button"
          onClick={openNewProject}
          className="btn btn-primary btn-sm ml-auto max-md:hidden"
        >
          <PlusIcon className="size-4" />
          {t('newProject')}
        </button>
      )}
    </div>
  );

  // The board's empty state, filling the page under the header
  const renderNoProjects = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center p-10">
        <EmptyState
          icon={<MapIcon className="size-20 text-base-content/15" />}
          title={t('Empty.title')}
          description={t('Empty.description')}
          action={
            <>
              <button
                type="button"
                onClick={openNewProject}
                className="btn btn-primary fx-glow mt-2"
              >
                <PlusIcon className="size-5" />
                {t('newProject')}
              </button>
              <span className="fx-num text-[11px] text-base-content/50">
                {t('Empty.claudeHint')}
              </span>
            </>
          }
        />
      </div>
    </div>
  );

  const renderNoActiveProjects = () => (
    <div className="p-3.5 md:p-[22px]">
      <EmptyState
        variant="inline"
        icon={<MapIcon className="size-4" />}
        title={t('Empty.noActiveTitle')}
        description={t('Empty.noActiveDescription')}
        action={
          <button
            type="button"
            onClick={openNewProject}
            className="btn btn-primary btn-sm"
          >
            <PlusIcon className="size-4" />
            {t('newProject')}
          </button>
        }
      />
    </div>
  );

  const renderDetail = () => {
    if (!selectedProject) return renderNoActiveProjects();
    const {id: projectId} = selectedProject;
    return (
      <ProjectDetail
        // A new project starts from a fresh pane (no carried drag state)
        key={projectId}
        project={selectedProject}
        steps={stepsOf(projectId)}
        activePlanId={activePlanId}
        onBack={showProjectList}
        onEdit={() => setOpenModal({kind: 'editProject', projectId})}
        onAddStep={() => setOpenModal({kind: 'addStep', projectId})}
        onEditStep={stepId => setOpenModal({kind: 'editStep', stepId})}
        onSchedule={handleSchedule}
        onTakeBack={handleTakeBack}
        onMove={handleMove}
        onArchive={() => handleArchive(projectId)}
      />
    );
  };

  // Each pane scrolls on its own: the detail must be the step list's only
  // scroll parent (a Droppable supports one)
  const renderPanes = () => (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto md:border-r md:border-base-content/10',
          isDetailOpen && 'max-md:hidden',
        )}
      >
        <ProjectList
          projects={projects}
          stepsByProjectId={stepsByProjectId}
          activePlanId={activePlanId}
          selectedProjectId={selectedProject?.id}
          onSelect={showProject}
          onUnarchive={handleUnarchive}
          onNewProject={openNewProject}
        />
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          !isDetailOpen && 'max-md:hidden',
        )}
      >
        {renderDetail()}
      </div>
    </div>
  );

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
        freshData={projects}
        onClose={closeModal}
        onSaved={handleProjectSaved}
        onArchived={handleArchived}
      />
    );
  };

  const getStepModalTarget = (): StepModalTarget | null => {
    switch (openModal?.kind) {
      case 'addStep': {
        const project = projects.find(({id}) => id === openModal.projectId);
        if (!project) return null;
        return {
          mode: 'add',
          project: {id: project.id, title: project.title},
          stepNumber: getNextStepNumber(stepsOf(project.id)),
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
    <div className="flex h-full flex-col">
      {renderHeader()}
      {projects.length === 0 ? renderNoProjects() : renderPanes()}
      {renderProjectModal()}
      <StepModal
        target={getStepModalTarget()}
        freshData={steps}
        onClose={closeModal}
        onSaved={closeModal}
      />
    </div>
  );
};
