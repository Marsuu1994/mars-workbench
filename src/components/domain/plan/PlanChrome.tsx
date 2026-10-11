import type {ReactNode} from 'react';
import {getTranslations} from 'next-intl/server';
import {Pill} from '@/components/ui/Pill';
import {PlanHubTab, PlanHubTabs} from '@/components/domain/shared/PlanHubTabs';

interface PlanChromeProps {
  /** The Plan hub's This week tab — the active plan's form, or a new one's */
  thisWeekHref: string;
  children: ReactNode;
}

/**
 * The plans screens' chrome: fixed planning-mode header, the Plan hub's tabs
 * row (This week active) + the scrollable form body. h-full (not h-screen):
 * fills <main>'s dock-padded box — or a fill scenario frame — exactly, so the
 * header stays put and only the inner form body scrolls (single scrollbar).
 * Shared by the /kanban/plans layout and the plan scenarios so the two can
 * never drift apart.
 */
export const PlanChrome = async ({thisWeekHref, children}: PlanChromeProps) => {
  const t = await getTranslations('Board.Header');

  return (
    <div className="flex flex-col h-full">
      {/* Same header on both breakpoints (matches BoardHeader's responsive sizing) */}
      <div className="flex items-center justify-between px-4 py-2 md:py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold">
            <span className="text-success">{t('titlePrefix')}</span>
            {t('titleSuffix')}
          </h1>
          <Pill color="error" size="md" className="rounded-full">
            {t('planningMode')}
          </Pill>
        </div>
      </div>
      <div className="flex px-4 py-2 border-b border-base-content/10">
        <PlanHubTabs
          activeTab={PlanHubTab.THIS_WEEK}
          thisWeekHref={thisWeekHref}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  );
};
