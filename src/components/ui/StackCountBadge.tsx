'use client';

import {useState} from 'react';
import {Pill, type PillSize} from './Pill';
import {cn} from './cn';

interface StackCountBadgeProps {
  /** Number of items in the stack; the chip reads `×count` */
  count: number;
  /** Tooltip spelling out what the count means */
  label: string;
  size?: PillSize;
  mdSize?: PillSize;
  className?: string;
}

/**
 * `×n` chip counting the items in a stacked card. Pops once each time the
 * count changes while mounted (not on first render), so a pull that leaves
 * the card in place still reads as something happening.
 */
export const StackCountBadge = ({
  count,
  label,
  size,
  mdSize,
  className,
}: StackCountBadgeProps) => {
  const [initialCount] = useState(count);
  const hasChanged = count !== initialCount;

  return (
    <span title={label} className="inline-flex">
      {/* Keyed by count so every change remounts the chip and replays the pop */}
      <Pill
        key={count}
        color="primary"
        size={size}
        mdSize={mdSize}
        className={cn('font-bold', hasChanged && 'fx-bump', className)}
      >
        ×{count}
      </Pill>
    </span>
  );
};
