'use client';

import {useState} from 'react';
import {Droppable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {
  InboxStackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type {TaskItem} from '@/lib/db/tasks';
import {
  getTaskFrequency,
  groupTasksIntoStacks,
  type RiskLevel,
  type TaskStack,
} from '@/utils/taskUtils';
import TaskCard from './TaskCard';
import {TaskCardFace} from './TaskCardFace';
import {BACKLOG_DROPPABLE_PREFIX} from './backlogConstants';

interface DesktopBacklogProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
}

/**
 * Desktop-only collapsible right-edge backlog that stages BACKLOG tasks,
 * identical instances collapsed into stacks. The user drags a card onto the
 * Todo column to pull it onto the board (BACKLOG → TODO) — from a stack, one
 * instance per drag. Rendered inside KanbanBoard's DragDropContext.
 */
export default function DesktopBacklog({
  tasks,
  today,
  riskMap,
  templateFreqMap,
}: DesktopBacklogProps) {
  const t = useTranslations('Board.Backlog');
  const [isOpen, setIsOpen] = useState(false);

  const countPill = (
    <span className="badge badge-primary badge-sm font-bold">
      {tasks.length}
    </span>
  );

  const renderCollapsed = () => (
    <button
      onClick={() => setIsOpen(true)}
      className={`absolute inset-y-0 left-0 w-12 bg-base-200/30 flex flex-col items-center gap-3.5 pt-4 cursor-pointer transition-opacity duration-200 hover:bg-base-300 ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      title={t('openLabel')}
    >
      <ChevronLeftIcon className="size-4 text-base-content/40" />
      {countPill}
      <span className="[writing-mode:vertical-rl] rotate-180 text-sm font-semibold text-base-content/60 tracking-wide">
        {t('title')}
      </span>
    </button>
  );

  const renderHeader = () => (
    <div className="px-4 py-3 border-b border-base-content/10 bg-base-200/30 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm font-bold">
        <InboxStackIcon className="size-[18px] text-primary" />
        {t('title')}
        {countPill}
      </div>
      <button
        onClick={() => setIsOpen(false)}
        className="size-7 rounded-md flex items-center justify-center text-base-content/60 hover:bg-base-300 hover:text-base-content cursor-pointer"
        title={t('closeLabel')}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );

  const renderHint = () => (
    <div className="px-4 py-2.5 border-b border-base-content/10 flex items-center gap-1.5 text-xs text-base-content/50 flex-shrink-0">
      <ArrowLeftIcon className="size-3.5 text-primary flex-shrink-0" />
      {t('hintDragToTodo')}
    </div>
  );

  // One Droppable per stack, holding only the stack's top card. A lone
  // Draggable has no siblings for dnd to displace on lift, and the home
  // placeholder keeps its slot open — so the rest of the stack can stay in
  // place, one count lower, under the card being dragged away.
  // isDropDisabled: cards only leave the backlog. Without it, the collapsed
  // backlog's invisible panel (kept mounted for the cross-fade, overlapping
  // the Done column) wins dnd's geometric hit-test and steals Done drops.
  const renderStack = ({key, tasks: stackTasks}: TaskStack) => {
    const [topTask, nextTask] = stackTasks;
    const riskLevel = riskMap.get(topTask.id) ?? 'normal';
    const frequency = getTaskFrequency(topTask, templateFreqMap);

    return (
      <Droppable
        key={key}
        droppableId={`${BACKLOG_DROPPABLE_PREFIX}${key}`}
        isDropDisabled
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="relative"
          >
            <TaskCard
              task={topTask}
              taskType={topTask.type}
              index={0}
              today={today}
              riskLevel={riskLevel}
              frequency={frequency}
              stackCount={stackTasks.length}
            />
            {provided.placeholder}
            {snapshot.draggingFromThisWith && nextTask && (
              <TaskCardFace
                className="absolute inset-x-0 top-0"
                task={nextTask}
                taskType={nextTask.type}
                today={today}
                riskLevel={riskLevel}
                frequency={frequency}
                stackCount={stackTasks.length - 1}
              />
            )}
          </div>
        )}
      </Droppable>
    );
  };

  // gap-4 leaves room for the stack lips hanging below each card
  const renderBody = () => (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
      {tasks.length === 0 && (
        <p className="text-center text-xs text-base-content/40 mt-6 px-4">
          {t('emptyState')}
        </p>
      )}
      {groupTasksIntoStacks(tasks).map(renderStack)}
    </div>
  );

  return (
    <div
      className={`hidden md:block relative h-full flex-shrink-0 overflow-hidden bg-base-100/10 border-l border-base-content/10 transition-[width] duration-200 ${
        isOpen ? 'w-[300px]' : 'w-12'
      }`}
    >
      {/* Both states stay mounted and cross-fade so width + content animate
          together — instant content swaps would otherwise read as a jump. */}
      {renderCollapsed()}
      <div
        className={`absolute inset-y-0 right-0 w-[300px] flex flex-col bg-base-100/10 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {renderHeader()}
        {renderHint()}
        {renderBody()}
      </div>
    </div>
  );
}
