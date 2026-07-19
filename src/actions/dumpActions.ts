'use server';

import {revalidatePath} from 'next/cache';
import {getTranslations} from 'next-intl/server';
import {z} from 'zod';
import {createDumpEntrySchema, fetchDumpEntriesSchema} from '../schemas';
import {DUMP_PAGE_SIZE} from '../utils/dump';
import {
  createDumpEntry,
  getDumpEntriesPage,
  type DumpEntryItem,
} from '@/lib/db/dumpEntries';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';

// The wire cursor is an opaque base64url(JSON) token; this payload schema is
// deliberately module-private — clients echo nextCursor verbatim and never
// construct it. Not HMAC-signed: every query ANDs userId, so the worst a
// forged-but-decodable token yields is an empty/overlapping page of the
// caller's own data.
const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

function encodeCursor(entry: DumpEntryItem): string {
  return Buffer.from(
    JSON.stringify({createdAt: entry.createdAt.toISOString(), id: entry.id}),
  ).toString('base64url');
}

function decodeCursor(token: string): {createdAt: Date; id: string} | null {
  try {
    const parsed = cursorPayloadSchema.safeParse(
      JSON.parse(Buffer.from(token, 'base64url').toString('utf8')),
    );
    return parsed.success
      ? {createdAt: new Date(parsed.data.createdAt), id: parsed.data.id}
      : null;
  } catch {
    return null; // corrupted base64/JSON
  }
}

/**
 * Quick Capture flow: a single insert, nothing else runs (storage-only V1 —
 * isProcessed stays false for the future batch-processing flow).
 */
export async function createDumpEntryAction(input: unknown) {
  const parsed = createDumpEntrySchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  const userId = await getCurrentUserId();
  const entry = await createDumpEntry(userId, {content: parsed.data.content});

  revalidatePath('/kanban/dump');
  return {data: entry};
}

/**
 * One feed page for the infinite scroll. Page size is server-pinned
 * (DUMP_PAGE_SIZE); nextCursor is an opaque token (null = end of history).
 */
export async function fetchDumpEntriesAction(input: unknown) {
  const parsed = fetchDumpEntriesSchema.safeParse(input);
  if (!parsed.success) return {error: parsed.error.flatten()};

  let cursor: {createdAt: Date; id: string} | undefined;
  if (parsed.data.cursor) {
    const decoded = decodeCursor(parsed.data.cursor);
    if (!decoded) {
      const t = await getTranslations('Errors');
      return {error: {formErrors: [t('invalidCursor')], fieldErrors: {}}};
    }
    cursor = decoded;
  }

  const userId = await getCurrentUserId();
  const rows = await getDumpEntriesPage(userId, DUMP_PAGE_SIZE + 1, cursor);

  const hasMore = rows.length > DUMP_PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, DUMP_PAGE_SIZE) : rows;
  const lastRow = entries[entries.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(lastRow) : null;

  return {data: {entries, nextCursor}};
}
