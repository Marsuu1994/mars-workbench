import {useTranslations} from 'next-intl';
import {LinkTabBar} from '@/components/ui/LinkTabBar';
import {cn} from '@/components/ui/cn';
import {PROJECTS_HREF} from '@/utils/planUtils';

/** The Plan hub's two tabs: the week's plan form, and the projects. */
export const PlanHubTab = {
  THIS_WEEK: 'THIS_WEEK',
  PROJECTS: 'PROJECTS',
} as const;
export type PlanHubTab = (typeof PlanHubTab)[keyof typeof PlanHubTab];

interface PlanHubTabsProps {
  activeTab: PlanHubTab;
  /** The plan form's route — the active plan's, or a new plan's */
  thisWeekHref: string;
  className?: string;
}

/**
 * This week · Projects, configured once so the plan form's tabs row and the
 * Projects page header always show the same tabs. Stretched to full width
 * below md. Neither client nor async: server (PlanChrome) and client
 * (ProjectsHeader) trees both render it.
 */
export const PlanHubTabs = ({
  activeTab,
  thisWeekHref,
  className,
}: PlanHubTabsProps) => {
  const t = useTranslations('PlanHub');
  const hrefByTab: Record<PlanHubTab, string> = {
    [PlanHubTab.THIS_WEEK]: thisWeekHref,
    [PlanHubTab.PROJECTS]: PROJECTS_HREF,
  };

  return (
    <LinkTabBar
      ariaLabel={t('tabsLabel')}
      tabs={[
        {label: t('thisWeek'), href: thisWeekHref},
        {label: t('projects'), href: PROJECTS_HREF},
      ]}
      activeHref={hrefByTab[activeTab]}
      className={cn(
        'max-md:flex max-md:w-full max-md:[&>a]:flex-1 max-md:[&>a]:text-center',
        className,
      )}
    />
  );
};
