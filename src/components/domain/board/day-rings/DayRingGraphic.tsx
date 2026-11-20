'use client';

import type {CSSProperties} from 'react';
import type {DayRing} from '@/utils/dayRingUtils';
import {toRingArcShares, toSparkKinds} from '@/utils/dayRingUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {
  RING_ARC_GAP,
  RING_CHECK_RATIO,
  RING_STROKE_RATIO,
  SPARK_COUNT,
} from './constants';

interface DayRingGraphicProps {
  ring: DayRing;
  /** Its size in px */
  size: number;
}

/** The ✓ drawn in a closed ring's centre */
const CHECK_PATH = 'm4.5 12.75 6 6 9-13.5';

/**
 * One day's ring (RING-3): an empty track for everything planned, and one arc
 * of the same length for each task done, in its kind's colour, from 12
 * o'clock clockwise, habits first, then steps, then one-offs. A closed ring
 * holds a ✓ and the sparks its celebration throws (FX-4); the arcs grow and
 * shrink to new lengths with fx-ring-grow (FX-3).
 */
export const DayRingGraphic = ({ring, size}: DayRingGraphicProps) => {
  const {done, plannedCount, isClosed} = ring;
  const stroke = size * RING_STROKE_RATIO;
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const checkSize = size * RING_CHECK_RATIO;

  const arcs = toRingArcShares(done, plannedCount);

  const renderSparks = () =>
    toSparkKinds(done, SPARK_COUNT).map((kind, index) => (
      <i
        key={index}
        aria-hidden="true"
        className="fx-ring-spark"
        style={
          {
            '--fx-spark-angle': `${index * (360 / SPARK_COUNT)}deg`,
            '--fx-spark-color': TASK_KIND_STYLE[kind].color,
          } as CSSProperties
        }
      />
    ));

  return (
    <span
      className={`relative inline-grid flex-shrink-0 place-items-center *:[grid-area:1/1] ${
        isClosed
          ? 'drop-shadow-[0_0_4px_color-mix(in_oklab,var(--color-success)_45%,transparent)]'
          : ''
      }`}
      aria-hidden="true"
    >
      <svg
        className="fx-ring-svg -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-base-content/10"
        />
        {arcs.map(({kind, share, offset}) => (
          <circle
            key={kind}
            data-arc={kind}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(share * circumference - RING_ARC_GAP, 0)} ${circumference}`}
            strokeDashoffset={-offset * circumference}
            className={`fx-ring-grow ${TASK_KIND_STYLE[kind].stroke}`}
          />
        ))}
      </svg>
      {isClosed && (
        <svg
          className="fx-ring-check stroke-success"
          width={checkSize}
          height={checkSize}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={CHECK_PATH} pathLength={1} strokeDasharray={1} />
        </svg>
      )}
      {isClosed && renderSparks()}
    </span>
  );
};
