'use client';

import {useEffect} from 'react';

/** Registers the PWA service worker once on mount. Renders nothing. */
export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(error =>
          console.warn('Service worker registration failed', error),
        );
    }
  }, []);

  return null;
};
