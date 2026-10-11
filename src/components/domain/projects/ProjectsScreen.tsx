import type {ProjectsPageData} from '@/types/projects';
import {getThisWeekHref} from '@/utils/planUtils';
import {ProjectsContainer} from './ProjectsContainer';

interface ProjectsScreenProps extends ProjectsPageData {
  /** The project the route opens (/kanban/projects/[id]); null on the list */
  selectedProjectId: string | null;
  /** The week the header shows */
  periodKey: string;
}

/**
 * The Projects page's screen layer: a definite-height column (h-full against
 * AppShell's <main> — or a fill scenario frame) around the container. Shared
 * by /kanban/projects, /kanban/projects/[id] and the Projects scenarios, so
 * pages and scenarios can never drift apart.
 */
export const ProjectsScreen = ({
  activePlanId,
  selectedProjectId,
  ...props
}: ProjectsScreenProps) => (
  <div className="flex h-full flex-col">
    {/* Keyed by route: /kanban/projects/[id] → another id reuses the page,
        and the container's selection starts from the route */}
    <ProjectsContainer
      key={selectedProjectId ?? 'list'}
      {...props}
      selectedProjectId={selectedProjectId}
      activePlanId={activePlanId}
      thisWeekHref={getThisWeekHref(activePlanId)}
    />
  </div>
);
