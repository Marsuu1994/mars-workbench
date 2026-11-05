'use client';

import {useState, type ReactNode} from 'react';
import {Draggable} from '@hello-pangea/dnd';
import type {BacklogGroup} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {useHoldScrollHeight} from '@/components/ui/scroll-hold/ScrollHoldContext';
import {cn} from '@/components/ui/cn';
import {BacklogHabitFace} from './BacklogHabitFace';
import {BacklogProjectFace} from './BacklogProjectFace';
import {BacklogOneOffFace} from './BacklogOneOffFace';
import {BacklogPile} from './BacklogPile';
import {BacklogStepQueue} from './BacklogStepQueue';
import {BacklogPullButton} from './BacklogPullButton';

/** Desktop drags the group's next onto the board; mobile taps ↑ Todo. */
export type BacklogVariant = 'desktop' | 'mobile';

interface BacklogGroupCardProps {
  group: BacklogGroup;
  /** The group's place among the backlog's draggables (desktop) */
  index: number;
  variant: BacklogVariant;
}

/**
 * One group in the backlog — a habit, a project or a one-off — as a single
 * card that stands for its next task: desktop drags it, mobile pulls it with
 * ↑ Todo, and either way the next one takes its place (it rises in). A
 * project with steps behind its next sits on a thin pile, or opens them as a
 * queue under the card.
 */
export const BacklogGroupCard = ({
  group,
  index,
  variant,
}: BacklogGroupCardProps) => {
  const holdScrollHeight = useHoldScrollHeight();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  // The next this group mounted with: a different one was pulled up after it
  const [firstNextId] = useState(group.next.task.id);
  const {kind, next, behind} = group;
  const hasMore = behind.length > 0;
  const isOpen = isQueueOpen && hasMore;
  const isMobile = variant === 'mobile';
  const cardStyle = cn(
    'card fx-card relative z-[1] rounded-card bg-base-100 border border-base-content/10',
    TASK_KIND_STYLE[kind].edge,
    next.task.id !== firstNextId && 'fx-rise',
  );

  // The scroll container keeps its height, so the scrollbar stays put
  const toggleQueue = () => {
    holdScrollHeight();
    setIsQueueOpen(!isOpen);
  };

  const renderFace = (): ReactNode => {
    const action = isMobile ? (
      <BacklogPullButton taskId={next.task.id} />
    ) : undefined;
    switch (group.kind) {
      case TaskKind.HABIT:
        return <BacklogHabitFace group={group} action={action} />;
      case TaskKind.PROJECT:
        return (
          <BacklogProjectFace
            group={group}
            isQueueOpen={isOpen}
            onToggleQueue={toggleQueue}
            action={action}
          />
        );
      case TaskKind.ONE_OFF:
        return <BacklogOneOffFace group={group} action={action} />;
      default: {
        const unhandled: never = group;
        throw new Error(`Unhandled group: ${JSON.stringify(unhandled)}`);
      }
    }
  };

  // Keyed by the next task, so a pull mounts the new one (and its rise)
  const renderCard = () =>
    isMobile ? (
      <div key={next.task.id} className={cardStyle}>
        {renderFace()}
      </div>
    ) : (
      <Draggable key={next.task.id} draggableId={next.task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              cardStyle,
              'cursor-grab hover:-translate-y-0.5',
              snapshot.isDragging && 'fx-card-lift scale-[1.02] z-50',
            )}
          >
            {renderFace()}
          </div>
        )}
      </Draggable>
    );

  const renderBelow = () => {
    if (group.kind !== TaskKind.PROJECT || !hasMore) return null;
    return isOpen ? (
      <BacklogStepQueue steps={group.behind} variant={variant} />
    ) : (
      <BacklogPile count={behind.length} />
    );
  };

  return (
    <div className="flex flex-col">
      {renderCard()}
      {renderBelow()}
    </div>
  );
};
