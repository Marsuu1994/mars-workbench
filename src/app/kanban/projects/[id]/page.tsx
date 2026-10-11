import {notFound, redirect} from 'next/navigation';
import {fetchProjectsPageAction} from '@/actions/projectActions';
import {ProjectsScreen} from '@/components/domain/projects/ProjectsScreen';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';
import {PROJECTS_HREF} from '@/utils/planUtils';

/** One project open: mobile's detail page, a preselected project on desktop. */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const projectsPage = await fetchProjectsPageAction();

  const project = projectsPage.projects.find(
    ({id: projectId}) => projectId === id,
  );
  if (!project) notFound();
  // An archived project has no detail of its own: it lives in the list
  if (project.isArchived) redirect(PROJECTS_HREF);

  return (
    <ProjectsScreen
      {...projectsPage}
      selectedProjectId={id}
      periodKey={getISOWeekKey(getTodayDate())}
    />
  );
}
