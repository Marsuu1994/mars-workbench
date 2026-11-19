'use client';

import {useState, type ReactNode} from 'react';
import {Draggable, Droppable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {ArrowUpIcon} from '@heroicons/react/24/outline';
import {TaskKind} from '@/utils/taskUtils';
import type {BacklogGroup as BacklogGroupModel} from '@/utils/backlogGroupUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {useBoardPageContext} from '../BoardPageContext';
import {BACKLOG_GROUP_DROPPABLE_PREFIX} from '../backlogConstants';
import {BacklogGroupFace} from './BacklogGroupFace';
import {BacklogPile} from './BacklogPile';
import {BacklogQueue} from './BacklogQueue';

/** desktop: the card is dragged out of the panel · mobile: it has ↑ Todo */
export type BacklogGroupVariant = 'desktop' | 'mobile';

interface BacklogGroupProps {
  group: BacklogGroupModel;
  variant: BacklogGroupVariant;
}

const CARD_CLASS = 'card fx-card bg-base-100 border border-base-content/10';

/**
 * While the card is lifted, dnd keeps its place with a placeholder of its
 * size; it is drawn like the pile's sheets, with nothing on it.
 *
 * Workaround (@hello-pangea/dnd): dnd gives the placeholder no class of its
 * own, so these classes find it by `data-rfd-placeholder-context-id`, an
 * attribute dnd sets for its own use and doesn't document. If an upgrade
 * renames it, the placeholder is drawn blank, with no border and no fill.
 */
const LIFT_PLACEHOLDER_CLASS =
  '[&>[data-rfd-placeholder-context-id]]:rounded-box [&>[data-rfd-placeholder-context-id]]:border [&>[data-rfd-placeholder-context-id]]:border-(--fx-pile-border) [&>[data-rfd-placeholder-context-id]]:bg-(--fx-pile)';

/**
 * One habit's or one project's tasks in the backlog: a card showing the next
 * one, on a pile of the rest — or, for a project whose queue is open, over
 * the rows of its steps behind. Only the next task can leave: dragged out of
 * the panel on desktop, or pulled with ↑ Todo in the mobile sheet.
 */
export const BacklogGroup = ({group, variant}: BacklogGroupProps) => {
  const t = useTranslations('Board.Backlog');
  const {pullToTodo} = useBoardPageContext();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const {key, next, behind} = group;
  const {edge} = TASK_KIND_STYLE[next.kind];
  // The queue closes for good once no step is left behind the next one
  const showsQueue = isQueueOpen && behind.length > 0;
  const queue =
    next.kind === TaskKind.PROJECT
      ? {isOpen: showsQueue, onToggle: () => setIsQueueOpen(!showsQueue)}
      : undefined;

  const renderPullButton = () => (
    <button
      type="button"
      onClick={() => pullToTodo(next.task.id)}
      className="inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-1 rounded-field border border-base-content/10 px-3 fx-num text-[11.5px] font-semibold text-base-content/60 hover:border-primary hover:text-primary"
    >
      <ArrowUpIcon className="size-2.5 stroke-2" />
      {t('pullToTodoLabel')}
    </button>
  );

  const renderFace = (action?: ReactNode) => (
    <BacklogGroupFace group={group} queue={queue} action={action} />
  );

  // Workaround (@hello-pangea/dnd): each group is a drop zone of its own, with
  // drops disabled. In one list shared by every group, dnd closes a lifted
  // card's gap as soon as the card leaves the list, and every group below it
  // moves up while the card is still in the air (BL-14).
  const renderDraggableCard = () => (
    <Droppable
      droppableId={`${BACKLOG_GROUP_DROPPABLE_PREFIX}${key}`}
      isDropDisabled
    >
      {provided => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`relative z-[1] flex flex-col ${LIFT_PLACEHOLDER_CLASS}`}
        >
          {/* Workaround (@hello-pangea/dnd): keyed by the task, so when the
              next task leaves, the one after it mounts a Draggable of its
              own. Without the key the same Draggable gets the new task's
              id, and dnd never lifts it again: the card that came up can't
              be dragged */}
          <Draggable key={next.task.id} draggableId={next.task.id} index={0}>
            {(draggable, snapshot) => (
              <div
                ref={draggable.innerRef}
                {...draggable.draggableProps}
                {...draggable.dragHandleProps}
                className={`${CARD_CLASS} ${edge} cursor-grab hover:-translate-y-0.5 ${
                  snapshot.isDragging ? 'fx-card-lift z-50 scale-[1.02]' : ''
                }`}
              >
                {renderFace()}
              </div>
            )}
          </Draggable>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  const renderPlainCard = () => (
    <div className={`${CARD_CLASS} ${edge} relative z-[1]`}>
      {renderFace(renderPullButton())}
    </div>
  );

  return (
    <div className="flex flex-col">
      {variant === 'desktop' ? renderDraggableCard() : renderPlainCard()}
      {showsQueue ? (
        <BacklogQueue cards={behind} variant={variant} />
      ) : (
        <BacklogPile behindCount={behind.length} />
      )}
    </div>
  );
};
