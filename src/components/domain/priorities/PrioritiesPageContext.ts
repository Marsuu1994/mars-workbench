import {createContext, use} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import type {PriorityQuadrant} from '@/utils/enums';
import type {TrackTargetStatus} from '@/schemas';

/**
 * What the priorities page's components read and do without threading it
 * through props: the week tracking goes onto, which card's Move-to popover is
 * open, and every write and overlay, bound to the page's optimistic tasks.
 * `PrioritiesPage` provides it; the tasks still come down as props.
 */
export interface PrioritiesPageContextValue {
  /** The plan Track This Week adds to; null: no plan this week yet */
  activePlanId: string | null;
  /** The card whose desktop Move-to popover is open */
  openPopoverTaskId: string | null;
  /** Opens a card's popover, or closes it when it is the open one */
  togglePopover: (taskId: string) => void;
  /** Mobile: a tapped card's Move-to sheet */
  openMoveToSheet: (task: TaskItem) => void;
  /** The add modal; without a quadrant (mobile's global add) it shows its
      picker */
  openAddTask: (quadrant?: PriorityQuadrant) => void;
  /** Puts the task on the active plan, in one of the board's columns */
  trackTask: (taskId: string, status: TrackTargetStatus) => void;
  /** Marks the task done; the card leaves under an undo toast */
  completeTask: (taskId: string) => void;
}

export const PrioritiesPageContext =
  createContext<PrioritiesPageContextValue | null>(null);

/** The priorities page's context; only its components render inside it. */
export const usePrioritiesPageContext = (): PrioritiesPageContextValue => {
  const context = use(PrioritiesPageContext);
  if (!context) {
    throw new Error(
      'usePrioritiesPageContext must be used within PrioritiesPage',
    );
  }
  return context;
};
