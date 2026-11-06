'use client';

import {useTranslations} from 'next-intl';
import type {BacklogGroup, BacklogGroups} from '@/utils/boardCardUtils';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {BacklogGroupCard, type BacklogVariant} from './BacklogGroupCard';

interface BacklogGroupListProps {
  groups: BacklogGroups;
  variant: BacklogVariant;
}

/**
 * The backlog's groups in two sections, habits first, then projects and
 * one-offs — each section under its label, the groups numbered on through
 * both for the drag list. Renders into its host's flex column.
 */
export const BacklogGroupList = ({groups, variant}: BacklogGroupListProps) => {
  const t = useTranslations('Board.Backlog');
  const {habitGroups, otherGroups} = groups;

  const renderSection = (
    label: string,
    sectionGroups: BacklogGroup[],
    firstIndex: number,
  ) =>
    sectionGroups.length > 0 && (
      <>
        <div className="mx-0.5 mt-0.5 -mb-0.5 flex items-center gap-[7px]">
          <SectionLabel className="text-[10px] font-semibold tracking-[0.12em] text-base-content/50">
            {label}
          </SectionLabel>
          <span className="h-px flex-1 bg-base-content/10" />
        </div>
        {sectionGroups.map((group, offset) => (
          <BacklogGroupCard
            key={group.key}
            group={group}
            index={firstIndex + offset}
            variant={variant}
          />
        ))}
      </>
    );

  return (
    <>
      {renderSection(t('habitsSection'), habitGroups, 0)}
      {renderSection(t('othersSection'), otherGroups, habitGroups.length)}
    </>
  );
};
