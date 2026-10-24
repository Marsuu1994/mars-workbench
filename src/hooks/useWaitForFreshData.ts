'use client';

import {useEffect, useReducer, useRef} from 'react';
import {FRESH_DATA_RETRY_MS, FRESH_DATA_TIMEOUT_MS} from './constants';

interface FreshDataWaiter {
  /** The data as it was when the wait started */
  from: unknown;
  resolve: () => void;
}

/**
 * Lets a write wait for the page's revalidated server props. A server action
 * resolves before the re-render its `revalidatePath` triggers has committed,
 * so a modal that closes on the action's result shows the old data for a
 * moment. Call the returned function before firing the action; its promise
 * resolves once `freshData` (a server prop, which every revalidation replaces)
 * has changed, or after a timeout.
 */
export function useWaitForFreshData(freshData: unknown) {
  const committedData = useRef(freshData);
  const waiters = useRef<FreshDataWaiter[]>([]);
  // A render that changes nothing on screen. On Next 16.2.9 (its bundled
  // React canary) the page update of the first write after a page load often
  // never commits until something else renders; each of these makes React
  // retry it, so the wait ends when the data is ready, not at the timeout
  const [, retryPageUpdate] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    committedData.current = freshData;
    for (const {from, resolve} of waiters.current) {
      if (from !== freshData) resolve();
    }
  }, [freshData]);

  // The fresh data can unmount the waiting component itself (a deleted
  // step's modal loses its target): there's nothing left to wait for
  useEffect(() => {
    const pendingWaiters = waiters;
    return () => {
      for (const {resolve} of pendingWaiters.current) resolve();
    };
  }, []);

  return () =>
    new Promise<void>(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        clearInterval(retry);
        waiters.current = waiters.current.filter(other => other !== waiter);
        resolve();
      };
      const waiter = {from: committedData.current, resolve: finish};
      const timeout = setTimeout(finish, FRESH_DATA_TIMEOUT_MS);
      const retry = setInterval(retryPageUpdate, FRESH_DATA_RETRY_MS);
      waiters.current.push(waiter);
    });
}
