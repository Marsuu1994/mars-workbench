'use client';

import {useId, type KeyboardEvent, type MouseEvent} from 'react';
import {useTranslations} from 'next-intl';
import {
  Draggable,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import {useBoardPageContext} from './BoardPageContext';
import {TaskCardFace} from './TaskCardFace';
import {TodoCardAction} from './TodoCardAction';

interface TodoCardProps {
  card: BoardCard;
  /** Position within Todo: Draggable needs it */
  index: number;
}

/**
 * A card in Todo, finished in two presses: a press anywhere selects it, and
 * its ✓ Complete finishes it (TAP-1 to TAP-4). Enter does what a press does.
 * On desktop it can be dragged onto Done as well, Space lifting it; on
 * mobile it can't be dragged.
 */
export const TodoCard = ({card, index}: TodoCardProps) => {
  const t = useTranslations('Board.Card');
  const {isMobile} = useBreakpoint();
  const {selectedTaskId, pressTodoCard, completeCard} = useBoardPageContext();
  const {kind, task} = card;
  const isSelected = selectedTaskId === task.id;
  const {edge} = TASK_KIND_STYLE[kind];
  // The label names the card; the face it describes keeps the kind line and
  // the habit's dots or the step's path in what a screen reader hears.
  const faceId = useId();

  // Workaround (@hello-pangea/dnd): a drag handle cancels the mousedown's
  // default, so pressing a card doesn't focus it. Without this, Enter after a
  // press reaches nothing, and closing the day's list by pressing a card
  // leaves focus on the page (DAY-5).
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.currentTarget.focus({preventScroll: true});
    pressTodoCard(task.id);
  };

  // A held key repeats: only the press itself counts, or holding Enter would
  // select the card and then, past the guard, complete it
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    if (isSelected) completeCard(task.id);
    else pressTodoCard(task.id);
  };

  const renderCard = (
    provided?: DraggableProvided,
    snapshot?: DraggableStateSnapshot,
  ) => (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      data-todo-card={task.id}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={
        isSelected
          ? t('selectedLabel', {title: task.title})
          : t('selectLabel', {title: task.title})
      }
      aria-describedby={faceId}
      onClick={handleClick}
      // While the card is lifted, Enter is the drag's key, not the card's
      onKeyDown={snapshot?.isDragging ? undefined : handleKeyDown}
      className={`card fx-card fx-press w-full flex-shrink-0 cursor-pointer border bg-base-100/70 ${edge} ${
        isSelected ? 'fx-card-selected' : 'border-base-content/10'
      } ${snapshot?.isDragging ? 'fx-card-lift z-50 scale-[1.02]' : ''}`}
    >
      <div id={faceId}>
        <TaskCardFace
          card={card}
          action={
            <TodoCardAction
              taskId={task.id}
              title={task.title}
              isSelected={isSelected}
            />
          }
        />
      </div>
    </div>
  );

  if (isMobile) return renderCard();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => renderCard(provided, snapshot)}
    </Draggable>
  );
};
