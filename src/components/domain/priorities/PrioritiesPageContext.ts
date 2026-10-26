import {createContext, use} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import type {PriorityQuadrant} from '@/utils/enums';
import type {TrackTargetStatus} from '@/schemas';

/**
 * What the Priorities page's components read and do without threading it
 * through props: the plan tracking moves onto, which card's Move-to popover
 * is open, and every write and overlay, bound to the page's optimistic tasks.
 * `PrioritiesPage` provides it; the tasks still come down as props.
 */
export interface PrioritiesPageContextValue {
  /** The plan Track moves a one-off onto; null: no plan this week yet */
  activePlanId: string | null;
  /** The task whose desktop Move-to popover is open; null: none */
  openPopoverTaskId: string | null;
  /** Opens the task's popover, or closes it when it is the open one */
  togglePopover: (taskId: string) => void;
  /** Mobile's tap on a card: the Move-to bottom sheet */
  openMoveToSheet: (task: TaskItem) => void;
  /** The add modal; without a quadrant (mobile's global add) it shows a picker */
  openAddTask: (quadrant?: PriorityQuadrant) => void;
  trackTask: (taskId: string, status: TrackTargetStatus) => void;
  /** Takes the card off the matrix and opens the undo toast */
  completeTask: (taskId: string) => void;
}

export const PrioritiesPageContext =
  createContext<PrioritiesPageContextValue | null>(null);

/** The Priorities page's context; only its components render inside it. */
export const usePrioritiesPageContext = (): PrioritiesPageContextValue => {
  const context = use(PrioritiesPageContext);
  if (!context) {
    throw new Error(
      'usePrioritiesPageContext must be used within PrioritiesPage',
    );
  }
  return context;
};
