'use client';

import {useTranslations} from 'next-intl';
import {getWeekDateRange} from '@/utils/dateUtils';
import {Pill} from '@/components/ui/Pill';

interface BoardHeaderProps {
  periodKey: string;
}

export default function BoardHeader({periodKey}: BoardHeaderProps) {
  const t = useTranslations('Board.Header');
  const dateRange = getWeekDateRange(periodKey);

  return (
    <div className="flex items-center px-4 py-2 md:py-3 border-b border-base-content/10">
      <div className="flex items-center justify-between flex-1 md:flex-initial md:justify-start gap-3">
        <h1 className="fx-display text-lg md:text-xl font-bold">
          <span className="text-primary md:text-success">
            {t('titlePrefix')}
          </span>
          {t('titleSuffix')}
        </h1>
        {/* Accent drift (primary on mobile, success on desktop) is tracked
            in the tracker's uniform-page-header item — keep as-is for now. */}
        <Pill
          color="primary"
          size="md"
          className="rounded-full md:text-success"
        >
          {dateRange}
        </Pill>
      </div>
    </div>
  );
}
