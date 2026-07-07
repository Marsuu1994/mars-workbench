'use client';

import {useTranslations} from 'next-intl';
import {TaskType} from '@/utils/enums';
import {Pill, type PillColor} from './Pill';

interface TaskTypeBadgeProps {
  type: string;
}

const COLOR_CONFIG: Record<string, PillColor> = {
  [TaskType.DAILY]: 'info',
  [TaskType.WEEKLY]: 'secondary',
  [TaskType.AD_HOC]: 'warning',
};

/** Semantic chip for a task's recurrence type. */
export const TaskTypeBadge = ({type}: TaskTypeBadgeProps) => {
  const t = useTranslations('Enums.TaskType');
  const key: TaskType =
    type in COLOR_CONFIG ? (type as TaskType) : TaskType.DAILY;

  return (
    <Pill color={COLOR_CONFIG[key]} size="xs" mdSize="sm">
      {t(key)}
    </Pill>
  );
};
