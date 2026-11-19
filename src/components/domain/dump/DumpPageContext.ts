import {createContext, use} from 'react';

/**
 * What the Dump page's components read and do without threading it through
 * props: capture and its last error, and paging, bound to the page's feed.
 * `DumpPage` provides it; the entries still come down as props.
 */
export interface DumpPageContextValue {
  /** Prepends the entry optimistically; resolves `ok: false` on failure */
  capture: (content: string) => Promise<{ok: boolean}>;
  /** The last failed capture's message; null once a capture succeeds */
  captureError: string | null;
  /** Appends the next page of older entries */
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
