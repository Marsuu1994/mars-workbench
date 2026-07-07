'use client';

import {useTranslations} from 'next-intl';
import {
  ArrowPathIcon,
  BoltIcon,
  InformationCircleIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {TaskType, PlanMode} from '@/utils/enums';
import type {TaskSize} from '@/utils/enums';
import {SizeChip} from '@/components/ui/SizeChip';
import {Pill} from '@/components/ui/Pill';
import {OverlayShell} from '@/components/ui/overlay/OverlayShell';

interface AddedTemplate {
  templateId: string;
  title: string;
  size: TaskSize;
  points: number;
  type: TaskType;
  frequency: number;
}

interface RemovedTemplate {
  templateId: string;
  title: string;
  size: TaskSize;
  points: number;
  type: TaskType;
  frequency: number;
}

interface ModifiedTemplate {
  templateId: string;
  title: string;
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
  added: AddedTemplate[];
  removed: RemovedTemplate[];
  modified: ModifiedTemplate[];
  addedAdhoc?: AdhocTaskChange[];
  removedAdhoc?: AdhocTaskChange[];
  incompleteCounts: Record<string, number>;
  isSubmitting: boolean;
  modeChanged?: boolean;
  fromMode?: PlanMode;
  toMode?: PlanMode;
}

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

  return (
    // Tall sheet on mobile: header + footer pinned, sections scroll between.
    // Backdrop-dismiss stays off — the review selection must survive a stray tap.
    <OverlayShell
      variant="responsive"
      isOpen={isOpen}
      onClose={onClose}
      dismissOnBackdrop={false}
      grip
      boxClassName="max-w-lg flex flex-col overflow-hidden max-h-[85vh] pt-2 md:pt-6 md:max-h-[calc(100vh-5em)]"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between -mx-6 px-6 pb-4 mb-4 border-b border-base-content/10">
        <h3 className="text-lg font-semibold">{tr('title')}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          onClick={onClose}
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      {/* Scrolling body: change sections + global note */}
      <div className="flex-1 overflow-y-auto -mx-6 px-6">
        <div className="flex flex-col gap-4">
          {/* Added */}
          {added.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PlusIcon className="size-3.5 text-success" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-success">
                  {tr('addedHeading')}
                </span>
                <Pill color="success" className="rounded-full font-bold">
                  {tr('templateCount', {count: added.length})}
                </Pill>
              </div>
              <div className="flex flex-col gap-1.5">
                {added.map(t => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-success/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-success shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
                        <SizeChip size={t.size} points={t.points} />
                        <span className="mx-0.5">&middot;</span>
                        <span>{typeLabel(t.type)}</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{freqLabel(t.type, t.frequency)}</span>
                      </div>
                      <div className="text-[11px] italic text-success mt-1">
                        {tr('addedNote', {
                          type: typeLabel(t.type).toLowerCase(),
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed */}
          {removed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MinusIcon className="size-3.5 text-error" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-error">
                  {tr('removedHeading')}
                </span>
                <Pill color="error" className="rounded-full font-bold">
                  {tr('templateCount', {count: removed.length})}
                </Pill>
              </div>
              <div className="flex flex-col gap-1.5">
                {removed.map(t => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-error/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-error shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
                        <SizeChip size={t.size} points={t.points} />
                        <span className="mx-0.5">&middot;</span>
                        <span>{typeLabel(t.type)}</span>
                        <span className="mx-0.5">&middot;</span>
                        <span>{freqLabel(t.type, t.frequency)}</span>
                      </div>
                      <div className="text-[11px] italic text-error mt-1">
                        {(() => {
                          const count = incompleteCounts[t.templateId] ?? 0;
                          return count > 0
                            ? tr('removedNoteWithTasks', {count})
                            : tr('removedNoteNoTasks');
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified */}
          {modified.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PencilSquareIcon className="size-3.5 text-warning" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-warning">
                  {tr('modifiedHeading')}
                </span>
                <Pill color="warning" className="rounded-full font-bold">
                  {tr('templateCount', {count: modified.length})}
                </Pill>
              </div>
              <div className="flex flex-col gap-1.5">
                {modified.map(t => (
                  <div
                    key={t.templateId}
                    className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-warning/30 rounded-lg"
                  >
                    <div className="size-[7px] rounded-full bg-warning shrink-0 mt-[5px]" />
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <span className="text-base-content/30 line-through">
                          {typeLabel(t.fromType)} &middot;{' '}
                          {freqLabel(t.fromType, t.fromFrequency)}
                        </span>
                        <span className="text-warning mx-0.5">&rarr;</span>
                        <span className="text-warning">
                          {typeLabel(t.toType)} &middot;{' '}
                          {freqLabel(t.toType, t.toFrequency)}
                        </span>
                      </div>
                      <div className="text-[11px] italic text-warning mt-1">
                        {(() => {
                          const count = incompleteCounts[t.templateId] ?? 0;
                          return tr('modifiedNote', {
                            hasTasks: count > 0 ? 'yes' : 'no',
                            count: t.toFrequency,
                            type: typeLabel(t.toType).toLowerCase(),
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad-hoc Tasks */}
          {totalAdhocChanges > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BoltIcon className="size-3.5 text-warning" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-warning">
                  {tr('adhocHeading')}
                </span>
                <Pill color="warning" className="rounded-full font-bold">
                  {tr('taskCount', {count: totalAdhocChanges})}
                </Pill>
              </div>

              {/* Added to board */}
              {addedAdhoc.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold text-info mb-1 pl-0.5">
                    {tr('addedToBoard')}
                  </div>
                  <div className="flex flex-col gap-1.5 mb-2">
                    {addedAdhoc.map(t => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-info/30 rounded-lg"
                      >
                        <div className="size-[7px] rounded-full bg-info shrink-0 mt-[5px]" />
                        <div>
                          <div className="text-sm font-medium text-base-content">
                            {t.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
                            <SizeChip size={t.size} points={t.points} />
                          </div>
                          <div className="text-[11px] italic text-info mt-1">
                            {tr('adhocAddedNote')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Removed from board */}
              {removedAdhoc.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold text-error mb-1 pl-0.5">
                    {tr('removedFromBoard')}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {removedAdhoc.map(t => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-error/30 rounded-lg"
                      >
                        <div className="size-[7px] rounded-full bg-error shrink-0 mt-[5px]" />
                        <div>
                          <div className="text-sm font-medium text-base-content">
                            {t.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
                            <SizeChip size={t.size} points={t.points} />
                          </div>
                          <div className="text-[11px] italic text-error mt-1">
                            {tr('adhocRemovedNote')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {/* Mode Changed */}
          {modeChanged && fromMode && toMode && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowPathIcon className="size-3.5 text-info" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-info">
                  {tr('modeChangedHeading')}
                </span>
              </div>
              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border border-info/30 rounded-lg">
                <div className="size-[7px] rounded-full bg-info shrink-0 mt-[5px]" />
                <div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-base-content/30 line-through">
                      {modeLabel(fromMode)}
                    </span>
                    <span className="text-info mx-0.5">&rarr;</span>
                    <span className="text-info font-medium">
                      {modeLabel(toMode)}
                    </span>
                  </div>
                  <div className="text-[11px] italic text-info mt-1">
                    {tr('modeChangedNote', {
                      description: modeDescription(toMode),
                    })}
                  </div>
                </div>
              </div>
            </div>
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

      {/* Footer (pinned) */}
      <div className="modal-action shrink-0 -mx-6 mt-0 border-t border-base-content/10 px-6 pt-4">
        <button
          type="button"
          className="btn btn-ghost flex-1 md:flex-none"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {tr('cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-[2] md:flex-none"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <ArrowPathIcon className="size-4" />
          )}
          {tr('confirmButton')}
        </button>
      </div>
    </OverlayShell>
  );
}
