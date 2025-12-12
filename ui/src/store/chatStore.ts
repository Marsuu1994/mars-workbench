import { create } from 'zustand';

export interface Message {
  content: string;
  type: 'user' | 'bot';
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  finishStreaming: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
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