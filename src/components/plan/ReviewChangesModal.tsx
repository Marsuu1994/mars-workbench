'use client';

import type {ReactNode} from 'react';
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
import {SizeChip} from '@/components/ui/SizeChip';
import {Pill, type PillColor} from '@/components/ui/Pill';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';
import {SheetCloseButton} from '@/components/ui/overlay/SheetCloseButton';
import {SubmitButton} from '@/components/ui/form/SubmitButton';

/** Shared identity for any template referenced in the review. */
interface TemplateRef {
  templateId: string;
  title: string;
}

/** A template added to or removed from the plan — both lists share this shape. */
interface TemplateChange extends TemplateRef {
  size: TaskSize;
  points: number;
  type: TaskType;
  frequency: number;
}

/** A template whose type/frequency changed between plans. */
interface ModifiedTemplate extends TemplateRef {
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

interface ReviewChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  added: TemplateChange[];
  removed: TemplateChange[];
  modified: ModifiedTemplate[];
  addedAdhoc?: AdhocTaskChange[];
  removedAdhoc?: AdhocTaskChange[];
  incompleteCounts: Record<string, number>;
  isSubmitting: boolean;
  modeChanged?: boolean;
  fromMode?: PlanMode;
  toMode?: PlanMode;
}

/* One accent drives a whole change section — dot, border, heading and
   note all read from here (literal classes so Tailwind can see them). */
type Accent = Extract<PillColor, 'success' | 'error' | 'warning' | 'info'>;
const ACCENT: Record<Accent, {dot: string; border: string; text: string}> = {
  success: {
    dot: 'bg-success',
    border: 'border-success/30',
    text: 'text-success',
  },
  error: {dot: 'bg-error', border: 'border-error/30', text: 'text-error'},
  warning: {
    dot: 'bg-warning',
    border: 'border-warning/30',
    text: 'text-warning',
  },
  info: {dot: 'bg-info', border: 'border-info/30', text: 'text-info'},
};

/** Section header: icon + uppercase heading + optional count pill. */
const ChangeSection = ({
  icon,
  heading,
  accent,
  count,
  children,
}: {
  icon: ReactNode;
  heading: string;
  accent: Accent;
  count?: number;
  children: ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span
        className={`text-[11px] font-bold uppercase tracking-widest ${ACCENT[accent].text}`}
      >
        {heading}
      </span>
      {count !== undefined && (
        <Pill color={accent} className="rounded-full font-bold">
          {count}
        </Pill>
      )}
    </div>
    {children}
  </div>
);

/** One change entry: accent dot + title + meta line + italic note. */
const ChangeRow = ({
  accent,
  title,
  meta,
  note,
}: {
  accent: Accent;
  title: ReactNode;
  meta?: ReactNode;
  note: ReactNode;
}) => (
  <div
    className={`flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border ${ACCENT[accent].border} rounded-lg`}
  >
    <div
      className={`size-[7px] rounded-full ${ACCENT[accent].dot} shrink-0 mt-[5px]`}
    />
    <div>
      <div className="text-sm font-medium text-base-content">{title}</div>
      {meta}
      <div className={`text-[11px] italic ${ACCENT[accent].text} mt-1`}>
        {note}
      </div>
    </div>
  </div>
);

export function ReviewChangesModal({
  isOpen,
  onClose,
  onConfirm,
  added,
  removed,
  modified,
  addedAdhoc = [],
  removedAdhoc = [],
  incompleteCounts,
  isSubmitting,
  modeChanged = false,
  fromMode,
  toMode,
}: ReviewChangesModalProps) {
  const tr = useTranslations('Review');
  const tMode = useTranslations('Enums.PlanMode');

  const typeLabel = (type: TaskType) =>
    type === TaskType.DAILY ? tr('dailyLabel') : tr('weeklyLabel');

  const freqLabel = (type: TaskType, frequency: number) =>
    type === TaskType.DAILY
      ? tr('freqPerDay', {count: frequency})
      : tr('freqPerWeek', {count: frequency});

  const modeLabel = (m: PlanMode) =>
    m === PlanMode.NORMAL ? tMode('NORMAL') : tMode('EXTREME');

  const modeDescription = (m: PlanMode) =>
    m === PlanMode.NORMAL
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

  const modifiedMeta = (t: ModifiedTemplate) => (
    <div className="flex items-center gap-1 text-xs mt-0.5">
      <span className="text-base-content/30 line-through">
        {typeLabel(t.fromType)} &middot;{' '}
        {freqLabel(t.fromType, t.fromFrequency)}
      </span>
      <span className="text-warning mx-0.5">&rarr;</span>
      <span className="text-warning">
        {typeLabel(t.toType)} &middot; {freqLabel(t.toType, t.toFrequency)}
      </span>
    </div>
  );

  const renderHeader = () => (
    <div className="shrink-0 flex items-center justify-between -mx-6 px-6 pb-4 mb-4 border-b border-base-content/10">
      <h3 className="text-lg font-semibold">{tr('title')}</h3>
      <SheetCloseButton onClick={onClose} label={tr('cancel')} />
    </div>
  );

  const renderAdhocGroup = (
    label: string,
    labelClass: string,
    rows: AdhocTaskChange[],
    accent: Accent,
    note: string,
    trailingGap: boolean,
  ) => (
    <>
      <div className={`text-[11px] font-semibold ${labelClass} mb-1 pl-0.5`}>
        {label}
      </div>
      <div className={`flex flex-col gap-1.5${trailingGap ? ' mb-2' : ''}`}>
        {rows.map(t => (
          <ChangeRow
            key={t.id}
            accent={accent}
            title={t.title}
            meta={sizeMeta(t.size, t.points)}
            note={note}
          />
        ))}
      </div>
    </>
  );

  const renderBody = () => (
    <div className="flex-1 overflow-y-auto -mx-6 px-6">
      <div className="flex flex-col gap-4">
        {added.length > 0 && (
          <ChangeSection
            icon={<PlusIcon className="size-3.5 text-success" />}
            heading={tr('addedHeading')}
            accent="success"
            count={added.length}
          >
            <div className="flex flex-col gap-1.5">
              {added.map(t => (
                <ChangeRow
                  key={t.templateId}
                  accent="success"
                  title={t.title}
                  meta={templateMeta(t.size, t.points, t.type, t.frequency)}
                  note={tr('addedNote', {
                    type: typeLabel(t.type).toLowerCase(),
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
              {removed.map(t => (
                <ChangeRow
                  key={t.templateId}
                  accent="error"
                  title={t.title}
                  meta={templateMeta(t.size, t.points, t.type, t.frequency)}
                  note={removedNote(t.templateId)}
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
              {modified.map(t => (
                <ChangeRow
                  key={t.templateId}
                  accent="warning"
                  title={t.title}
                  meta={modifiedMeta(t)}
                  note={tr('modifiedNote', {
                    hasTasks:
                      (incompleteCounts[t.templateId] ?? 0) > 0 ? 'yes' : 'no',
                    count: t.toFrequency,
                    type: typeLabel(t.toType).toLowerCase(),
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
              renderAdhocGroup(
                tr('addedToBoard'),
                'text-info',
                addedAdhoc,
                'info',
                tr('adhocAddedNote'),
                removedAdhoc.length > 0,
              )}
            {removedAdhoc.length > 0 &&
              renderAdhocGroup(
                tr('removedFromBoard'),
                'text-error',
                removedAdhoc,
                'error',
                tr('adhocRemovedNote'),
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
    <div className="modal-action shrink-0 -mx-6 mt-0 border-t border-base-content/10 px-6 pt-4">
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
    // Tall sheet on mobile: header + footer pinned, sections scroll between.
    // A read-only review (no text input) → backdrop tap dismisses = Cancel.
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={tr('cancel')}
      boxClassName="max-w-lg flex flex-col overflow-hidden max-h-[85vh] pt-4 md:pt-6 md:max-h-[calc(100vh-5em)]"
    >
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </OverlayShell>
  );
}
