import {createContext, use} from 'react';

/**
 * What the Projects page's components read and do without threading it
 * through props: the week + This week schedules into, and every write and
 * navigation, bound to the page's optimistic steps, its URL and its open
 * modal. `ProjectsPage` provides it; the rows still come down as props.
 */
export interface ProjectsPageContextValue {
  /** The plan + This week schedules into; null: no plan this week yet */
  activePlanId: string | null;
  /** Selects a project; on mobile, opens its detail */
  showProject: (projectId: string) => void;
  /** Mobile's "‹ All projects" */
  showProjectList: () => void;
  openNewProject: () => void;
  openEditProject: (projectId: string) => void;
  openAddStep: (projectId: string) => void;
  openEditStep: (stepId: string) => void;
  scheduleStep: (stepId: string) => void;
  takeStepBack: (stepId: string) => void;
  /** A dragged step goes right before `beforeStepId`, or last without one */
  moveStep: (stepId: string, beforeStepId: string | undefined) => void;
  /** Resolves once the project is archived (the banner waits on it) */
  archiveProject: (projectId: string) => Promise<void>;
  /** Resolves once the project is back (the row waits on it) */
  unarchiveProject: (projectId: string) => Promise<void>;
}

export const ProjectsPageContext =
  createContext<ProjectsPageContextValue | null>(null);

/** The Projects page's context; only its components render inside it. */
export const useProjectsPageContext = (): ProjectsPageContextValue => {
  const context = use(ProjectsPageContext);
  if (!context) {
    throw new Error('useProjectsPageContext must be used within ProjectsPage');
  }
  return context;
};
