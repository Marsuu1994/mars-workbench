'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/features/chat/store/chatStore';
import { ChatArea } from '@/features/chat/components/ChatArea';
import { ChatInput } from '@/features/chat/components/ChatInput';

export default function NewChatPage() {
  const clearMessages = useChatStore((state) => state.clearMessages);

  useEffect(() => {
    clearMessages();
  }, [clearMessages]);

  return (
    <>
      <ChatArea />
      <ChatInput />
    </>
  );
}