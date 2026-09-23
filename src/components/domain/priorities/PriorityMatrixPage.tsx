'use client';

import {useState, useEffect, useMemo} from 'react';
import {DragDropContext, type DropResult} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {
  StarIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {PriorityQuadrant} from '@/utils/enums';
import type {TrackTargetStatus} from '@/schemas';
import type {MatrixActivePlan} from '@/services/matrixService';
import {
  updateTaskQuadrantAction,
  trackTaskAction,
  completeTaskAction,
  undoCompleteTaskAction,
} from '@/actions/matrixActions';
import TaskModal from '@/components/domain/shared/task-modal/TaskModal';
import {Toast} from '@/components/ui/Toast';
import QuadrantCell from './QuadrantCell';
import {MobileMoveToSheet} from './MobileMoveToSheet';
import {
  QUADRANT_ORDER,
  FALLBACK_QUADRANT,
  CREATE_PLAN_HREF,
  TOAST_DURATION_MS,
  UNDO_TOAST_MS,
} from './constants';

interface PriorityMatrixPageProps {
  tasks: TaskItem[];
  activePlan: MatrixActivePlan | null;
  /** Design scenario override — pins a card's Move-to popover open on mount. */
  initialOpenPopoverTaskId?: string;
  /** Design scenario override — mounts with this card just completed: off the
      grid, undo toast showing with its countdown held. */
  initialUndoToastTaskId?: string;
}

/** The undo window's state: everything needed to put the card back. */
interface UndoToastState {
  /** Pre-complete snapshot, restored verbatim on Undo */
  task: TaskItem;
  /** Where the card sat in the list, so it returns to the same spot */
  index: number;
  /** An active plan absorbed the points → "+N pts this week" copy */
  credited: boolean;
  /** The completion write, true once it landed — Undo waits for it because
      the server-side revert is guarded on status = DONE */
  completed: Promise<boolean>;
  /** Scenario pin — the countdown is held */
  pinned?: boolean;
}

const insertTaskAt = (list: TaskItem[], index: number, task: TaskItem) => [
  ...list.slice(0, index),
  task,
  ...list.slice(index),
];

const withoutTask = (list: TaskItem[], taskId?: string) =>
  taskId ? list.filter(task => task.id !== taskId) : list;

export default function PriorityMatrixPage({
  tasks,
  activePlan,
  initialOpenPopoverTaskId,
  initialUndoToastTaskId,
}: PriorityMatrixPageProps) {
  const t = useTranslations('Priorities');
  const tQuadrant = useTranslations('Enums.PriorityQuadrant');
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(() =>
    withoutTask(tasks, initialUndoToastTaskId),
  );
  const [openPopoverTaskId, setOpenPopoverTaskId] = useState<string | null>(
    initialOpenPopoverTaskId ?? null,
  );
  const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
  // null = closed; quadrant undefined = mobile global add (modal shows its picker)
  const [addModal, setAddModal] = useState<{
    quadrant?: PriorityQuadrant;
  } | null>(null);
  const [toastQuadrant, setToastQuadrant] = useState<PriorityQuadrant | null>(
    null,
  );
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(() => {
    const index = tasks.findIndex(task => task.id === initialUndoToastTaskId);
    if (!initialUndoToastTaskId || index === -1) return null;
    return {
      task: tasks[index],
      index,
      credited: activePlan !== null,
      completed: Promise.resolve(true),
      pinned: true,
    };
  });

  useEffect(() => {
    setLocalTasks(withoutTask(tasks, initialUndoToastTaskId));
  }, [tasks, initialUndoToastTaskId]);

  const activePlanId = activePlan?.id ?? null;
  const isTrackedTask = (task: TaskItem) =>
    activePlanId !== null && task.planId === activePlanId;

  const byQuadrant = useMemo(() => {
    const groups: Record<PriorityQuadrant, TaskItem[]> = {
      [PriorityQuadrant.DO_FIRST]: [],
      [PriorityQuadrant.SCHEDULE]: [],
      [PriorityQuadrant.SQUEEZE_IN]: [],
      [PriorityQuadrant.MAYBE_LATER]: [],
    };
    for (const task of localTasks) {
      groups[
        (task.quadrant as PriorityQuadrant | null) ?? FALLBACK_QUADRANT
      ].push(task);
    }
    return groups;
  }, [localTasks]);

  const totalCount = localTasks.length;
  const trackedCount = localTasks.filter(isTrackedTask).length;

  // Optimistically patch one task and fire the server action; on failure only
  // that task's previous value is restored — restoring a whole-list snapshot
  // would clobber concurrent optimistic updates that landed in between.
  function runOptimisticTaskUpdate(
    taskId: string,
    patch: Partial<TaskItem>,
    action: () => Promise<{error?: unknown}>,
    errorLabel: string,
  ) {
    const previous = localTasks.find(task => task.id === taskId);
    if (!previous) return;

    setLocalTasks(prev =>
      prev.map(task => (task.id === taskId ? {...task, ...patch} : task)),
    );

    action().then(result => {
      if (result.error) {
        console.error(errorLabel, result.error);
        setLocalTasks(prev =>
          prev.map(task => (task.id === taskId ? previous : task)),
        );
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    const {destination, source, draggableId} = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newQuadrant = destination.droppableId as PriorityQuadrant;
    runOptimisticTaskUpdate(
      draggableId,
      {quadrant: newQuadrant},
      () => updateTaskQuadrantAction(draggableId, {quadrant: newQuadrant}),
      'Failed to reprioritize task:',
    );
  }

  // Track This Week: optimistic dim + "This Week" tag + count bump, rollback on failure
  function handleTrack(taskId: string, status: TrackTargetStatus) {
    if (!activePlanId) return;
    setOpenPopoverTaskId(null);
    setSheetTask(null);

    runOptimisticTaskUpdate(
      taskId,
      {planId: activePlanId, status},
      () => trackTaskAction(taskId, {status}),
      'Failed to track task:',
    );
  }

  // Complete One-off: the matrix never shows DONE tasks, so the card leaves
  // optimistically and a 5 s undo toast opens; on failure the card returns
  // to where it was and the toast is withdrawn. No confirm — act, then undo.
  function handleComplete(taskId: string) {
    setOpenPopoverTaskId(null);
    setSheetTask(null);

    const index = localTasks.findIndex(task => task.id === taskId);
    if (index === -1) return;
    const previous = localTasks[index];

    setLocalTasks(prev => prev.filter(task => task.id !== taskId));

    const completed = completeTaskAction(taskId).then(result => {
      if (!result.error) return true;
      console.error('Failed to complete task:', result.error);
      setLocalTasks(prev => insertTaskAt(prev, index, previous));
      setUndoToast(current => (current?.task.id === taskId ? null : current));
      return false;
    });

    setUndoToast({
      task: previous,
      index,
      credited: activePlanId !== null,
      completed,
    });
  }

  // Undo: wait for the completion write (the revert is guarded on DONE), then
  // put the snapshot back — status and plan link exactly as before.
  async function handleUndo() {
    if (!undoToast) return;
    const {task, index, completed} = undoToast;
    setUndoToast(null);

    if (!(await completed)) return;

    setLocalTasks(prev => insertTaskAt(prev, index, task));

    const result = await undoCompleteTaskAction(task.id, {
      status: task.status,
      detach: task.planId === null,
    });
    if (result.error) {
      console.error('Failed to undo completion:', result.error);
      setLocalTasks(prev => prev.filter(item => item.id !== task.id));
    }
  }

  // Keyed by task so a second completion restarts the countdown.
  const renderUndoToast = () =>
    undoToast !== null && (
      <Toast
        key={undoToast.task.id}
        tone="success"
        durationMs={UNDO_TOAST_MS}
        paused={undoToast.pinned}
        onDismiss={() => setUndoToast(null)}
        actionLabel={t('undo')}
        onAction={handleUndo}
      >
        <CheckIcon className="size-[15px] stroke-[2.5]" />
        {undoToast.credited
          ? t('doneToastCredited', {points: undoToast.task.points})
          : t('doneToast')}
      </Toast>
    );

  // Mobile-only confirmation for the picker add flow; it yields to the undo
  // toast so the two never stack.
  const renderAddedToast = () =>
    toastQuadrant !== null &&
    undoToast === null && (
      <Toast
        key={toastQuadrant}
        tone="success"
        className="md:hidden"
        durationMs={TOAST_DURATION_MS}
        onDismiss={() => setToastQuadrant(null)}
      >
        <CheckIcon className="size-[15px] stroke-[2.5]" />
        {t('addedToast', {quadrant: tQuadrant(toastQuadrant)})}
      </Toast>
    );

  // Same title bar on both breakpoints; mobile appends the round add button
  // and truncates the subtitle when space runs out.
  const renderTitleBar = () => (
    <div className="flex items-center gap-3 px-4 py-2.5 md:py-3 border-b border-base-content/10 flex-shrink-0">
      <div className="flex size-9 items-center justify-center rounded-[10px] bg-secondary/10 flex-shrink-0">
        <StarIcon className="size-[18px] text-secondary" />
      </div>
      <div className="flex flex-col min-w-0 flex-1 md:flex-initial">
        <span className="text-base font-bold truncate">{t('title')}</span>
        <span className="hidden md:block text-xs text-base-content/50 truncate">
          {t('subtitle')}
        </span>
      </div>
      <span className="ml-auto text-xs font-semibold text-base-content/60 shrink-0">
        <span className="md:hidden">
          {t('summaryMobile', {total: totalCount, tracked: trackedCount})}
        </span>
        <span className="hidden md:inline">
          {t.rich('summary', {
            total: totalCount,
            tracked: trackedCount,
            num: chunks => (
              <span className="text-[13px] font-bold text-base-content">
                {chunks}
              </span>
            ),
          })}
        </span>
      </span>
      <button
        type="button"
        title={t('addTaskLabel')}
        onClick={() => setAddModal({})}
        className="md:hidden flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content shadow-md shadow-primary/30 cursor-pointer"
      >
        <PlusIcon className="size-[18px] stroke-[2.5]" />
      </button>
    </div>
  );

  // Instruction hint is desktop-only (drag/click don't apply to touch), but the
  // no-plan warning renders on both breakpoints — its Create Plan link is
  // mobile's only in-page path to plan creation.
  const renderHintBar = () => (
    <div
      className={`${
        activePlanId ? 'hidden md:flex' : 'flex'
      } items-center gap-2 px-4 py-2.5 bg-base-200/60 border-b border-base-content/10 text-xs flex-shrink-0`}
    >
      {activePlanId ? (
        <>
          <ListBulletIcon className="size-3.5 text-primary flex-shrink-0" />
          <span className="text-base-content/60">
            {t.rich('hint', {
              // Decorative send-button glyph stays in JSX, not the message
              arrow: () => <strong className="text-primary">→</strong>,
            })}
          </span>
        </>
      ) : (
        <>
          <ExclamationTriangleIcon className="size-3.5 text-warning flex-shrink-0" />
          <span className="text-warning">
            {t.rich('hintNoPlan', {
              em: chunks => (
                <Link href={CREATE_PLAN_HREF} className="font-bold underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </>
      )}
    </div>
  );

  const renderAxisY = () => (
    <div className="w-4 md:w-7 flex-shrink-0 flex flex-col items-center justify-around bg-base-200/60">
      <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40">
        {t('axisImportant')}
      </span>
      <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40">
        {t('axisNotImportant')}
      </span>
    </div>
  );

  const renderAxisX = () => (
    <div className="flex h-3.5 md:h-6 ml-4 md:ml-7 bg-base-200/60 flex-shrink-0">
      <span className="flex-1 text-center text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40 leading-[14px] md:leading-6">
        {t('axisUrgent')}
      </span>
      <span className="flex-1 text-center text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-base-content/40 leading-[14px] md:leading-6">
        {t('axisNotUrgent')}
      </span>
    </div>
  );

  return (
    <DragDropContext
      onDragStart={() => setOpenPopoverTaskId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {renderTitleBar()}
        {renderHintBar()}

        <div className="flex-1 min-h-0 flex">
          {renderAxisY()}
          <div className="flex-1 min-w-0 grid grid-cols-2 grid-rows-2">
            {QUADRANT_ORDER.map(quadrant => (
              <QuadrantCell
                key={quadrant}
                quadrant={quadrant}
                tasks={byQuadrant[quadrant]}
                activePlanId={activePlanId}
                openPopoverTaskId={openPopoverTaskId}
                onSendToggle={setOpenPopoverTaskId}
                onTrack={handleTrack}
                onComplete={handleComplete}
                onCardTap={setSheetTask}
                onAdd={quadrant => setAddModal({quadrant})}
              />
            ))}
          </div>
        </div>
        {renderAxisX()}
      </div>

      {/* Popover click-away layer — lives outside every Draggable so pressing
          it can never start a drag (the whole card is a drag handle). */}
      {openPopoverTaskId !== null && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setOpenPopoverTaskId(null)}
        />
      )}

      {renderUndoToast()}
      {renderAddedToast()}

      <MobileMoveToSheet
        task={sheetTask}
        isTracked={sheetTask !== null && isTrackedTask(sheetTask)}
        hasActivePlan={activePlanId !== null}
        onClose={() => setSheetTask(null)}
        onTrack={handleTrack}
        onComplete={handleComplete}
      />
      <TaskModal
        isOpen={addModal !== null}
        onClose={() => setAddModal(null)}
        onSaved={quadrant => {
          setAddModal(null);
          // Confirmation toast only for the mobile global add (picker flow) —
          // desktop's per-quadrant entry shows the new card in place instead.
          if (addModal?.quadrant === undefined && quadrant) {
            setToastQuadrant(quadrant);
          }
        }}
        mode="adhoc"
        quadrant={addModal?.quadrant}
      />
    </DragDropContext>
  );
}
