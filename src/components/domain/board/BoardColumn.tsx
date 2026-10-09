'use client';

import {Droppable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import type {HabitWeek} from '@/utils/taskUtils';
import TaskCard from './TaskCard';

interface BoardColumnProps {
  status: BoardColumnStatus;
  tasks: TaskItem[];
  /** Per-template habit context + dots, keyed by templateId */
  habitWeeks: Map<string, HabitWeek>;
  /** True while any card is being dragged — faintly outlines all drop targets. */
  isDragActive?: boolean;
}

type BoardColumnStatus = typeof TaskStatus.TODO | typeof TaskStatus.DONE;

const STATUS_STYLE: Record<
  BoardColumnStatus,
  {accent: string; ledColor: string}
> = {
  [TaskStatus.TODO]: {accent: 'md:border-l-info', ledColor: 'text-info'},
  [TaskStatus.DONE]: {accent: 'md:border-l-success', ledColor: 'text-success'},
};

export default function BoardColumn({
  status,
  tasks,
  habitWeeks,
  isDragActive = false,
}: BoardColumnProps) {
  const {isMobile} = useBreakpoint();
  const tStatus = useTranslations('Enums.TaskStatus');
  const {accent, ledColor} = STATUS_STYLE[status];

  // Only one border-color utility is active at a time, so highlights override
  // the base color cleanly (no Tailwind class-ordering ambiguity). Drop
  // targets speak the mars-signal-orange channel (fx-target).
  const columnBorder = (isDraggingOver: boolean): string => {
    if (isDraggingOver) return 'md:fx-target md:border md:border-transparent';
    if (isDragActive) return 'md:border md:border-dashed md:border-accent/30';
    return 'md:border md:border-base-content/10';
  };

  return (
    <Droppable
      droppableId={status}
      direction={isMobile ? 'horizontal' : 'vertical'}
    >
      {(provided, snapshot) => (
        <div
          className={`w-full md:min-w-[280px] md:flex-1 md:bg-base-200/10 md:rounded-xl flex flex-col transition-colors duration-200 ${columnBorder(
            snapshot.isDraggingOver,
          )}`}
        >
          <div
            className={`flex items-center justify-between md:justify-start gap-2 px-4 py-1.5 md:py-3 md:border-l-4 md:border-b md:border-b-base-content/10 ${accent} md:rounded-tl-xl`}
          >
            <div className="flex items-center gap-2">
              <span className={`fx-led md:hidden ${ledColor}`} />
              <h2
                className={`fx-label fx-label-bright fx-display font-semibold ${
                  snapshot.isDraggingOver ? 'max-md:text-accent' : ''
                }`}
              >
                {tStatus(status)}
              </h2>
            </div>
            <span className="badge badge-ghost badge-sm fx-num">
              {tasks.length}
            </span>
          </div>

          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:flex-col md:p-3 md:overflow-y-auto md:overflow-x-visible md:flex-1 md:rounded-b-xl max-md:rounded-xl max-md:border-2 max-md:border-dashed transition-colors duration-200 ${
              snapshot.isDraggingOver
                ? 'max-md:border-accent max-md:bg-accent/10'
                : 'max-md:border-transparent'
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                habitWeek={
                  task.templateId ? habitWeeks.get(task.templateId) : undefined
                }
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}
