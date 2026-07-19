'use client';

import {useTranslations} from 'next-intl';
import {InboxArrowDownIcon} from '@heroicons/react/24/outline';

interface DumpTitleBarProps {
  totalCount: number;
}

/** Icon + title + subtitle + total-entries count (mirrors the priorities
 *  title bar); the count's number is bolded via the `<num>` rich chunk. */
export const DumpTitleBar = ({totalCount}: DumpTitleBarProps) => {
  const t = useTranslations('Dump');
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 md:py-3 border-b border-base-content/10 flex-shrink-0">
      <div className="flex size-9 items-center justify-center rounded-[10px] bg-secondary/10 flex-shrink-0">
        <InboxArrowDownIcon className="size-[18px] text-secondary" />
      </div>
      <div className="flex flex-col min-w-0 flex-1 md:flex-initial">
        <span className="text-base font-bold truncate">{t('title')}</span>
        <span className="hidden md:block text-xs text-base-content/50 truncate">
          {t('subtitle')}
        </span>
      </div>
      <span className="ml-auto text-xs font-semibold text-base-content/60 shrink-0">
        <span className="text-[13px] font-bold text-base-content">
          {totalCount}
        </span>{' '}
        {t('entryCount', {count: totalCount})}
      </span>
    </div>
  );
};
