'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {getTaskKind, TaskKind, type HabitWeek} from '@/utils/taskUtils';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {TaskCardHead} from './TaskCardHead';
import {HabitSignal} from './HabitSignal';

interface TaskCardMiniFaceProps {
  task: TaskItem;
  /** The habit's week dots; absent for other kinds */
  habitWeek?: HabitWeek;
}

/**
 * The 136px card face in the mobile board rows: kind label, the title
 * (two lines), then the signal — a habit's week dots, its own ringed — and
 * the size.
 */
export const TaskCardMiniFace = ({task, habitWeek}: TaskCardMiniFaceProps) => {
  const kind = getTaskKind(task.type);
  const isDone = task.status === TaskStatus.DONE;

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
        {kind === TaskKind.HABIT && habitWeek && (
          <HabitSignal
            habitWeek={habitWeek}
            currentSlot={habitWeek.slotByTaskId.get(task.id)}
            variant="mini"
          />
        )}
        <SizeChip
          size={task.size}
          points={task.points}
          className="ml-auto text-[8px] px-1.5 py-px"
        />
      </div>
    </>
  );
};
