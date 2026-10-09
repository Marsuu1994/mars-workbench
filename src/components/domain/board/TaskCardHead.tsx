'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import type {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';

type TaskCardHeadVariant = 'card' | 'mini';

interface TaskCardHeadProps {
  kind: TaskKind;
  variant: TaskCardHeadVariant;
  /** Right-aligned context (plan line, ↩ date, quadrant); full card only */
  context?: ReactNode;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<TaskCardHeadVariant, {row: string; icon: string}> =
  {
    card: {row: 'gap-1.5 text-[10px] tracking-[0.1em]', icon: 'size-3'},
    mini: {row: 'gap-1 text-[8.5px] tracking-[0.08em]', icon: 'size-2.5'},
  };

/**
 * A task card's first line: what kind of work this is — icon and label in the
 * kind's colour — plus its context. The kind colour never changes on a card.
 */
export const TaskCardHead = ({kind, variant, context}: TaskCardHeadProps) => {
  const tKind = useTranslations('Enums.TaskKind');
  const {text, Icon} = TASK_KIND_STYLE[kind];
  const {row, icon} = VARIANT_STYLE[variant];

  return (
    <div
      className={`flex items-center min-w-0 fx-num font-semibold uppercase ${row} ${text}`}
    >
      <Icon className={`flex-shrink-0 stroke-2 ${icon}`} />
      <span className="truncate">{tKind(kind)}</span>
      {context && (
        <span className="ml-auto flex-shrink-0 whitespace-nowrap font-medium normal-case tracking-[0.04em] text-base-content/50">
          {context}
        </span>
      )}
    </div>
  );
};
