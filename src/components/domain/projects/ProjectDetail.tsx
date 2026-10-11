import type {ReactNode} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {ChevronLeftIcon} from '@heroicons/react/24/outline';

interface ProjectDetailProps {
  /** Above the header: what the page lacks (no plan this week) */
  pageNotice?: ReactNode;
  header: ReactNode;
  /** Under the header: the project's own state (All steps done) */
  projectNotice?: ReactNode;
  /** The path (or its empty state) */
  children: ReactNode;
  /** Under the path (Add step) */
  footer?: ReactNode;
  /** Mobile's way back to the list */
  backHref: string;
}

/** The detail pane: one project's header, notices and path. A frame — the
    container renders the pieces into it. Mobile leads with "‹ All projects". */
export const ProjectDetail = ({
  pageNotice,
  header,
  projectNotice,
  children,
  footer,
  backHref,
}: ProjectDetailProps) => {
  const t = useTranslations('Projects.Detail');

  return (
    <div className="flex min-w-0 flex-col gap-3.5 px-3.5 py-3 md:px-[22px] md:pt-[18px] md:pb-[22px]">
      <Link
        href={backHref}
        className="fx-num flex items-center gap-1 self-start text-[11px] text-base-content/50 hover:text-base-content md:hidden"
      >
        <ChevronLeftIcon className="size-3" />
        {t('allProjects')}
      </Link>
      {pageNotice}
      {header}
      {projectNotice}
      {children}
      {footer}
    </div>
  );
};
