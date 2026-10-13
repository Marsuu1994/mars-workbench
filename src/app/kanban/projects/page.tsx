import {ProjectsPage} from '@/components/domain/projects/ProjectsPage';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {fetchProjectsPage} from '@/services/projectService';

export default async function KanbanProjectsPage() {
  const userId = await getCurrentUserId();
  const projectsPage = await fetchProjectsPage(userId);

  return <ProjectsPage {...projectsPage} />;
}
