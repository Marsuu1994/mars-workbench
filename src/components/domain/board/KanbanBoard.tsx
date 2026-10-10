'use client';

import {useState, useMemo} from 'react';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import type {TaskItem} from '@/lib/db/tasks';
import {TaskStatus} from '@/utils/enums';
import type {BoardPlan} from '@/utils/taskUtils';
import {toBoardCards, type BoardCard} from '@/utils/boardCardUtils';
import {updateTaskStatusAction} from '@/actions/taskActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import BoardColumn from './BoardColumn';
import DesktopBacklog from './DesktopBacklog';
import MobileBacklog from './MobileBacklog';
import MobileBacklogCard from './MobileBacklogCard';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  /** The board's state, in the server's shape — moves patch these */
  tasks: TaskItem[];
  /** The active plan — its week, lines and mode drive the habit cards */
  plan: BoardPlan;
}

/**
 * The board's container: keeps the tasks as state, derives the cards with
 * toBoardCards, and renders them into the columns and backlogs — which are
 * frames that know nothing about cards. Moves are optimistic and roll back
 * per task on failure.
 */
export default function KanbanBoard({tasks, plan}: KanbanBoardProps) {
  const {localTasks, runOptimisticTaskUpdate} = useOptimisticTasks(tasks);
  const [isDragging, setIsDragging] = useState(false);

  const cardsByStatus = useMemo(
    () => toBoardCards(localTasks, {plan}),
    [localTasks, plan],
  );
  const {
    [TaskStatus.TODO]: todoCards,
    [TaskStatus.DONE]: doneCards,
    [TaskStatus.BACKLOG]: backlogCards,
  } = cardsByStatus;

  function moveTask(taskId: string, status: TaskStatus, errorLabel: string) {
    runOptimisticTaskUpdate(
      taskId,
      {status},
      () => updateTaskStatusAction(taskId, {status}),
      errorLabel,
    );
  }

  function handleDragEnd(result: DropResult) {
    setIsDragging(false);
    const {destination, source, draggableId} = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Backlog is a drag source only — no un-pull back into the backlog.
    if (destination.droppableId === TaskStatus.BACKLOG) return;

    moveTask(
      draggableId,
      destination.droppableId as TaskStatus,
      'Failed to update task status:',
    );
  }

  // Mobile tap-to-pull: BACKLOG → TODO.
  function pullToTodo(taskId: string) {
    moveTask(taskId, TaskStatus.TODO, 'Failed to pull task to Todo:');
  }

  const renderDraggableCards = (cards: BoardCard[]) =>
    cards.map((card, index) => (
      <TaskCard key={card.task.id} card={card} index={index} />
    ));

  const renderMobileBacklogCards = () =>
    backlogCards.map(card => (
      <MobileBacklogCard key={card.task.id} card={card} onPull={pullToTodo} />
    ));

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
            count={todoCards.length}
            isDragActive={isDragging}
          >
            {renderDraggableCards(todoCards)}
          </BoardColumn>
          <BoardColumn
            status={TaskStatus.DONE}
            count={doneCards.length}
            isDragActive={isDragging}
          >
            {renderDraggableCards(doneCards)}
          </BoardColumn>
        </div>
        <DesktopBacklog count={backlogCards.length}>
          {renderDraggableCards(backlogCards)}
        </DesktopBacklog>
      </div>
      <MobileBacklog count={backlogCards.length}>
        {renderMobileBacklogCards()}
      </MobileBacklog>
    </DragDropContext>
  );
}
