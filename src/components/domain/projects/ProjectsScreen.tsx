import type {ProjectsPageData} from '@/types/projects';
import {ProjectsContainer} from './ProjectsContainer';

/**
 * The Projects page's screen layer: a definite-height column (h-full against
 * AppShell's <main> — or a fill scenario frame) around the container.
 */
export const ProjectsScreen = (props: ProjectsPageData) => (
  <div className="flex h-full flex-col">
    <ProjectsContainer {...props} />
  </div>
);
