'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus, TaskType} from '@/utils/enums';
import {
  getTaskKind,
  isRolloverTask,
  TaskKind,
  type HabitWeek,
} from '@/utils/taskUtils';
import {formatShortDate} from '@/utils/dateUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskCardHead} from './TaskCardHead';
import {HabitSignal} from './HabitSignal';

interface TaskCardFaceProps {
  task: TaskItem;
  today: Date;
  /** The habit's plan line and week dots; absent for other kinds */
  habitWeek?: HabitWeek;
  /** Optional action beside the title (the mobile sheet's ↑ Todo) */
  action?: ReactNode;
}

/**
 * The full kind-first card face — desktop board, desktop backlog and the
 * mobile backlog sheet. Line 1: kind + context. Then the title (and its
 * description until done). Last line: the kind's signal and a neutral size.
 */
export const TaskCardFace = ({
  task,
  today,
  habitWeek,
  action,
}: TaskCardFaceProps) => {
  const tCard = useTranslations('Board.Card');
  const kind = getTaskKind(task.type);
  const isDone = task.status === TaskStatus.DONE;

  const renderPlanLine = ({type, frequency}: HabitWeek) =>
    type === TaskType.DAILY
      ? tCard('planLineDaily', {frequency})
      : tCard('planLineWeekly', {frequency});

  const renderContext = (): ReactNode => {
    switch (kind) {
      case TaskKind.HABIT:
        if (isRolloverTask(task, today)) {
          return (
            <span className="text-base-content/60">
              ↩ {formatShortDate(task.forDate!)}
            </span>
          );
        }
        return habitWeek ? renderPlanLine(habitWeek) : null;
      case TaskKind.ONE_OFF:
        return task.quadrant ? tCard(`Quadrant.${task.quadrant}`) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <TaskCardHead kind={kind} variant="card" context={renderContext()} />

      <div className="flex items-start gap-2.5">
        <h3
          className={`flex-1 min-w-0 text-sm font-medium leading-snug ${
            isDone ? 'line-through text-base-content/50' : ''
          }`}
        >
          {task.title}
        </h3>
        {action}
      </div>

      {task.description && !isDone && (
        <p className="-mt-0.5 text-xs leading-snug text-base-content/60 line-clamp-2 break-words">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 min-h-[18px]">
        {kind === TaskKind.HABIT && habitWeek && (
          <HabitSignal habitWeek={habitWeek} variant="card" />
        )}
        <SizeChip size={task.size} points={task.points} className="ml-auto" />
      </div>
    </>
  );
};
