'use client';

import {useTranslations} from 'next-intl';
import {
  ArrowRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {TaskStatus} from '@/utils/enums';
import type {TrackTargetStatus} from '@/schemas';
import {SectionLabel} from '@/components/ui/SectionLabel';
import {TRACK_TARGETS, COMPLETE_DOT_CLASS} from './constants';

export type MoveToVariant = 'popover' | 'sheet';

interface MoveToRowsProps {
  /** Compact desktop popover rows vs the roomier mobile sheet rows */
  variant: MoveToVariant;
  /** Already on the board → the column rows drop out, Done only */
  isTracked: boolean;
  /** No active plan → column rows disabled under a note; Done stays live */
  hasActivePlan: boolean;
  onTrack: (status: TrackTargetStatus) => void;
  onComplete: () => void;
}

interface VariantStyle {
  list: string;
  label: string;
  note: string;
  row: string;
  dot: string;
  icon: string;
  rule: string;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<MoveToVariant, VariantStyle> = {
  popover: {
    list: 'gap-1.5',
    label: 'mb-0.5',
    note: 'text-[11px]',
    row: 'gap-2 px-2.5 py-2 rounded-md text-xs',
    dot: 'size-2',
    icon: 'size-3.5',
    rule: 'my-0.5',
  },
  sheet: {
    list: 'gap-2',
    label: 'block',
    note: 'text-xs',
    row: 'gap-2.5 w-full px-3.5 py-3 rounded-card text-sm',
    dot: 'size-[9px]',
    icon: 'size-4',
    rule: 'my-1',
  },
};

/**
 * The Move-to chooser rows shared by the desktop popover and the mobile
 * sheet: "Move to" label, the two board columns (Todo / In Progress) and,
 * under a hairline, Done. Column rows need an active plan (disabled with a
 * note otherwise) and vanish for tracked cards; Done never needs a plan —
 * completing is the one move that works from any state.
 */
export const MoveToRows = ({
  variant,
  isTracked,
  hasActivePlan,
  onTrack,
  onComplete,
}: MoveToRowsProps) => {
  const t = useTranslations('Priorities');
  const tStatus = useTranslations('Enums.TaskStatus');
  const {list, label, note, row, dot, icon, rule} = VARIANT_STYLE[variant];

  const rowClass = `flex items-center border border-base-content/10 bg-base-100 font-medium transition-colors enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed ${row}`;

  const renderNoPlanNote = () => (
    <p className={`flex items-center gap-1.5 text-warning ${note}`}>
      <ExclamationTriangleIcon className="size-3.5 flex-shrink-0" />
      {t('noPlanNote')}
    </p>
  );

  const renderTrackRow = (status: TrackTargetStatus, dotClass: string) => (
    <button
      key={status}
      type="button"
      disabled={!hasActivePlan}
      onClick={e => {
        e.stopPropagation();
        onTrack(status);
      }}
      className={rowClass}
    >
      <span className={`rounded-full flex-shrink-0 ${dot} ${dotClass}`} />
      {tStatus(status)}
      <ArrowRightIcon className={`ml-auto text-base-content/40 ${icon}`} />
    </button>
  );

  const renderCompleteRow = () => (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onComplete();
      }}
      className={rowClass}
    >
      <span
        className={`rounded-full flex-shrink-0 ${dot} ${COMPLETE_DOT_CLASS}`}
      />
      {tStatus(TaskStatus.DONE)}
      <CheckIcon className={`ml-auto text-success stroke-[2.5] ${icon}`} />
    </button>
  );

  return (
    <div className={`flex flex-col ${list}`}>
      <SectionLabel className={label}>{t('moveTitle')}</SectionLabel>
      {!isTracked && (
        <>
          {!hasActivePlan && renderNoPlanNote()}
          {TRACK_TARGETS.map(({status, dotClass}) =>
            renderTrackRow(status, dotClass),
          )}
          <div className={`h-px bg-base-content/10 ${rule}`} />
        </>
      )}
      {renderCompleteRow()}
    </div>
  );
};
