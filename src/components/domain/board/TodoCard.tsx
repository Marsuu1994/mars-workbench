'use client';

import {useId, type KeyboardEvent} from 'react';
import {useTranslations} from 'next-intl';
import type {BoardCard} from '@/utils/boardCardUtils';
import {useBoardPageContext} from './BoardPageContext';
import {TaskCardFace} from './TaskCardFace';
import {taskCardFrameClass} from './taskCardFrame';
import {TodoCardAction} from './TodoCardAction';

interface TodoCardProps {
  card: BoardCard;
}

/**
 * A card in Todo, finished in two presses: a press anywhere selects it, and
 * its ✓ Complete finishes it (TAP-1 to TAP-4). Enter and Space do what a
 * press does.
 */
export const TodoCard = ({card}: TodoCardProps) => {
  const t = useTranslations('Board.Card');
  const {selectedTaskId, pressTodoCard, completeCard} = useBoardPageContext();
  const {kind, task} = card;
  const isSelected = selectedTaskId === task.id;
  // The label names the card; the face it describes keeps the kind line and
  // the habit's dots or the step's path in what a screen reader hears.
  const faceId = useId();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // The card is a button only by its role, so Space would scroll the page
    event.preventDefault();
    // A held key repeats: only the press itself counts, or holding the key
    // would select the card and then, past the guard, complete it
    if (event.repeat) return;
    if (isSelected) completeCard(task.id);
    else pressTodoCard(task.id);
  };

  return (
    <div
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
      onClick={() => pressTodoCard(task.id)}
      onKeyDown={handleKeyDown}
      className={`${taskCardFrameClass(kind)} fx-press w-full flex-shrink-0 cursor-pointer bg-base-100/70 ${
        isSelected ? 'fx-card-selected' : 'border-base-content/10'
      }`}
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
};
