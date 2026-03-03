import prisma from "@/lib/prisma";
import { MessageRole } from "@/generated/prisma/client";

// Types for return values
export type MessageItem = {
  id: string; // Serialized from bigint
  role: MessageRole;
  content: string;
  createdAt: Date;
};

type MessageRaw = {
  id: bigint;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

// Helper to serialize BigInt id to string
function serializeMessage(msg: MessageRaw): MessageItem {
  return {
    ...msg,
    id: msg.id.toString(),
  };
}

/**
 * Get all messages for a chat, ordered by creation time
 */
export async function getMessagesByChatId(chatId: string): Promise<MessageItem[]> {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return messages.map(serializeMessage);
}

/**
 * Create a new message and update the chat's updatedAt timestamp
 */
export async function createMessage(
  chatId: string,
  role: MessageRole,
  content: string
): Promise<MessageItem> {
  const message = await prisma.message.create({
    data: {
      chatId,
      role,
      content,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  // Update chat's updatedAt timestamp
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return serializeMessage(message);
}

/**
 * Valid message roles for validation
 */
export const VALID_MESSAGE_ROLES: MessageRole[] = ["user", "assistant", "system"];

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is MessageRole {
  return VALID_MESSAGE_ROLES.includes(role as MessageRole);
}