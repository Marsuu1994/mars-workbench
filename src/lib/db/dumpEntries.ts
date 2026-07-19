import prisma from '@/lib/prisma';

// Feed item — isProcessed is intentionally excluded (dormant flag, never
// surfaced in V1) and updatedAt is omitted (append-only: always === createdAt).
export type DumpEntryItem = {
  id: string;
  content: string;
  createdAt: Date;
};

const dumpEntrySelect = {
  id: true,
  content: true,
  createdAt: true,
} as const;

/** Insert one dump entry (isProcessed defaults to false). */
export async function createDumpEntry(
  userId: string,
  data: {content: string},
): Promise<DumpEntryItem> {
  return prisma.dumpEntry.create({
    data: {...data, userId},
    select: dumpEntrySelect,
  });
}

/**
 * One feed page, newest first ((createdAt, id) DESC). The cursor is the last
 * row of the previous page; only rows strictly after it are returned, so the
 * feed stays stable while new entries are captured. Callers pass
 * take = pageSize + 1 to detect whether another page exists.
 */
export async function getDumpEntriesPage(
  userId: string,
  take: number,
  cursor?: {createdAt: Date; id: string},
): Promise<DumpEntryItem[]> {
  return prisma.dumpEntry.findMany({
    where: {
      userId,
      ...(cursor
        ? {
            OR: [
              {createdAt: {lt: cursor.createdAt}},
              {createdAt: cursor.createdAt, id: {lt: cursor.id}},
            ],
          }
        : {}),
    },
    orderBy: [{createdAt: 'desc'}, {id: 'desc'}],
    take,
    select: dumpEntrySelect,
  });
}

/** Total entry count for the dump title bar. */
export async function countDumpEntries(userId: string): Promise<number> {
  return prisma.dumpEntry.count({where: {userId}});
}
