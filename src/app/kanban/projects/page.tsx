import {ProjectsScreen} from '@/components/domain/projects/ProjectsScreen';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {fetchProjectsPage} from '@/services/projectService';

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();
  const projectsPage = await fetchProjectsPage(userId);

  return <ProjectsScreen {...projectsPage} />;
}
