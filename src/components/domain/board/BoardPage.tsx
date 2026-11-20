'use client';

import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import type {BoardData} from '@/types/board';
import {TaskStatus} from '@/utils/enums';
import {toBoardCards} from '@/utils/boardCardUtils';
import {countBacklogTasks, toBacklogSections} from '@/utils/backlogGroupUtils';
import {DayState, toDayRings} from '@/utils/dayRingUtils';
import {updateTaskStatusAction} from '@/actions/taskActions';
import {useOptimisticTasks} from '@/hooks/useOptimisticTasks';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {BoardHeader} from '@/components/domain/shared/BoardHeader';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {FinishBox} from '@/components/ui/FinishBox';
import {BoardColumn} from './BoardColumn';
import {DesktopBacklog} from './DesktopBacklog';
import {MobileBacklog} from './MobileBacklog';
import {BacklogGroupList} from './backlog-group/BacklogGroupList';
import {DayRingRow} from './day-rings/DayRingRow';
import {TodoCard} from './TodoCard';
import {DoneCard} from './DoneCard';
import {ARM_DEBOUNCE_MS} from './taskCardConstants';
import {
  COMPLETE_VIBRATION,
  pickJuice,
  playCompletion,
  readPressClock,
  RING_CLOSE_VIBRATION,
  slideIntoGap,
  vibrate,
  type Juice,
} from './motion/completionMotion';
import {
  BoardPageContext,
  type BoardPageContextValue,
  type CloseDayOptions,
} from './BoardPageContext';

/** A selected Todo card, and when it was selected (TAP-3's guard) */
interface Selection {
  taskId: string;
  selectedAt: number;
}

const TODO_CARD_SELECTOR = '[data-todo-card]';

/**
 * Workaround (iOS Safari): a tap on something that isn't clickable sends no
 * click at all unless an element between it and <body> has a click handler,
 * so the document's listener below would never hear a tap on the board's
 * empty space, and a selected card or an open day's list would stay. With
 * this empty handler on the page every tap on it is a click.
 */
const hearEveryTap = () => {};

/**
 * The board page (/kanban): header, the row of day rings and the board in a
 * definite-height column (h-full against AppShell's <main>). Keeps the tasks
 * as state and derives everything else from them on every render: the
 * cards (toBoardCards), the backlog's groups (toBacklogSections) and the
 * rings (toDayRings). Owns the selected card, the open day's list and the
 * completion's motion, and provides them, with every write, through
 * BoardPageContext. Moves are optimistic and roll back per task on failure,
 * and the rings follow them, roll-backs included.
 */
export const BoardPage = ({
  plan,
  tasks,
  projects,
  expiredDailyCountByDate,
}: BoardData) => {
  const tTodo = useTranslations('Board.Todo');
  const {isMobile} = useBreakpoint();
  const {localTasks, runOptimisticTaskUpdate} = useOptimisticTasks(tasks);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isTossing, setIsTossing] = useState(false);
  const [openDayDate, setOpenDayDate] = useState<string | null>(null);
  const [tickKey, setTickKey] = useState(0);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [freshDoneTaskId, setFreshDoneTaskId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const lastJuiceRef = useRef<Juice | null>(null);
  // Where each Todo card stood before a tossed card left, and the toss's
  // copy, both handled once the move has rendered
  const slideFromRef = useRef<Map<string, number> | null>(null);
  const removeGhostRef = useRef<(() => void) | null>(null);

  const cardsByStatus = toBoardCards(localTasks, {plan, projects});
  const todoCards = cardsByStatus[TaskStatus.TODO];
  const doneCards = cardsByStatus[TaskStatus.DONE];
  const backlogSections = toBacklogSections(cardsByStatus[TaskStatus.BACKLOG], {
    plan,
    projects,
  });
  const backlogCount = countBacklogTasks(backlogSections);
  const rings = toDayRings(localTasks, {
    periodKey: plan.periodKey,
    expiredDailyCountByDate,
    now: new Date(),
  });
  const todayRing = rings.find(({state}) => state === DayState.TODAY);
  // An empty Todo says the day is clear once something was finished today
  const isDayClear = todoCards.length === 0 && (todayRing?.doneCount ?? 0) > 0;
  // Today's ring as last rendered: ✓ Complete finishes its card after the
  // toss, by when the ring it started from may have changed
  const todayRingRef = useRef(todayRing);
  useEffect(() => {
    todayRingRef.current = todayRing;
  });

  useLayoutEffect(() => {
    const slideFrom = slideFromRef.current;
    if (slideFrom && pageRef.current) {
      slideIntoGap(
        pageRef.current.querySelectorAll<HTMLElement>(TODO_CARD_SELECTOR),
        slideFrom,
        card => card.dataset.todoCard,
      );
    }
    slideFromRef.current = null;
    removeGhostRef.current?.();
    removeGhostRef.current = null;
  });

  function focusDayCell(date: string) {
    pageRef.current
      ?.querySelector<HTMLElement>(`[data-day-cell="${date}"]`)
      ?.focus();
  }

  function closeDay({restoreFocus}: CloseDayOptions) {
    if (restoreFocus && openDayDate && !isMobile) focusDayCell(openDayDate);
    setOpenDayDate(null);
  }

  // A press outside the Todo cards cancels the selection, and one outside
  // the open list closes it (TAP-2, DAY-4); a dialog (the sheets) closes
  // itself. Esc does both, and focus goes back to the day's cell.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const {target} = event;
      if (!target.closest(TODO_CARD_SELECTOR)) setSelection(null);
      if (!target.closest('[data-day-list], [data-day-cell], dialog')) {
        setOpenDayDate(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelection(null);
      if (openDayDate && !isMobile) focusDayCell(openDayDate);
      setOpenDayDate(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  function moveTask(taskId: string, status: TaskStatus, errorLabel: string) {
    // The server stamps doneAt; stamping it here too puts a finished card on
    // top of Done and in today's ring at once
    const patch =
      status === TaskStatus.DONE ? {status, doneAt: new Date()} : {status};
    runOptimisticTaskUpdate(
      taskId,
      patch,
      () => updateTaskStatusAction(taskId, {status}),
      errorLabel,
    );
  }

  // Finishes a Todo card once ✓ Complete's toss has landed: today's cell
  // jumps, and celebrates when this closes its ring (FX-3, FX-4)
  function finishTask(taskId: string) {
    const todayRing = todayRingRef.current;
    const closesToday =
      todayRing !== undefined &&
      !todayRing.isClosed &&
      todayRing.doneCount + 1 === todayRing.plannedCount;
    moveTask(taskId, TaskStatus.DONE, 'Failed to finish task:');
    setFreshDoneTaskId(taskId);
    setTickKey(prev => prev + 1);
    if (closesToday) {
      setCelebrationKey(prev => prev + 1);
      vibrate(RING_CLOSE_VIBRATION);
    }
  }

  function pullToTodo(taskId: string) {
    moveTask(taskId, TaskStatus.TODO, 'Failed to pull task to Todo:');
  }

  function pressTodoCard(taskId: string) {
    if (isTossing) return;
    setOpenDayDate(null);
    setSelection(
      selection?.taskId === taskId
        ? null
        : {taskId, selectedAt: readPressClock()},
    );
  }

  async function completeCard(taskId: string) {
    if (isTossing || selection?.taskId !== taskId) return;
    if (readPressClock() - selection.selectedAt < ARM_DEBOUNCE_MS) return;
    const page = pageRef.current;
    const card = page?.querySelector<HTMLElement>(
      `[data-todo-card="${taskId}"]`,
    );
    const ring = page?.querySelector('[data-today-ring]');
    const kind = todoCards.find(({task}) => task.id === taskId)?.kind;
    vibrate(COMPLETE_VIBRATION);
    if (page && card && ring && kind) {
      const juice = pickJuice(lastJuiceRef.current);
      lastJuiceRef.current = juice;
      setIsTossing(true);
      removeGhostRef.current = await playCompletion({
        card,
        ring,
        host: page,
        juice,
        kindColor: TASK_KIND_STYLE[kind].color,
      });
      slideFromRef.current = new Map(
        [...page.querySelectorAll<HTMLElement>(TODO_CARD_SELECTOR)].map(
          element => [
            element.dataset.todoCard ?? '',
            element.getBoundingClientRect().top,
          ],
        ),
      );
    }
    setIsTossing(false);
    setSelection(null);
    finishTask(taskId);
  }

  function toggleDay(date: string) {
    if (openDayDate === date) {
      closeDay({restoreFocus: true});
      return;
    }
    setSelection(null);
    setOpenDayDate(date);
  }

  const pageContext: BoardPageContextValue = {
    pullToTodo,
    selectedTaskId: selection?.taskId ?? null,
    pressTodoCard,
    completeCard: taskId => void completeCard(taskId),
    openDayDate,
    toggleDay,
    closeDay,
    tickKey,
    celebrationKey,
    freshDoneTaskId,
  };

  const renderTodo = () =>
    isDayClear ? (
      <FinishBox
        title={tTodo('DayClear.title')}
        lines={[tTodo('DayClear.fact'), tTodo('DayClear.nextStep')]}
        className="w-full flex-shrink-0"
      />
    ) : (
      todoCards.map(card => <TodoCard key={card.task.id} card={card} />)
    );

  const renderBoard = () => (
    <>
      <div className="flex h-full">
        {/* On desktop this row scrolls sideways only, and each column scrolls
            its own cards: md:overflow-y-hidden keeps overflow-x-auto from
            turning the row's overflow-y to auto as well. <main> doesn't
            scroll on /kanban (AppShell SELF_SCROLLING_ROUTES). */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5 md:flex-row md:gap-4 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden p-4 max-md:pb-32">
          <BoardColumn status={TaskStatus.TODO} count={todoCards.length}>
            {renderTodo()}
          </BoardColumn>
          {!isMobile && (
            <BoardColumn status={TaskStatus.DONE} count={doneCards.length}>
              {doneCards.map(card => (
                <DoneCard key={card.task.id} card={card} />
              ))}
            </BoardColumn>
          )}
        </div>
        <DesktopBacklog count={backlogCount}>
          <BacklogGroupList sections={backlogSections} variant="desktop" />
        </DesktopBacklog>
      </div>
      <MobileBacklog count={backlogCount}>
        <BacklogGroupList sections={backlogSections} variant="mobile" />
      </MobileBacklog>
    </>
  );

  return (
    <BoardPageContext value={pageContext}>
      <div
        ref={pageRef}
        onClick={hearEveryTap}
        className="flex h-full flex-col [-webkit-tap-highlight-color:transparent]"
      >
        <BoardHeader periodKey={plan.periodKey} />
        <DayRingRow rings={rings} doneCards={doneCards} />
        <div className="min-h-0 flex-1">{renderBoard()}</div>
      </div>
    </BoardPageContext>
  );
};
