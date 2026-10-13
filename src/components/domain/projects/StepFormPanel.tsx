'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {CheckIcon, MapIcon, PlusIcon} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskSize} from '@/utils/enums';
import {toFormErrorMessage} from '@/utils/formErrors';
import {
  addProjectStepAction,
  deleteProjectStepAction,
  updateProjectStepAction,
} from '@/actions/projectActions';
import {SizePicker} from '@/components/domain/shared/task-modal/SizePicker';
import {InlineConfirmButton} from '@/components/ui/InlineConfirmButton';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ModalFormFooter} from '@/components/ui/form/ModalFormFooter';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';

export type StepFormMode = 'add' | 'edit';

export interface StepFormPanelProps {
  mode: StepFormMode;
  /** The project the step belongs to — named in the header */
  project: {id: string; title: string};
  /** The step's number: the one it becomes (add) or holds (edit) */
  stepNumber: number;
  /** The step being edited (edit mode) */
  step?: Pick<TaskItem, 'id' | 'title' | 'description' | 'size'>;
  onClose: () => void;
  /** After an add or a save */
  onSaved: () => void;
}

/** A new step's size: ~2 hours, the size the path prefers. */
const DEFAULT_STEP_SIZE = TaskSize.SMALL;

/**
 * The Add / Edit Step form — header, fields, footer — sans dialog shell:
 * title (required), an optional description and the size. The header names
 * the project and the step number; editing adds Delete step (two-click) on
 * the footer's left. StepModal wraps it in OverlayShell; design scenarios
 * mount it inline.
 */
export const StepFormPanel = ({
  mode,
  project,
  stepNumber,
  step,
  onClose,
  onSaved,
}: StepFormPanelProps) => {
  const t = useTranslations('Projects.StepModal');
  const [title, setTitle] = useState(step?.title ?? '');
  const [description, setDescription] = useState(step?.description ?? '');
  const [size, setSize] = useState<TaskSize>(step?.size ?? DEFAULT_STEP_SIZE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdd = mode === 'add';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const input = {title, description, size};
    const result =
      isAdd || !step
        ? await addProjectStepAction(project.id, input)
        : await updateProjectStepAction(step.id, input);

    if (result.error) {
      setError(toFormErrorMessage(result.error));
      setIsSubmitting(false);
      return;
    }

    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!step) return;
    setError(null);

    const result = await deleteProjectStepAction(step.id);
    if (result.error) {
      setError(toFormErrorMessage(result.error));
      return;
    }

    onClose();
  }

  const renderSubtitle = () => (
    <>
      <MapIcon className="size-2.5" />
      {isAdd
        ? t('subtitleAdd', {project: project.title, number: stepNumber})
        : t('subtitleEdit', {project: project.title, number: stepNumber})}
    </>
  );

  const renderFields = () => (
    <>
      <FieldRow label={t('titleLabel')} required>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={event => setTitle(event.target.value)}
          required
        />
      </FieldRow>
      <FieldRow label={t('descriptionLabel')} labelHint={t('optional')}>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </FieldRow>
      <FieldRow label={t('sizeLabel')} required>
        <SizePicker
          value={size}
          onChange={setSize}
          splitWarning={t('sizeWarning')}
        />
      </FieldRow>
    </>
  );

  const renderDelete = () =>
    !isAdd && (
      <InlineConfirmButton
        label={t('delete')}
        confirmLabel={t('deleteConfirm')}
        onConfirm={handleDelete}
      />
    );

  return (
    <>
      <OverlayHeader
        title={isAdd ? t('addTitle') : t('editTitle')}
        subtitle={renderSubtitle()}
        onClose={onClose}
        closeLabel={t('cancel')}
        className="px-6"
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-6 pt-4 pb-6"
      >
        {renderFields()}

        <ModalFormFooter
          error={error}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          cancelLabel={t('cancel')}
          submitLabel={isAdd ? t('add') : t('save')}
          submitIcon={
            isAdd ? (
              <PlusIcon className="size-4" />
            ) : (
              <CheckIcon className="size-4" />
            )
          }
          submitDisabled={title.trim() === ''}
          leading={renderDelete()}
        />
      </form>
    </>
  );
};
