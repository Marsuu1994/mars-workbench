'use client';

import type {ReactNode} from 'react';
import {Droppable} from '@hello-pangea/dnd';
import {STEP_LIST_DROPPABLE_ID} from './constants';

interface ProjectStepListProps {
  /** Done steps — locked, so outside the drop zone */
  doneRows: ReactNode;
  /** The open steps, each a DraggableStepRow */
  children: ReactNode;
}

/** A project's path: the done steps on top, then the reorderable rest. A
    frame — the container renders the rows into it. */
export const ProjectStepList = ({doneRows, children}: ProjectStepListProps) => (
  <div className="flex flex-col gap-1">
    {doneRows}
    <Droppable droppableId={STEP_LIST_DROPPABLE_ID}>
      {provided => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex flex-col gap-1"
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);
