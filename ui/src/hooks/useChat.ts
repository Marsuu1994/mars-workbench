import { useChatStore, Message } from '@/store/chatStore';

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateLastMessage = useChatStore((state) => state.updateLastMessage);
  const finishStreaming = useChatStore((state) => state.finishStreaming);
  const setLoading = useChatStore((state) => state.setLoading);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    addMessage({ content, role: 'user' });
    setLoading(true);

    // Add empty assistant message placeholder with streaming flag
    addMessage({ content: '', role: 'assistant', isStreaming: true });

    // Get current messages (including the new user message, excluding the empty streaming placeholder)
    const currentMessages = useChatStore.getState().messages;
    const messagesToSend: Message[] = currentMessages.filter(
      (msg) => !(msg.isStreaming && msg.content === '')
    );

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        updateLastMessage(accumulated);
      }

      finishStreaming();
    } catch (error) {
      console.error('Error streaming response:', error);
      updateLastMessage('Sorry, something went wrong.');
      finishStreaming();
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}