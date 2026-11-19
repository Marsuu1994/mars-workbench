'use client';

import {useTranslations} from 'next-intl';
import type {ProjectStepContext} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {STEP_PATH_MAX_SEGMENTS} from './taskCardConstants';

type StepPathVariant = 'card' | 'mini';

interface StepPathProps {
  step: ProjectStepContext;
  /** Full card: 92px path · mini card: 52px path */
  variant: StepPathVariant;
}

// Literal classes only — never interpolate, Tailwind can't see it.
const VARIANT_STYLE: Record<StepPathVariant, {path: string; segment: string}> =
  {
    card: {path: 'w-[92px]', segment: 'h-1'},
    mini: {path: 'w-[52px]', segment: 'h-[3px]'},
  };

const {fill, track, ring} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * A project step card's signal: the project's path, one segment per step in
 * order, filled when that step is done, with this card's own step outlined —
 * so each card shows where it sits in its project. Past
 * STEP_PATH_MAX_SEGMENTS the segments give way to one continuous bar. A
 * screen reader reads the path as how many steps are done out of the total.
 */
export const StepPath = ({step, variant}: StepPathProps) => {
  const tCard = useTranslations('Board.Card');
  const {path, currentSegment} = step;
  const {path: pathWidth, segment} = VARIANT_STYLE[variant];
  const doneCount = path.filter(Boolean).length;
  const label = tCard('stepProgressLabel', {
    done: doneCount,
    total: path.length,
  });

  if (path.length > STEP_PATH_MAX_SEGMENTS) {
    return (
      <div role="img" aria-label={label} className="inline-flex">
        <ProgressBar
          value={(doneCount / path.length) * 100}
          fillClassName={fill}
          className={`${pathWidth} ${segment} rounded-selector ${track}`}
        />
      </div>
    );
  }

  const renderSegment = (isDone: boolean, index: number) => (
    <span
      key={index}
      className={`flex-1 rounded-selector ${segment} ${isDone ? fill : track} ${
        index === currentSegment ? `ring-1 ${ring}` : ''
      }`}
    />
  );

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex gap-0.5 ${pathWidth}`}
    >
      {path.map(renderSegment)}
    </span>
  );
};
