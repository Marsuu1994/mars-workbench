'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {
  getTaskKind,
  isRolloverTask,
  TaskKind,
  type HabitWeek,
} from '@/utils/taskUtils';
import {formatShortWeekday} from '@/utils/dateUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskCardHead} from './TaskCardHead';
import {HabitSignal} from './HabitSignal';

interface TaskCardMiniFaceProps {
  task: TaskItem;
  today: Date;
  /** The habit's week dots; absent for other kinds */
  habitWeek?: HabitWeek;
}

/**
 * The 136px card face in the mobile board rows: kind label, the title
 * (two lines), then the signal — dots, or ↩ and the day for a rollover —
 * and the size.
 */
export const TaskCardMiniFace = ({
  task,
  today,
  habitWeek,
}: TaskCardMiniFaceProps) => {
  const kind = getTaskKind(task.type);
  const isDone = task.status === TaskStatus.DONE;

  const renderSignal = () => {
    if (kind !== TaskKind.HABIT) return null;
    if (isRolloverTask(task, today)) {
      return (
        <span className="fx-num text-[9px] text-base-content/60">
          ↩ {formatShortWeekday(task.forDate!)}
        </span>
      );
    }
    return habitWeek ? (
      <HabitSignal habitWeek={habitWeek} variant="mini" />
    ) : null;
  };

  return (
    <>
      <TaskCardHead kind={kind} variant="mini" />

      <h3
        className={`text-xs font-medium leading-tight line-clamp-2 ${
          isDone ? 'line-through text-base-content/50' : ''
        }`}
      >
        {task.title}
      </h3>

      <div className="mt-auto flex items-center gap-1">
        {renderSignal()}
        <SizeChip
          size={task.size}
          points={task.points}
          className="ml-auto text-[8px] px-1.5 py-px"
        />
      </div>
    </>
  );
};
