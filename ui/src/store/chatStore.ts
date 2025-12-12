import { create } from 'zustand';

export interface Message {
  content: string;
  type: 'user' | 'bot';
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  sendMessage: (content: string) => {
    // Add user message
    set((state) => ({
      messages: [...state.messages, { content, type: 'user' }],
      isLoading: true,
    }));

    // Mock bot response after 2s
    setTimeout(() => {
      set((state) => ({
        messages: [...state.messages, { content: 'automatic mock reply', type: 'bot' }],
        isLoading: false,
      }));
    }, 2000);
  },
}));