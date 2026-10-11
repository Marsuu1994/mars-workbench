'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {ArchivedProjectSummary} from '@/utils/projectViewUtils';
import {cn} from '@/components/ui/cn';
import {OUTLINE_BUTTON} from './constants';

interface ArchivedProjectRowProps {
  project: ArchivedProjectSummary;
  onUnarchive: () => Promise<void>;
}

/** An archived project in the list's Archived section: its title and
    progress, and Unarchive (disabled while the request runs). */
export const ArchivedProjectRow = ({
  project,
  onUnarchive,
}: ArchivedProjectRowProps) => {
  const t = useTranslations('Projects.List');
  const [isPending, setIsPending] = useState(false);
  const {title, doneCount, stepCount} = project;

  const handleUnarchive = async () => {
    setIsPending(true);
    try {
      await onUnarchive();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-box border border-dashed border-base-content/10 px-3 py-[9px] text-[13px] text-base-content/60">
      <span className="min-w-0 flex-1 truncate">
        {t('archivedRow', {title, done: doneCount, total: stepCount})}
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
