'use client';

import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {CheckIcon, ArrowRightIcon} from '@heroicons/react/24/outline';
import {useAiPlanChatStore} from '@/store/aiPlanChatStore';
import {summarizeDraftTemplates} from '@/utils/draftSummary';

/** Success banner shown after the plan is created. */
export const CreatedBanner = () => {
  const t = useTranslations('AiChat');
  const router = useRouter();
  const latestDraft = useAiPlanChatStore(state => state.latestDraft);
  const close = useAiPlanChatStore(state => state.close);

  const {total, newCount, existing} = summarizeDraftTemplates(
    latestDraft?.draftTemplates ?? [],
  );

  const handleViewBoard = () => {
    close();
    router.push('/kanban');
  };

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-base-content/10 bg-success/10 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-content">
          <CheckIcon className="size-4 stroke-2" />
        </span>
        <div>
          <div className="text-[13px] font-semibold">{t('createdTitle')}</div>
          <div className="text-xs text-base-content/60">
            {t('createdSummary', {total, newCount, existing})}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleViewBoard}
        className="btn btn-primary btn-sm"
      >
        {t('viewBoardLabel')}
        <ArrowRightIcon className="size-4" />
      </button>
    </div>
  );
};
