'use client';

import {useTranslations} from 'next-intl';
import {CheckIcon} from '@heroicons/react/24/outline';
import {Banner} from '@/components/ui/Banner';
import {InlineConfirmButton} from '@/components/ui/InlineConfirmButton';

interface AllStepsDoneBannerProps {
  onArchive: () => Promise<void>;
}

/**
 * A project whose every step is done: the two ways on — add the next steps,
 * or archive it (two-click confirm). Derived from the steps; nothing is
 * archived for the user. The parent keys it by project, so a stale armed
 * Archive? resets when the project changes.
 */
export const AllStepsDoneBanner = ({onArchive}: AllStepsDoneBannerProps) => {
  const t = useTranslations('Projects.Detail');

  return (
    <Banner
      tone="success"
      outlined
      icon={<CheckIcon className="size-4 shrink-0" />}
      action={
        <InlineConfirmButton
          size="sm"
          hintSide="start"
          label={t('archive')}
          confirmLabel={t('archiveConfirm')}
          hint={t('archiveHint')}
          onConfirm={onArchive}
          className="shrink-0"
        />
      }
    >
      <span className="text-[12.5px] text-base-content/80">
        {t.rich('allStepsDone', {
          strong: chunks => (
            <strong className="font-semibold text-success">{chunks}</strong>
          ),
        })}
      </span>
    </Banner>
  );
};
