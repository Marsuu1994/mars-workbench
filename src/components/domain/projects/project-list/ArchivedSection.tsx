'use client';

import {useId, useState} from 'react';
import {useTranslations} from 'next-intl';
import {ChevronRightIcon} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import type {TaskItem} from '@/lib/db/tasks';
import {Pill} from '@/components/ui/Pill';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {cn} from '@/components/ui/cn';
import {ArchivedProjectRow} from './ArchivedProjectRow';

interface ArchivedSectionProps {
  archivedProjects: ProjectItem[];
  /** A project's steps, in step order */
  stepsOf: (projectId: string) => TaskItem[];
  /** Opens on mount: with no active project, unarchiving is what's left */
  isOpenByDefault: boolean;
}

/**
 * The archived projects as an accordion: a header (chevron, Archived, the
 * count) that opens to their rows. Open or closed is page state only — every
 * visit starts from the default.
 */
export const ArchivedSection = ({
  archivedProjects,
  stepsOf,
  isOpenByDefault,
}: ArchivedSectionProps) => {
  const t = useTranslations('Projects.List');
  const [isOpen, setIsOpen] = useState(isOpenByDefault);
  const panelId = useId();

  const renderHeader = () => (
    <button
      type="button"
      onClick={() => setIsOpen(prev => !prev)}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className="group flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-field px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ChevronRightIcon
        className={cn(
          'size-3 shrink-0 stroke-2 text-base-content/50 transition-transform group-hover:text-primary',
          isOpen && 'rotate-90',
        )}
      />
      <SectionLabel className="group-hover:text-primary">
        {t('archived')}
      </SectionLabel>
      <Pill color="muted">{archivedProjects.length}</Pill>
      <span aria-hidden="true" className="h-px flex-1 bg-base-content/10" />
    </button>
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      {renderHeader()}
      {isOpen && (
        <div id={panelId} className="flex flex-col gap-2">
          {archivedProjects.map(project => (
            <ArchivedProjectRow
              key={project.id}
              project={project}
              steps={stepsOf(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
