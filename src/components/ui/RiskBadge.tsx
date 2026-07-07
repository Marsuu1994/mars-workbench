'use client';

import {useTranslations} from 'next-intl';
import type {RiskLevel} from '@/utils/taskUtils';
import {Pill, type PillSize} from './Pill';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: PillSize;
  className?: string;
}

/** At-risk / urgent chip derived from a task's risk level. */
export const RiskBadge = ({level, size, className}: RiskBadgeProps) => {
  const t = useTranslations('Board.Card');

  switch (level) {
    case 'warning':
      return (
        <Pill color="warning" size={size} className={className}>
          ⚠ {t('atRisk')}
        </Pill>
      );
    case 'danger':
      return (
        <Pill color="error" size={size} className={className}>
          ‼ {t('urgent')}
        </Pill>
      );
    default:
      return null;
  }
};
