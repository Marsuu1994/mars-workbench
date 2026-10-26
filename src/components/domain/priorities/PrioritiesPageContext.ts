import {createContext, use} from 'react';
import type {TaskItem} from '@/lib/db/tasks';
import type {PriorityQuadrant} from '@/utils/enums';
import type {TrackTargetStatus} from '@/schemas';

/**
 * What the Priorities page's components read and do without threading it
 * through props: the week tasks track into, which card's Move-to popover is
 * open, and every write and overlay, bound to the page's optimistic tasks.
 * `PrioritiesPage` provides it; the rows still come down as props.
 */
export interface PrioritiesPageContextValue {
  /** The plan Track This Week sends tasks to; null: no plan this week yet */
  activePlanId: string | null;
  /** The card whose desktop Move-to popover is open; null: none */
  openPopoverTaskId: string | null;
  /** Opens this card's popover, or closes it when it is the open one */
  togglePopover: (taskId: string) => void;
  /** Mobile tap on a card: the Move-to bottom sheet */
  openMoveToSheet: (task: TaskItem) => void;
  /** The add-task modal; without a quadrant it shows its quadrant picker */
  openAddTask: (quadrant?: PriorityQuadrant) => void;
  trackTask: (taskId: string, status: TrackTargetStatus) => void;
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
