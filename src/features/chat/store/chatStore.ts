import { create } from 'zustand';

export interface Message {
  content: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
}

interface ChatState {
  // Current chat context
  currentChatId: string | null;
  messages: Message[];
  isLoading: boolean;

  // Actions
  setCurrentChat: (chatId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  finishStreaming: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentChatId: null,
  messages: [],
  isLoading: false,

  setCurrentChat: (chatId: string | null) => {
    set({ currentChatId: chatId });
  },

  // Hydrate messages from server
  setMessages: (messages: Message[]) => {
    set({ messages });
  },

  clearMessages: () => {
    set({ messages: [], currentChatId: null });
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateLastMessage: (content: string) => {
    set((state) => ({
      messages: state.messages.map((msg, i) =>
        i === state.messages.length - 1 ? { ...msg, content } : msg
      ),
    }));
  },

  finishStreaming: () => {
    set((state) => ({
      messages: state.messages.map((msg, i) =>
        i === state.messages.length - 1 ? { ...msg, isStreaming: false } : msg
      ),
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));