'use client';

import {useTranslations} from 'next-intl';
import {PlusIcon, CheckIcon} from '@heroicons/react/24/outline';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {FormErrorAlert} from '@/components/ui/form/FormErrorAlert';

interface TaskModalFooterProps {
  mode: 'create' | 'edit' | 'adhoc';
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
}

const BUTTON_CONFIG: Record<
  TaskModalFooterProps['mode'],
  {
    icon: typeof PlusIcon;
    labelKey: 'submit.create' | 'submit.edit' | 'submit.adhoc';
  }
> = {
  create: {icon: PlusIcon, labelKey: 'submit.create'},
  edit: {icon: CheckIcon, labelKey: 'submit.edit'},
  adhoc: {icon: PlusIcon, labelKey: 'submit.adhoc'},
};

export default function TaskModalFooter({
  mode,
  isSubmitting,
  error,
  onClose,
}: TaskModalFooterProps) {
  const t = useTranslations('TaskModal');
  const config = BUTTON_CONFIG[mode];
  const Icon = config.icon;

  return (
    <>
      <FormErrorAlert error={error} />
      <div className="modal-action">
        <button
          type="button"
          className="btn btn-ghost flex-1 md:flex-none"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {t('cancel')}
        </button>
        <SubmitButton
          isSubmitting={isSubmitting}
          icon={<Icon className="size-4" />}
          className="flex-[2] md:flex-none"
        >
          {t(config.labelKey)}
        </SubmitButton>
      </div>
    </>
  );
}
