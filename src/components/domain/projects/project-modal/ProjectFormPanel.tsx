'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {
  ArchiveBoxIcon,
  CheckIcon,
  MapIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type {ProjectItem} from '@/lib/db/projects';
import {toFormErrorMessage} from '@/utils/formErrors';
import {
  archiveProjectAction,
  createProjectAction,
  updateProjectAction,
} from '@/actions/projectActions';
import {Banner} from '@/components/ui/Banner';
import {ConfirmBar} from '@/components/ui/ConfirmBar';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {FormErrorAlert} from '@/components/ui/form/FormErrorAlert';
import {FOOTER_DANGER_BUTTON} from '@/components/ui/form/constants';
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
 * Editing adds Archive on the footer's left, which turns the action row
 * into a confirm bar. ProjectModal wraps it in OverlayShell (mounted fresh
 * on each open); design scenarios mount it inline.
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
  const [isArchiveArmed, setIsArchiveArmed] = useState(false);
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
    setIsSubmitting(true);

    const result = await archiveProjectAction(project.id);
    if (result.error) {
      setError(toFormErrorMessage(result.error));
      setIsSubmitting(false);
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

  // Armed, the action row asks first; Cancel / Save step aside meanwhile
  const renderArchiveConfirm = (projectTitle: string) => (
    <>
      <FormErrorAlert error={error} />
      <div className="modal-action">
        <ConfirmBar
          icon={<ArchiveBoxIcon className="size-5 shrink-0" />}
          prompt={t('archivePrompt', {title: projectTitle})}
          detail={t('archiveDetail')}
          cancelLabel={t('keep')}
          confirmLabel={t('archiveConfirm')}
          onCancel={() => setIsArchiveArmed(false)}
          onConfirm={handleArchive}
          isPending={isSubmitting}
        />
      </div>
    </>
  );

  const renderFooter = () => {
    if (isArchiveArmed && project) return renderArchiveConfirm(project.title);
    return (
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
        leading={
          !isCreate && (
            <button
              type="button"
              onClick={() => setIsArchiveArmed(true)}
              className={FOOTER_DANGER_BUTTON}
            >
              {t('archive')}
            </button>
          )
        }
      />
    );
  };

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
        {renderFooter()}
      </form>
    </>
  );
};
