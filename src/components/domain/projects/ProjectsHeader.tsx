import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {getWeekDateRange, getWeekNumberFromPeriodKey} from '@/utils/dateUtils';
import {PlanHubTab, PlanHubTabs} from '@/components/domain/shared/PlanHubTabs';

interface ProjectsHeaderProps {
  /** The week shown beside the title */
  periodKey: string;
  /** The Plan hub's This week tab */
  thisWeekHref: string;
  /** The page's primary action, from md up (mobile puts it in the list) */
  action?: ReactNode;
}

/**
 * The Projects page header: "Plan" with the week, the Plan hub's tabs
 * (Projects active) and the page action. From md up one row; on mobile the
 * title row with the week number, then the tabs at full width.
 */
export const ProjectsHeader = ({
  periodKey,
  thisWeekHref,
  action,
}: ProjectsHeaderProps) => {
  const t = useTranslations('PlanHub');

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-base-content/10 px-4 py-3 md:px-5 md:py-4">
      <div className="flex flex-1 items-baseline justify-between md:block md:flex-initial">
        <h1 className="fx-display text-[22px] font-bold md:text-xl">
          {t('title')}
        </h1>
        <div className="fx-num text-[11px] text-base-content/50 md:mt-0.5">
          <span className="md:hidden">
            {t('week', {week: getWeekNumberFromPeriodKey(periodKey)})}
          </span>
          <span className="hidden md:inline">
            {getWeekDateRange(periodKey)}
          </span>
        </div>
      </div>
      <div className="flex w-full items-center gap-2.5 md:ml-auto md:w-auto">
        <PlanHubTabs
          activeTab={PlanHubTab.PROJECTS}
          thisWeekHref={thisWeekHref}
        />
        {action && <div className="hidden md:block">{action}</div>}
      </div>
    </div>
  );
};
