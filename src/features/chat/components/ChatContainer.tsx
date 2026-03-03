'use client';

import { useEffect } from 'react';
import { useChatStore, Message } from '@/features/chat/store/chatStore';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';

type ChatContainerProps = {
  chatId: string;
  initialMessages: Message[];
};

/**
 * Client component that hydrates Zustand store with server-fetched messages.
 * This bridges the SSR data with client-side state management.
 */
export function ChatContainer({ chatId, initialMessages }: ChatContainerProps) {
  const setCurrentChat = useChatStore((state) => state.setCurrentChat);
  const setMessages = useChatStore((state) => state.setMessages);
  const currentChatId = useChatStore((state) => state.currentChatId);

  // Hydrate store when component mounts or chatId changes
  useEffect(() => {
    // Only hydrate if we're switching to a different chat
    if (currentChatId !== chatId) {
      setCurrentChat(chatId);
      setMessages(initialMessages);
    }
  }, [chatId, currentChatId, initialMessages, setCurrentChat, setMessages]);

  return (
    <>
      <ChatArea />
      <ChatInput />
    </>
  );
}