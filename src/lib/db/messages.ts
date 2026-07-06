import prisma from '@/lib/prisma';
import {MessageRole, MessageType} from '@/generated/prisma/client';

// Serialized message (BigInt id -> string for client transport).
export type MessageItem = {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: Date;
};

type MessageRaw = {
  id: bigint;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: Date;
};

const messageSelect = {
  id: true,
  role: true,
  type: true,
  content: true,
  createdAt: true,
} as const;

function serializeMessage(msg: MessageRaw): MessageItem {
  return {...msg, id: msg.id.toString()};
}

/**
 * Get all messages for a chat, ordered by creation time (LLM conversation history).
 */
export async function getMessagesByChatId(
  chatId: string,
): Promise<MessageItem[]> {
  const messages = await prisma.message.findMany({
    where: {chatId},
    orderBy: {createdAt: 'asc'},
    select: messageSelect,
  });
  return messages.map(serializeMessage);
}

/**
 * Persist a single message and touch the chat's updatedAt. `type` defaults to TEXT.
 */
export async function createMessage(data: {
  chatId: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
}): Promise<MessageItem> {
  const message = await prisma.message.create({
    data: {
      chatId: data.chatId,
      role: data.role,
      content: data.content,
      type: data.type ?? MessageType.TEXT,
    },
    select: messageSelect,
  });

  await prisma.chat.update({
    where: {id: data.chatId},
    data: {updatedAt: new Date()},
  });

  return serializeMessage(message);
}
