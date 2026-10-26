import {createContext, use} from 'react';

/**
 * What the Dump page's components do without threading it through props:
 * capture and load-more, bound to the page's feed (useDumpFeed), and the
 * last capture's error. `DumpPage` provides it; the entries still come down
 * as props.
 */
export interface DumpPageContextValue {
  /** Prepends the entry optimistically; resolves `ok: false` on failure */
  capture: (content: string) => Promise<{ok: boolean}>;
  /** The last failed capture's message; null once one succeeds */
  captureError: string | null;
  /** Appends the feed's next page; a no-op while one is loading */
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
