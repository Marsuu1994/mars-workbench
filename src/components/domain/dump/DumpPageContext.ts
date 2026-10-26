import {createContext, use} from 'react';

/**
 * What the dump page's components do without threading it through props:
 * capture and load more, bound to the page's feed. `DumpPage` provides it;
 * the entries still come down as props.
 */
export interface DumpPageContextValue {
  /** Prepends the entry optimistically; resolves `ok: false` on failure */
  capture: (content: string) => Promise<{ok: boolean}>;
  /** The last capture's error, cleared by the next capture */
  captureError: string | null;
  /** Appends the next feed page */
  loadMore: () => void;
}

export const DumpPageContext = createContext<DumpPageContextValue | null>(null);

/** The dump page's context; only its components render inside it. */
export const useDumpPageContext = (): DumpPageContextValue => {
  const context = use(DumpPageContext);
  if (!context) {
    throw new Error('useDumpPageContext must be used within DumpPage');
  }
  return context;
};
