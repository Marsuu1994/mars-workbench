'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {createDumpEntrySchema, fetchDumpEntriesSchema} from '../schemas';
import {
  captureDumpEntry,
  countDumpFeed,
  fetchDumpFeedPage,
} from '../services/dumpService';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

/** Quick Capture flow: one entry, then the feed revalidates. */
export async function createDumpEntryAction(input: unknown) {
  const parsed = createDumpEntrySchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const entry = await captureDumpEntry(userId, parsed.data.content);

  revalidatePath('/kanban/dump');
  return {data: entry};
}

/** One feed page for the infinite scroll (dumpService › fetchDumpFeedPage). */
export async function fetchDumpEntriesAction(input: unknown) {
  const parsed = fetchDumpEntriesSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const result = await fetchDumpFeedPage(userId, parsed.data.cursor);
  if ('error' in result) {
    const t = await getTranslations('Errors');
    return {error: {formErrors: [t(result.error)], fieldErrors: {}}};
  }

  return {data: result};
}

/** Total entry count for the dump title bar. */
export async function countDumpEntriesAction() {
  const userId = await getCurrentUserId();
  return countDumpFeed(userId);
}
