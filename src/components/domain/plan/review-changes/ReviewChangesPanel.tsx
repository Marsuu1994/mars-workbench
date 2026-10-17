'use client';

import {useTranslations} from 'next-intl';
import {
  ArrowPathIcon,
  BoltIcon,
  InformationCircleIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {TaskType, PlanMode} from '@/utils/enums';
import type {TaskSize} from '@/utils/enums';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {OverlayHeader} from '@/components/ui/overlay/OverlayHeader';
import {SubmitButton} from '@/components/ui/form/SubmitButton';
import {ChangeRow} from './ChangeRow';
import {ChangeSection} from './ChangeSection';
import type {Accent} from './constants';

/** Shared identity for any template referenced in the review. */
interface TemplateRef {
  templateId: string;
  title: string;
}

/** A template added to or removed from the plan — both lists share this shape. */
export interface TemplateChange extends TemplateRef {
  size: TaskSize;
  points: number;
  type: TaskType;
  frequency: number;
}

/** A template whose type/frequency changed between plans. */
export interface ModifiedTemplate extends TemplateRef {
  fromType: TaskType;
  fromFrequency: number;
  toType: TaskType;
  toFrequency: number;
}

export interface AdhocTaskChange {
  id: string;
  title: string;
  size: TaskSize;
  points: number;
}

/** A project step leaving the week: it returns to its project, same number. */
export interface ProjectStepChange extends AdhocTaskChange {
  projectTitle: string;
  stepNumber: number;
}

export interface ReviewChangesPanelProps {
  onClose: () => void;
  onConfirm: () => void;
  added: TemplateChange[];
  removed: TemplateChange[];
  modified: ModifiedTemplate[];
  addedAdhoc?: AdhocTaskChange[];
  removedAdhoc?: AdhocTaskChange[];
  removedSteps?: ProjectStepChange[];
  incompleteCounts: Record<string, number>;
  isSubmitting: boolean;
  modeChanged?: boolean;
  fromMode?: PlanMode;
  toMode?: PlanMode;
}

/**
 * The review's header + change sections + footer, sans dialog shell. The
 * live modal wraps it in OverlayShell; design scenarios mount it inline so
 * the review renders inside a frame instead of the browser top layer.
 */
export const ReviewChangesPanel = ({
  onClose,
  onConfirm,
  added,
  removed,
  modified,
  addedAdhoc = [],
  removedAdhoc = [],
  removedSteps = [],
  incompleteCounts,
  isSubmitting,
  modeChanged = false,
  fromMode,
  toMode,
}: ReviewChangesPanelProps) => {
  const tr = useTranslations('Review');
  const tMode = useTranslations('Enums.PlanMode');

  const typeLabel = (type: TaskType) =>
    type === TaskType.DAILY ? tr('dailyLabel') : tr('weeklyLabel');

  const freqLabel = (type: TaskType, frequency: number) =>
    type === TaskType.DAILY
      ? tr('freqPerDay', {count: frequency})
      : tr('freqPerWeek', {count: frequency});

  const modeLabel = (mode: PlanMode) =>
    mode === PlanMode.NORMAL ? tMode('NORMAL') : tMode('EXTREME');

  const modeDescription = (mode: PlanMode) =>
    mode === PlanMode.NORMAL
      ? tr('normalModeDescription')
      : tr('extremeModeDescription');

  const totalAdhocChanges = addedAdhoc.length + removedAdhoc.length;

  // ── Meta-line builders (need tr, so they live in component scope) ──
  const templateMeta = (
    size: TaskSize,
    points: number,
    type: TaskType,
    frequency: number,
  ) => (
    <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
      <SizeChip size={size} points={points} />
      <span className="mx-0.5">&middot;</span>
      <span>{typeLabel(type)}</span>
      <span className="mx-0.5">&middot;</span>
      <span>{freqLabel(type, frequency)}</span>
    </div>
  );

  const sizeMeta = (size: TaskSize, points: number) => (
    <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
      <SizeChip size={size} points={points} />
    </div>
  );

  const removedNote = (templateId: string) => {
    const count = incompleteCounts[templateId] ?? 0;
    return count > 0
      ? tr('removedNoteWithTasks', {count})
      : tr('removedNoteNoTasks');
  };

  const modifiedMeta = (template: ModifiedTemplate) => (
    <div className="flex items-center gap-1 text-xs mt-0.5">
      <span className="text-base-content/30 line-through">
        {typeLabel(template.fromType)} &middot;{' '}
        {freqLabel(template.fromType, template.fromFrequency)}
      </span>
      <span className="text-warning mx-0.5">&rarr;</span>
      <span className="text-warning">
        {typeLabel(template.toType)} &middot;{' '}
        {freqLabel(template.toType, template.toFrequency)}
      </span>
    </div>
  );

  const renderHeader = () => (
    <OverlayHeader
      title={tr('title')}
      onClose={onClose}
      closeLabel={tr('cancel')}
      className="px-6"
    />
  );

  /** A labelled group of one-off or step changes; each row gets its note. */
  const renderTaskGroup = <Row extends AdhocTaskChange>(
    label: string,
    labelClass: string,
    rows: Row[],
    accent: Accent,
    noteFor: (row: Row) => string,
    trailingGap: boolean,
  ) => (
    <>
      <div className={`text-[11px] font-semibold ${labelClass} mb-1 pl-0.5`}>
        {label}
      </div>
      <div className={`flex flex-col gap-1.5${trailingGap ? ' mb-2' : ''}`}>
        {rows.map(row => (
          <ChangeRow
            key={row.id}
            accent={accent}
            title={row.title}
            meta={sizeMeta(row.size, row.points)}
            note={noteFor(row)}
          />
        ))}
      </div>
    </>
  );

  const ProjectIcon = TASK_KIND_STYLE[TaskKind.PROJECT].Icon;

  const renderBody = () => (
    <div className="flex-1 overflow-y-auto px-6 pt-4">
      <div className="flex flex-col gap-4">
        {added.length > 0 && (
          <ChangeSection
            icon={<PlusIcon className="size-3.5 text-success" />}
            heading={tr('addedHeading')}
            accent="success"
            count={added.length}
          >
            <div className="flex flex-col gap-1.5">
              {added.map(template => (
                <ChangeRow
                  key={template.templateId}
                  accent="success"
                  title={template.title}
                  meta={templateMeta(
                    template.size,
                    template.points,
                    template.type,
                    template.frequency,
                  )}
                  note={tr('addedNote', {
                    type: typeLabel(template.type).toLowerCase(),
                  })}
                />
              ))}
            </div>
          </ChangeSection>
        )}

        {removed.length > 0 && (
          <ChangeSection
            icon={<MinusIcon className="size-3.5 text-error" />}
            heading={tr('removedHeading')}
            accent="error"
            count={removed.length}
          >
            <div className="flex flex-col gap-1.5">
              {removed.map(template => (
                <ChangeRow
                  key={template.templateId}
                  accent="error"
                  title={template.title}
                  meta={templateMeta(
                    template.size,
                    template.points,
                    template.type,
                    template.frequency,
                  )}
                  note={removedNote(template.templateId)}
                />
              ))}
            </div>
          </ChangeSection>
        )}

        {modified.length > 0 && (
          <ChangeSection
            icon={<PencilSquareIcon className="size-3.5 text-warning" />}
            heading={tr('modifiedHeading')}
            accent="warning"
            count={modified.length}
          >
            <div className="flex flex-col gap-1.5">
              {modified.map(template => (
                <ChangeRow
                  key={template.templateId}
                  accent="warning"
                  title={template.title}
                  meta={modifiedMeta(template)}
                  note={tr('modifiedNote', {
                    hasTasks:
                      (incompleteCounts[template.templateId] ?? 0) > 0
                        ? 'yes'
                        : 'no',
                    count: template.toFrequency,
                    type: typeLabel(template.toType).toLowerCase(),
                  })}
                />
              ))}
            </div>
          </ChangeSection>
        )}

        {totalAdhocChanges > 0 && (
          <ChangeSection
            icon={<BoltIcon className="size-3.5 text-warning" />}
            heading={tr('adhocHeading')}
            accent="warning"
            count={totalAdhocChanges}
          >
            {addedAdhoc.length > 0 &&
              renderTaskGroup(
                tr('addedToBoard'),
                'text-info',
                addedAdhoc,
                'info',
                () => tr('adhocAddedNote'),
                removedAdhoc.length > 0,
              )}
            {removedAdhoc.length > 0 &&
              renderTaskGroup(
                tr('removedFromBoard'),
                'text-error',
                removedAdhoc,
                'error',
                () => tr('adhocRemovedNote'),
                false,
              )}
          </ChangeSection>
        )}

        {removedSteps.length > 0 && (
          <ChangeSection
            icon={<ProjectIcon className="size-3.5 text-secondary" />}
            heading={tr('stepsHeading')}
            accent="secondary"
            count={removedSteps.length}
          >
            {renderTaskGroup(
              tr('removedFromBoard'),
              'text-error',
              removedSteps,
              'error',
              step =>
                tr('stepRemovedNote', {
                  project: step.projectTitle,
                  number: step.stepNumber,
                }),
              false,
            )}
          </ChangeSection>
        )}

        {modeChanged && fromMode && toMode && (
          <ChangeSection
            icon={<ArrowPathIcon className="size-3.5 text-info" />}
            heading={tr('modeChangedHeading')}
            accent="info"
          >
            <ChangeRow
              accent="info"
              title={
                <span className="flex items-center gap-1">
                  <span className="text-base-content/30 line-through font-normal">
                    {modeLabel(fromMode)}
                  </span>
                  <span className="text-info mx-0.5">&rarr;</span>
                  <span className="text-info">{modeLabel(toMode)}</span>
                </span>
              }
              note={tr('modeChangedNote', {
                description: modeDescription(toMode),
              })}
            />
          </ChangeSection>
        )}
      </div>

      {/* Global note */}
      <div className="flex gap-2 items-start px-3.5 py-3 rounded-lg bg-base-300 border border-dashed border-base-content/20 mt-4">
        <InformationCircleIcon className="size-3.5 text-base-content/40 shrink-0 mt-0.5" />
        <span className="text-xs text-base-content/50 leading-relaxed">
          {tr('globalNote')}
        </span>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="modal-action shrink-0 mt-0 border-t border-base-content/10 px-6 pt-4 pb-6">
      <button
        type="button"
        className="btn btn-ghost flex-1 md:flex-none"
        onClick={onClose}
        disabled={isSubmitting}
      >
        {tr('cancel')}
      </button>
      <SubmitButton
        type="button"
        onClick={onConfirm}
        isSubmitting={isSubmitting}
        icon={<ArrowPathIcon className="size-4" />}
        className="flex-[2] md:flex-none"
      >
        {tr('confirmButton')}
      </SubmitButton>
    </div>
  );

  return (
    <>
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </>
  );
};
