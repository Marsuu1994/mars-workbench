'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {BoltIcon, CheckIcon, PlusIcon} from '@heroicons/react/24/outline';
import {Banner} from '@/components/ui/Banner';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ModalFormFooter} from '@/components/ui/form/ModalFormFooter';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import {TaskSize, type PriorityQuadrant} from '@/utils/enums';
import {useModalSubmit} from '@/hooks/useModalSubmit';
import {
  createTaskTemplateAction,
  updateTaskTemplateAction,
} from '@/actions/templateActions';
import {createAdhocTaskAction} from '@/actions/taskActions';
import {FALLBACK_QUADRANT} from '@/components/domain/priorities/constants';
import {QuadrantPicker} from './QuadrantPicker';
import {SizePicker} from './SizePicker';

export type TaskModalMode = 'create' | 'edit' | 'adhoc';

/** Per mode: the header, and the submit button's label and icon. */
const MODE_COPY: Record<
  TaskModalMode,
  {
    headerKey: 'header.create' | 'header.edit' | 'header.adhoc';
    submitKey: 'submit.create' | 'submit.edit' | 'submit.adhoc';
    SubmitIcon: typeof PlusIcon;
  }
> = {
  create: {
    headerKey: 'header.create',
    submitKey: 'submit.create',
    SubmitIcon: PlusIcon,
  },
  edit: {
    headerKey: 'header.edit',
    submitKey: 'submit.edit',
    SubmitIcon: CheckIcon,
  },
  adhoc: {
    headerKey: 'header.adhoc',
    submitKey: 'submit.adhoc',
    SubmitIcon: PlusIcon,
  },
};

export interface TaskModalPanelProps {
  /** The page's server rows the saved task shows up in: the modal closes
      once they arrive */
  freshData: unknown;
  onClose: () => void;
  /** For adhoc mode, receives the quadrant the created task landed in. */
  onSaved?: (quadrant?: PriorityQuadrant) => void;
  mode: TaskModalMode;
  template?: TaskTemplateItem | null;
  /**
   * Source quadrant for adhoc mode — the created matrix task lands there.
   * When omitted in adhoc mode (mobile top-bar "+" entry), the panel shows
   * a quadrant picker instead.
   */
  quadrant?: PriorityQuadrant;
}

/**
 * The task form itself — header, fields, footer — sans dialog shell. The
 * live modal wraps it in OverlayShell (mounted fresh on each open, so the
 * form always starts from the current template/mode); design scenarios
 * mount it inline so it renders inside a frame instead of the top layer.
 */
export const TaskModalPanel = ({
  freshData,
  onClose,
  onSaved,
  mode,
  template,
  quadrant,
}: TaskModalPanelProps) => {
  const t = useTranslations('TaskModal');

  const initialTitle = mode === 'adhoc' ? '' : (template?.title ?? '');
  const initialDescription =
    mode === 'adhoc' ? '' : (template?.description ?? '');
  const initialSize =
    mode === 'adhoc'
      ? TaskSize.EXTRA_SMALL
      : ((template?.size as TaskSize) ?? TaskSize.MEDIUM);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [size, setSize] = useState<TaskSize>(initialSize);
  const [selectedQuadrant, setSelectedQuadrant] =
    useState<PriorityQuadrant>(FALLBACK_QUADRANT);
  const {isSubmitting, error, submit, reset} = useModalSubmit({
    freshData,
    onClose,
  });

  // Reset form when the target template/mode changes while mounted. Done
  // during render (not in an effect) to avoid cascading re-renders.
  const [formSource, setFormSource] = useState({template, mode});
  if (formSource.template !== template || formSource.mode !== mode) {
    setFormSource({template, mode});
    setTitle(initialTitle);
    setDescription(initialDescription);
    setSize(initialSize);
    setSelectedQuadrant(FALLBACK_QUADRANT);
    reset();
  }

  const saveTask = async (effectiveQuadrant: PriorityQuadrant) => {
    switch (mode) {
      case 'create':
        return createTaskTemplateAction({title, description, size});
      case 'edit':
        return updateTaskTemplateAction(template!.id, {
          title,
          description,
          size,
        });
      case 'adhoc':
        return createAdhocTaskAction({
          title,
          description,
          size,
          quadrant: effectiveQuadrant,
        });
      default: {
        const unhandled: never = mode;
        throw new Error(`Unhandled task modal mode: ${unhandled}`);
      }
    }
  };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const effectiveQuadrant = quadrant ?? selectedQuadrant;
    void submit(
      () => saveTask(effectiveQuadrant),
      () => onSaved?.(mode === 'adhoc' ? effectiveQuadrant : undefined),
    );
  }

  const isAdhoc = mode === 'adhoc';
  const {headerKey, submitKey, SubmitIcon} = MODE_COPY[mode];

  const renderFields = () => (
    <>
      {/* Title */}
      <FieldRow label={t('titleLabel')} required>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={
            isAdhoc ? t('titlePlaceholderAdhoc') : t('titlePlaceholderTemplate')
          }
          value={title}
          onChange={event => setTitle(event.target.value)}
          required
        />
      </FieldRow>

      {/* Description */}
      <FieldRow
        label={t('descriptionLabel')}
        labelHint={!isAdhoc ? t('descriptionClaudeHint') : undefined}
      >
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder={
            isAdhoc
              ? t('descriptionPlaceholderAdhoc')
              : t('descriptionPlaceholderTemplate')
          }
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </FieldRow>

      {/* Size */}
      <FieldRow label={t('sizeLabel')} required>
        <SizePicker
          value={size}
          onChange={setSize}
          splitWarning={t('sizeWarning')}
        />
      </FieldRow>

      {/* Quadrant (adhoc without a preset source quadrant) */}
      {isAdhoc && quadrant === undefined && (
        <QuadrantPicker
          value={selectedQuadrant}
          onChange={setSelectedQuadrant}
        />
      )}
    </>
  );

  return (
    <>
      <OverlayHeader
        title={t(headerKey)}
        onClose={onClose}
        closeLabel={t('cancel')}
        className="px-6"
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-6 pt-4 pb-6"
      >
        {isAdhoc && (
          <Banner
            tone="warning"
            icon={<BoltIcon className="size-4.5 shrink-0" />}
          >
            {t('adhocBanner')}
          </Banner>
        )}

        {renderFields()}

        <ModalFormFooter
          error={error}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          cancelLabel={t('cancel')}
          submitLabel={t(submitKey)}
          submitIcon={<SubmitIcon className="size-4" />}
        />
      </form>
    </>
  );
};
