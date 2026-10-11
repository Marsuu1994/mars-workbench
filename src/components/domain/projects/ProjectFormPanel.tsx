'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {CheckIcon, MapIcon, PlusIcon} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import {toFormErrorMessage} from '@/utils/formErrors';
import {
  archiveProjectAction,
  createProjectAction,
  updateProjectAction,
} from '@/actions/projectActions';
import {Banner} from '@/components/ui/Banner';
import {InlineConfirmButton} from '@/components/ui/InlineConfirmButton';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ModalFormFooter} from '@/components/ui/form/ModalFormFooter';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';

export type ProjectFormMode = 'create' | 'edit';

export interface ProjectFormPanelProps {
  mode: ProjectFormMode;
  /** The project being edited (edit mode) */
  project?: Pick<ProjectItem, 'id' | 'title' | 'goal'>;
  onClose: () => void;
  /** After a create or a save, with the project's id */
  onSaved: (projectId: string) => void;
  /** After the project is archived (edit mode) */
  onArchived?: (projectId: string) => void;
}

/**
 * The New / Edit Project form — header, fields, footer — sans dialog shell:
 * title (required) and an optional goal; a project has no size of its own.
 * Editing adds Archive (two-click) on the footer's left. ProjectModal wraps
 * it in OverlayShell (mounted fresh on each open); design scenarios mount it
 * inline.
 */
export const ProjectFormPanel = ({
  mode,
  project,
  onClose,
  onSaved,
  onArchived,
}: ProjectFormPanelProps) => {
  const t = useTranslations('Projects.ProjectModal');
  const [title, setTitle] = useState(project?.title ?? '');
  const [goal, setGoal] = useState(project?.goal ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result =
      isCreate || !project
        ? await createProjectAction({title, goal})
        : await updateProjectAction(project.id, {title, goal});

    if (result.error) {
      setError(toFormErrorMessage(result.error));
      setIsSubmitting(false);
      return;
    }

    onSaved(result.data.id);
    onClose();
  }

  async function handleArchive() {
    if (!project) return;
    setError(null);
    const result = await archiveProjectAction(project.id);
    if (result.error) {
      setError(toFormErrorMessage(result.error));
      return;
    }
    onArchived?.(project.id);
    onClose();
  }

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
      <FieldRow label={t('goalLabel')} labelHint={t('optional')}>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder={t('goalPlaceholder')}
          value={goal}
          onChange={event => setGoal(event.target.value)}
        />
      </FieldRow>
    </>
  );

  const renderArchive = () =>
    !isCreate && (
      <InlineConfirmButton
        label={t('archive')}
        confirmLabel={t('archiveConfirm')}
        hint={t('archiveHint')}
        onConfirm={handleArchive}
      />
    );

  return (
    <>
      <OverlayHeader
        title={isCreate ? t('createTitle') : t('editTitle')}
        onClose={onClose}
        closeLabel={t('cancel')}
        className="px-6"
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-6 pt-4 pb-6"
      >
        {isCreate && (
          <Banner
            tone="secondary"
            icon={<MapIcon className="size-4.5 shrink-0" />}
          >
            {t('banner')}
          </Banner>
        )}

        {renderFields()}

        <ModalFormFooter
          error={error}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          cancelLabel={t('cancel')}
          submitLabel={isCreate ? t('create') : t('save')}
          submitIcon={
            isCreate ? (
              <PlusIcon className="size-4" />
            ) : (
              <CheckIcon className="size-4" />
            )
          }
          submitDisabled={title.trim() === ''}
          leading={renderArchive()}
        />
      </form>
    </>
  );
};
