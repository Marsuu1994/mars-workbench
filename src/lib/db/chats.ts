import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Types for return values
export type ChatListItem = {
  id: string;
  title: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatWithMessages = {
  id: string;
  title: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: bigint;
    role: string;
    content: string;
    createdAt: Date;
  }[];
};

/**
 * Get all chats ordered by most recently updated
 */
export async function getChats(): Promise<ChatListItem[]> {
  return prisma.chat.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get a single chat by ID (without messages)
 */
export async function getChatById(chatId: string): Promise<ChatListItem | null> {
  return prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      title: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get a chat with all its messages
 */
export async function getChatWithMessages(chatId: string): Promise<ChatWithMessages | null> {
  return prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Create a new chat
 */
export async function createChat(
  title: string,
  metadata?: Prisma.InputJsonValue
): Promise<ChatListItem> {
  return prisma.chat.create({
    data: {
      title,
      metadata: metadata ?? Prisma.JsonNull,
    },
    select: {
      id: true,
      title: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update a chat's title and/or metadata
 */
export async function updateChat(
  chatId: string,
  data: { title?: string; metadata?: Prisma.InputJsonValue }
): Promise<ChatListItem> {
  const updateData: Prisma.ChatUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.metadata !== undefined) {
    updateData.metadata = data.metadata;
  }

  return prisma.chat.update({
    where: { id: chatId },
    data: updateData,
    select: {
      id: true,
      title: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Delete a chat (cascades to messages)
 */
export async function deleteChat(chatId: string): Promise<void> {
  await prisma.chat.delete({
    where: { id: chatId },
  });
}

/**
 * Check if a chat exists
 */
export async function chatExists(chatId: string): Promise<boolean> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true },
  });
  return chat !== null;
}