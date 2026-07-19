'use client';

import {useCallback, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  createDumpEntryAction,
  fetchDumpEntriesAction,
} from '@/actions/dumpActions';
import type {DumpEntryItem} from '@/lib/db/dumpEntries';

type ActionError = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
};

// Mirror the error-flattening used across the app's hooks/forms (see
// useAiPlanChat). `fallback` is the translated generic message (hooks own i18n).
function extractError(error: ActionError | unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'formErrors' in error) {
    const {formErrors, fieldErrors} = error as ActionError;
    if (formErrors.length > 0) return formErrors.join(', ');
    const firstField = Object.values(fieldErrors ?? {})[0];
    if (Array.isArray(firstField) && firstField.length > 0) {
      return String(firstField[0]);
    }
  }
  return fallback;
}

// Module-level counter for optimistic temp ids (stable across renders).
let tempCounter = 0;
const nextTempId = () => `temp-${++tempCounter}`;

interface DumpFeedInit {
  entries: DumpEntryItem[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Bridges the dump feed's local state to the server actions. Owns optimistic
 * capture (prepend a temp entry, reconcile with the server row, roll back on
 * error) and cursor-based load-more. Local state (not a store) — the feed is
 * page-scoped and server-seeded, mirroring PriorityMatrixPage.
 */
export function useDumpFeed(initial: DumpFeedInit) {
  const tErrors = useTranslations('Errors');
  const genericError = tErrors('generic');

  const [entries, setEntries] = useState<DumpEntryItem[]>(initial.entries);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initial.nextCursor,
  );
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [isAppending, setIsAppending] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const capture = useCallback(
    async (content: string): Promise<{ok: boolean}> => {
      const trimmed = content.trim();
      if (!trimmed) return {ok: false};

      const temp: DumpEntryItem = {
        id: nextTempId(),
        content: trimmed,
        createdAt: new Date(),
      };
      setEntries(prev => [temp, ...prev]);
      setTotalCount(c => c + 1);
      setCaptureError(null);

      const result = await createDumpEntryAction({content: trimmed});
      if ('error' in result) {
        setEntries(prev => prev.filter(e => e.id !== temp.id));
        setTotalCount(c => c - 1);
        setCaptureError(extractError(result.error, genericError));
        return {ok: false};
      }
      // Reconcile the optimistic row with the persisted entry (real id + time).
      setEntries(prev => prev.map(e => (e.id === temp.id ? result.data : e)));
      return {ok: true};
    },
    [genericError],
  );

  const loadMore = useCallback(async () => {
    if (isAppending || nextCursor === null) return;
    setIsAppending(true);
    const result = await fetchDumpEntriesAction({cursor: nextCursor});
    setIsAppending(false);
    // A stale/invalid cursor simply stops paging — the feed already shows what
    // it has; there is no user-facing failure mode for scroll.
    if ('error' in result) return;
    setEntries(prev => [...prev, ...result.data.entries]);
    setNextCursor(result.data.nextCursor);
  }, [isAppending, nextCursor]);

  return {
    entries,
    totalCount,
    hasMore: nextCursor !== null,
    isAppending,
    captureError,
    capture,
    loadMore,
  };
}
