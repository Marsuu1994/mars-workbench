import {createContext, use} from 'react';

/**
 * What the Dump page's components read and do without threading it through
 * props: capture and load-more, bound to the page's feed state, and the last
 * capture's error. `DumpPage` provides it; the entries still come down as
 * props.
 */
export interface DumpPageContextValue {
  /** Prepends the entry optimistically; `ok` false: rolled back */
  capture: (content: string) => Promise<{ok: boolean}>;
  /** The last failed capture's message; null once a capture starts */
  captureError: string | null;
  /** Appends the next page; a no-op while one is loading or at the end */
  loadMore: () => void;
}

export const DumpPageContext = createContext<DumpPageContextValue | null>(null);

/** The Dump page's context; only its components render inside it. */
export const useDumpPageContext = (): DumpPageContextValue => {
  const context = use(DumpPageContext);
  if (!context) {
    throw new Error('useDumpPageContext must be used within DumpPage');
  }
  return context;
};
