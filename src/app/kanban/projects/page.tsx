import {fetchProjectsPageAction} from '@/actions/projectActions';
import {ProjectsScreen} from '@/components/domain/projects/ProjectsScreen';
import {getISOWeekKey, getTodayDate} from '@/utils/dateUtils';

export default async function ProjectsPage() {
  const projectsPage = await fetchProjectsPageAction();

  return (
    <ProjectsScreen
      {...projectsPage}
      selectedProjectId={null}
      periodKey={getISOWeekKey(getTodayDate())}
    />
  );
}
