'use client';

import {useTranslations} from 'next-intl';
import {PlusIcon} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {useProjectsPageContext} from '../ProjectsPageContext';
import {ArchivedSection} from './ArchivedSection';
import {ProjectCard} from './ProjectCard';

interface ProjectListProps {
  /** Every project, archived ones included (listed apart at the bottom) */
  projects: ProjectItem[];
  stepsByProjectId: ReadonlyMap<string, TaskItem[]>;
  /** The project shown in the detail pane */
  selectedProjectId: string | undefined;
}

const NO_STEPS: TaskItem[] = [];

/**
 * The list pane: the active projects (from md up a card — done/total, the
 * progress bar, the next step, how many are on this week, ringed when
 * selected; on mobile a row with a chevron), mobile's New project, then the
 * Archived accordion — collapsed, unless no project is active.
 */
export const ProjectList = ({
  projects,
  stepsByProjectId,
  selectedProjectId,
}: ProjectListProps) => {
  const t = useTranslations('Projects');
  const {openNewProject} = useProjectsPageContext();
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
          isSelected={project.id === selectedProjectId}
        />
      ))}
      {/* Mobile's New project, under the active projects */}
      <button
        type="button"
        onClick={openNewProject}
        className="btn btn-primary w-full md:hidden"
      >
        <PlusIcon className="size-4" />
        {t('newProject')}
      </button>
      {archivedProjects.length > 0 && (
        <ArchivedSection
          archivedProjects={archivedProjects}
          stepsOf={stepsOf}
          isOpenByDefault={activeProjects.length === 0}
        />
      )}
    </div>
  );
};
