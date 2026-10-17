'use client';

import {useTranslations} from 'next-intl';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {
  ReviewChangesPanel,
  type ReviewChangesPanelProps,
} from './ReviewChangesPanel';

interface ReviewChangesModalProps extends ReviewChangesPanelProps {
  isOpen: boolean;
}

export const ReviewChangesModal = ({
  isOpen,
  ...panelProps
}: ReviewChangesModalProps) => {
  const tr = useTranslations('Review');

  return (
    // Tall sheet on mobile: header + footer pinned, sections scroll between.
    // A read-only review (no text input) → backdrop tap dismisses = Cancel.
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={panelProps.onClose}
      closeLabel={tr('cancel')}
      boxClassName="max-w-lg flex flex-col overflow-hidden max-h-[85vh] p-0 md:max-h-[calc(100vh-5em)]"
    >
      <ReviewChangesPanel {...panelProps} />
    </OverlayShell>
  );
};
