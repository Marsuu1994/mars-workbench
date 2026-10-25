import {ProjectsPage} from '@/components/domain/projects/ProjectsPage';
import {fetchProjectsPageAction} from '@/actions/projectActions';

export default async function KanbanProjectsPage() {
  const projectsPage = await fetchProjectsPageAction();

  return <ProjectsPage {...projectsPage} />;
}
