import {revalidatePath} from 'next/cache';
import {captureDumpEntriesSchema} from '@/schemas';
import {captureDumpEntries} from '@/services/dumpService';
import {DUMP_PAGE_PATH} from '@/utils/dump';
import {runRoute} from '../middleware/runRoute';

/**
 * POST /api/v1/dump-entries: the iOS app sends the entries it saved on the
 * phone, and drops each one the answer's `acceptedIds` lists.
 */
export const postDumpEntries = (request: Request) =>
  runRoute(request, captureDumpEntriesSchema, async (userId, {entries}) => {
    const result = await captureDumpEntries(userId, entries);
    revalidatePath(DUMP_PAGE_PATH);
    return result;
  });
