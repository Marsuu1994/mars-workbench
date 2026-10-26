'use client';

import {useState, useMemo} from 'react';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {toBoardCards, type BoardCard} from '@/utils/boardCardUtils';
import {updateTaskStatusAction} from '@/actions/taskActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import {BoardHeader} from '@/components/domain/shared/BoardHeader';
import {BoardColumn} from './BoardColumn';
import {DesktopBacklog} from './DesktopBacklog';
import {MobileBacklog} from './MobileBacklog';
import {MobileBacklogCard} from './MobileBacklogCard';
import {ProgressDashboard} from './ProgressDashboard';
import {TaskCard} from './TaskCard';
import {BoardPageContext, type BoardPageContextValue} from './BoardPageContext';

/**
 * The board page (/kanban): header + progress dashboard + the kanban board
 * in a definite-height column (h-full against AppShell's <main>, or a fill
 * scenario frame). Keeps the tasks as client state (moves patch them
 * optimistically and roll back per task on failure), derives the cards with
 * toBoardCards, and renders them into the columns and backlogs — frames that
 * know nothing about cards. The mobile pull reaches its write through
 * BoardPageContext.
 */
export const BoardPage = ({plan, progress, tasks, projects}: BoardData) => {
  const {localTasks, runOptimisticTaskUpdate} = useOptimisticTasks(tasks);
  const [isDragging, setIsDragging] = useState(false);

  const cardsByStatus = useMemo(
    () => toBoardCards(localTasks, {plan, projects}),
    [localTasks, plan, projects],
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

  const pageContext: BoardPageContextValue = {
    // Mobile tap-to-pull: BACKLOG → TODO.
    pullToTodo: taskId =>
      moveTask(taskId, TaskStatus.TODO, 'Failed to pull task to Todo:'),
  };

  const renderDraggableCards = (cards: BoardCard[]) =>
    cards.map((card, index) => (
      <TaskCard key={card.task.id} card={card} index={index} />
    ));

  const renderMobileBacklogCards = () =>
    backlogCards.map(card => (
      <MobileBacklogCard key={card.task.id} card={card} />
    ));

  const renderBoard = () => (
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

  return (
    <BoardPageContext value={pageContext}>
      <div className="flex flex-col h-full">
        <BoardHeader periodKey={plan.periodKey} />
        <ProgressDashboard {...progress} />
        <div className="flex-1 min-h-0">{renderBoard()}</div>
      </div>
    </BoardPageContext>
  );
};
