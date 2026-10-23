import {Prisma} from '@/generated/prisma/client';

/** Prisma's error code for a write whose row doesn't match its where. */
const RECORD_NOT_FOUND = 'P2025';

/**
 * Runs a single-row `update`, resolving to null when its where (id plus any
 * guards) matches no row. A guarded write takes this rather than
 * `updateManyAndReturn`: `update` is one database round trip, while the
 * `updateMany` family wraps its statement in BEGIN / COMMIT, three.
 */
export const updateOrNull = async <T>(
  update: Promise<T>,
): Promise<T | null> => {
  try {
    return await update;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === RECORD_NOT_FOUND
    ) {
      return null;
    }
    throw error;
  }
};
