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
import {TaskStatus} from '@/utils/enums';
import {getTaskFrequency, type RiskLevel} from '@/utils/taskUtils';
import TaskCard from './TaskCard';

interface BacklogDrawerProps {
  tasks: TaskItem[];
  today: Date;
  riskMap: Map<string, RiskLevel>;
  templateFreqMap: Map<string, number>;
}

/**
 * Desktop-only right-edge drawer that stages BACKLOG tasks. The user drags a
 * card onto the Todo column to pull it onto the board (BACKLOG → TODO).
 * Rendered inside KanbanBoard's DragDropContext.
 */
export default function BacklogDrawer({
  tasks,
  today,
  riskMap,
  templateFreqMap,
}: BacklogDrawerProps) {
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
      className={`absolute inset-y-0 left-0 w-12 bg-base-200 flex flex-col items-center gap-3.5 pt-4 cursor-pointer transition-opacity duration-200 hover:bg-base-300 ${
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
    <div className="px-4 py-3 border-b border-base-content/10 bg-base-200 flex items-center justify-between flex-shrink-0">
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

  const renderBody = () => (
    // isDropDisabled: cards only leave the backlog. Without it, the collapsed
    // drawer's invisible panel (kept mounted for the cross-fade, overlapping
    // the Done column) wins dnd's geometric hit-test and steals Done drops.
    <Droppable droppableId={TaskStatus.BACKLOG} isDropDisabled>
      {provided => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
        >
          {tasks.length === 0 && (
            <p className="text-center text-xs text-base-content/40 mt-6 px-4">
              {t('emptyState')}
            </p>
          )}
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              taskType={task.type}
              index={index}
              today={today}
              riskLevel={riskMap.get(task.id) ?? 'normal'}
              frequency={getTaskFrequency(task, templateFreqMap)}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  return (
    <div
      className={`hidden md:block relative h-full flex-shrink-0 overflow-hidden bg-base-100 border-l border-base-content/10 transition-[width] duration-200 ${
        isOpen ? 'w-[300px]' : 'w-12'
      }`}
    >
      {/* Both states stay mounted and cross-fade so width + content animate
          together — instant content swaps would otherwise read as a jump. */}
      {renderCollapsed()}
      <div
        className={`absolute inset-y-0 right-0 w-[300px] flex flex-col bg-base-100 transition-opacity duration-200 ${
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
