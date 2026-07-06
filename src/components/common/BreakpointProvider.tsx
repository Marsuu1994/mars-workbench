'use client';

import {createContext, useContext, useSyncExternalStore} from 'react';

const MD_QUERY = '(min-width: 768px)';

const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(MD_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};
const getSnapshot = () => window.matchMedia(MD_QUERY).matches;
const getServerSnapshot = () => true; // SSR defaults to desktop

interface BreakpointContextValue {
  isMobile: boolean;
}

const BreakpointContext = createContext<BreakpointContextValue>({
  isMobile: false,
});

export const BreakpointProvider = ({children}: {children: React.ReactNode}) => {
  const isDesktop = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <BreakpointContext.Provider value={{isMobile: !isDesktop}}>
      {children}
    </BreakpointContext.Provider>
  );
};

export const useBreakpoint = () => useContext(BreakpointContext);
