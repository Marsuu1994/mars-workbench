'use client';

import {useTranslations} from 'next-intl';
import type {TaskSize} from '@/utils/enums';
import {Pill} from './Pill';
import {cn} from './cn';

interface SizeChipProps {
  size: TaskSize;
  points: number;
  className?: string;
  /** Compact variant (mobile matrix cards): size label only, no points */
  labelOnly?: boolean;
}

/** Inline size + Fibonacci points indicator used on cards and rows. */
export const SizeChip = ({
  size,
  points,
  className,
  labelOnly,
}: SizeChipProps) => {
  const t = useTranslations('Enums.TaskSize');

  return (
    <Pill color="success" className={cn('font-bold', className)}>
      <span>{t(size)}</span>
      {!labelOnly && (
        <>
          <span className="opacity-40">&middot;</span>
          <span className="fx-num font-semibold opacity-70">{points}</span>
        </>
      )}
    </Pill>
  );
};
