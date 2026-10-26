import {createContext, use} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import type {PriorityQuadrant} from '@/utils/enums';

/**
 * What the Priorities page's components read and do without threading it
 * through props: the plan tracking moves cards onto, which card's Move-to
 * popover is open, and every write and overlay, bound to the page's
 * optimistic tasks. `PrioritiesPage` provides it; the rows still come down
 * as props.
 */
export interface PrioritiesPageContextValue {
  /** The plan tracking moves a card onto; null: no active plan this week */
  activePlanId: string | null;
  /** The card whose desktop Move-to popover is open; null: none */
  openPopoverTaskId: string | null;
  /** Opens the card's popover, or closes it when it is the open one */
  togglePopover: (taskId: string) => void;
  /** Mobile's tap on a card: the Move-to bottom sheet */
  openMoveToSheet: (task: TaskItem) => void;
  /** The add-task modal, preset to a quadrant; without one, its picker */
  openAddTask: (quadrant?: PriorityQuadrant) => void;
  /** Track this week: onto the active plan, into the board's column */
  trackTask: (taskId: string, status: TrackTargetStatus) => void;
  /** Done: the card leaves, with an undo toast */
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
