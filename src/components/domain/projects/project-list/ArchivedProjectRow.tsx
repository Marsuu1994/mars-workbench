'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {countDoneSteps} from '@/utils/projectUtils';
import {cn} from '@/components/ui/cn';
import {useProjectsPageContext} from '../ProjectsPageContext';
import {OUTLINE_BUTTON} from '../constants';

interface ArchivedProjectRowProps {
  project: ProjectItem;
  steps: TaskItem[];
}

/** An archived project: its title and progress, and Unarchive. */
export const ArchivedProjectRow = ({
  project,
  steps,
}: ArchivedProjectRowProps) => {
  const t = useTranslations('Projects.List');
  const {unarchiveProject} = useProjectsPageContext();
  const [isPending, setIsPending] = useState(false);

  // The button waits until the project is back in the list
  async function handleUnarchive() {
    setIsPending(true);
    await unarchiveProject(project.id);
    setIsPending(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-box border border-dashed border-base-content/10 px-3 py-[9px] text-[13px] text-base-content/60">
      <span className="min-w-0 flex-1 truncate">
        {t('archivedRow', {
          title: project.title,
          done: countDoneSteps(steps),
          total: steps.length,
        })}
      </span>
      <button
        type="button"
        onClick={handleUnarchive}
        disabled={isPending}
        className={cn(OUTLINE_BUTTON, 'btn-sm')}
      >
        {t('unarchive')}
      </button>
    </div>
  );
};
