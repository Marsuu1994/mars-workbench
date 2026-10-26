import {createContext, use} from 'react';

/**
 * What the Board page's components do without threading it through props:
 * the writes, bound to the page's optimistic tasks. `BoardPage` provides it;
 * the cards still come down as props.
 */
export interface BoardPageContextValue {
  /** Mobile's tap-to-pull: a backlog task moves to Todo */
  pullToTodo: (taskId: string) => void;
}

export const BoardPageContext = createContext<BoardPageContextValue | null>(
  null,
);

/** The Board page's context; only its components render inside it. */
export const useBoardPageContext = (): BoardPageContextValue => {
  const context = use(BoardPageContext);
  if (!context) {
    throw new Error('useBoardPageContext must be used within BoardPage');
  }
  return context;
};
