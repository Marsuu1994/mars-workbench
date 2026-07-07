'use client';

import {useTranslations} from 'next-intl';
import {ArrowRightIcon} from '@heroicons/react/24/outline';
import type {TrackTargetStatus} from '@/schemas';
import {Popover} from '@/components/ui/overlay/Popover';
import {TRACK_TARGETS} from './constants';

interface TrackPopoverProps {
  onTrack: (status: TrackTargetStatus) => void;
}

/**
 * Desktop track-this-week popover, anchored below a matrix card's send button.
 * Offers the two board target columns (Todo / In Progress).
 */
export default function TrackPopover({onTrack}: TrackPopoverProps) {
  const t = useTranslations('Priorities');
  const tStatus = useTranslations('Enums.TaskStatus');

  return (
    <Popover className="flex flex-col gap-1.5 min-w-[180px]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 mb-0.5">
        {t('trackTitle')}
      </span>
      {TRACK_TARGETS.map(({status, dotClass}) => (
        <button
          key={status}
          type="button"
          onClick={e => {
            e.stopPropagation();
            onTrack(status);
          }}
          className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-base-content/10 bg-base-100 text-xs font-medium cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          {tStatus(status)}
          <ArrowRightIcon className="size-3.5 ml-auto text-base-content/40" />
        </button>
      ))}
    </Popover>
  );
}
