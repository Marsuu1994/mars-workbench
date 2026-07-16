'use client';

import {useTranslations} from 'next-intl';
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {TRACK_TARGETS} from '@/components/domain/priorities/constants';

interface MobileTrackPanelProps {
  task: TaskItem;
  hasActivePlan: boolean;
}

/**
 * The mobile track-this-week sheet's body, rendered inline as a phone-width
 * card inside a scenario frame. Mirrors the live MobileTrackSheet (summary +
 * track targets + no-plan warning) but without the top-layer <dialog>, so it
 * stays inside the frame and inherits its inertness.
 */
export const MobileTrackPanel = ({
  task,
  hasActivePlan,
}: MobileTrackPanelProps) => {
  const t = useTranslations('Priorities');
  const tStatus = useTranslations('Enums.TaskStatus');
  const tSize = useTranslations('Enums.TaskSize');

  const meta = [
    task.description,
    tSize(task.size),
    t('sheetPoints', {points: task.points}),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex h-full flex-col justify-end bg-base-200/20 p-3">
      <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-base-content/10 bg-base-100 px-4 pt-4 pb-6 shadow-lg">
        <h3 className="text-[15px] font-bold">{task.title}</h3>
        <p className="text-xs text-base-content/60 mt-0.5 mb-4">{meta}</p>
        <SectionLabel className="block mb-2">{t('trackTitle')}</SectionLabel>
        {!hasActivePlan && (
          <p className="flex items-center gap-1.5 text-xs text-warning mb-2">
            <ExclamationTriangleIcon className="size-3.5 flex-shrink-0" />
            {t('noPlanTooltip')}
          </p>
        )}
        {TRACK_TARGETS.map(({status, dotClass}) => (
          <button
            key={status}
            type="button"
            disabled={!hasActivePlan}
            className="flex items-center gap-2.5 w-full px-3.5 py-3 mb-2 rounded-card border border-base-content/10 bg-base-100 text-sm font-medium transition-colors enabled:cursor-pointer enabled:hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${dotClass}`}
            />
            {tStatus(status)}
            <ArrowRightIcon className="size-4 ml-auto text-base-content/40" />
          </button>
        ))}
      </div>
    </div>
  );
};
