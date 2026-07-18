'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {BoltIcon} from '@heroicons/react/24/outline';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import {TaskSize, sizeToPoints, type PriorityQuadrant} from '@/utils/enums';
import {
  createTaskTemplateAction,
  updateTaskTemplateAction,
} from '@/actions/templateActions';
import {createAdhocTaskAction} from '@/actions/taskActions';
import {FALLBACK_QUADRANT} from '@/components/domain/priorities/constants';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import TaskModalFooter from './TaskModalFooter';
import QuadrantPicker from './QuadrantPicker';

type ModalMode = 'create' | 'edit' | 'adhoc';

const HEADER_KEY: Record<
  ModalMode,
  'header.create' | 'header.edit' | 'header.adhoc'
> = {
  create: 'header.create',
  edit: 'header.edit',
  adhoc: 'header.adhoc',
};

interface TaskModalPanelProps {
  onClose: () => void;
  /** For adhoc mode, receives the quadrant the created task landed in. */
  onSaved: (quadrant?: PriorityQuadrant) => void;
  mode: ModalMode;
  template?: TaskTemplateItem | null;
  /**
   * Source quadrant for adhoc mode — the created matrix task lands there.
   * When omitted in adhoc mode (mobile top-bar "+" entry), the panel shows
   * a quadrant picker instead.
   */
  quadrant?: PriorityQuadrant;
}

interface TaskModalProps extends Omit<TaskModalPanelProps, 'mode'> {
  isOpen: boolean;
  mode?: ModalMode;
}

/**
 * The task form itself — header, fields, footer — sans dialog shell. The
 * live modal wraps it in OverlayShell (mounted fresh on each open, so the
 * form always starts from the current template/mode); design scenarios
 * mount it inline so it renders inside a frame instead of the top layer.
 */
export function TaskModalPanel({
  onClose,
  onSaved,
  mode,
  template,
  quadrant,
}: TaskModalPanelProps) {
  const t = useTranslations('TaskModal');
  const tSize = useTranslations('Enums.TaskSize');
  const tEnums = useTranslations('Enums');

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when the target template/mode changes while mounted. Done
  // during render (not in an effect) to avoid cascading re-renders.
  const [formSource, setFormSource] = useState({template, mode});
  if (formSource.template !== template || formSource.mode !== mode) {
    setFormSource({template, mode});
    setTitle(initialTitle);
    setDescription(initialDescription);
    setSize(initialSize);
    setSelectedQuadrant(FALLBACK_QUADRANT);
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const effectiveQuadrant = quadrant ?? selectedQuadrant;
    let result;
    switch (mode) {
      case 'create':
        result = await createTaskTemplateAction({title, description, size});
        break;
      case 'edit':
        result = await updateTaskTemplateAction(template!.id, {
          title,
          description,
          size,
        });
        break;
      case 'adhoc':
        result = await createAdhocTaskAction({
          title,
          description,
          size,
          quadrant: effectiveQuadrant,
        });
        break;
    }

    if (result.error) {
      const err = result.error;
      let message: string;
      if ('formErrors' in err) {
        // Include fieldErrors so a validation failure with empty formErrors
        // (e.g. a missing required field) never renders as a blank error.
        const fieldMessages = Object.values(err.fieldErrors ?? {}).flatMap(
          messages => messages ?? [],
        );
        message = [...err.formErrors, ...fieldMessages].join(', ');
      } else {
        message = JSON.stringify(err);
      }
      setError(message);
      setIsSubmitting(false);
      return;
    }

    onSaved(mode === 'adhoc' ? effectiveQuadrant : undefined);
    onClose();
  }

  const isAdhoc = mode === 'adhoc';

  return (
    <>
      <OverlayHeader
        title={t(HEADER_KEY[mode])}
        onClose={onClose}
        closeLabel={t('cancel')}
        className="px-6"
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-6 pt-4 pb-6"
      >
        {/* Ad-hoc info banner */}
        {isAdhoc && (
          <div className="flex items-center gap-2 bg-warning/10 text-warning text-sm px-3.5 py-2.5 rounded-lg">
            <BoltIcon className="size-4.5 shrink-0" />
            {t('adhocBanner')}
          </div>
        )}

        {/* Title */}
        <FieldRow label={t('titleLabel')} required>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={
              isAdhoc
                ? t('titlePlaceholderAdhoc')
                : t('titlePlaceholderTemplate')
            }
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </FieldRow>

        {/* Description */}
        <FieldRow
          label={t('descriptionLabel')}
          labelHint={!isAdhoc ? t('descriptionAiHint') : undefined}
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
            onChange={e => setDescription(e.target.value)}
          />
        </FieldRow>

        {/* Size */}
        <FieldRow label={t('sizeLabel')} required>
          <ChoicePills
            layout="fill"
            value={size}
            onChange={setSize}
            options={Object.values(TaskSize).map(s => ({
              value: s,
              label: (selected: boolean) => (
                <>
                  <span>{tSize(s)}</span>
                  <span
                    className={`text-[10px] font-semibold ${selected ? 'opacity-70' : 'opacity-50'}`}
                  >
                    {sizeToPoints(s)}
                  </span>
                </>
              ),
            }))}
            pillClass="flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold"
            selectedClass="bg-secondary/10 border-secondary text-secondary"
            unselectedClass="bg-base-200 border-base-300 text-base-content/50 hover:border-base-content/30"
          />
          <p className="text-xs text-secondary mt-1.5">
            {tEnums('sizeEffort', {hours: sizeToPoints(size)})}
          </p>
          {(size === TaskSize.LARGE || size === TaskSize.EXTRA_LARGE) && (
            <p className="text-xs text-warning mt-0.5">{t('sizeWarning')}</p>
          )}
        </FieldRow>

        {/* Quadrant (adhoc without a preset source quadrant) */}
        {isAdhoc && quadrant === undefined && (
          <QuadrantPicker
            value={selectedQuadrant}
            onChange={setSelectedQuadrant}
          />
        )}

        <TaskModalFooter
          mode={mode}
          isSubmitting={isSubmitting}
          error={error}
          onClose={onClose}
        />
      </form>
    </>
  );
}

export default function TaskModal({
  isOpen,
  onClose,
  onSaved,
  mode: modeProp,
  template,
  quadrant,
}: TaskModalProps) {
  const mode: ModalMode = modeProp ?? (template ? 'edit' : 'create');

  return (
    // Backdrop-dismiss stays off: a stray tap must not discard form input
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={onClose}
      dismissOnBackdrop={false}
      corners
      boxClassName="max-w-lg p-0"
    >
      {/* Mounted only while open, so every open starts a fresh form (the
          panel's initial state is the reset the old isOpen effect did). */}
      {isOpen && (
        <TaskModalPanel
          onClose={onClose}
          onSaved={onSaved}
          mode={mode}
          template={template}
          quadrant={quadrant}
        />
      )}
    </OverlayShell>
  );
}
