'use client';

import type {ReactNode} from 'react';
import type {HabitBacklogGroup} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {HabitSignal} from '../HabitSignal';
import {BacklogDescription} from './BacklogDescription';
import {BacklogMoreCount} from './BacklogMoreCount';

interface BacklogHabitFaceProps {
  group: HabitBacklogGroup;
  /** The mobile sheet's ↑ Todo, at the bottom right */
  action?: ReactNode;
}

const {text, Icon} = TASK_KIND_STYLE[TaskKind.HABIT];

/**
 * One habit in the backlog, however many of its instances are staged: its
 * title with "+N more" for the ones behind the next, its description, then the
 * week dots with the next one's own dot ringed — the project face's structure.
 * No plan line, no size.
 */
export const BacklogHabitFace = ({group, action}: BacklogHabitFaceProps) => {
  const {next, behind} = group;
  const {task} = next;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`size-3.5 flex-shrink-0 ${text}`} />
        <h3 className="min-w-0 flex-1 truncate text-sm leading-tight font-medium">
          {task.title}
        </h3>
        {behind.length > 0 && (
          <BacklogMoreCount kind={TaskKind.HABIT} count={behind.length} />
        )}
      </div>
      <BacklogDescription description={task.description} />
      <div className="flex min-h-[18px] items-center gap-2">
        {next.habitWeek && (
          <HabitSignal
            habitWeek={next.habitWeek}
            currentSlot={next.currentSlot}
            variant="card"
          />
        )}
        <span className="flex-1" />
        {action}
      </div>
    </div>
  );
};
