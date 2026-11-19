'use client';

import {useState, useMemo} from 'react';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {toBoardCards, type BoardCard} from '@/utils/boardCardUtils';
import {countBacklogTasks, toBacklogSections} from '@/utils/backlogGroupUtils';
import {hasTaskDoneToday} from '@/utils/taskUtils';
import {updateTaskStatusAction} from '@/actions/taskActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import {useTranslations} from 'next-intl';
import {BoardHeader} from '@/components/domain/shared/BoardHeader';
import {FinishBox} from '@/components/ui/FinishBox';
import {BoardColumn} from './BoardColumn';
import {DesktopBacklog} from './DesktopBacklog';
import {MobileBacklog} from './MobileBacklog';
import {BacklogGroupList} from './backlog-group/BacklogGroupList';
import {ProgressDashboard} from './ProgressDashboard';
import {TaskCard} from './TaskCard';
import {BoardPageContext, type BoardPageContextValue} from './BoardPageContext';

/**
 * The board page (/kanban): header, progress dashboard and the board in a
 * definite-height column (h-full against AppShell's <main>). Keeps the tasks
 * as state, derives the cards with toBoardCards and the backlog's groups
 * with toBacklogSections, and renders them into the columns and backlogs —
 * frames that know nothing about cards. Moves are optimistic and roll back
 * per task on failure; the mobile pull reaches its cards through
 * BoardPageContext.
 */
export const BoardPage = ({plan, progress, tasks, projects}: BoardData) => {
  const tTodo = useTranslations('Board.Todo');
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
  const backlogSections = useMemo(
    () => toBacklogSections(backlogCards, {plan, projects}),
    [backlogCards, plan, projects],
  );
  const backlogCount = countBacklogTasks(backlogSections);
  // An empty Todo says the day is clear once something was finished today; a
  // card dropped on Done counts at once, since its doneAt is stamped here
  const isDayClear =
    todoCards.length === 0 &&
    hasTaskDoneToday(
      doneCards.map(({task}) => task),
      new Date(),
    );

  function moveTask(taskId: string, status: TaskStatus, errorLabel: string) {
    // The server stamps doneAt; stamping it here too puts a card dropped on
    // Done on top of the column at once (Done runs latest first)
    const patch =
      status === TaskStatus.DONE ? {status, doneAt: new Date()} : {status};
    runOptimisticTaskUpdate(
      taskId,
      patch,
      () => updateTaskStatusAction(taskId, {status}),
      errorLabel,
    );
  }

  function handleDragEnd(result: DropResult) {
    setIsDragging(false);
    const {destination, source, draggableId} = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Only Todo and Done take drops: the backlog's groups are drag sources
    // only — no un-pull back into the backlog.
    const status = destination.droppableId;
    if (status !== TaskStatus.TODO && status !== TaskStatus.DONE) return;

    moveTask(draggableId, status, 'Failed to update task status:');
  }

  // Mobile tap-to-pull: BACKLOG → TODO.
  function pullToTodo(taskId: string) {
    moveTask(taskId, TaskStatus.TODO, 'Failed to pull task to Todo:');
  }

  const pageContext: BoardPageContextValue = {pullToTodo};

  const renderDraggableCards = (cards: BoardCard[]) =>
    cards.map((card, index) => (
      <TaskCard key={card.task.id} card={card} index={index} />
    ));

  const renderTodo = () =>
    isDayClear ? (
      <FinishBox
        title={tTodo('DayClear.title')}
        lines={[tTodo('DayClear.fact'), tTodo('DayClear.nextStep')]}
        className="w-full flex-shrink-0"
      />
    ) : (
      renderDraggableCards(todoCards)
    );

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
            {renderTodo()}
          </BoardColumn>
          <BoardColumn
            status={TaskStatus.DONE}
            count={doneCards.length}
            isDragActive={isDragging}
          >
            {renderDraggableCards(doneCards)}
          </BoardColumn>
        </div>
        <DesktopBacklog count={backlogCount}>
          <BacklogGroupList sections={backlogSections} variant="desktop" />
        </DesktopBacklog>
      </div>
      <MobileBacklog count={backlogCount}>
        <BacklogGroupList sections={backlogSections} variant="mobile" />
      </MobileBacklog>
    </DragDropContext>
  );

  return (
    <BoardPageContext value={pageContext}>
      <div className="flex h-full flex-col">
        <BoardHeader periodKey={plan.periodKey} />
        <ProgressDashboard {...progress} />
        <div className="min-h-0 flex-1">{renderBoard()}</div>
      </div>
    </BoardPageContext>
  );
};
