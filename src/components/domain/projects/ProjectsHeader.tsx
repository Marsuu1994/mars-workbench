import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';

interface ProjectsHeaderProps {
  /** The page's primary action, from md up (mobile puts it in the list) */
  action?: ReactNode;
}

/** The Projects page header: its title and the page action. */
export const ProjectsHeader = ({action}: ProjectsHeaderProps) => {
  const t = useTranslations('Projects');

  return (
    <div className="flex flex-shrink-0 items-center gap-4 border-b border-base-content/10 px-4 py-3 md:px-5 md:py-4">
      <h1 className="fx-display text-[22px] font-bold md:text-xl">
        {t('title')}
      </h1>
      {action && <div className="ml-auto hidden md:block">{action}</div>}
    </div>
  );
};
