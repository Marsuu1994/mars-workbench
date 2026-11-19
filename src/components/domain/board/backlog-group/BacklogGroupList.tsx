'use client';

import {useTranslations} from 'next-intl';
import {BacklogSection, type BacklogSections} from '@/utils/backlogGroupUtils';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {BacklogGroup, type BacklogGroupVariant} from './BacklogGroup';

interface BacklogGroupListProps {
  sections: BacklogSections;
  variant: BacklogGroupVariant;
}

const SECTION_LABEL_KEY: Record<
  BacklogSection,
  'habitsSection' | 'projectsSection'
> = {
  [BacklogSection.HABITS]: 'habitsSection',
  [BacklogSection.PROJECTS]: 'projectsSection',
};

/**
 * The backlog's groups in their sections, Habits and then Projects; a
 * section with no group in it isn't shown.
 */
export const BacklogGroupList = ({
  sections,
  variant,
}: BacklogGroupListProps) => {
  const t = useTranslations('Board.Backlog');

  const renderSection = (section: BacklogSection) => {
    const groups = sections[section];
    if (groups.length === 0) return null;
    return [
      <h4
        key={section}
        className="mx-0.5 -mb-0.5 mt-0.5 flex items-center gap-[7px]"
      >
        <SectionLabel className="text-[10px]">
          {t(SECTION_LABEL_KEY[section])}
        </SectionLabel>
        <span aria-hidden className="h-px flex-1 bg-base-content/10" />
      </h4>,
      ...groups.map(group => (
        <BacklogGroup key={group.key} group={group} variant={variant} />
      )),
    ];
  };

  return (
    <div className="flex flex-col gap-3.5">
      {renderSection(BacklogSection.HABITS)}
      {renderSection(BacklogSection.PROJECTS)}
    </div>
  );
};
