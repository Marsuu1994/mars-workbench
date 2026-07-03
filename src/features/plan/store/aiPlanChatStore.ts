import { create } from "zustand";
import type { DraftPlanResponse } from "@/lib/kanban/schemas";
import type { UiMessage } from "../types/aiChat";

/**
 * Lifecycle of the AI chat modal:
 * - `initializing`: creating the chat / fetching the welcome message
 * - `generating`: waiting on a draft-plan generation
 * - `approving`: committing the draft into a real plan
 * - `created`: plan committed — modal shows the success banner
 * - `idle`: ready for user input
 */
export type AiChatStatus =
  | "idle"
  | "initializing"
  | "generating"
  | "approving"
  | "created";

/** A `UiMessage` before its id is assigned (the store stamps the id). */
export type NewUiMessage = UiMessage extends infer T
  ? T extends unknown
    ? Omit<T, "id">
    : never
  : never;

let messageCounter = 0;
const nextId = () => `m${++messageCounter}`;

interface AiPlanChatState {
  isOpen: boolean;
  chatId: string | null;
  messages: UiMessage[];
  input: string;
  status: AiChatStatus;
  error: string | null;
  /** The currently approvable draft (null on clarifying-question turns). */
  latestDraft: DraftPlanResponse | null;
  createdPlanId: string | null;

  open: () => void;
  close: () => void;
  reset: () => void;
  setInput: (value: string) => void;
  setStatus: (status: AiChatStatus) => void;
  setError: (error: string | null) => void;
  setChatId: (chatId: string) => void;
  appendMessage: (message: NewUiMessage) => void;
  /**
   * Rehydrate a persisted chat: stamp ids on the reconstructed messages, derive
   * the approvable `latestDraft` from the last draft message, and reset
   * transient fields. Used when resuming an existing chat from the DB.
   */
  hydrate: (payload: { chatId: string; messages: NewUiMessage[] }) => void;
  /** Set the approvable draft and append its assistant message in one step. */
  setLatestDraft: (draft: DraftPlanResponse) => void;
  /** Flag the last draft message as approved and move to the `created` state. */
  markLatestApproved: (planId: string) => void;
}

const INITIAL_STATE = {
  chatId: null,
  messages: [] as UiMessage[],
  input: "",
  status: "idle" as AiChatStatus,
  error: null,
  latestDraft: null,
  createdPlanId: null,
};

export const useAiPlanChatStore = create<AiPlanChatState>()((set) => ({
  isOpen: false,
  ...INITIAL_STATE,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  // Wipe the conversation but leave `isOpen` untouched — callers control visibility.
  reset: () => set({ ...INITIAL_STATE }),

  setInput: (input) => set({ input }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setChatId: (chatId) => set({ chatId }),

  appendMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { ...message, id: nextId() } as UiMessage],
    })),

  hydrate: ({ chatId, messages }) => {
    const stamped = messages.map((m) => ({ ...m, id: nextId() }) as UiMessage);
    // The approvable draft is the most recent DRAFT_PLAN turn, if any.
    let latestDraft: DraftPlanResponse | null = null;
    for (let i = stamped.length - 1; i >= 0; i--) {
      const message = stamped[i];
      if (message.role === "assistant" && message.type === "draft") {
        latestDraft = message.draft;
        break;
      }
    }
    set({
      chatId,
      messages: stamped,
      latestDraft,
      input: "",
      status: "idle",
      error: null,
      createdPlanId: null,
    });
  },

  setLatestDraft: (draft) =>
    set((state) => ({
      latestDraft: draft,
      messages: [
        ...state.messages,
        { id: nextId(), role: "assistant", type: "draft", draft },
      ],
    })),

  markLatestApproved: (planId) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === "assistant" && message.type === "draft") {
          messages[i] = { ...message, approved: true };
          break;
        }
      }
      return { messages, status: "created", createdPlanId: planId };
    }),
}));
