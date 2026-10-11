import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {SectionLabel} from '@/components/ui/SectionLabel';

interface ProjectListProps {
  /** The active projects' items */
  children: ReactNode;
  /** The archived projects' rows, listed apart at the bottom */
  archived?: ReactNode;
  /** Mobile only, under the active projects (the page action) */
  mobileFooter?: ReactNode;
}

/** The list pane: active projects, then the Archived section. A frame — the
    container renders the items into it. */
export const ProjectList = ({
  children,
  archived,
  mobileFooter,
}: ProjectListProps) => {
  const t = useTranslations('Projects.List');

  return (
    <div className="flex flex-col gap-2 p-3.5">
      {children}
      {mobileFooter && <div className="md:hidden">{mobileFooter}</div>}
      {archived && (
        <>
          <SectionLabel className="mt-2 px-0.5">{t('archived')}</SectionLabel>
          {archived}
        </>
      )}
    </div>
  );
};
