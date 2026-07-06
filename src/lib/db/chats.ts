import prisma from '@/lib/prisma';
import {Prisma} from '@/generated/prisma/client';

// Minimal chat record used by the kanban AI plan-creation flow.
export type ChatRecord = {
  id: string;
  planId: string | null;
  metadata: Prisma.JsonValue;
};

const chatSelect = {
  id: true,
  planId: true,
  metadata: true,
} as const;

/**
 * Create a chat owned by a user, optionally linked to a plan, with an initial
 * metadata snapshot (lastPlanStats / draftTemplates).
 */
export async function createChat(data: {
  userId: string;
  planId?: string;
  title?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<ChatRecord> {
  return prisma.chat.create({
    data: {
      userId: data.userId,
      planId: data.planId ?? null,
      title: data.title ?? null,
      metadata: data.metadata ?? Prisma.JsonNull,
    },
    select: chatSelect,
  });
}

/**
 * Get a chat by ID, scoped to the owner (returns null if not found / not owned).
 */
export async function getChatById(
  userId: string,
  chatId: string,
): Promise<ChatRecord | null> {
  return prisma.chat.findFirst({
    where: {id: chatId, userId},
    select: chatSelect,
  });
}

/**
 * Find the user's most recent in-progress AI chat — one not yet linked to a
 * plan (`planId` null). Approval sets `planId`, so this returns the active
 * draft conversation to resume, or null if there is none. `since` bounds the
 * search to chats created on/after that instant (the caller scopes resume to
 * the current period so a stale prior-period chat can't be resumed).
 */
export async function getLatestInProgressChat(
  userId: string,
  since?: Date,
): Promise<ChatRecord | null> {
  return prisma.chat.findFirst({
    where: {
      userId,
      planId: null,
      ...(since ? {createdAt: {gte: since}} : {}),
    },
    orderBy: {createdAt: 'desc'},
    select: chatSelect,
  });
}

/**
 * Overwrite a chat's metadata (single-slot clipboard for draftTemplates /
 * lastPlanStats).
 */
export async function updateChatMetadata(
  chatId: string,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.chat.update({
    where: {id: chatId},
    data: {metadata},
  });
}

/**
 * Link a chat to a plan after the plan is created.
 */
export async function updateChatPlanId(
  chatId: string,
  planId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  await db.chat.update({
    where: {id: chatId},
    data: {planId},
  });
}
