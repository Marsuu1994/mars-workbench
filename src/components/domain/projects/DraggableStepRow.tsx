'use client';

import type {ReactNode} from 'react';
import {Draggable} from '@hello-pangea/dnd';
import {cn} from '@/components/ui/cn';

interface DraggableStepRowProps {
  stepId: string;
  /** Position in the open steps — required by Draggable */
  index: number;
  children: ReactNode;
}

/**
 * Makes an open step's row reorderable: the whole row is the handle (drag
 * with the mouse, long-press on touch); its buttons never start a drag.
 */
export const DraggableStepRow = ({
  stepId,
  index,
  children,
}: DraggableStepRowProps) => (
  <Draggable draggableId={stepId} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={cn(
          'cursor-grab rounded-lg',
          snapshot.isDragging &&
            'fx-card-lift bg-base-100 ring-1 ring-primary/35',
        )}
      >
        {children}
      </div>
    )}
  </Draggable>
);
