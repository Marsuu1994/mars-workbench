import {createContext, use} from 'react';

/** How a day's list closed: focus goes back to its cell, except after a
    press outside it, which leaves focus wherever that press put it */
export interface CloseDayOptions {
  restoreFocus: boolean;
}

/**
 * What the board's components read and do without threading it through
 * props: the page's selection, the open day's list and the moments the
 * rings react to, and the board's writes, bound to the page's optimistic
 * tasks. `BoardPage` provides it; the cards and rings still come down as
 * props.
 */
export interface BoardPageContextValue {
  /** ↑ Todo on a backlog card: BACKLOG → TODO (A9) */
  pullToTodo: (taskId: string) => void;
  /** The selected Todo card's task (TAP-1), or null */
  selectedTaskId: string | null;
  /** A press on a Todo card: selects it, or cancels its selection (A10, A11) */
  pressTodoCard: (taskId: string) => void;
  /** ✓ Complete: the juice, the toss, then TODO → DONE (A12) */
  completeCard: (taskId: string) => void;
  /** The day whose list is open, as "YYYY-MM-DD", or null */
  openDayDate: string | null;
  /** A press on a day's cell: opens its list, or closes it (A13, A14) */
  toggleDay: (date: string) => void;
  closeDay: (options: CloseDayOptions) => void;
  /** Goes up each time a card is finished on the page: today's cell jumps */
  tickKey: number;
  /** Goes up each time a finish on the page closes today's ring */
  celebrationKey: number;
  /** The card finished last on the page, which glows as it lands in Done */
  freshDoneTaskId: string | null;
}

export const BoardPageContext = createContext<BoardPageContextValue | null>(
  null,
);

/** The board page's context; only its components render inside it. */
export const useBoardPageContext = (): BoardPageContextValue => {
  const context = use(BoardPageContext);
  if (!context) {
    throw new Error('useBoardPageContext must be used within BoardPage');
  }
  return context;
};
