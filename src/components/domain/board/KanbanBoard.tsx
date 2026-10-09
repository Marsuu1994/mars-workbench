'use client';

import {useState, useEffect, useMemo} from 'react';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import {
  groupAndSortTasks,
  computeHabitWeeks,
  type BoardPlan,
} from '@/utils/taskUtils';
import {getTodayDate} from '@/utils/dateUtils';
import {updateTaskStatusAction} from '@/actions/taskActions';
import BoardColumn from './BoardColumn';
import DesktopBacklog from './DesktopBacklog';
import MobileBacklog from './MobileBacklog';

interface KanbanBoardProps {
  tasks: TaskItem[];
  /** The active plan — its lines and mode drive the habit cards */
  plan: BoardPlan;
}

export default function KanbanBoard({tasks, plan}: KanbanBoardProps) {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const today = useMemo(() => getTodayDate(), []);

  const habitWeeks = useMemo(
    () => computeHabitWeeks(localTasks, plan),
    [localTasks, plan],
  );

  const columns = groupAndSortTasks(localTasks, today);

  function handleDragEnd(result: DropResult) {
    setIsDragging(false);
    const {destination, source, draggableId} = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Backlog is a drag source only — no un-pull back into the backlog.
    if (destination.droppableId === TaskStatus.BACKLOG) return;

    const newStatus = destination.droppableId as TaskStatus;
    const snapshot = localTasks;

    setLocalTasks(prev =>
      prev.map(task =>
        task.id === draggableId ? {...task, status: newStatus} : task,
      ),
    );

    updateTaskStatusAction(draggableId, {status: newStatus}).then(result => {
      if (result.error) {
        console.error('Failed to update task status:', result.error);
        setLocalTasks(snapshot);
      }
    });
  }

  // Mobile tap-to-pull: BACKLOG → TODO. Same optimistic pattern as handleDragEnd.
  function handlePullToTodo(taskId: string) {
    const snapshot = localTasks;

    setLocalTasks(prev =>
      prev.map(task =>
        task.id === taskId ? {...task, status: TaskStatus.TODO} : task,
      ),
    );

    updateTaskStatusAction(taskId, {status: TaskStatus.TODO}).then(result => {
      if (result.error) {
        console.error('Failed to pull task to Todo:', result.error);
        setLocalTasks(snapshot);
      }
    });
  }

  return (
    <DragDropContext
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* Scroll ownership: @hello-pangea/dnd supports one scroll parent per
            Droppable, so this row must not add scroll axes beyond what it
            owns — md:overflow-y-hidden keeps it x-only on desktop (overflow-x
            auto would otherwise force computed overflow-y to auto), and
            <main> is overflow-hidden on /kanban (AppShell SELF_SCROLLING_ROUTES).
            The remaining dev warning (scrollable columns inside this
            scrollable row) is the library's known kanban limitation. */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5 md:flex-row md:gap-4 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden p-4 max-md:pb-32">
          <BoardColumn
            status={TaskStatus.TODO}
            tasks={columns[TaskStatus.TODO]}
            today={today}
            habitWeeks={habitWeeks}
            isDragActive={isDragging}
          />
          <BoardColumn
            status={TaskStatus.DONE}
            tasks={columns[TaskStatus.DONE]}
            today={today}
            habitWeeks={habitWeeks}
            isDragActive={isDragging}
          />
        </div>
        <DesktopBacklog
          tasks={columns[TaskStatus.BACKLOG]}
          today={today}
          habitWeeks={habitWeeks}
        />
      </div>
      <MobileBacklog
        tasks={columns[TaskStatus.BACKLOG]}
        today={today}
        habitWeeks={habitWeeks}
        onPull={handlePullToTodo}
      />
    </DragDropContext>
  );
}
